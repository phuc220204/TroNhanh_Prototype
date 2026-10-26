interface IllustrativeListing {
  title?: string | null;
  description?: string | null;
  metadata?: unknown;
}

const demoSeedSet = "exe201-rental-demo-v1";
const demoDisclaimer = "Tin minh họa cho buổi báo cáo môn học EXE201, không phải phòng cho thuê thật.";
const photoDisclaimer = "Ảnh phòng chỉ dùng để minh họa giao diện; địa điểm, giá và tiện ích là kịch bản demo. Không đặt cọc hoặc chuyển tiền theo tin này.";

export function isIllustrativeListing(listing: IllustrativeListing): boolean {
  const metadata = listing.metadata;
  return typeof metadata === "object" && metadata !== null && "demoSeedSet" in metadata
    && metadata.demoSeedSet === demoSeedSet;
}

export function listingDisplayTitle(listing: IllustrativeListing): string {
  const title = listing.title ?? "";
  return isIllustrativeListing(listing) ? title.replace(/^\[DEMO\]\s+/, "") : title;
}

export function listingDisplayDescription(listing: IllustrativeListing): string {
  const description = listing.description ?? "";
  if (!isIllustrativeListing(listing)) return description;
  // Keep source markers intact for seed/remove; the visible badge replaces the two long demo paragraphs.
  return description.replace(demoDisclaimer, "").replace(photoDisclaimer, "")
    .replace("Giá mẫu tính theo", "Giá tính theo").replace("Mẫu căn hộ nhỏ", "Căn hộ nhỏ").trim();
}
