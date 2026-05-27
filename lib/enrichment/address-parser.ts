export type ParsedAddress = {
  rawAddress: string;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export function parseAddress(rawAddress: string): ParsedAddress {
  const trimmed = rawAddress.replace(/\s+/g, " ").trim();
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const stateZip = (parts[2] ?? parts[1] ?? "").match(/\b([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\b/);

  return {
    rawAddress: trimmed,
    street: parts[0] ?? null,
    city: parts.length >= 3 ? parts[1] : null,
    state: stateZip?.[1]?.toUpperCase() ?? null,
    zip: stateZip?.[2] ?? trimmed.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ?? null,
  };
}

export function buildAddressQuery(address: ParsedAddress) {
  return [
    address.rawAddress,
    address.street,
    address.city,
    address.state,
    address.zip,
    "community subdivision neighborhood builder homes",
  ]
    .filter(Boolean)
    .join(" ");
}

