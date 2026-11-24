import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { C, font, radius } from "../../../shared/theme";
import { Button, Skeleton } from "../../../shared/components/common";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { qk } from "../../../shared/query/keys";
import { toUserMessage } from "../../../shared/services/supabase-error";
import {
  EMPTY_LANDLORD_PROFILE, getLandlordLegalProfile, upsertLandlordLegalProfile, type LandlordLegalProfileForm,
} from "../../services/occupancy-profile-service";
import { TextInput, twoColumns } from "./OccupantProfileModal/fields";

/**
 * Thông tin chủ trọ in làm "Bên A" trên hợp đồng (T43) và tờ khai CT01 (T44).
 * Một bản cho mọi khu của chủ trọ. Ghi qua RPC `upsert_landlord_legal_profile`.
 */
export function LandlordLegalProfileCard({ mobile, isReadOnly }: { mobile?: boolean; isReadOnly?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: qk.landlordLegalProfile(user?.id),
    queryFn: getLandlordLegalProfile,
    enabled: Boolean(user?.id),
  });
  const [form, setForm] = useState<LandlordLegalProfileForm>(EMPTY_LANDLORD_PROFILE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profileQuery.data) setForm(profileQuery.data);
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => upsertLandlordLegalProfile(form),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: qk.landlordLegalProfile(user?.id) });
    },
  });

  const set = (key: keyof LandlordLegalProfileForm) => (value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div data-testid="landlord-legal-profile" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
      <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Thông tin chủ trọ (Bên A)</h2>
      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>
        In ở mục Bên cho thuê trên hợp đồng và tờ khai tạm trú. Dùng chung cho mọi khu của bạn.
      </p>

      {profileQuery.isPending ? (
        <Skeleton variant="row" count={3} label="Đang tải thông tin chủ trọ" />
      ) : profileQuery.isError ? (
        <p role="alert" style={{ fontFamily: font, fontSize: 13, color: C.error, margin: 0 }}>{toUserMessage(profileQuery.error)}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={twoColumns}>
            <TextInput label="Họ và tên *" value={form.fullName} maxLength={80} onChange={set("fullName")} testId="landlord-full-name" />
            <TextInput label="Số điện thoại" type="tel" value={form.phone} maxLength={20} onChange={set("phone")} />
            <TextInput label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            <TextInput label="Số CCCD" value={form.idNumber} maxLength={20} inputMode="numeric" onChange={set("idNumber")} testId="landlord-id-number" />
            <TextInput label="Ngày cấp" type="date" value={form.idIssueDate} onChange={set("idIssueDate")} />
            <TextInput label="Nơi cấp" value={form.idIssuePlace} maxLength={120} onChange={set("idIssuePlace")} />
          </div>
          <TextInput label="Địa chỉ thường trú" value={form.permanentAddress} maxLength={255} onChange={set("permanentAddress")} />

          {saveMutation.isError && (
            <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, borderRadius: radius.sm, padding: "8px 12px", fontFamily: font, fontSize: 13 }}>
              {toUserMessage(saveMutation.error)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
            {saved && <span data-testid="landlord-profile-saved" style={{ fontFamily: font, fontSize: 13, color: C.success }}>Đã lưu.</span>}
            <Button
              variant="primary"
              requiresWrite
              disabled={isReadOnly || form.fullName.trim() === ""}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              data-testid="landlord-profile-save"
            >
              Lưu thông tin chủ trọ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
