import * as mammoth from 'mammoth';

export interface ParsedSong {
  title: string;
  lyrics: string;
  key?: string;
  tags?: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): ParsedSong[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const titleIdx = headers.indexOf('title');
  const lyricsIdx = headers.indexOf('lyrics');
  const keyIdx = headers.indexOf('key');
  const tagsIdx = headers.indexOf('tags');

  if (titleIdx === -1 || lyricsIdx === -1) {
    throw new Error('CSV must have "title" and "lyrics" columns');
  }

  const songs: ParsedSong[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length <= titleIdx || cols.length <= lyricsIdx) continue;
    const title = cols[titleIdx].trim();
    const lyrics = cols[lyricsIdx].trim();
    if (!title || !lyrics) continue;

    let tags: string[] | undefined;
    if (tagsIdx !== -1 && cols[tagsIdx]) {
      tags = cols[tagsIdx].split(';').map(t => t.trim()).filter(Boolean);
    }

    songs.push({
      title,
      lyrics,
      key: keyIdx !== -1 ? cols[keyIdx]?.trim() || undefined : undefined,
      tags,
    });
  }
  return songs;
}

function parseJSON(text: string): ParsedSong[] {
  const data = JSON.parse(text);

  // Array of songs
  if (Array.isArray(data)) {
    return data.map(item => ({
      title: item.title || item.name || '',
      lyrics: item.lyrics || item.text || item.content || '',
      key: item.key || undefined,
      tags: item.tags || undefined,
    })).filter(s => s.title && s.lyrics);
  }

  // Object with songs array
  if (data.songs && Array.isArray(data.songs)) {
    return data.songs.map((item: any) => ({
      title: item.title || item.name || '',
      lyrics: item.lyrics || item.text || item.content || '',
      key: item.key || undefined,
      tags: item.tags || undefined,
    })).filter((s: ParsedSong) => s.title && s.lyrics);
  }

  // Single song object
  if (data.title && data.lyrics) {
    return [{
      title: data.title,
      lyrics: data.lyrics,
      key: data.key || undefined,
      tags: data.tags || undefined,
    }];
  }

  throw new Error('Could not parse JSON: expected an array of songs or { songs: [...] }');
}

function parseTXT(text: string, filename: string): ParsedSong[] {
  const title = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  return [{ title, lyrics: text.trim() }];
}

/**
 * Normalizes lyrics where each verse line is a separate paragraph (PHB DOCX format).
 * Groups consecutive non-empty paragraphs into stanzas separated by \n\n.
 * Also adds "Stanza N" labels when stanzas are detected.
 */
function normalizeStanzas(raw: string): string {
  const paragraphs = raw.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  if (paragraphs.length < 3) return raw;

  // Heuristic: if most paragraphs are short (≤120 chars) and there are many,
  // this is likely the single-line-per-paragraph format that needs grouping
  let shortCount = 0;
  for (const p of paragraphs) {
    if (p.length <= 120) shortCount++;
  }
  const isLinePerParagraph = shortCount > paragraphs.length * 0.7 && paragraphs.length > 6;

  if (!isLinePerParagraph) return raw;

  // Group into stanzas: consecutive lines form a stanza, empty line = stanza break
  // But since mammoth already removed empty lines, we group by detecting
  // that the original had blank paragraphs between stanzas.
  // Strategy: find gaps (places where 2+ \n\n appeared) by looking at
  // the original text's line spacing.
  const originalLines = raw.split('\n');
  const stanzas: string[] = [];
  let current: string[] = [];
  let emptyCount = 0;

  for (const line of originalLines) {
    if (line.trim().length === 0) {
      emptyCount++;
      if (emptyCount >= 2 && current.length > 0) {
        stanzas.push(current.join('\n'));
        current = [];
      }
    } else {
      emptyCount = 0;
      current.push(line.trim());
    }
  }
  if (current.length > 0) stanzas.push(current.join('\n'));

  // If grouping found only 1 stanza, try a different approach:
  // alternate lines — detect if lines naturally pair
  if (stanzas.length <= 1 && paragraphs.length > 4) {
    // Re-group: every paragraph is a line, group into stanzas of ~4 lines
    const grouped: string[] = [];
    for (let i = 0; i < paragraphs.length; i += 4) {
      // Skip the first paragraph if it looks like a title (PH 001)
      if (i === 0 && /^[A-Z]{2,3}\s+\d+$/i.test(paragraphs[0])) {
        continue;
      }
      const slice = paragraphs.slice(i, i + 4).join('\n');
      if (slice.trim()) grouped.push(slice);
    }
    if (grouped.length > 1) {
      return grouped.map((s, i) => `Stanza ${i + 1}\n${s}`).join('\n\n');
    }
  }

  // Add stanza labels if we have 2+ stanzas
  if (stanzas.length >= 2) {
    return stanzas.map((s, i) => `Stanza ${i + 1}\n${s}`).join('\n\n');
  }

  return raw;
}

async function parseDOCX(file: File): Promise<ParsedSong[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.trim();
  if (!text) throw new Error('No text found in DOCX file');

  const normalized = normalizeStanzas(text);

  let title = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // If the file has multiple hymns (separated by blank lines with titles),
  // split into multiple songs
  if (normalized !== text) {
    return [{ title, lyrics: normalized }];
  }

  // Try splitting by hymn titles like "PH 001", "PH 002" etc.
  // Hymns are separated by 4+ newlines (2+ blank lines) in the PHB format
  const hymnBlocks = text.split(/\n{4,}/).filter(b => b.trim());
  const hymnPattern = /^(PH\s*\d+|Hymn\s*\d+)/im;
  const hymns: { title: string; lyrics: string }[] = [];

  let currentTitle = title;
  let currentLyrics: string[] = [];

  for (const block of hymnBlocks) {
    const match = block.trim().match(hymnPattern);
    if (match) {
      if (currentLyrics.length > 0) {
        hymns.push({ title: currentTitle, lyrics: currentLyrics.join('\n\n') });
      }
      currentTitle = match[1].trim();
      // The title line is not part of the lyrics
      const rest = block.replace(match[0], '').trim();
      currentLyrics = rest ? [rest] : [];
    } else {
      currentLyrics.push(block.trim());
    }
  }
  if (currentLyrics.length > 0) {
    hymns.push({ title: currentTitle, lyrics: currentLyrics.join('\n\n') });
  }

  if (hymns.length > 1) {
    return hymns.map(h => {
      const normalized = normalizeStanzas(h.lyrics);
      return { title: h.title, lyrics: normalized || h.lyrics };
    });
  }

  return [{ title, lyrics: normalized }];
}

export async function parseSongFile(file: File): Promise<ParsedSong[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'csv': {
      const text = await file.text();
      return parseCSV(text);
    }
    case 'json': {
      const text = await file.text();
      return parseJSON(text);
    }
    case 'docx': {
      return parseDOCX(file);
    }
    case 'txt':
    case 'song':
    case 'chord':
    case 'lyrics': {
      const text = await file.text();
      return parseTXT(text, file.name);
    }
    default:
      throw new Error(`Unsupported file format: .${ext}. Supported: .csv, .json, .docx, .txt, .song, .chord, .lyrics`);
  }
}
