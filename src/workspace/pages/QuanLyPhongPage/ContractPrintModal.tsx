import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Printer } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell, Skeleton } from "../../../shared/components/common";
import { qk } from "../../../shared/query/keys";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { getContractPrintData, updateContractTerms } from "../../services/contract-print-service";
import { ContractDocument } from "../../components/ContractDocument";
import { PrintArea } from "../../components/PrintArea";

const fieldStyle: React.CSSProperties = { padding: "8px 10px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.sm, background: C.white, boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textSecondary };

/**
 * In hợp đồng thuê phòng (T43). Khung "Điều khoản" phía trên KHÔNG in ra — dùng để
 * sửa ngày thu tiền, chu kỳ và điều khoản bổ sung của hợp đồng đã có.
 */
export function ContractPrintModal({ contractId, isReadOnly, onClose }: {
  contractId: string;
  isReadOnly: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const dataQuery = useQuery({
    queryKey: qk.contracts.detail(contractId),
    queryFn: () => getContractPrintData(contractId),
  });
  const data = dataQuery.data;
  const [paymentDay, setPaymentDay] = useState("");
  const [cycle, setCycle] = useState("1");
  const [extraTerms, setExtraTerms] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPaymentDay(data.paymentDay ? String(data.paymentDay) : "");
    setCycle(String(data.billingCycleMonths));
    setExtraTerms(data.extraTerms ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateContractTerms(contractId, {
      paymentDay: paymentDay ? Number(paymentDay) : null,
      billingCycleMonths: Number(cycle) || 1,
      extraTerms,
    }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: qk.contracts.detail(contractId) });
    },
  });

  const missing = data ? [
    !data.landlord.fullName && "thông tin chủ trọ (Cài đặt khu → Thông tin chủ trọ)",
    !data.occupant.idNumber && "giấy tờ của người ở (Người ở → Hồ sơ & giấy tờ)",
  ].filter((item): item is string => typeof item === "string") : [];
  const invalidDay = paymentDay !== "" && !(Number(paymentDay) >= 1 && Number(paymentDay) <= 31);

  return (
    <ModalShell
      title="In hợp đồng thuê phòng"
      size="xl"
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button variant="primary" icon={<Printer size={16} />} disabled={!data} onClick={() => window.print()} data-testid="contract-print-btn">
            In / Lưu PDF
          </Button>
        </>
      )}
    >
      {dataQuery.isPending ? (
        <Skeleton variant="row" count={6} label="Đang tải hợp đồng" />
      ) : dataQuery.isError ? (
        <div role="alert" style={{ fontFamily: font, fontSize: 13.5, color: C.error }}>
          {toUserMessage(dataQuery.error)}{" "}
          <Button size="sm" variant="ghost" onClick={() => void dataQuery.refetch()}>Thử lại</Button>
        </div>
      ) : data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {missing.length > 0 && (
            <div role="status" data-testid="contract-missing-info" style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: radius.sm, background: C.warningBg, border: `1px solid ${C.warningBorder}`, fontFamily: font, fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>
              <AlertTriangle size={16} color={C.warning} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Chưa có {missing.join(" và ")} — các ô đó sẽ in dòng chấm để điền tay.</span>
            </div>
          )}
          {!data.servicesFromSnapshot && data.services.length > 0 && (
            <p style={{ margin: 0, fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
              Hợp đồng này tạo trước khi có bản chụp giá dịch vụ — bảng dịch vụ đang in theo giá hiện tại của phòng.
            </p>
          )}

          <section data-testid="contract-terms-editor" style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 12, background: C.white, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>Điều khoản thanh toán (không in khung này)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <label style={labelStyle}>
                Ngày thu tiền hàng tháng
                <input type="number" min={1} max={31} value={paymentDay} placeholder="VD: 5" onChange={(e) => { setSaved(false); setPaymentDay(e.target.value); }} style={{ ...fieldStyle, borderColor: invalidDay ? C.error : C.border }} data-testid="contract-payment-day" />
              </label>
              <label style={labelStyle}>
                Chu kỳ thu
                <select value={cycle} onChange={(e) => { setSaved(false); setCycle(e.target.value); }} style={fieldStyle} data-testid="contract-billing-cycle">
                  {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} tháng</option>)}
                </select>
              </label>
            </div>
            <label style={labelStyle}>
              Điều khoản bổ sung (in thành Điều 6)
              <textarea value={extraTerms} rows={3} maxLength={4000} placeholder="VD: Không nuôi thú cưng; giờ đóng cổng 23h…" onChange={(e) => { setSaved(false); setExtraTerms(e.target.value); }} style={{ ...fieldStyle, resize: "vertical", width: "100%" }} data-testid="contract-extra-terms-input" />
            </label>
            {saveMutation.isError && <p role="alert" style={{ margin: 0, fontFamily: font, fontSize: 13, color: C.error }}>{toUserMessage(saveMutation.error)}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
              {saved && <span data-testid="contract-terms-saved" style={{ fontFamily: font, fontSize: 13, color: C.success }}>Đã lưu.</span>}
              <Button size="sm" variant="outline" requiresWrite disabled={isReadOnly || invalidDay} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} data-testid="contract-terms-save">
                Lưu điều khoản
              </Button>
            </div>
          </section>

          <PrintArea testId="contract-print-area">
            <ContractDocument data={{ ...data, paymentDay: paymentDay ? Number(paymentDay) : null, billingCycleMonths: Number(cycle) || 1, extraTerms: extraTerms.trim() || null }} />
          </PrintArea>
        </div>
      )}
    </ModalShell>
  );
}
