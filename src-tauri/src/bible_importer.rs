/// bible_importer.rs
/// Parses external Bible files and returns a flat list of verses ready to bulk-insert.
/// Supported formats:
///   - Zefania XML  (.xml with root element <XMLBIBLE>)
///   - OSIS XML     (.xml/.osis with root element <osis>)
///   - Biblica/YouVersion XML (.xml with root element <bible>)
///   - WorshipFlow JSON (.json  —  our own format)

use crate::error::{AppError, AppResult};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::path::Path;

pub type VerseRow = (String, i32, i32, String, String); // (book, chapter, verse, text, version)

/// Detect format and dispatch to the correct parser.
pub fn import_bible_file(path: &Path) -> AppResult<(String, Vec<VerseRow>)> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "json" => parse_json(path),
        "osis" => parse_osis(path),
        "xml" => {
            // Peek at the root element to distinguish Zefania vs OSIS vs Biblica
            let root = peek_xml_root(path)?;
            if root.to_uppercase().contains("XMLBIBLE") {
                parse_zefania(path)
            } else if root.to_lowercase().contains("osis") {
                parse_osis(path)
            } else if root.to_lowercase() == "bible" {
                parse_biblica(path)
            } else {
                Err(AppError::Unknown(format!(
                    "Unrecognised XML root element '{}'. Expected XMLBIBLE (Zefania), osis (OSIS), or bible (Biblica/YouVersion).",
                    root
                )))
            }
        }
        _ => Err(AppError::Unknown(format!(
            "Unsupported file type '.{}'. Please use .xml (Zefania/OSIS) or .json.",
            ext
        ))),
    }
}

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────

/// Read just enough of the file to find the first non-comment XML element name.
fn peek_xml_root(path: &Path) -> AppResult<String> {
    let content = read_file_with_encoding(path)?;
    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                return Ok(name);
            }
            Ok(Event::Eof) => return Ok(String::new()),
            Err(e) => {
                return Err(AppError::Unknown(format!(
                    "Failed to peek XML root: {}",
                    e
                )))
            }
            _ => {}
        }
        buf.clear();
    }
}

/// Read a file to string, attempting UTF-8 first and falling back to Latin-1.
fn read_file_with_encoding(path: &Path) -> AppResult<String> {
    let bytes = std::fs::read(path)
        .map_err(|e| AppError::Unknown(format!("Cannot read file {:?}: {}", path, e)))?;

    // Try UTF-8 first
    if let Ok(s) = std::str::from_utf8(&bytes) {
        return Ok(s.to_string());
    }

    // Fall back to Windows-1252 / Latin-1 (common in older Zefania files)
    let (cow, _, _) = encoding_rs::WINDOWS_1252.decode(&bytes);
    Ok(cow.into_owned())
}

/// Strip XML namespace prefix (e.g. "osisText" → "osisText", "osis:osisText" → "osisText")
fn local_name(full: &str) -> &str {
    full.split(':').last().unwrap_or(full)
}

// ─────────────────────────────────────────────────────────────────
//  Zefania XML parser
//  Structure: <XMLBIBLE> → <BIBLEBOOK bname="Genesis"> →
//             <CHAPTER cnumber="1"> → <VERS vnumber="1">text</VERS>
// ─────────────────────────────────────────────────────────────────
pub fn parse_zefania(path: &Path) -> AppResult<(String, Vec<VerseRow>)> {
    let content = read_file_with_encoding(path)?;
    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut rows: Vec<VerseRow> = Vec::new();
    let mut buf = Vec::new();

    let mut version_name = String::from("IMPORTED");
    let mut current_book = String::new();
    let mut current_chapter: i32 = 0;
    let mut current_verse_num: i32 = 0;
    let mut inside_vers = false;
    let mut verse_text = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                match local_name(&tag) {
                    "XMLBIBLE" | "BIBLE" => {
                        // Try biblename attribute
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key.to_lowercase().contains("biblename")
                                || key.to_lowercase().contains("name")
                            {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                if !val.is_empty() {
                                    version_name = val.to_string();
                                }
                            }
                        }
                    }
                    "BIBLEBOOK" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "bname" || key == "bsname" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                current_book = val.to_string();
                            }
                        }
                        current_chapter = 0;
                    }
                    "CHAPTER" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "cnumber" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                current_chapter = val.parse().unwrap_or(0);
                            }
                        }
                    }
                    "VERS" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "vnumber" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                current_verse_num = val.parse().unwrap_or(0);
                            }
                        }
                        inside_vers = true;
                        verse_text.clear();
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                if inside_vers {
                    if let Ok(t) = e.unescape() {
                        verse_text.push_str(&t);
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if local_name(&tag) == "VERS" && inside_vers {
                    let text = verse_text.trim().to_string();
                    if !text.is_empty() && !current_book.is_empty() {
                        rows.push((
                            current_book.clone(),
                            current_chapter,
                            current_verse_num,
                            text,
                            version_name.clone(),
                        ));
                    }
                    inside_vers = false;
                    verse_text.clear();
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(AppError::Unknown(format!(
                    "Zefania XML parse error: {}",
                    e
                )))
            }
            _ => {}
        }
        buf.clear();
    }

    if rows.is_empty() {
        return Err(AppError::Unknown(
            "No verses found in Zefania XML file. Check that the file is a valid Zefania Bible module.".into(),
        ));
    }

    Ok((version_name, rows))
}

// ─────────────────────────────────────────────────────────────────
//  OSIS XML parser
//  Structure: <osis> → <osisText osisIDWork="KJV"> →
//             <div type="book" osisID="Gen"> →
//             <chapter osisID="Gen.1"> →
//             <verse osisID="Gen.1.1">text</verse>
// ─────────────────────────────────────────────────────────────────
pub fn parse_osis(path: &Path) -> AppResult<(String, Vec<VerseRow>)> {
    let content = read_file_with_encoding(path)?;
    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut rows: Vec<VerseRow> = Vec::new();
    let mut buf = Vec::new();

    let mut version_name = String::from("IMPORTED");
    let mut current_book = String::new();
    let mut current_chapter: i32 = 0;
    let mut current_verse_num: i32 = 0;
    let mut inside_verse = false;
    let mut verse_text = String::new();

    // Map OSIS book abbreviations to full names
    let osis_book_names = build_osis_book_map();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                match local_name(&tag) {
                    "osisText" | "work" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "osisIDWork" || key == "osisID" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                if !val.is_empty() && local_name(&tag) == "osisText" {
                                    version_name = val.to_string();
                                }
                            }
                        }
                    }
                    "div" => {
                        let mut div_type = String::new();
                        let mut osis_id = String::new();
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "type" {
                                div_type = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default().to_string();
                            }
                            if key == "osisID" {
                                osis_id = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default().to_string();
                            }
                        }
                        if div_type == "book" && !osis_id.is_empty() {
                            current_book = osis_book_names
                                .get(osis_id.as_str())
                                .cloned()
                                .unwrap_or_else(|| osis_id.clone());
                            current_chapter = 0;
                        }
                    }
                    "chapter" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "osisID" {
                                // "Gen.1" → chapter 1
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                if let Some(ch) = val.split('.').nth(1) {
                                    current_chapter = ch.parse().unwrap_or(0);
                                }
                            }
                            if key == "n" || key == "sID" {
                                // Some OSIS files use n="1"
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                if let Ok(n) = val.parse::<i32>() {
                                    current_chapter = n;
                                }
                            }
                        }
                    }
                    "verse" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "osisID" {
                                // "Gen.1.1" → verse 1
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                if let Some(v) = val.split('.').nth(2) {
                                    current_verse_num = v.parse().unwrap_or(0);
                                }
                            }
                            if key == "n" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                // Could be "Gen.1.1" or just "1"
                                let last = val.split('.').last().unwrap_or(&val);
                                current_verse_num = last.parse().unwrap_or(current_verse_num);
                            }
                        }
                        inside_verse = true;
                        verse_text.clear();
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                if inside_verse {
                    if let Ok(t) = e.unescape() {
                        verse_text.push_str(&t);
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if local_name(&tag) == "verse" && inside_verse {
                    let text = verse_text.trim().to_string();
                    if !text.is_empty() && !current_book.is_empty() && current_verse_num > 0 {
                        rows.push((
                            current_book.clone(),
                            current_chapter,
                            current_verse_num,
                            text,
                            version_name.clone(),
                        ));
                    }
                    inside_verse = false;
                    verse_text.clear();
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(AppError::Unknown(format!("OSIS XML parse error: {}", e)))
            }
            _ => {}
        }
        buf.clear();
    }

    if rows.is_empty() {
        return Err(AppError::Unknown(
            "No verses found in OSIS XML file.".into(),
        ));
    }

    Ok((version_name, rows))
}

// ─────────────────────────────────────────────────────────────────
//  Biblica / YouVersion XML parser
//  Structure: <bible translation="..."> →
//             <testament name="Old"> / <testament name="New"> →
//             <book number="1"> (number only — mapped via standard canon order) →
//             <chapter number="1"> →
//             <verse number="1">text</verse>
// ─────────────────────────────────────────────────────────────────
pub fn parse_biblica(path: &Path) -> AppResult<(String, Vec<VerseRow>)> {
    let content = read_file_with_encoding(path)?;
    let mut reader = Reader::from_str(&content);
    reader.config_mut().trim_text(true);

    let mut rows: Vec<VerseRow> = Vec::new();
    let mut buf = Vec::new();

    let mut version_name = String::from("IMPORTED");
    let ot_books = canon_ot_books();
    let nt_books = canon_nt_books();
    let mut current_testament: Option<&[&str]> = None;
    let mut current_book = String::new();
    let mut current_chapter: i32 = 0;
    let mut current_verse_num: i32 = 0;
    let mut inside_verse = false;
    let mut verse_text = String::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                let tag = local_name(&tag);
                match tag {
                    "bible" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "translation" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                if !val.is_empty() {
                                    version_name = val.to_string();
                                }
                            }
                        }
                    }
                    "testament" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "name" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                current_testament = if val.to_lowercase() == "old" {
                                    Some(&ot_books)
                                } else {
                                    Some(&nt_books)
                                };
                            }
                        }
                    }
                    "book" => {
                        if let Some(books) = current_testament {
                            for attr in e.attributes().flatten() {
                                let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                                if key == "number" {
                                    let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                    let num: usize = val.parse().unwrap_or(0);
                                    // XML uses continuous numbering: OT=1-39, NT=40-66
                                    let idx = if current_testament == Some(&ot_books) {
                                        num.checked_sub(1)
                                    } else {
                                        num.checked_sub(40)
                                    };
                                    if let Some(i) = idx {
                                        if i < books.len() {
                                            current_book = books[i].to_string();
                                        }
                                    }
                                }
                            }
                        }
                        current_chapter = 0;
                    }
                    "chapter" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "number" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                current_chapter = val.parse().unwrap_or(0);
                            }
                        }
                    }
                    "verse" => {
                        for attr in e.attributes().flatten() {
                            let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                            if key == "number" {
                                let val = attr.decode_and_unescape_value(reader.decoder()).unwrap_or_default();
                                current_verse_num = val.parse().unwrap_or(0);
                            }
                        }
                        inside_verse = true;
                        verse_text.clear();
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                if inside_verse {
                    if let Ok(t) = e.unescape() {
                        verse_text.push_str(&t);
                    }
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if local_name(&tag) == "verse" && inside_verse {
                    let text = verse_text.trim().to_string();
                    if !text.is_empty() && !current_book.is_empty() {
                        rows.push((
                            current_book.clone(),
                            current_chapter,
                            current_verse_num,
                            text,
                            version_name.clone(),
                        ));
                    }
                    inside_verse = false;
                    verse_text.clear();
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(AppError::Unknown(format!(
                    "Biblica XML parse error: {}",
                    e
                )))
            }
            _ => {}
        }
        buf.clear();
    }

    if rows.is_empty() {
        return Err(AppError::Unknown(
            "No verses found in Biblica/YouVersion XML file.".into(),
        ));
    }

    Ok((version_name, rows))
}

fn canon_ot_books() -> Vec<&'static str> {
    vec![
        "1 Mose", "2 Mose", "3 Mose", "4 Mose", "5 Mose",
        "Yosua", "Atemmufoɛ", "Rut", "1 Samuel", "2 Samuel",
        "1 Ahemfo", "2 Ahemfo", "1 Anansesɛm", "2 Anansesɛm", "Esra",
        "Nehemia", "Ester", "Hiob", "Nnwom", "Mmebusɛm",
        "Ɔsɛnkafoɛ", "Nnwom Solomo", "Yesaia", "Yeremia", "Nkɔnbeɛ",
        "Hesekiel", "Daniel", "Hosea", "Joel", "Amosi",
        "Obadia", "Yona", "Mikea", "Nahum", "Habakuk",
        "Sefania", "Hagai", "Sakaria", "Malaki",
    ]
}

fn canon_nt_books() -> Vec<&'static str> {
    vec![
        "Mateo", "Marko", "Luka", "Yohane", "Asomafoɛ",
        "Roma", "1 Korintofoɛ", "2 Korintofoɛ", "Galatia", "Efesofoɛ",
        "Filipifoɛ", "Kolosefoɛ", "1 Tesalonikafoɛ", "2 Tesalonikafoɛ",
        "1 Timoteo", "2 Timoteo", "Tito", "Filemon", "Hebrifoɛ",
        "Yakobo", "1 Petro", "2 Petro", "1 Yohane", "2 Yohane", "3 Yohane",
        "Yuda", "Adiyisɛm",
    ]
}

// ─────────────────────────────────────────────────────────────────
//  WorshipFlow JSON parser  (existing internal format)
// ─────────────────────────────────────────────────────────────────
pub fn parse_json(path: &Path) -> AppResult<(String, Vec<VerseRow>)> {
    #[derive(serde::Deserialize)]
    struct VerseJson {
        verse: String,
        text: String,
    }
    #[derive(serde::Deserialize)]
    struct ChapterJson {
        chapter: String,
        verses: Vec<VerseJson>,
    }
    #[derive(serde::Deserialize)]
    struct BookJson {
        book: String,
        chapters: Vec<ChapterJson>,
    }
    #[derive(serde::Deserialize)]
    struct BibleJson {
        version: String,
        books: Vec<BookJson>,
    }

    let file = std::fs::File::open(path)
        .map_err(|e| AppError::Unknown(format!("Cannot open JSON: {}", e)))?;
    let data: BibleJson = serde_json::from_reader(std::io::BufReader::new(file))
        .map_err(|e| AppError::Unknown(format!("Invalid WorshipFlow JSON: {}", e)))?;

    let version = data.version.clone();
    let mut rows = Vec::new();
    for book in &data.books {
        for ch in &book.chapters {
            let chapter_num: i32 = ch.chapter.parse().unwrap_or(0);
            for v in &ch.verses {
                let verse_num: i32 = v.verse.parse().unwrap_or(0);
                rows.push((
                    book.book.clone(),
                    chapter_num,
                    verse_num,
                    v.text.clone(),
                    version.clone(),
                ));
            }
        }
    }

    if rows.is_empty() {
        return Err(AppError::Unknown("No verses found in JSON file.".into()));
    }

    Ok((version, rows))
}

// ─────────────────────────────────────────────────────────────────
//  OSIS → full book name map (abbreviated list of 66 books)
// ─────────────────────────────────────────────────────────────────
fn build_osis_book_map() -> std::collections::HashMap<&'static str, String> {
    let entries: &[(&str, &str)] = &[
        ("Gen", "Genesis"), ("Exod", "Exodus"), ("Lev", "Leviticus"),
        ("Num", "Numbers"), ("Deut", "Deuteronomy"), ("Josh", "Joshua"),
        ("Judg", "Judges"), ("Ruth", "Ruth"), ("1Sam", "1 Samuel"),
        ("2Sam", "2 Samuel"), ("1Kgs", "1 Kings"), ("2Kgs", "2 Kings"),
        ("1Chr", "1 Chronicles"), ("2Chr", "2 Chronicles"), ("Ezra", "Ezra"),
        ("Neh", "Nehemiah"), ("Esth", "Esther"), ("Job", "Job"),
        ("Ps", "Psalms"), ("Prov", "Proverbs"), ("Eccl", "Ecclesiastes"),
        ("Song", "Song of Solomon"), ("Isa", "Isaiah"), ("Jer", "Jeremiah"),
        ("Lam", "Lamentations"), ("Ezek", "Ezekiel"), ("Dan", "Daniel"),
        ("Hos", "Hosea"), ("Joel", "Joel"), ("Amos", "Amos"),
        ("Obad", "Obadiah"), ("Jonah", "Jonah"), ("Mic", "Micah"),
        ("Nah", "Nahum"), ("Hab", "Habakkuk"), ("Zeph", "Zephaniah"),
        ("Hag", "Haggai"), ("Zech", "Zechariah"), ("Mal", "Malachi"),
        ("Matt", "Matthew"), ("Mark", "Mark"), ("Luke", "Luke"),
        ("John", "John"), ("Acts", "Acts"), ("Rom", "Romans"),
        ("1Cor", "1 Corinthians"), ("2Cor", "2 Corinthians"), ("Gal", "Galatians"),
        ("Eph", "Ephesians"), ("Phil", "Philippians"), ("Col", "Colossians"),
        ("1Thess", "1 Thessalonians"), ("2Thess", "2 Thessalonians"),
        ("1Tim", "1 Timothy"), ("2Tim", "2 Timothy"), ("Titus", "Titus"),
        ("Phlm", "Philemon"), ("Heb", "Hebrews"), ("Jas", "James"),
        ("1Pet", "1 Peter"), ("2Pet", "2 Peter"), ("1John", "1 John"),
        ("2John", "2 John"), ("3John", "3 John"), ("Jude", "Jude"),
        ("Rev", "Revelation"),
    ];
    entries.iter().map(|(k, v)| (*k, v.to_string())).collect()
}
