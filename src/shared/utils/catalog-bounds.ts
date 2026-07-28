/**
 * Unified catalog bounds parser for price and area range filter labels.
 * Ensures AllListingsPage, SearchResultsPage, and HomePage share exact numeric filter boundaries.
 */

export interface PriceBounds {
  priceMin?: number;
  priceMax?: number;
}

export interface AreaBounds {
  areaMin?: number;
  areaMax?: number;
}

/**
 * Parse price range string label into min/max numbers (VND).
 * e.g. "Dưới 2 triệu" -> { priceMax: 2_000_000 }
 *      "2 – 4 triệu" -> { priceMin: 2_000_000, priceMax: 4_000_000 }
 *      "4 – 6 triệu" -> { priceMin: 4_000_000, priceMax: 6_000_000 }
 *      "Trên 6 triệu" -> { priceMin: 6_000_000 }
 */
export function parsePriceRangeLabel(label: string | undefined): PriceBounds {
  if (!label) return {};
  const normalized = label.replace(/–|-/g, "-").trim();

  if (normalized.includes("Dưới 2")) {
    return { priceMax: 2_000_000 };
  }
  if (normalized.includes("2 - 4")) {
    return { priceMin: 2_000_000, priceMax: 4_000_000 };
  }
  if (normalized.includes("4 - 6")) {
    return { priceMin: 4_000_000, priceMax: 6_000_000 };
  }
  if (normalized.includes("4 - 7")) {
    return { priceMin: 4_000_000, priceMax: 7_000_000 };
  }
  if (normalized.includes("7 - 10")) {
    return { priceMin: 7_000_000, priceMax: 10_000_000 };
  }
  if (normalized.includes("Trên 6")) {
    return { priceMin: 6_000_000 };
  }
  if (normalized.includes("Trên 10")) {
    return { priceMin: 10_000_000 };
  }
  return {};
}

/**
 * Parse area range string label into min/max numbers (m²).
 * e.g. "Dưới 20 m²" -> { areaMax: 20 }
 *      "20 – 30 m²" -> { areaMin: 20, areaMax: 30 }
 *      "30 – 45 m²" -> { areaMin: 30, areaMax: 45 }
 *      "Trên 45 m²" -> { areaMin: 45 }
 */
export function parseAreaRangeLabel(label: string | undefined): AreaBounds {
  if (!label) return {};
  const normalized = label.replace(/–|-/g, "-").trim();

  if (normalized.includes("Dưới 20")) {
    return { areaMax: 20 };
  }
  if (normalized.includes("20 - 30")) {
    return { areaMin: 20, areaMax: 30 };
  }
  if (normalized.includes("30 - 45")) {
    return { areaMin: 30, areaMax: 45 };
  }
  if (normalized.includes("30 - 50")) {
    return { areaMin: 30, areaMax: 50 };
  }
  if (normalized.includes("Trên 45")) {
    return { areaMin: 45 };
  }
  if (normalized.includes("Trên 50")) {
    return { areaMin: 50 };
  }
  return {};
}
