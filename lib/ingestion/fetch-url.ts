import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;

export type FetchedHtmlPage = {
  html: string;
  finalUrl: string;
};

export class UrlIngestionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 422,
  ) {
    super(message);
    this.name = "UrlIngestionError";
  }
}

export async function fetchPublicHtml(inputUrl: string): Promise<FetchedHtmlPage> {
  let url = parseHttpUrl(inputUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    await assertPublicHost(url);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "PropertyEvidenceSearch/0.1 (public evidence ingestion)",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new UrlIngestionError("FETCH_TIMEOUT", "The page request timed out after 10 seconds.");
      }
      throw new UrlIngestionError(
        "FETCH_UNREACHABLE",
        "The page could not be reached. Confirm that the URL is public and try again.",
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new UrlIngestionError("REDIRECT_FAILED", "The page redirected without a usable destination.");
      }
      if (redirectCount === MAX_REDIRECTS) {
        throw new UrlIngestionError("TOO_MANY_REDIRECTS", "The page redirected too many times.");
      }
      url = parseHttpUrl(new URL(location, url).toString());
      continue;
    }

    if ([401, 402, 403, 407, 429].includes(response.status)) {
      throw new UrlIngestionError(
        "ACCESS_BLOCKED",
        `The site blocked access or requires login (HTTP ${response.status}). Paste source text instead.`,
      );
    }
    if (!response.ok) {
      throw new UrlIngestionError(
        "FETCH_FAILED",
        `The page returned HTTP ${response.status} and could not be ingested.`,
      );
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new UrlIngestionError(
        "UNSUPPORTED_CONTENT_TYPE",
        `Unsupported content type "${contentType || "unknown"}". Only HTML pages can be ingested.`,
        415,
      );
    }

    return { html: await readLimitedBody(response), finalUrl: url.toString() };
  }

  throw new UrlIngestionError("FETCH_FAILED", "The page could not be fetched.");
}

function parseHttpUrl(inputUrl: string) {
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    throw new UrlIngestionError("INVALID_URL", "Enter a valid public http or https URL.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlIngestionError("INVALID_URL", "Only http and https URLs can be fetched.", 400);
  }
  if (url.username || url.password) {
    throw new UrlIngestionError("INVALID_URL", "URLs containing embedded credentials cannot be fetched.", 400);
  }

  return url;
}

async function assertPublicHost(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0"
  ) {
    throw new UrlIngestionError("PRIVATE_URL", "Only publicly accessible page URLs can be fetched.", 400);
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true });
  } catch {
    throw new UrlIngestionError(
      "FETCH_UNREACHABLE",
      "The URL host could not be resolved. Confirm that the page is publicly accessible.",
    );
  }

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UrlIngestionError("PRIVATE_URL", "Only publicly accessible page URLs can be fetched.", 400);
  }
}

function isPrivateAddress(address: string) {
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:")) {
      return isPrivateAddress(lower.slice(7));
    }
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      /^fe[89ab]/.test(lower) ||
      lower.startsWith("ff")
    );
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4) return true;
  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

async function readLimitedBody(response: Response) {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_RESPONSE_BYTES) {
    throw new UrlIngestionError("RESPONSE_TOO_LARGE", "The HTML page exceeds the 2 MB ingestion limit.", 413);
  }
  if (!response.body) {
    throw new UrlIngestionError("EMPTY_RESPONSE", "The page returned no HTML content.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new UrlIngestionError("RESPONSE_TOO_LARGE", "The HTML page exceeds the 2 MB ingestion limit.", 413);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}
