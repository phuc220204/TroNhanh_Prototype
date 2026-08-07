import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface RoomItem {
  id: string;
  property_id: string;
  room_code?: string;
  room_number?: string;
  floor?: number;
  area: number;
  price: number;
  status: string;
  owner_id: string;
  created_at: string;
  properties?: {
    name: string;
  };
  contracts?: any[];
  invoices?: any[];
}

/**
 * Fetch all rooms owned by a landlord with joined property name, contracts, and invoices.
 */
export async function getRoomsByOwner(ownerId: string | undefined): Promise<RoomItem[]> {
  if (!ownerId) return [];
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        properties(name),
        contracts(
          id,
          start_date,
          end_date,
          rent_price,
          deposit,
          status,
          occupancies!occupancies_contract_id_fkey(
            id,
            full_name,
            phone_number,
            occupant_count
          )
        ),
        invoices(
          id,
          period,
          due_date,
          total_amount,
          status,
          invoice_items(
            id,
            type,
            description,
            quantity,
            unit_price,
            amount
          )
        )
      `)
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as RoomItem[];
  } catch (err) {
    logError("room-service.getRoomsByOwner", err);
    return [];
  }
}

/**
 * Fetch rooms belonging to a specific property.
 */
export async function getRoomsByProperty(propertyId: string): Promise<RoomItem[]> {
  if (!propertyId) return [];
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*, properties(name)")
      .eq("property_id", propertyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as RoomItem[];
  } catch (err) {
    logError("room-service.getRoomsByProperty", err);
    return [];
  }
}

/** BR-002 — đúng 4 trạng thái phòng. Không có "Repairing", không có "Inactive". */
export type RoomStatusDb = "Available" | "Deposited" | "Rented" | "Hidden";

export interface CreateRoomInput {
  propertyId: string;
  roomCode: string;
  area: number;
  price: number;
  floor?: number;
  status?: RoomStatusDb;
  description?: string;
}

/**
 * Tạo phòng mới trong một khu.
 *
 * ⚠️ KHÔNG gửi `owner_id`: cột có `default auth.uid()` (migration
 * `20260807140000`). Policy `for all using (auth.uid() = owner_id)` là biên chặn.
 *
 * `room_code` unique trong phạm vi một khu (`unique(property_id, room_code)` từ
 * migration init) ⇒ trùng mã sẽ ra lỗi 23505, và `supabase-error.ts` dịch nó
 * thành "Dữ liệu đã tồn tại."
 *
 * @returns id phòng vừa tạo.
 */
export async function createRoom(input: CreateRoomInput): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        property_id: input.propertyId,
        room_code: input.roomCode.trim(),
        area: input.area,
        price: input.price,
        floor: input.floor ?? 1,
        status: input.status ?? "Available",
        description: input.description?.trim() || null,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  } catch (err) {
    logError("room-service.createRoom", err);
    throw err;
  }
}

/**
 * Fetch vacant / available rooms for a landlord.
 */
export async function getVacantRooms(ownerId: string | undefined): Promise<RoomItem[]> {
  if (!ownerId) return [];
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("*, properties(name)")
      .eq("owner_id", ownerId)
      .eq("status", "Available")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as RoomItem[];
  } catch (err) {
    logError("room-service.getVacantRooms", err);
    return [];
  }
}
