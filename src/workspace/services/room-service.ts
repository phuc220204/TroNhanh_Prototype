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
  /**
   * Đơn giá RIÊNG của phòng. `null`/`undefined` = dùng giá của khu.
   *
   * Giá điện nước không cố định một mức cho cả khu: chủ trọ có thể thu 3.500đ/kWh
   * với hợp đồng cũ và 3.700đ/kWh với phòng ký mới. Để `null` thì phòng thừa hưởng
   * giá khu, nên chỉ phải nhập cho những phòng thực sự khác.
   *
   * ⚠️ `0` KHÁC `null`: `0` nghĩa là miễn phí (khu không thu phí dịch vụ), `null`
   * nghĩa là chưa khai và lấy theo khu.
   */
  electricityPrice?: number | null;
  waterPrice?: number | null;
  serviceFee?: number | null;
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
        // `?? null` chứ không `|| null`: `0` là mức giá hợp lệ (miễn phí) và phải
        // được ghi đúng, chứ không bị coi là "chưa khai" rồi rơi về giá khu.
        electricity_price: input.electricityPrice ?? null,
        water_price: input.waterPrice ?? null,
        service_fee: input.serviceFee ?? null,
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

/** Giá trị THÔ của một phòng — dùng để đổ vào form sửa, không phải để hiển thị. */
export interface RoomEditable {
  id: string;
  propertyId: string;
  roomCode: string;
  floor: number | null;
  area: number;
  price: number;
  status: RoomStatusDb;
  description: string;
  /** `null` = theo giá khu. `0` = miễn phí. Hai ý khác nhau — xem `CreateRoomInput`. */
  electricityPrice: number | null;
  waterPrice: number | null;
  serviceFee: number | null;
}

/**
 * Đọc một phòng ở dạng THÔ để đổ vào form sửa.
 *
 * Vì sao không dùng lại `Room` của `workspace/types/room.ts`: kiểu đó đã format
 * để hiển thị (`price: "3.200.000đ"`, `floor: "Tầng 1"`, `area: "25 m²"`). Parse
 * ngược chuỗi đã format để lấy lại số là cách chắc chắn có ngày sai — chỉ cần
 * `toLocaleString` đổi dấu phân cách.
 *
 * An toàn khi select trực tiếp: policy `rooms` là `for all using (auth.uid() =
 * owner_id)`, nên phòng của người khác trả về rỗng chứ không lộ dữ liệu.
 */
export async function getRoomById(roomId: string): Promise<RoomEditable | null> {
  if (!roomId) return null;
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, property_id, room_code, floor, area, price, status, description, electricity_price, water_price, service_fee")
      .eq("id", roomId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      propertyId: data.property_id,
      roomCode: data.room_code,
      floor: data.floor,
      area: Number(data.area),
      price: Number(data.price),
      status: data.status as RoomStatusDb,
      description: data.description ?? "",
      // `?? null` giữ nguyên `0`: khu không thu phí dịch vụ là mức giá hợp lệ.
      electricityPrice: data.electricity_price ?? null,
      waterPrice: data.water_price ?? null,
      serviceFee: data.service_fee ?? null,
    };
  } catch (err) {
    logError("room-service.getRoomById", err);
    return null;
  }
}

export interface UpdateRoomInput {
  roomId: string;
  roomCode: string;
  area: number;
  price: number;
  floor?: number;
  status: RoomStatusDb;
  description?: string;
  /**
   * BẮT BUỘC truyền, kể cả khi là `null` — khác `CreateRoomInput` nơi chúng
   * optional. Ở luồng sửa, `null` là một ý định thật ("bỏ giá riêng, quay về giá
   * khu"); nếu để optional thì quên truyền và cố ý xóa giá trông giống hệt nhau.
   */
  electricityPrice: number | null;
  waterPrice: number | null;
  serviceFee: number | null;
}

/**
 * Sửa thông tin một phòng đã tạo.
 *
 * ⚠️ Đi qua RPC `update_room`, KHÔNG `.from("rooms").update()`. Đổi `status` sang
 * `Rented` phải kéo theo tin đăng liên kết (BR-027) — hai bảng, nên phải atomic
 * (§6). Update thẳng từ client sẽ để tin vẫn rao một phòng đã có người ở, và
 * không có lỗi nào báo cho ai biết.
 *
 * KHÔNG đổi được `property_id`: chuyển phòng sang khu khác kéo theo hóa đơn, hợp
 * đồng và tin đăng đang trỏ tới — đó là nghiệp vụ riêng, không phải "sửa phòng".
 *
 * Domain error: `ROOM_NOT_FOUND` · `ROOM_NOT_OWNED` · `ROOM_CODE_REQUIRED` ·
 * `INVALID_ROOM_AREA` · `INVALID_ROOM_PRICE` · `INVALID_ROOM_STATUS` ·
 * `INVALID_UNIT_PRICE`. Trùng mã phòng trong khu → 23505.
 */
export async function updateRoom(input: UpdateRoomInput): Promise<void> {
  try {
    // Ba đơn giá + `p_floor` + `p_description` nhận `null` hợp lệ, nhưng generated
    // types khai chúng non-nullable (Supabase chỉ sinh optional cho param có
    // DEFAULT trong SQL). Cast ở ĐÚNG một chỗ — cùng cách với `linkListingToRoom`
    // — thay vì bẻ dữ liệu cho vừa type.
    const args = {
      p_room_id: input.roomId,
      p_room_code: input.roomCode.trim(),
      p_area: input.area,
      p_price: input.price,
      p_floor: input.floor ?? null,
      p_status: input.status,
      p_description: input.description?.trim() || null,
      p_electricity_price: input.electricityPrice,
      p_water_price: input.waterPrice,
      p_service_fee: input.serviceFee,
    } as unknown as Parameters<typeof supabase.rpc<"update_room">>[1];

    const { error } = await supabase.rpc("update_room", args);
    if (error) throw error;
  } catch (err) {
    logError("room-service.updateRoom", err);
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
