import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface ContractItem {
  id: string;
  room_id: string;
  occupancy_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  rent_price: number;
  deposit: number;
  status: string;
  created_at: string;
}

/**
 * Fetch all contracts owned by a landlord.
 */
export async function getContractsByOwner(ownerId: string | undefined): Promise<ContractItem[]> {
  if (!ownerId) return [];
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ContractItem[];
  } catch (err) {
    logError("contract-service.getContractsByOwner", err);
    return [];
  }
}

/**
 * Fetch active contract for a given room.
 */
export async function getActiveContractByRoom(roomId: string): Promise<ContractItem | null> {
  if (!roomId) return null;
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "Active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data as ContractItem | null;
  } catch (err) {
    logError("contract-service.getActiveContractByRoom", err);
    return null;
  }
}

/**
 * Gia hạn hợp đồng đang hiệu lực — dời `end_date`, giữ nguyên occupancy và
 * toàn bộ hóa đơn cũ.
 *
 * ⚠️ KHÔNG truyền `owner_id`: RPC derive `auth.uid()` và tự assert ownership.
 * RPC cũng kiểm BR-006 (không để hợp đồng sau gia hạn chồng thời gian với một
 * hợp đồng Active khác trên cùng phòng) — đừng kiểm lại ở client rồi tin vào đó.
 *
 * Domain error có thể gặp: `CONTRACT_NOT_FOUND` · `CONTRACT_NOT_OWNED` ·
 * `CONTRACT_NOT_ACTIVE` · `EXTEND_DATE_NOT_LATER` · `ROOM_HAS_ACTIVE_CONTRACT`.
 */
export async function extendContract(
  contractId: string,
  newEndDate: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc("extend_contract", {
      p_contract_id: contractId,
      p_new_end_date: newEndDate,
    });
    if (error) throw error;
  } catch (err) {
    logError("contract-service.extendContract", err);
    throw err;
  }
}
