/**
 * Danh mục phí dịch vụ của khu trọ (T40).
 *
 * Bảng `property_services` + `room_services` thuộc workspace. Mọi GHI đi qua RPC
 * (`upsert_property_service`, `delete_property_service`, `set_room_services`) —
 * server derive `owner_id` và kiểm quyền sở hữu; client không ghi thẳng bảng.
 *
 * `fee_category` là BẢN CHẤT khoản tiền:
 *   - `Service`     — phí dịch vụ, là doanh thu của chủ trọ (wifi chủ lắp, phí quản lý…)
 *   - `PassThrough` — thu hộ bên thứ 3, không phải doanh thu (rác, giữ xe bãi ngoài…)
 */
import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export type FeeCategory = "Service" | "PassThrough";
export type QuantityBasis = "Meter" | "PerOccupant" | "Fixed";
export type MeterType = "Electricity" | "Water";

export interface PropertyService {
  id: string;
  propertyId: string;
  name: string;
  unit: string;
  feeCategory: FeeCategory;
  quantityBasis: QuantityBasis;
  meterType: MeterType | null;
  unitPrice: number;
  applyToNewRooms: boolean;
  sortOrder: number;
  /** Phòng đang áp dịch vụ này (kèm giá riêng nếu có). */
  rooms: { roomId: string; unitPriceOverride: number | null }[];
}

export interface PropertyServiceInput {
  /** `null` = tạo mới. */
  id: string | null;
  propertyId: string;
  name: string;
  unit: string;
  feeCategory: FeeCategory;
  quantityBasis: QuantityBasis;
  meterType: MeterType | null;
  unitPrice: number;
  applyToNewRooms: boolean;
  /** Bộ phòng áp dụng. `null` khi sửa = giữ nguyên; khi tạo = mọi phòng. */
  roomIds: string[] | null;
}

export interface RoomServiceSetting {
  serviceId: string;
  applied: boolean;
  /** `null` = theo giá của khu. */
  unitPriceOverride: number | null;
}

const toNumberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export async function getPropertyServices(propertyId: string): Promise<PropertyService[]> {
  const { data, error } = await supabase
    .from("property_services")
    .select("id, property_id, name, unit, fee_category, quantity_basis, meter_type, unit_price, apply_to_new_rooms, sort_order, room_services(room_id, unit_price_override)")
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    logError("property-services-service.getPropertyServices", error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    name: row.name,
    unit: row.unit,
    feeCategory: row.fee_category as FeeCategory,
    quantityBasis: row.quantity_basis as QuantityBasis,
    meterType: (row.meter_type as MeterType | null) ?? null,
    unitPrice: Number(row.unit_price),
    applyToNewRooms: row.apply_to_new_rooms,
    sortOrder: row.sort_order,
    rooms: (row.room_services ?? []).map((rs) => ({
      roomId: rs.room_id,
      unitPriceOverride: toNumberOrNull(rs.unit_price_override),
    })),
  }));
}

export async function upsertPropertyService(input: PropertyServiceInput): Promise<string> {
  const { data, error } = await supabase.rpc("upsert_property_service", {
    // RPC nhận uuid null khi tạo mới; type sinh ra không biểu diễn được null.
    p_id: input.id as string,
    p_property_id: input.propertyId,
    p_name: input.name,
    p_unit: input.unit,
    p_fee_category: input.feeCategory,
    p_quantity_basis: input.quantityBasis,
    p_meter_type: (input.quantityBasis === "Meter" ? input.meterType : null) as string,
    p_unit_price: input.unitPrice,
    p_apply_to_new_rooms: input.applyToNewRooms,
    p_room_ids: input.roomIds as string[],
  });
  if (error) {
    logError("property-services-service.upsertPropertyService", error);
    throw error;
  }
  return data as string;
}

export async function deletePropertyService(serviceId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_property_service", { p_id: serviceId });
  if (error) {
    logError("property-services-service.deletePropertyService", error);
    throw error;
  }
}

/** Dịch vụ áp cho MỘT phòng + giá riêng — dùng ở "Sửa phòng". */
export async function setRoomServices(roomId: string, settings: RoomServiceSetting[]): Promise<void> {
  const { error } = await supabase.rpc("set_room_services", {
    p_room_id: roomId,
    p_items: settings.map((s) => ({
      service_id: s.serviceId,
      applied: s.applied,
      unit_price_override: s.unitPriceOverride,
    })),
  });
  if (error) {
    logError("property-services-service.setRoomServices", error);
    throw error;
  }
}
