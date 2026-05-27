import type { SourceLayer, SourceTrust, SourceType } from "@prisma/client";
import type { MappedCsvRow } from "./csv-import";

export type BatchDocumentInput = {
  title: string;
  sourceType: SourceType;
  sourceLayer: SourceLayer;
  sourceTrust: SourceTrust;
  sourceName: string;
  externalId: string | null;
  effectiveDate: Date | null;
  isOverrideSource: boolean;
  sourceUrl: string | null;
  rawText: string;
};

export type BatchDefaults = {
  sourceLayer: SourceLayer;
  sourceTrust: SourceTrust;
  sourceName: string;
};

const SOURCE_TYPES: SourceType[] = [
  "PASTED_TEXT",
  "PUBLIC_RECORD",
  "BUILDER_BROCHURE",
  "LISTING_EXPORT",
  "HOA_NOTICE",
  "OTHER",
];
const SOURCE_LAYERS: SourceLayer[] = ["BASELINE", "INTERNAL", "REVIEWED"];
const SOURCE_TRUST_LEVELS: SourceTrust[] = ["LOW", "MEDIUM", "HIGH", "VERIFIED"];

export function buildBatchDocument(row: MappedCsvRow, rowNumber: number, defaults: BatchDefaults): BatchDocumentInput {
  const address = row.address || [row.street, row.city, row.state, row.zip].filter(Boolean).join(", ");
  const hasVerifiedValue = Boolean(row.verified_community?.trim() || row.verified_builder?.trim());
  const lines = [
    labeled("Address", address),
    labeled("Street", row.street),
    labeled("City", row.city),
    labeled("State", row.state),
    labeled("ZIP", row.zip),
    labeled("Community", row.community),
    labeled("Subdivision", row.subdivision),
    labeled("Builder", row.builder),
    labeled("Baseline Community", row.baseline_community),
    labeled("Baseline Builder", row.baseline_builder),
    labeled("Verified Community", row.verified_community),
    labeled("Verified Builder", row.verified_builder),
    labeled("Description", row.description),
    labeled("Notes", row.notes),
    labeled("Listing Text", row.listing_text),
  ].filter((line): line is string => Boolean(line));

  if (!lines.length) {
    throw new Error("No searchable evidence fields were mapped for this row.");
  }
  const sourceUrl = row.source_url?.trim() || null;
  if (sourceUrl && !isHttpUrl(sourceUrl)) {
    throw new Error("Source URL must use http or https.");
  }

  const subject = address || row.community || row.subdivision || row.builder || `Row ${rowNumber}`;
  const sourceLayer = row.source_layer?.trim()
    ? parseSourceLayer(row.source_layer, defaults.sourceLayer)
    : hasVerifiedValue ? "REVIEWED" : defaults.sourceLayer;
  const sourceTrust = row.source_trust?.trim()
    ? parseSourceTrust(row.source_trust, defaults.sourceTrust)
    : hasVerifiedValue ? "VERIFIED" : defaults.sourceTrust;
  return {
    title: `CSV Evidence - ${subject}`.slice(0, 160),
    sourceType: parseSourceType(row.source_type),
    sourceLayer,
    sourceTrust,
    sourceName: row.source_name?.trim() || defaults.sourceName,
    externalId: row.external_id?.trim() || null,
    effectiveDate: parseDate(row.effective_date),
    isOverrideSource: hasVerifiedValue || sourceLayer !== "BASELINE",
    sourceUrl,
    rawText: lines.join("\n\n"),
  };
}

function parseSourceLayer(value: string, fallback: SourceLayer): SourceLayer {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return SOURCE_LAYERS.includes(normalized as SourceLayer) ? normalized as SourceLayer : fallback;
}

function parseSourceTrust(value: string, fallback: SourceTrust): SourceTrust {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return SOURCE_TRUST_LEVELS.includes(normalized as SourceTrust) ? normalized as SourceTrust : fallback;
}

function parseDate(value?: string) {
  if (!value?.trim()) return null;
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) throw new Error("Effective date must be a valid date.");
  return date;
}

function labeled(label: string, value?: string) {
  return value?.trim() ? `${label}: ${value.trim()}` : null;
}

function parseSourceType(value?: string): SourceType {
  const normalized = value?.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_") ?? "";
  const aliases: Record<string, SourceType> = {
    LISTING: "LISTING_EXPORT",
    LISTING_TEXT: "LISTING_EXPORT",
    BUILDER_PAGE: "BUILDER_BROCHURE",
    COMMUNITY_PAGE: "OTHER",
    SALES_NOTES: "PASTED_TEXT",
  };
  const mapped = aliases[normalized] ?? normalized;
  return SOURCE_TYPES.includes(mapped as SourceType) ? mapped as SourceType : "LISTING_EXPORT";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
