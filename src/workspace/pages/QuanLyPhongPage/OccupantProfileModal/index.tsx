import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { C, font, radius } from "../../../../shared/theme";
import { Button, ModalShell, Skeleton } from "../../../../shared/components/common";
import { qk } from "../../../../shared/query/keys";
import { toUserMessage } from "../../../../shared/services/supabase-error";
import {
  EMPTY_OCCUPANCY_PROFILE, GENDER_LABELS, getOccupancyProfile, saveOccupancyProfile,
  type Gender, type IdDocumentType, type OccupancyProfileForm, type VehicleForm,
} from "../../../services/occupancy-profile-service";
import { ProfileSection, TextInput, Toggle, twoColumns } from "./fields";
import { VehiclesSection } from "./VehiclesSection";

const CCCD_PATTERN = /^\d{12}$/;
const PASSPORT_PATTERN = /^[A-Za-z0-9]{6,20}$/;

/** Kiểm sớm ở client — server (`save_occupancy_profile`) kiểm lại y hệt. */
export function validateOccupancyProfile(profile: OccupancyProfileForm): string | null {
  const id = profile.idNumber.replace(/\s/g, "");
  if (id && profile.idDocumentType === "CCCD" && !CCCD_PATTERN.test(id)) return "Số CCCD phải gồm đúng 12 chữ số.";
  if (id && profile.idDocumentType === "Passport" && !PASSPORT_PATTERN.test(id)) return "Số hộ chiếu gồm 6–20 chữ cái hoặc chữ số.";
  if (profile.tempResidenceFrom && profile.tempResidenceTo && profile.tempResidenceFrom > profile.tempResidenceTo) {
    return "Ngày hết hạn tạm trú phải sau ngày đăng ký.";
  }
  return null;
}

/**
 * Hồ sơ người ở (T42): giấy tờ tùy thân, địa chỉ & công việc, tạm trú & tình trạng, xe.
 * Dùng cho hợp đồng in (T43) và tờ khai tạm trú CT01 (T44). Dữ liệu nhạy cảm — chỉ chủ
 * trọ và chính người ở đã liên kết đọc được (RLS).
 */
export function OccupantProfileModal({ occupancyId, fullName, isPrimary, isReadOnly, onClose, onOpenCt01 }: {
  occupancyId: string;
  fullName: string;
  isPrimary: boolean;
  isReadOnly: boolean;
  onClose: () => void;
  /** T44 — đóng hồ sơ và mở tờ khai CT01 (lưu hồ sơ trước để tờ khai có số liệu mới). */
  onOpenCt01?: () => void;
}) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: qk.occupancies.profile(occupancyId),
    queryFn: () => getOccupancyProfile(occupancyId),
  });
  const [profile, setProfile] = useState<OccupancyProfileForm>(EMPTY_OCCUPANCY_PROFILE);
  const [vehicles, setVehicles] = useState<VehicleForm[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfile(profileQuery.data.profile);
    setVehicles(profileQuery.data.vehicles);
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => saveOccupancyProfile(occupancyId, profile, vehicles),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.occupancies.profile(occupancyId) });
      await queryClient.invalidateQueries({ queryKey: qk.billing.all });
      onClose();
    },
  });

  const set = <K extends keyof OccupancyProfileForm>(key: K) => (value: OccupancyProfileForm[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const submit = () => {
    const error = validateOccupancyProfile(profile);
    setLocalError(error);
    if (!error) saveMutation.mutate();
  };

  const errorText = localError ?? (saveMutation.isError ? toUserMessage(saveMutation.error) : null);
  const idLabel = profile.idDocumentType === "CCCD" ? "CCCD" : "hộ chiếu";

  return (
    <ModalShell
      title={`Hồ sơ người ở · ${fullName}`}
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          {onOpenCt01 && (
            <Button variant="outline" disabled={!profileQuery.data} onClick={onOpenCt01} data-testid="profile-open-ct01">
              In tờ khai CT01
            </Button>
          )}
          <Button variant="primary" requiresWrite disabled={isReadOnly || !profileQuery.data} loading={saveMutation.isPending} onClick={submit} data-testid="profile-save">
            Lưu hồ sơ
          </Button>
        </>
      )}
    >
      {profileQuery.isPending ? (
        <Skeleton variant="row" count={6} label="Đang tải hồ sơ người ở" />
      ) : profileQuery.isError ? (
        <div role="alert" style={{ fontFamily: font, fontSize: 13.5, color: C.error }}>
          {toUserMessage(profileQuery.error)}{" "}
          <Button size="sm" variant="ghost" onClick={() => void profileQuery.refetch()}>Thử lại</Button>
        </div>
      ) : (
        <div data-testid="occupant-profile-modal" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {errorText && (
            <div role="alert" data-testid="profile-error" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, borderRadius: radius.sm, padding: "10px 14px", fontFamily: font, fontSize: 13, fontWeight: 600 }}>
              {errorText}
            </div>
          )}
          <p style={{ margin: 0, fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
            Thông tin giấy tờ là dữ liệu cá nhân của người ở — chỉ khai khi người ở đồng ý, dùng cho hợp đồng và đăng ký tạm trú.
          </p>

          <ProfileSection title="Giấy tờ & nhận diện" subtitle="Giấy tờ tùy thân dùng cho hợp đồng và đăng ký tạm trú.">
            <div role="radiogroup" aria-label="Loại giấy tờ" style={{ display: "flex", gap: 18, fontFamily: font, fontSize: 13.5, color: C.textPrimary }}>
              {(["CCCD", "Passport"] as IdDocumentType[]).map((type) => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" name="id-document-type" checked={profile.idDocumentType === type} onChange={() => set("idDocumentType")(type)} />
                  {type === "CCCD" ? "CCCD" : "Hộ chiếu / Visa"}
                </label>
              ))}
            </div>
            <div style={twoColumns}>
              <TextInput label={`Số ${idLabel}`} value={profile.idNumber} maxLength={20} inputMode={profile.idDocumentType === "CCCD" ? "numeric" : "text"} onChange={set("idNumber")} testId="profile-id-number" />
              <TextInput label="Ngày cấp" type="date" value={profile.idIssueDate} onChange={set("idIssueDate")} />
              <TextInput label="Nơi cấp" value={profile.idIssuePlace} maxLength={120} placeholder="VD: Cục CSQLHC về TTXH" onChange={set("idIssuePlace")} />
              <TextInput label="Ngày sinh" type="date" value={profile.dateOfBirth} onChange={set("dateOfBirth")} testId="profile-dob" />
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                Giới tính
                <select value={profile.gender} onChange={(e) => set("gender")(e.target.value as Gender | "")} style={{ padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.sm, background: C.white }}>
                  <option value="">—</option>
                  {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                </select>
              </label>
              {!isPrimary && (
                <TextInput label="Quan hệ với người đứng tên" value={profile.relationToPrimary} maxLength={40} placeholder="VD: Vợ, Em, Bạn" onChange={set("relationToPrimary")} />
              )}
            </div>
          </ProfileSection>

          <ProfileSection title="Địa chỉ & công việc">
            <div style={twoColumns}>
              <TextInput label="Địa chỉ thường trú" value={profile.permanentAddress} maxLength={255} onChange={set("permanentAddress")} testId="profile-address" />
              <TextInput label="Nghề nghiệp" value={profile.occupation} maxLength={80} onChange={set("occupation")} />
            </div>
          </ProfileSection>

          <ProfileSection title="Tạm trú & tình trạng">
            <div style={twoColumns}>
              <TextInput label="Ngày đăng ký tạm trú" type="date" value={profile.tempResidenceFrom} onChange={set("tempResidenceFrom")} />
              <TextInput label="Ngày hết hạn tạm trú" type="date" value={profile.tempResidenceTo} onChange={set("tempResidenceTo")} />
            </div>
            <Toggle label="Là người liên hệ của phòng" description="Nhận hóa đơn, báo các vấn đề của phòng." checked={profile.isRoomContact} onChange={set("isRoomContact")} testId="profile-room-contact" />
            <Toggle label="Đã đăng ký tạm trú" description="Tình trạng đăng ký tạm trú của người ở." checked={profile.tempResidenceRegistered} onChange={set("tempResidenceRegistered")} testId="profile-temp-registered" />
            <Toggle label="Thông tin đã được xác minh" description="Đã đối chiếu giấy tờ để chuẩn bị làm tạm trú." checked={profile.isInfoVerified} onChange={set("isInfoVerified")} testId="profile-verified" />
          </ProfileSection>

          <VehiclesSection vehicles={vehicles} onChange={setVehicles} />
        </div>
      )}
    </ModalShell>
  );
}
