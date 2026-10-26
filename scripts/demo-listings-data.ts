import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AMENITIES, PROPERTY_TYPES } from "../src/shared/constants/catalog.ts";
import { VN_WARDS } from "../src/shared/constants/vn-wards.generated.ts";
import type { Json } from "../src/shared/types/database.types.ts";

export const seedSet = "exe201-rental-demo-v1";
export const disclaimer = "Tin minh họa cho buổi báo cáo môn học EXE201, không phải phòng cho thuê thật.";
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export class DemoError extends Error {}

export interface DemoPhoto {
  file: string;
  sourceUrl: string;
  sha256: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface DemoListing {
  listingKey: string;
  landlordEmail: string;
  title: string;
  description: string;
  propertyType: string;
  price: number;
  area: number;
  provinceCode: number;
  wardCode: number;
  wardName: string;
  address: string;
  electricityPrice: number;
  waterPrice: number;
  waterUnit: "person" | "cubic";
  servicePrice: number;
  deposit: number;
  accessPolicy: "Free" | "Restricted";
  accessOpenTime: string | null;
  accessCloseTime: string | null;
  amenities: string[];
  sourcePageUrl: string;
  photos: DemoPhoto[];
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DemoError(message);
}

export function isDemoEmail(email: string): boolean {
  return /^[a-z0-9._+-]+@tronhanh\.demo$/.test(email);
}

export function validateDataset(input: unknown): DemoListing[] {
  requireValue(Array.isArray(input) && input.length === 10, "DATASET_REQUIRES_TEN_LISTINGS");
  const keys = new Set<string>();
  const titles = new Set<string>();
  const counts: Record<string, number> = {};
  for (const value of input) {
    requireValue(value && typeof value === "object", "INVALID_LISTING");
    const item = value as DemoListing;
    requireValue(typeof item.listingKey === "string" && /^[a-z0-9-]{3,60}$/.test(item.listingKey), "INVALID_LISTING_KEY");
    requireValue(!keys.has(item.listingKey), "DUPLICATE_LISTING_KEY");
    requireValue(typeof item.landlordEmail === "string" && isDemoEmail(item.landlordEmail), "NON_DEMO_OWNER");
    requireValue(typeof item.title === "string" && item.title.startsWith("[DEMO] ") && item.title.length <= 120 && item.title.length >= 10 && !titles.has(item.title), "INVALID_DEMO_TITLE");
    requireValue(typeof item.description === "string" && item.description.startsWith(disclaimer) && item.description.length > disclaimer.length, "MISSING_DISCLAIMER");
    requireValue(PROPERTY_TYPES.some(type => type === item.propertyType), "INVALID_PROPERTY_TYPE");
    requireValue(Number.isInteger(item.price) && item.price >= 1_800_000 && item.price <= 4_500_000, "INVALID_PRICE");
    requireValue(Number.isFinite(item.area) && item.area >= 15 && item.area <= 30, "INVALID_AREA");
    requireValue(item.provinceCode === 79 && VN_WARDS.some(ward => ward[0] === item.wardCode && ward[1] === item.wardName && ward[2] === 79), "INVALID_WARD");
    requireValue(item.address === `${item.wardName}, Thành phố Hồ Chí Minh`, "ADDRESS_MUST_STOP_AT_WARD");
    for (const cost of [item.electricityPrice, item.waterPrice, item.servicePrice, item.deposit]) {
      requireValue(Number.isInteger(cost) && cost >= 0, "INVALID_COST");
    }
    requireValue(["person", "cubic"].includes(item.waterUnit), "INVALID_WATER_UNIT");
    requireValue(["Free", "Restricted"].includes(item.accessPolicy), "INVALID_ACCESS_POLICY");
    const isTime = (time: unknown) => typeof time === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
    requireValue(item.accessPolicy === "Free"
      ? item.accessOpenTime === null && item.accessCloseTime === null
      : isTime(item.accessOpenTime) && isTime(item.accessCloseTime), "INVALID_ACCESS_TIMES");
    requireValue(Array.isArray(item.amenities) && new Set(item.amenities).size === item.amenities.length && item.amenities.every(amenity => AMENITIES.some(known => known === amenity)), "INVALID_AMENITIES");
    requireValue(typeof item.sourcePageUrl === "string" && /^https:\/\/(?:www\.)?(?:lozido\.com|nhatot\.com|chotot\.com)\//.test(item.sourcePageUrl), "INVALID_SOURCE_PAGE");
    requireValue(Array.isArray(item.photos) && item.photos.length >= 3 && item.photos.length <= 8, "REQUIRES_THREE_TO_EIGHT_PHOTOS");
    const hashes = new Set<string>();
    for (const photo of item.photos) {
      requireValue(photo && typeof photo.file === "string" && /^seed\/images\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/.test(photo.file), "INVALID_PHOTO_PATH");
      requireValue(typeof photo.sourceUrl === "string" && /^https:\/\/(?:cdn|media)\.lozido\.com\//.test(photo.sourceUrl), "INVALID_PHOTO_SOURCE");
      requireValue(typeof photo.sha256 === "string" && /^[a-f0-9]{64}$/.test(photo.sha256) && !hashes.has(photo.sha256), "INVALID_OR_DUPLICATE_PHOTO_HASH");
      requireValue(Number.isInteger(photo.width) && Number.isInteger(photo.height) && photo.width >= 200 && photo.height >= 200 && Math.max(photo.width, photo.height) <= 1600, "INVALID_PHOTO_DIMENSIONS");
      requireValue(Number.isInteger(photo.sizeBytes) && photo.sizeBytes > 0 && photo.sizeBytes <= 5_242_880, "INVALID_PHOTO_SIZE");
      hashes.add(photo.sha256);
    }
    counts[item.propertyType] = (counts[item.propertyType] ?? 0) + 1;
    keys.add(item.listingKey);
    titles.add(item.title);
  }
  requireValue(counts["Phòng trọ"] === 5 && counts["Căn hộ mini"] === 3 && counts["Ký túc xá"] === 2, "INVALID_TYPE_DISTRIBUTION");
  return input as DemoListing[];
}

export function webpDimensions(bytes: Buffer): [number, number] {
  requireValue(bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP", "INVALID_WEBP");
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    requireValue(start + size <= bytes.length, "TRUNCATED_WEBP");
    if (tag === "VP8X" && size >= 10) return [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1];
    if (tag === "VP8 " && size >= 10) return [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
    if (tag === "VP8L" && size >= 5) {
      const bits = bytes.readUInt32LE(start + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = start + size + (size % 2);
  }
  throw new DemoError("MISSING_WEBP_DIMENSIONS");
}

export async function readPhoto(photo: DemoPhoto): Promise<Buffer> {
  const path = resolve(repoRoot, photo.file);
  requireValue(path.startsWith(resolve(repoRoot, "seed/images") + sep), "PHOTO_OUTSIDE_FIXTURE");
  const bytes = await readFile(path);
  requireValue(bytes.length === photo.sizeBytes && createHash("sha256").update(bytes).digest("hex") === photo.sha256, "PHOTO_CHECKSUM_MISMATCH");
  const [width, height] = webpDimensions(bytes);
  requireValue(width === photo.width && height === photo.height, "PHOTO_DIMENSION_MISMATCH");
  return bytes;
}

export async function loadDataset(): Promise<DemoListing[]> {
  const items = validateDataset(JSON.parse(await readFile(resolve(repoRoot, "seed/demoListings.json"), "utf8")));
  for (const item of items) for (const photo of item.photos) await readPhoto(photo);
  return items;
}

export function photoPath(sellerId: string, listingId: string, photo: DemoPhoto): string {
  const hex = photo.sha256.slice(0, 32);
  const imageId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return `${sellerId}/${listingId}/${imageId}.webp`;
}

export function listingPayload(item: DemoListing, profile: { full_name: string | null; contact_phone: string | null }): Json {
  requireValue(profile.full_name?.trim() && profile.contact_phone?.trim(), "DEMO_PROFILE_CONTACT_MISSING");
  return {
    title: item.title, description: item.description, property_type: item.propertyType,
    price: item.price, area: item.area, address: item.address, district: item.wardName,
    province_code: item.provinceCode, ward_code: item.wardCode,
    contact_name: profile.full_name, contact_phone: profile.contact_phone,
    electricity_price: item.electricityPrice, water_price: item.waterPrice,
    water_unit: item.waterUnit, service_price: item.servicePrice, deposit: item.deposit,
    access_policy: item.accessPolicy, access_open_time: item.accessOpenTime,
    access_close_time: item.accessCloseTime, room_id: null, property_id: null,
    // The detail screen still reads curfew from metadata; match the real form as well as typed columns.
    metadata: {
      demoSeedSet: seedSet, listingKey: item.listingKey, sourcePageUrl: item.sourcePageUrl,
      curfew: { type: item.accessPolicy === "Restricted" ? "curfew" : "free", time: item.accessCloseTime ?? "" },
      costs: { electric: String(item.electricityPrice), water: String(item.waterPrice), waterUnit: item.waterUnit,
        service: String(item.servicePrice), deposit: String(item.deposit), other: "" },
      coords: null, nearby: [],
    },
  };
}
