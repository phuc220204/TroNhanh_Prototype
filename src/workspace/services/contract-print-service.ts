/**
 * Dữ liệu in hợp đồng thuê phòng (T43) + sửa điều khoản hợp đồng.
 *
 * Nguồn: hợp đồng, phòng/khu, người ở đứng tên + hồ sơ giấy tờ (T42), Bên A
 * (`landlord_legal_profiles`), dịch vụ CHỤP LÚC KÝ (`contract_services`; hợp đồng
 * không có bản chụp thì lấy dịch vụ đang áp của phòng), chỉ số điện gần nhất.
 * Tất cả đọc theo RLS của chủ trọ.
 */
import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { getLandlordLegalProfile, type LandlordLegalProfileForm } from "./occupancy-profile-service";

export interface ContractPrintService {
  name: string;
  unit: string;
  unitPrice: number;
  meterType: "Electricity" | "Water" | null;
  feeCategory: "Service" | "PassThrough";
}

export interface ContractPrintParty {
  fullName: string;
  dateOfBirth: string | null;
  idNumber: string | null;
  idIssueDate: string | null;
  idIssuePlace: string | null;
  permanentAddress: string | null;
  phone: string | null;
}

export interface ContractPrintData {
  contractId: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  rentPrice: number;
  deposit: number;
  paymentDay: number | null;
  billingCycleMonths: number;
  extraTerms: string | null;
  roomCode: string;
  propertyName: string;
  propertyAddress: string;
  landlord: LandlordLegalProfileForm;
  occupant: ContractPrintParty;
  /** Người ở cùng (tên) — ghi kèm Bên B. */
  coOccupantNames: string[];
  services: ContractPrintService[];
  /** true = dịch vụ lấy từ bản chụp lúc ký; false = giá đang áp (hợp đồng cũ chưa có bản chụp). */
  servicesFromSnapshot: boolean;
  electricityReading: number | null;
}

const orNull = (value: string | null | undefined) => (value && value.trim() ? value : null);

export async function getContractPrintData(contractId: string): Promise<ContractPrintData> {
  try {
    const contractRes = await supabase
      .from("contracts")
      .select("id, created_at, start_date, end_date, rent_price, deposit, payment_day, billing_cycle_months, extra_terms, room_id, occupancy_id, rooms!inner(room_code, properties!inner(name, address))")
      .eq("id", contractId)
      .single();
    if (contractRes.error) throw contractRes.error;
    const contract = contractRes.data;

    const [occupantsRes, profileRes, snapshotRes, readingRes, landlord] = await Promise.all([
      supabase.from("occupancies").select("id, full_name, phone_number, is_primary, is_active").eq("contract_id", contractId).is("deleted_at", null),
      supabase.from("occupancy_profiles").select("date_of_birth, id_number, id_issue_date, id_issue_place, permanent_address").eq("occupancy_id", contract.occupancy_id).maybeSingle(),
      supabase.from("contract_services").select("name, unit, unit_price, meter_type, fee_category, sort_order").eq("contract_id", contractId).order("sort_order"),
      supabase.from("utility_readings").select("current_reading").eq("room_id", contract.room_id).eq("type", "Electricity").is("deleted_at", null).order("period", { ascending: false }).limit(1).maybeSingle(),
      getLandlordLegalProfile(),
    ]);
    for (const res of [occupantsRes, profileRes, snapshotRes, readingRes]) if (res.error) throw res.error;

    let services: ContractPrintService[] = (snapshotRes.data ?? []).map((s) => ({
      name: s.name, unit: s.unit, unitPrice: Number(s.unit_price),
      meterType: (s.meter_type as ContractPrintService["meterType"]) ?? null,
      feeCategory: s.fee_category as ContractPrintService["feeCategory"],
    }));
    const servicesFromSnapshot = services.length > 0;
    if (!servicesFromSnapshot) {
      const currentRes = await supabase
        .from("room_services")
        .select("unit_price_override, property_services!inner(name, unit, unit_price, meter_type, fee_category, sort_order, is_active, deleted_at)")
        .eq("room_id", contract.room_id)
        .eq("property_services.is_active", true)
        .is("property_services.deleted_at", null);
      if (currentRes.error) throw currentRes.error;
      services = (currentRes.data ?? [])
        .sort((a, b) => a.property_services.sort_order - b.property_services.sort_order)
        .map((row) => ({
          name: row.property_services.name,
          unit: row.property_services.unit,
          unitPrice: Number(row.unit_price_override ?? row.property_services.unit_price),
          meterType: (row.property_services.meter_type as ContractPrintService["meterType"]) ?? null,
          feeCategory: row.property_services.fee_category as ContractPrintService["feeCategory"],
        }));
    }

    const occupants = occupantsRes.data ?? [];
    const primary = occupants.find((o) => o.id === contract.occupancy_id) ?? occupants.find((o) => o.is_primary);
    const profile = profileRes.data;

    return {
      contractId: contract.id,
      createdAt: contract.created_at,
      startDate: contract.start_date,
      endDate: contract.end_date,
      rentPrice: Number(contract.rent_price),
      deposit: Number(contract.deposit),
      paymentDay: contract.payment_day,
      billingCycleMonths: contract.billing_cycle_months,
      extraTerms: contract.extra_terms,
      roomCode: contract.rooms.room_code,
      propertyName: contract.rooms.properties.name,
      propertyAddress: contract.rooms.properties.address ?? "",
      landlord,
      occupant: {
        fullName: primary?.full_name ?? "",
        phone: orNull(primary?.phone_number),
        dateOfBirth: orNull(profile?.date_of_birth),
        idNumber: orNull(profile?.id_number),
        idIssueDate: orNull(profile?.id_issue_date),
        idIssuePlace: orNull(profile?.id_issue_place),
        permanentAddress: orNull(profile?.permanent_address),
      },
      coOccupantNames: occupants.filter((o) => o.id !== primary?.id && o.is_active !== false).map((o) => o.full_name),
      services,
      servicesFromSnapshot,
      electricityReading: readingRes.data ? Number(readingRes.data.current_reading) : null,
    };
  } catch (err) {
    logError("contract-print-service.getContractPrintData", err);
    throw err;
  }
}

export async function updateContractTerms(contractId: string, terms: {
  paymentDay: number | null;
  billingCycleMonths: number;
  extraTerms: string;
}): Promise<void> {
  const { error } = await supabase.rpc("update_contract_terms", {
    p_contract_id: contractId,
    // RPC nhận null = "chưa thỏa thuận ngày thu"; type sinh ra không biểu diễn được null.
    p_payment_day: terms.paymentDay as number,
    p_billing_cycle_months: terms.billingCycleMonths,
    p_extra_terms: terms.extraTerms,
  });
  if (error) {
    logError("contract-print-service.updateContractTerms", error);
    throw error;
  }
}
