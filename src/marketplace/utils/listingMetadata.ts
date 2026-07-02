export interface CurfewInfo {
  type: "free" | "curfew";
  time?: string;
}

export interface NearbyPlace {
  name: string;
  dist: string;
}

export interface NearbyCategory {
  key: string;
  label: string;
  places: NearbyPlace[];
}

export interface ListingCosts {
  electric?: string;
  water?: string;
  waterUnit?: "person" | "cubic"; // calculation type: 'đ/người' or 'đ/m³'
  service?: string;
  deposit?: string;
  other?: string;
}

export interface ListingCoords {
  lat: number;
  lng: number;
  address?: string;
}

export interface ListingMetadata {
  curfew?: CurfewInfo;
  costs?: ListingCosts;
  nearby?: NearbyCategory[];
  coords?: ListingCoords;
}

const METADATA_MARKER = "\n\n---METADATA---\n";
const CURFEW_MARKER = "\n\n---CURFEW_INFO---\n";

/**
 * Format string/number to VND thousand separator (e.g. 5000000 -> 5.000.000)
 */
export function formatVND(val: string | number): string {
  if (val === undefined || val === null || val === "") return "";
  const numStr = String(val).replace(/\D/g, "");
  if (!numStr) return "";
  return Number(numStr).toLocaleString("vi-VN");
}

/**
 * Strips non-digit characters from formatted string
 */
export function cleanVND(val: string): string {
  return val.replace(/\D/g, "");
}

/**
 * Parse metadata from a description string
 */
export function parseMetadataFromDescription(description: string): {
  cleanDescription: string;
  metadata: ListingMetadata;
} {
  const defaultMetadata: ListingMetadata = {
    curfew: { type: "free", time: "" },
    costs: { electric: "", water: "", waterUnit: "person", service: "", deposit: "", other: "" },
    nearby: [],
    coords: { lat: 10.7712, lng: 106.6823, address: "" }
  };

  if (!description) {
    return { cleanDescription: "", metadata: defaultMetadata };
  }

  // 1. Check for standard METADATA_MARKER
  const metadataIdx = description.indexOf(METADATA_MARKER);
  if (metadataIdx !== -1) {
    const cleanDescription = description.substring(0, metadataIdx);
    const metaStr = description.substring(metadataIdx + METADATA_MARKER.length);
    try {
      const parsed = JSON.parse(metaStr) as ListingMetadata;
      return {
        cleanDescription,
        metadata: {
          ...defaultMetadata,
          ...parsed,
          curfew: { ...defaultMetadata.curfew, ...parsed.curfew },
          costs: { ...defaultMetadata.costs, ...parsed.costs },
          coords: parsed.coords ? { ...defaultMetadata.coords, ...parsed.coords } : defaultMetadata.coords,
          nearby: parsed.nearby || [],
        }
      };
    } catch (e) {
      console.error("Failed to parse listing metadata", e);
    }
  }

  // 2. Check for legacy CURFEW_MARKER
  const curfewIdx = description.indexOf(CURFEW_MARKER);
  if (curfewIdx !== -1) {
    const cleanDescription = description.substring(0, curfewIdx);
    const curfewStr = description.substring(curfewIdx + CURFEW_MARKER.length);
    try {
      const curfewInfo = JSON.parse(curfewStr) as CurfewInfo;
      return {
        cleanDescription,
        metadata: {
          ...defaultMetadata,
          curfew: curfewInfo
        }
      };
    } catch (e) {
      console.error("Failed to parse legacy curfew info", e);
    }
  }

  // No markers found
  return { cleanDescription: description, metadata: defaultMetadata };
}

/**
 * Serialize metadata and append it to description text
 */
export function appendMetadataToDescription(description: string, metadata: ListingMetadata): string {
  const { cleanDescription } = parseMetadataFromDescription(description);
  return `${cleanDescription}${METADATA_MARKER}${JSON.stringify(metadata)}`;
}
