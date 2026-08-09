import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface OccupantInput {
  full_name: string;
  phone_number?: string;
  occupant_count?: number;
  start_date: string;
  end_date?: string;
  user_id?: string | null;
}

export interface ContractInput {
  start_date: string;
  end_date: string;
  rent_price: number;
  deposit?: number;
}

export interface OccupancyItem {
  id: string;
  room_id: string;
  owner_id: string;
  user_id: string | null;
  full_name: string;
  phone_number: string | null;
  start_date: string;
  end_date: string | null;
  occupant_count: number;
  is_active: boolean;
  link_status: "Pending" | "Confirmed" | "Rejected" | null;
  /** Hợp đồng mà người này đứng tên cùng. null = dữ liệu cũ chưa backfill. */
  contract_id: string | null;
  /** true = người đại diện đứng tên hợp đồng; false = người ở cùng. */
  is_primary: boolean;
  created_at: string;
  contracts?: Array<{
    id: string;
    start_date: string;
    end_date: string;
    rent_price: number;
    deposit: number;
    status: string;
  }>;
}

/**
 * List occupancies for a specific room.
 */
export async function listOccupancies(roomId: string): Promise<OccupancyItem[]> {
  try {
    const { data, error } = await supabase
      .from("occupancies")
      // Chỉ rõ FK: sau khi thêm `occupancies.contract_id` thì giữa hai bảng có
      // HAI đường quan hệ. Không nêu tên FK thì PostgREST tự chọn đường mới và
      // trả về object thay vì mảng — UI đang đọc `.contracts?.find()` sẽ vỡ im lặng.
      .select("*, contracts!contracts_occupancy_id_fkey(*)")
      .eq("room_id", roomId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as OccupancyItem[];
  } catch (err) {
    logError("occupancy-service.listOccupancies", err);
    throw err;
  }
}

/**
 * Create occupancy with contract in a single atomic RPC call.
 */
export async function createOccupancyWithContract(
  roomId: string,
  occupant: OccupantInput,
  contract: ContractInput
): Promise<{ occupancyId: string; contractId: string }> {
  try {
    const { data, error } = await supabase.rpc("create_occupancy_with_contract", {
      p_room_id: roomId,
      p_occupant: occupant as any,
      p_contract: contract as any,
    });

    if (error) throw error;

    const result = data as any;
    return {
      occupancyId: result.occupancy_id,
      contractId: result.contract_id,
    };
  } catch (err) {
    logError("occupancy-service.createOccupancyWithContract", err);
    throw err;
  }
}

/**
 * Thêm người ở cùng vào một hợp đồng ĐÃ CÓ (nhiều người / một phòng).
 *
 * Không tạo hợp đồng mới nên BR-006 (một phòng một hợp đồng Active) giữ nguyên.
 * Người ở cùng có gắn tài khoản thì `link_status` vào 'Pending' — BR-029 áp cho
 * họ y như người đại diện, không auto Confirmed.
 */
export async function addOccupantToContract(
  contractId: string,
  occupant: OccupantInput
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("add_occupant_to_contract", {
      p_contract_id: contractId,
      p_occupant: occupant as never,
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("occupancy-service.addOccupantToContract", err);
    throw err;
  }
}

/**
 * Terminate contract and deactivate occupancy.
 */
export async function endOccupancy(contractId: string, endDate?: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("terminate_contract", {
      p_contract_id: contractId,
      p_end_date: endDate || new Date().toISOString().split("T")[0],
    });

    if (error) throw error;
  } catch (err) {
    logError("occupancy-service.endOccupancy", err);
    throw err;
  }
}

/**
 * Link Renter account by email (sets user_id and link_status = 'Pending').
 * ⚠️ NEVER sets 'Confirmed' (BR-029).
 */
export async function linkRenterAccount(occupancyId: string, email: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("link_renter_account", {
      p_occupancy_id: occupancyId,
      p_email: email,
    });

    if (error) throw error;
  } catch (err) {
    logError("occupancy-service.linkRenterAccount", err);
    throw err;
  }
}
