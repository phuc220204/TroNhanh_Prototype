/**
 * QUERY KEY FACTORY — nguồn chân lý duy nhất cho mọi React Query key.
 *
 * LUẬT: KHÔNG task nào được tự viết key string. Nếu thiếu key, thêm vào đây.
 * Lý do: `invalidateQueries` chỉ hoạt động khi key khớp chính xác. Hai file
 * cùng fetch một thứ với 2 key khác nhau = cache không bao giờ invalidate,
 * và bug đó im lặng.
 *
 * Quy ước: mảng, phần tử đầu là domain, tăng dần độ cụ thể.
 * `all` luôn là prefix của các key con ⇒ invalidate `all` là invalidate hết.
 */

export type ListingFilters = {
  keyword?: string;
  districts?: string[];
  priceMin?: number;
  priceMax?: number;
  propertyTypes?: string[];
  areaMin?: number;
  areaMax?: number;
  amenities?: string[];
  sort?: "newest" | "priceAsc" | "priceDesc" | "areaDesc";
  page?: number;
  pageSize?: number;
};

export type DemandFilters = {
  kind?: "RoomWanted" | "RoommateWanted";
  districts?: string[];
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
};

export const qk = {
  // ── Marketplace ───────────────────────────────────────────────────────────
  listings: {
    all: ["listings"] as const,
    search: (f: ListingFilters) => ["listings", "search", f] as const,
    featured: (limit: number) => ["listings", "featured", limit] as const,
    detail: (id: string) => ["listings", "detail", id] as const,
    mine: (sellerId: string | undefined) => ["listings", "mine", sellerId] as const,
    media: (listingId: string) => ["listings", "media", listingId] as const,
  },

  demandPosts: {
    all: ["demandPosts"] as const,
    search: (f: DemandFilters) => ["demandPosts", "search", f] as const,
    detail: (id: string) => ["demandPosts", "detail", id] as const,
    mine: (renterId: string | undefined) => ["demandPosts", "mine", renterId] as const,
    /** Xếp hạng theo độ khớp với phòng trống của Seller (/chu-tro/tim-nguoi-thue) */
    matches: (sellerId: string | undefined) => ["demandPosts", "matches", sellerId] as const,
  },

  reviews: {
    all: ["reviews"] as const,
    byProperty: (propertyId: string) => ["reviews", "property", propertyId] as const,
    mine: (userId: string | undefined) => ["reviews", "mine", userId] as const,
    /** Các đợt ở đủ điều kiện đánh giá (BR-022) */
    reviewableStays: (userId: string | undefined) => ["reviews", "reviewable", userId] as const,
    publicProfile: (slug: string) => ["reviews", "publicProfile", slug] as const,
  },

  // ── Workspace ─────────────────────────────────────────────────────────────
  properties: {
    all: ["properties"] as const,
    mine: (ownerId: string | undefined) => ["properties", "mine", ownerId] as const,
    detail: (id: string) => ["properties", "detail", id] as const,
  },

  rooms: {
    all: ["rooms"] as const,
    byProperty: (propertyId: string) => ["rooms", "property", propertyId] as const,
    detail: (id: string) => ["rooms", "detail", id] as const,
    vacant: (ownerId: string | undefined) => ["rooms", "vacant", ownerId] as const,
  },

  occupancies: {
    all: ["occupancies"] as const,
    byRoom: (roomId: string) => ["occupancies", "room", roomId] as const,
    /** Occupancy của chính Renter — dùng ở /tai-khoan/phong-cua-toi */
    mine: (userId: string | undefined) => ["occupancies", "mine", userId] as const,
  },

  contracts: {
    all: ["contracts"] as const,
    byRoom: (roomId: string) => ["contracts", "room", roomId] as const,
    detail: (id: string) => ["contracts", "detail", id] as const,
  },

  billing: {
    all: ["billing"] as const,
    latestReading: (roomId: string, type: "Electricity" | "Water") =>
      ["billing", "latestReading", roomId, type] as const,
    invoices: (ownerId: string | undefined, period?: string) =>
      ["billing", "invoices", ownerId, period ?? "all"] as const,
    invoiceDetail: (id: string) => ["billing", "invoice", id] as const,
  },

  dashboard: {
    summary: (ownerId: string | undefined) => ["dashboard", "summary", ownerId] as const,
  },

  // ── Shared kernel ─────────────────────────────────────────────────────────
  conversations: {
    all: ["conversations"] as const,
    list: (userId: string | undefined) => ["conversations", "list", userId] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
    messages: (conversationId: string) => ["conversations", "messages", conversationId] as const,
    unreadCount: (userId: string | undefined) => ["conversations", "unread", userId] as const,
  },

  subscription: (userId: string | undefined) => ["subscription", userId] as const,

  profile: (userId: string | undefined) => ["profile", userId] as const,
  roles: (userId: string | undefined) => ["roles", userId] as const,

  platformSettings: ["platformSettings"] as const,

  // ── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    moderationQueue: (status: string) => ["admin", "moderationQueue", status] as const,
    reportedReviews: ["admin", "reportedReviews"] as const,
    users: (search: string) => ["admin", "users", search] as const,
    settings: ["admin", "settings"] as const,
  },
} as const;
