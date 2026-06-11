const https = require('https');
const fs = require('fs');
const path = require('path');

const BOOK_NAMES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

const VERSIONS = [
  { slug: 'web', label: 'WEB', name: 'World English Bible', source: 'midvash' },
  { slug: 'asv', label: 'ASV', name: 'American Standard Version', source: 'midvash' },
  { slug: 'ylt', label: 'YLT', name: "Young's Literal Translation", source: 'redempti' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'src-tauri', 'resources');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function convertFromMidvash(data, versionLabel) {
  const books = data.books.map((book) => ({
    book: book.englishName,
    chapters: book.chapters.map((ch) => ({
      chapter: String(ch.chapter),
      verses: ch.verses.map((v) => ({
        verse: String(v.number),
        text: v.text,
      })),
    })),
  }));

  return { version: versionLabel, books };
}

function convertFromRedempti(data, versionLabel) {
  const rows = data.resultset.row;
  const bookMap = {};

  for (const row of rows) {
    const [, bookId, chapter, verse, text] = row.field;
    const bookName = BOOK_NAMES[bookId - 1];
    if (!bookName) continue;

    if (!bookMap[bookName]) {
      bookMap[bookName] = {};
    }
    if (!bookMap[bookName][chapter]) {
      bookMap[bookName][chapter] = [];
    }
    bookMap[bookName][chapter].push({ verse: String(verse), text });
  }

  const books = Object.entries(bookMap).map(([bookName, chaptersMap]) => {
    const chapters = Object.entries(chaptersMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([chNum, verses]) => ({
        chapter: chNum,
        verses: verses.sort((a, b) => Number(a.verse) - Number(b.verse)),
      }));
    return { book: bookName, chapters };
  });

  return { version: versionLabel, books };
}

async function main() {
  console.log('Downloading public domain Bible versions...\n');

  for (const v of VERSIONS) {
    let url;
    let outPath;
    let converter;

    if (v.source === 'midvash') {
      url = `https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/${v.slug}/${v.slug}.json`;
      outPath = path.join(OUTPUT_DIR, `${v.slug}_bible.json`);
      converter = (raw) => convertFromMidvash(raw, v.label);
    } else {
      url = `https://raw.githubusercontent.com/redempti/bible_database/master/json/t_${v.slug}.json`;
      outPath = path.join(OUTPUT_DIR, `${v.slug}_bible.json`);
      converter = (raw) => convertFromRedempti(raw, v.label);
    }

    console.log(`Downloading ${v.name} (${v.label})...`);
    console.log(`  URL: ${url}`);

    try {
      const raw = await fetchJson(url);
      const converted = converter(raw);

      fs.writeFileSync(outPath, JSON.stringify(converted, null, 2));
      const stats = fs.statSync(outPath);

      const bookCount = converted.books.length;
      const verseCount = converted.books.reduce(
        (sum, b) => sum + b.chapters.reduce((s, c) => s + c.verses.length, 0),
        0
      );

      console.log(`  Saved to: ${outPath}`);
      console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
      console.log(`  Books: ${bookCount}, Verses: ${verseCount.toLocaleString()}\n`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}\n`);
    }
  }

  console.log('Done! Restart the app and the new versions will appear in the version selector.');
}

main();
