export const CSV_IMPORT_FIELDS = [
  { key: "address", label: "Address", aliases: ["property_address", "full_address"] },
  { key: "street", label: "Street", aliases: ["street_address", "address_1"] },
  { key: "city", label: "City", aliases: [] },
  { key: "state", label: "State", aliases: ["province"] },
  { key: "zip", label: "ZIP", aliases: ["zipcode", "postal_code"] },
  { key: "community", label: "Community", aliases: ["community_name"] },
  { key: "subdivision", label: "Subdivision", aliases: ["subdivision_name", "neighborhood"] },
  { key: "builder", label: "Builder", aliases: ["builder_name"] },
  { key: "source_url", label: "Source URL", aliases: ["url", "listing_url"] },
  { key: "source_type", label: "Source Type", aliases: ["type"] },
  { key: "source_layer", label: "Source Layer", aliases: ["layer"] },
  { key: "source_trust", label: "Source Trust", aliases: ["trust"] },
  { key: "source_name", label: "Source Name", aliases: ["origin", "vendor_name"] },
  { key: "effective_date", label: "Effective Date", aliases: ["as_of_date"] },
  { key: "external_id", label: "External ID", aliases: ["source_id", "listing_id"] },
  { key: "verified_community", label: "Verified Community", aliases: ["approved_community"] },
  { key: "verified_builder", label: "Verified Builder", aliases: ["approved_builder"] },
  { key: "baseline_community", label: "Baseline Community", aliases: [] },
  { key: "baseline_builder", label: "Baseline Builder", aliases: [] },
  { key: "description", label: "Description", aliases: ["remarks"] },
  { key: "notes", label: "Notes", aliases: ["research_notes"] },
  { key: "listing_text", label: "Listing Text", aliases: ["text", "raw_text", "public_remarks"] },
] as const;

export type CsvImportField = typeof CSV_IMPORT_FIELDS[number]["key"];
export type CsvMapping = Record<CsvImportField, number | null>;
export type MappedCsvRow = Partial<Record<CsvImportField, string>>;

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export function parseCsv(value: string): ParsedCsv {
  const input = value.replace(/^\uFEFF/, "");
  const parsedRows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (character === "\n") {
      row.push(cell.trim());
      parsedRows.push(row);
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unclosed quoted value.");
  }
  if (cell || row.length) {
    row.push(cell.trim());
    parsedRows.push(row);
  }

  const nonBlankRows = parsedRows.filter((cells) => cells.some(Boolean));
  if (nonBlankRows.length < 2) {
    throw new Error("Upload a CSV with a header row and at least one data row.");
  }
  const headers = nonBlankRows[0].map((header, index) => header || `Column ${index + 1}`);
  return { headers, rows: nonBlankRows.slice(1) };
}

export function suggestedMapping(headers: string[]): CsvMapping {
  return Object.fromEntries(CSV_IMPORT_FIELDS.map((field) => {
    const accepted: readonly string[] = [field.key, ...field.aliases];
    const index = headers.findIndex((header) => accepted.includes(normalizeColumn(header)));
    return [field.key, index >= 0 ? index : null];
  })) as CsvMapping;
}

export function mapCsvRows(rows: string[][], mapping: CsvMapping): MappedCsvRow[] {
  return rows.map((row) => Object.fromEntries(
    CSV_IMPORT_FIELDS.map(({ key }) => [key, mapping[key] === null ? "" : (row[mapping[key]] ?? "").trim()]),
  ));
}

function normalizeColumn(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}
