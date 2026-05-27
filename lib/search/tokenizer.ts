const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "was",
  "with",
]);

export function cleanText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string) {
  return cleanText(text)
    .split(" ")
    .filter((term) => term.length > 1 && !STOPWORDS.has(term));
}

export function termFrequencies(text: string) {
  const frequencies = new Map<string, number>();

  for (const term of tokenize(text)) {
    frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }

  return frequencies;
}

export function splitIntoChunks(text: string, targetWords = 115) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let count = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    if (count && count + words.length > targetWords) {
      chunks.push(current.join("\n\n"));
      current = [];
      count = 0;
    }

    if (words.length > targetWords * 1.5) {
      for (let index = 0; index < words.length; index += targetWords) {
        const part = words.slice(index, index + targetWords).join(" ");
        if (current.length) {
          chunks.push(current.join("\n\n"));
          current = [];
          count = 0;
        }
        chunks.push(part);
      }
    } else {
      current.push(paragraph);
      count += words.length;
    }
  }

  if (current.length) {
    chunks.push(current.join("\n\n"));
  }

  return chunks.length ? chunks : [text.trim()].filter(Boolean);
}

export function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function highlightedSnippet(text: string, queryTerms: string[], length = 270) {
  const lowered = text.toLowerCase();
  const firstMatch = queryTerms
    .map((term) => lowered.indexOf(term.toLowerCase()))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, firstMatch - 70);
  const rawSnippet = text.slice(start, start + length);
  let escaped = escapeHtml(rawSnippet);

  for (const term of [...new Set(queryTerms)].sort((a, b) => b.length - a.length)) {
    if (!term) continue;
    escaped = escaped.replace(
      new RegExp(`\\b(${escapeRegExp(escapeHtml(term))})\\b`, "gi"),
      "<mark>$1</mark>",
    );
  }

  return `${start > 0 ? "..." : ""}${escaped}${start + length < text.length ? "..." : ""}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

