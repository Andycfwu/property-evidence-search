import * as cheerio from "cheerio";

export type ExtractedHtmlDocument = {
  title: string;
  text: string;
};

const REMOVED_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "footer",
  "header",
  "svg",
  "form",
  "iframe",
].join(",");

const READABLE_BLOCKS = "h1, h2, h3, h4, p, li, address, blockquote, td";

export function extractReadableHtml(html: string, sourceUrl: string): ExtractedHtmlDocument {
  const $ = cheerio.load(html);
  $(REMOVED_SELECTORS).remove();

  const title =
    normalizeInline($("title").first().text()) ||
    normalizeInline($("h1").first().text()) ||
    new URL(sourceUrl).hostname;
  const content = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body").first();
  const blocks: string[] = [];

  content.find(READABLE_BLOCKS).each((_index, element) => {
    const text = normalizeInline($(element).text());
    if (text && text !== blocks[blocks.length - 1]) {
      blocks.push(text);
    }
  });

  const text = blocks.length
    ? blocks.join("\n\n")
    : normalizeInline(content.text());

  return { title, text };
}

function normalizeInline(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

