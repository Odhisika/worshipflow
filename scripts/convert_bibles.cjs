/**
 * Converts Zefania XML and USFX XML files to WorshipFlow JSON format.
 * Usage: node scripts/convert_bibles.cjs
 */

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const RESOURCES_DIR = path.resolve(__dirname, '..', 'src-tauri', 'resources');

// Standard 66 book names (OSIS order)
const BOOK_NAMES = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
  'Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings',
  '1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job',
  'Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah',
  'Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai',
  'Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus',
  'Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John',
  '3 John','Jude','Revelation'
];

// USFX/OSIS book code → full name
const BOOK_CODE_MAP = {
  GEN:'Genesis',EXO:'Exodus',LEV:'Leviticus',NUM:'Numbers',DEU:'Deuteronomy',
  JOS:'Joshua',JDG:'Judges',RUT:'Ruth','1SA':'1 Samuel','2SA':'2 Samuel',
  '1KI':'1 Kings','2KI':'2 Kings','1CH':'1 Chronicles','2CH':'2 Chronicles',
  EZR:'Ezra',NEH:'Nehemiah',EST:'Esther',JOB:'Job',PSA:'Psalms',
  PRO:'Proverbs',ECC:'Ecclesiastes',SNG:'Song of Solomon',ISA:'Isaiah',
  JER:'Jeremiah',LAM:'Lamentations',EZK:'Ezekiel',DAN:'Daniel',HOS:'Hosea',
  JOL:'Joel',AMO:'Amos',OBA:'Obadiah',JON:'Jonah',MIC:'Micah',NAM:'Nahum',
  HAB:'Habakkuk',ZEP:'Zephaniah',HAG:'Haggai',ZEC:'Zechariah',MAL:'Malachi',
  MAT:'Matthew',MRK:'Mark',LUK:'Luke',JHN:'John',ACT:'Acts',ROM:'Romans',
  '1CO':'1 Corinthians','2CO':'2 Corinthians',GAL:'Galatians',EPH:'Ephesians',
  PHP:'Philippians',COL:'Colossians','1TH':'1 Thessalonians','2TH':'2 Thessalonians',
  '1TI':'1 Timothy','2TI':'2 Timothy',TIT:'Titus',PHM:'Philemon',HEB:'Hebrews',
  JAS:'James','1PE':'1 Peter','2PE':'2 Peter','1JN':'1 John','2JN':'2 John',
  '3JN':'3 John',JUD:'Jude',REV:'Revelation'
};

function parseZefania(xml) {
  const books = [];
  let pos = 0;
  let version = 'IMPORTED';

  // Extract version
  const vMatch = xml.match(/biblename="([^"]+)"/);
  if (vMatch) version = vMatch[1];

  // Extract books
  const bookRegex = /<BIBLEBOOK\s[^>]*bname="([^"]+)"[^>]*>/g;
  let bookMatch;
  while ((bookMatch = bookRegex.exec(xml)) !== null) {
    const bookName = bookMatch[1];
    const bookStart = bookMatch.index;
    
    // Find the closing </BIBLEBOOK>
    let depth = 1;
    let bookEnd = bookStart + bookMatch[0].length;
    while (depth > 0 && bookEnd < xml.length) {
      const nextOpen = xml.indexOf('<BIBLEBOOK', bookEnd);
      const nextClose = xml.indexOf('</BIBLEBOOK>', bookEnd);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        bookEnd = nextOpen + 11;
      } else {
        depth--;
        bookEnd = nextClose + 13;
      }
    }
    
    const bookXml = xml.slice(bookStart, bookEnd);
    const chapters = [];
    
    const chRegex = /<CHAPTER\s[^>]*cnumber="(\d+)"[^>]*>([\s\S]*?)<\/CHAPTER>/g;
    let chMatch;
    while ((chMatch = chRegex.exec(bookXml)) !== null) {
      const chNum = parseInt(chMatch[1]);
      const chContent = chMatch[2];
      const verses = [];
      
      const vRegex = /<VERS\s[^>]*vnumber="(\d+)"[^>]*>([\s\S]*?)<\/VERS>/g;
      let vMatch;
      while ((vMatch = vRegex.exec(chContent)) !== null) {
        const vNum = parseInt(vMatch[1]);
        const text = vMatch[2].trim();
        if (text) {
          verses.push({ verse: String(vNum), text });
        }
      }
      
      if (verses.length > 0) {
        chapters.push({ chapter: String(chNum), verses });
      }
    }
    
    if (chapters.length > 0) {
      books.push({ book: bookName, chapters });
    }
  }

  return { version, books };
}

function parseUsfx(xml) {
  const books = [];
  let version = 'Imported';

  // Extract version from <id> in first book
  const idMatch = xml.match(/<id[^>]*>([^<]*)/);
  if (idMatch) version = idMatch[1].replace(/^- /, '').trim();

  // Extract books
  const bookRegex = /<book\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/book>/g;
  let bookMatch;
  while ((bookMatch = bookRegex.exec(xml)) !== null) {
    const code = bookMatch[1];
    const bookXml = bookMatch[2];
    const bookName = BOOK_CODE_MAP[code];
    if (!bookName) continue;

    const chapters = [];
    let currentChapter = null;
    let currentVerses = [];
    let waitingVerse = null;
    let verseBuf = '';

    // Simple state-machine parser
    const chMarkerRegex = /<c\s+id="(\d+)"\s*\/>/g;
    const vRegex = /<v\s+id="(\d+)"[^>]*\/>/g;
    const veRegex = /<ve\s*\/>/g;
    
    // Pre-process: split into chapter sections
    const parts = bookXml.split(/<c\s+id="(\d+)"\s*\/>/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const chNum = parseInt(parts[i]);
      const chContent = parts[i + 1] || '';
      const verses = [];
      
      // Extract verses from this chapter content
      const vSecRegex = /<v\s+id="(\d+)"[^>]*\/>([\s\S]*?)(?=<v\s+id=|$)/g;
      let vMatch;
      while ((vMatch = vSecRegex.exec(chContent)) !== null) {
        const vNum = parseInt(vMatch[1]);
        let text = vMatch[2].replace(/<ve\s*\/>/g, '').trim();
        // Remove any other HTML/XML tags
        text = text.replace(/<[^>]+>/g, '').trim();
        if (text) {
          verses.push({ verse: String(vNum), text });
        }
      }
      
      // Fallback: try another approach if the above didn't work
      if (verses.length === 0) {
        const simpleVRegex = /<v\s+id="(\d+)"[^>]*\/>([^<]*)/g;
        let sMatch;
        while ((sMatch = simpleVRegex.exec(chContent)) !== null) {
          const vNum = parseInt(sMatch[1]);
          let text = sMatch[2].trim();
          if (text) {
            verses.push({ verse: String(vNum), text });
          }
        }
      }
      
      if (verses.length > 0) {
        chapters.push({ chapter: String(chNum), verses });
      }
    }

    if (chapters.length > 0) {
      books.push({ book: bookName, chapters });
    }
  }

  return { version, books };
}

function writeJson(filename, version, data) {
  const output = {
    version,
    books: data.books
  };
  const outPath = path.join(RESOURCES_DIR, filename);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  const verseCount = data.books.reduce((sum, b) => 
    sum + b.chapters.reduce((s, c) => s + c.verses.length, 0), 0);
  console.log(`  ✓ ${filename} → ${version} (${verseCount} verses, ${data.books.length} books)`);
}

function parseBiblica(xml) {
  const books = [];
  let version = 'Imported';

  const tMatch = xml.match(/translation="([^"]+)"/);
  if (tMatch) version = tMatch[1];

  // Testament loop
  const testamentRegex = /<testament\s+name="([^"]+)">([\s\S]*?)<\/testament>/g;
  let testMatch;
  while ((testMatch = testamentRegex.exec(xml)) !== null) {
    const testName = testMatch[1];
    const testContent = testMatch[2];
    const isOT = testName.toLowerCase() === 'old';
    
    const bookRegex = /<book\s+number="(\d+)"[^>]*>([\s\S]*?)<\/book>/g;
    let bMatch;
    while ((bMatch = bookRegex.exec(testContent)) !== null) {
      const bookNum = parseInt(bMatch[1]);
      const bookContent = bMatch[2];
      const idx = isOT ? bookNum - 1 : bookNum - 1;
      if (idx < 0 || idx >= BOOK_NAMES.length) continue;
      const bookName = BOOK_NAMES[idx + (isOT ? 0 : 39)];
      
      const chapters = [];
      const chRegex = /<chapter\s+number="(\d+)"[^>]*>([\s\S]*?)<\/chapter>/g;
      let chMatch;
      while ((chMatch = chRegex.exec(bookContent)) !== null) {
        const chNum = parseInt(chMatch[1]);
        const chContent = chMatch[2];
        const verses = [];
        
        const vRegex = /<verse\s+number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/g;
        let vMatch;
        while ((vMatch = vRegex.exec(chContent)) !== null) {
          const vNum = parseInt(vMatch[1]);
          const text = vMatch[2].trim();
          if (text) {
            verses.push({ verse: String(vNum), text });
          }
        }
        
        if (verses.length > 0) {
          chapters.push({ chapter: String(chNum), verses });
        }
      }
      
      if (chapters.length > 0) {
        books.push({ book: bookName, chapters });
      }
    }
  }

  return { version, books };
}

function convertZefaniaToJson(inputXml, outputJson, label) {
  const xml = fs.readFileSync(path.join(RESOURCES_DIR, inputXml), 'utf-8');
  const data = parseZefania(xml);
  writeJson(outputJson, label, data);
}

function convertUsfxToJson(inputXml, outputJson, label) {
  const xml = fs.readFileSync(path.join(RESOURCES_DIR, inputXml), 'utf-8');
  const data = parseUsfx(xml);
  writeJson(outputJson, label, data);
}

console.log('Converting Bibles to WorshipFlow JSON format...\n');

// Zefania XML → JSON conversions
convertZefaniaToJson('asv.xml', 'asv_bible.json', 'ASV');
convertZefaniaToJson('bbe.xml', 'bbe_bible.json', 'BBE');
convertZefaniaToJson('web.xml', 'web_bible.json', 'WEB');
convertZefaniaToJson('rsv.xml', 'rsv_bible.json', 'RSV');

// USFX XML → JSON conversion
convertUsfxToJson('twi_asante.xml', 'twi_asante_bible.json', 'Asante Twi');

// Also convert the existing Twi Akuapem (Biblica XML → JSON)
const twiAkuapemXml = fs.readFileSync(path.join(RESOURCES_DIR, 'TwiAkuapemBible.xml'), 'utf-8');
const twiAkuapemData = parseBiblica(twiAkuapemXml);
writeJson('twi_akuapem_bible.json', 'Akuapem Twi', twiAkuapemData);

// Apply Twi book names to the Asante Twi JSON (extracted from XML <h> tags)
const twiNames = [
  '1 Mose','2 Mose','3 Mose','4 Mose','5 Mose','Yosua','Atemmufoɔ','Rut',
  '1 Samuel','2 Samuel','1 Ahemfo','2 Ahemfo','1 Berɛsosɛm','2 Berɛsosɛm',
  'Ɛsra','Nehemia','Ɛster','Hiob','Nnwom','Mmɛbusɛm','Ɔsɛnkafoɔ',
  'Nnwom Mu Dwom','Yesaia','Yeremia','Kwadwom','Hesekiel','Daniel','Hosea',
  'Yoɛl','Amos','Obadia','Yona','Mika','Nahum','Habakuk','Sefania','Hagai',
  'Sakaria','Malaki','Mateo','Marko','Luka','Yohane','Asomafoɔ','Romafoɔ',
  '1 Korintofoɔ','2 Korintofoɔ','Galatifoɔ','Efesofoɔ','Filipifoɔ','Kolosefoɔ',
  '1 Tesalonikafoɔ','2 Tesalonikafoɔ','1 Timoteo','2 Timoteo','Tito','Filemon',
  'Hebrifoɔ','Yakobo','1 Petro','2 Petro','1 Yohane','2 Yohane','3 Yohane',
  'Yuda','Adiyisɛm'
];

const asantePath = path.join(RESOURCES_DIR, 'twi_asante_bible.json');
const asanteData = JSON.parse(fs.readFileSync(asantePath, 'utf-8'));
asanteData.books.forEach((b, i) => { b.book = twiNames[i]; });
fs.writeFileSync(asantePath, JSON.stringify(asanteData, null, 2), 'utf-8');
console.log(`  ✓ Applied Twi book names to Asante Twi`);

// Apply same Twi names to the Akuapem Twi JSON
const akuapemPath = path.join(RESOURCES_DIR, 'twi_akuapem_bible.json');
const akuapemData = JSON.parse(fs.readFileSync(akuapemPath, 'utf-8'));
akuapemData.books.forEach((b, i) => { b.book = twiNames[i]; });
fs.writeFileSync(akuapemPath, JSON.stringify(akuapemData, null, 2), 'utf-8');
console.log(`  ✓ Applied Twi book names to Akuapem Twi`);

console.log('\nDone!');
