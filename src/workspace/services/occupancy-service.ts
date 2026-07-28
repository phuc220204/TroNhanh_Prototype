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
      .select("*, contracts(*)")
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
 * Terminate contract and deactivate occupancy.
 */
export async function endOccupancy(contractId: string, endDate?: string): Promise<void> {
  try {
    // TODO: bỏ `as any` sau khi chạy `supabase db push` + `pnpm db:types` —
    // terminate_contract chưa có trong database.types.ts nên strict không kiểm được param.
    const { error } = await (supabase.rpc as any)("terminate_contract", {
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
    // TODO: bỏ `as any` sau khi chạy `supabase db push` + `pnpm db:types`.
    const { error } = await (supabase.rpc as any)("link_renter_account", {
      p_occupancy_id: occupancyId,
      p_email: email,
    });

    if (error) throw error;
  } catch (err) {
    logError("occupancy-service.linkRenterAccount", err);
    throw err;
  }
}
