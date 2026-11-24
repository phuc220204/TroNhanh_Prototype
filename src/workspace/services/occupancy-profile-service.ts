/**
 * Hồ sơ người ở (giấy tờ, tạm trú), xe, và thông tin chủ trọ (Bên A) — T42.
 *
 * Bảng `occupancy_profiles` / `occupancy_vehicles` / `landlord_legal_profiles`
 * thuộc workspace. Đọc theo RLS (chủ trọ; người ở đã liên kết chỉ đọc của mình),
 * ghi qua RPC `save_occupancy_profile` / `upsert_landlord_legal_profile`.
 * Số giấy tờ tùy thân là dữ liệu nhạy cảm: chỉ màn hồ sơ đọc tới.
 */
import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export type IdDocumentType = "CCCD" | "Passport";
export type Gender = "Male" | "Female" | "Other";
export type VehicleType = "Motorbike" | "EBike" | "Bicycle" | "Car";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  Motorbike: "Xe máy",
  EBike: "Xe điện",
  Bicycle: "Xe đạp",
  Car: "Ô tô",
};

export const GENDER_LABELS: Record<Gender, string> = { Male: "Nam", Female: "Nữ", Other: "Khác" };

/** Mọi trường là chuỗi để gắn thẳng vào form; "" = chưa khai. */
export interface OccupancyProfileForm {
  dateOfBirth: string;
  gender: Gender | "";
  idDocumentType: IdDocumentType;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  permanentAddress: string;
  occupation: string;
  relationToPrimary: string;
  isRoomContact: boolean;
  tempResidenceRegistered: boolean;
  tempResidenceFrom: string;
  tempResidenceTo: string;
  isInfoVerified: boolean;
}

export interface VehicleForm {
  vehicleType: VehicleType;
  name: string;
  plateNumber: string;
}

export const EMPTY_OCCUPANCY_PROFILE: OccupancyProfileForm = {
  dateOfBirth: "", gender: "", idDocumentType: "CCCD", idNumber: "", idIssueDate: "", idIssuePlace: "",
  permanentAddress: "", occupation: "", relationToPrimary: "", isRoomContact: false,
  tempResidenceRegistered: false, tempResidenceFrom: "", tempResidenceTo: "", isInfoVerified: false,
};

export interface LandlordLegalProfileForm {
  fullName: string;
  dateOfBirth: string;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  permanentAddress: string;
  phone: string;
}

export const EMPTY_LANDLORD_PROFILE: LandlordLegalProfileForm = {
  fullName: "", dateOfBirth: "", idNumber: "", idIssueDate: "", idIssuePlace: "", permanentAddress: "", phone: "",
};

const str = (value: string | null | undefined) => value ?? "";

export async function getOccupancyProfile(occupancyId: string): Promise<{ profile: OccupancyProfileForm; vehicles: VehicleForm[] }> {
  const [profileRes, vehiclesRes] = await Promise.all([
    supabase.from("occupancy_profiles").select("*").eq("occupancy_id", occupancyId).maybeSingle(),
    supabase.from("occupancy_vehicles").select("vehicle_type, name, plate_number, created_at").eq("occupancy_id", occupancyId).order("created_at"),
  ]);
  if (profileRes.error || vehiclesRes.error) {
    const error = profileRes.error ?? vehiclesRes.error;
    logError("occupancy-profile-service.getOccupancyProfile", error);
    throw error;
  }
  const row = profileRes.data;
  return {
    profile: row
      ? {
          dateOfBirth: str(row.date_of_birth),
          gender: (row.gender as Gender | null) ?? "",
          idDocumentType: (row.id_document_type as IdDocumentType) ?? "CCCD",
          idNumber: str(row.id_number),
          idIssueDate: str(row.id_issue_date),
          idIssuePlace: str(row.id_issue_place),
          permanentAddress: str(row.permanent_address),
          occupation: str(row.occupation),
          relationToPrimary: str(row.relation_to_primary),
          isRoomContact: row.is_room_contact,
          tempResidenceRegistered: row.temp_residence_registered,
          tempResidenceFrom: str(row.temp_residence_from),
          tempResidenceTo: str(row.temp_residence_to),
          isInfoVerified: row.is_info_verified,
        }
      : EMPTY_OCCUPANCY_PROFILE,
    vehicles: (vehiclesRes.data ?? []).map((v) => ({
      vehicleType: v.vehicle_type as VehicleType,
      name: str(v.name),
      plateNumber: str(v.plate_number),
    })),
  };
}

export async function saveOccupancyProfile(occupancyId: string, profile: OccupancyProfileForm, vehicles: VehicleForm[]): Promise<void> {
  const { error } = await supabase.rpc("save_occupancy_profile", {
    p_occupancy_id: occupancyId,
    p_profile: {
      date_of_birth: profile.dateOfBirth,
      gender: profile.gender,
      id_document_type: profile.idDocumentType,
      id_number: profile.idNumber,
      id_issue_date: profile.idIssueDate,
      id_issue_place: profile.idIssuePlace,
      permanent_address: profile.permanentAddress,
      occupation: profile.occupation,
      relation_to_primary: profile.relationToPrimary,
      is_room_contact: profile.isRoomContact,
      temp_residence_registered: profile.tempResidenceRegistered,
      temp_residence_from: profile.tempResidenceFrom,
      temp_residence_to: profile.tempResidenceTo,
      is_info_verified: profile.isInfoVerified,
    },
    p_vehicles: vehicles.map((v) => ({ vehicle_type: v.vehicleType, name: v.name, plate_number: v.plateNumber })),
  });
  if (error) {
    logError("occupancy-profile-service.saveOccupancyProfile", error);
    throw error;
  }
}

export async function getLandlordLegalProfile(): Promise<LandlordLegalProfileForm> {
  const { data, error } = await supabase.from("landlord_legal_profiles").select("*").maybeSingle();
  if (error) {
    logError("occupancy-profile-service.getLandlordLegalProfile", error);
    throw error;
  }
  if (!data) return EMPTY_LANDLORD_PROFILE;
  return {
    fullName: data.full_name,
    dateOfBirth: str(data.date_of_birth),
    idNumber: str(data.id_number),
    idIssueDate: str(data.id_issue_date),
    idIssuePlace: str(data.id_issue_place),
    permanentAddress: str(data.permanent_address),
    phone: str(data.phone),
  };
}

export async function upsertLandlordLegalProfile(profile: LandlordLegalProfileForm): Promise<void> {
  const { error } = await supabase.rpc("upsert_landlord_legal_profile", {
    p_profile: {
      full_name: profile.fullName,
      date_of_birth: profile.dateOfBirth,
      id_number: profile.idNumber,
      id_issue_date: profile.idIssueDate,
      id_issue_place: profile.idIssuePlace,
      permanent_address: profile.permanentAddress,
      phone: profile.phone,
    },
  });
  if (error) {
    logError("occupancy-profile-service.upsertLandlordLegalProfile", error);
    throw error;
  }
}
