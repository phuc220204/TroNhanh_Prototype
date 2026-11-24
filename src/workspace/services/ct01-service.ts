/**
 * Dữ liệu điền tờ khai thay đổi thông tin cư trú (mẫu CT01) — T44.
 *
 * Người kê khai = người ở được chọn; mục 11 = những người ở còn hiệu lực khác
 * cùng hợp đồng; "chủ sở hữu chỗ ở hợp pháp" = Bên A (`landlord_legal_profiles`).
 * Trọ Nhanh chỉ điền sẵn mẫu để in — không nộp thay, không gửi đi đâu.
 */
import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { getLandlordLegalProfile, type Gender, type LandlordLegalProfileForm } from "./occupancy-profile-service";

export interface Ct01Person {
  fullName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  idNumber: string | null;
  phone: string | null;
  relationToPrimary: string | null;
}

export interface Ct01Data {
  declarant: Ct01Person;
  members: Ct01Person[];
  roomCode: string;
  propertyAddress: string;
  landlord: LandlordLegalProfileForm;
}

export async function getCt01Data(occupancyId: string): Promise<Ct01Data> {
  try {
    const occRes = await supabase
      .from("occupancies")
      .select("id, full_name, phone_number, contract_id, rooms!inner(room_code, properties!inner(address))")
      .eq("id", occupancyId)
      .single();
    if (occRes.error) throw occRes.error;
    const occ = occRes.data;

    let others: { id: string; full_name: string; phone_number: string | null }[] = [];
    if (occ.contract_id) {
      const othersRes = await supabase
        .from("occupancies")
        .select("id, full_name, phone_number")
        .eq("contract_id", occ.contract_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .neq("id", occupancyId)
        .order("created_at");
      if (othersRes.error) throw othersRes.error;
      others = othersRes.data ?? [];
    }

    const ids = [occupancyId, ...others.map((o) => o.id)];
    const [profilesRes, landlord] = await Promise.all([
      supabase.from("occupancy_profiles").select("occupancy_id, date_of_birth, gender, id_number, relation_to_primary").in("occupancy_id", ids),
      getLandlordLegalProfile(),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    const profileOf = new Map((profilesRes.data ?? []).map((p) => [p.occupancy_id, p]));

    const toPerson = (o: { id: string; full_name: string; phone_number: string | null }): Ct01Person => {
      const profile = profileOf.get(o.id);
      return {
        fullName: o.full_name,
        phone: o.phone_number,
        dateOfBirth: profile?.date_of_birth ?? null,
        gender: (profile?.gender as Gender | null) ?? null,
        idNumber: profile?.id_number ?? null,
        relationToPrimary: profile?.relation_to_primary ?? null,
      };
    };

    return {
      declarant: toPerson(occ),
      members: others.map(toPerson),
      roomCode: occ.rooms.room_code,
      propertyAddress: occ.rooms.properties.address ?? "",
      landlord,
    };
  } catch (err) {
    logError("ct01-service.getCt01Data", err);
    throw err;
  }
}
