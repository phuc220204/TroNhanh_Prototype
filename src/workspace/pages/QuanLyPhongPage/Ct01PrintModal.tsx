import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Printer } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell, Skeleton } from "../../../shared/components/common";
import { qk } from "../../../shared/query/keys";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { toLocalISODate } from "../../../shared/utils/format";
import { getCt01Data } from "../../services/ct01-service";
import { Ct01Document, type Ct01FormInput } from "../../components/Ct01Document";
import { PrintArea } from "../../components/PrintArea";

const fieldStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.sm, background: C.white, boxSizing: "border-box" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textSecondary };

/**
 * In tờ khai CT01 điền sẵn từ hồ sơ người ở (T44). Các ô phía trên chỉ để điền
 * tay phần không có trong hệ thống (kính gửi, chủ hộ, nơi ký…), KHÔNG in và KHÔNG lưu.
 * Trọ Nhanh không nộp thay — chủ trọ/người ở tự kiểm tra và nộp.
 */
export function Ct01PrintModal({ occupancyId, onClose }: { occupancyId: string; onClose: () => void }) {
  const dataQuery = useQuery({
    queryKey: qk.occupancies.ct01(occupancyId),
    queryFn: () => getCt01Data(occupancyId),
  });
  const data = dataQuery.data;
  const [input, setInput] = useState<Ct01FormInput>({
    recipient: "", householdHeadName: "", relationToHead: "Thuê trọ", request: "", email: "", place: "", date: toLocalISODate(),
  });

  useEffect(() => {
    if (!data) return;
    setInput((current) => ({
      ...current,
      request: current.request || `Xin đăng ký tạm trú đến địa chỉ: ${data.roomCode} - ${data.propertyAddress}`,
    }));
  }, [data]);

  const set = (key: keyof Ct01FormInput) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInput((current) => ({ ...current, [key]: event.target.value }));

  const missing = data ? [
    !data.declarant.idNumber && "số định danh",
    !data.declarant.dateOfBirth && "ngày sinh",
    !data.declarant.gender && "giới tính",
  ].filter((item): item is string => typeof item === "string") : [];

  return (
    <ModalShell
      title="In tờ khai tạm trú (CT01)"
      size="xl"
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button variant="primary" icon={<Printer size={16} />} disabled={!data} onClick={() => window.print()} data-testid="ct01-print-btn">
            In / Lưu PDF
          </Button>
        </>
      )}
    >
      {dataQuery.isPending ? (
        <Skeleton variant="row" count={6} label="Đang tải hồ sơ người ở" />
      ) : dataQuery.isError ? (
        <div role="alert" style={{ fontFamily: font, fontSize: 13.5, color: C.error }}>
          {toUserMessage(dataQuery.error)}{" "}
          <Button size="sm" variant="ghost" onClick={() => void dataQuery.refetch()}>Thử lại</Button>
        </div>
      ) : data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {missing.length > 0 && (
            <div role="status" data-testid="ct01-missing-info" style={{ display: "flex", gap: 8, padding: "10px 14px", borderRadius: radius.sm, background: C.warningBg, border: `1px solid ${C.warningBorder}`, fontFamily: font, fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>
              <AlertTriangle size={16} color={C.warning} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Hồ sơ người kê khai còn thiếu {missing.join(", ")} (Người ở → Hồ sơ & giấy tờ). Ô thiếu sẽ để trống để điền tay.</span>
            </div>
          )}

          <section data-testid="ct01-inputs" style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 12, background: C.white, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>Điền thêm (không in khung này, không lưu)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <label style={labelStyle}>Kính gửi<input value={input.recipient} onChange={set("recipient")} placeholder="VD: Công an phường …" style={fieldStyle} data-testid="ct01-recipient" /></label>
              <label style={labelStyle}>Họ tên chủ hộ (nếu có)<input value={input.householdHeadName} onChange={set("householdHeadName")} style={fieldStyle} /></label>
              <label style={labelStyle}>Quan hệ với chủ hộ<input value={input.relationToHead} onChange={set("relationToHead")} style={fieldStyle} /></label>
              <label style={labelStyle}>Email người kê khai<input value={input.email} onChange={set("email")} style={fieldStyle} /></label>
              <label style={labelStyle}>Nơi ký<input value={input.place} onChange={set("place")} placeholder="VD: TP.HCM" style={fieldStyle} /></label>
              <label style={labelStyle}>Ngày ký<input type="date" value={input.date} onChange={set("date")} style={fieldStyle} /></label>
            </div>
            <label style={labelStyle}>Nội dung đề nghị<textarea value={input.request} rows={2} onChange={set("request")} style={{ ...fieldStyle, resize: "vertical" }} data-testid="ct01-request" /></label>
            <p style={{ margin: 0, fontFamily: font, fontSize: 12, color: C.textSecondary }}>
              Trọ Nhanh chỉ điền sẵn mẫu để in. Hãy kiểm tra lại thông tin và mẫu tờ khai đang áp dụng trước khi nộp cho cơ quan đăng ký cư trú.
            </p>
          </section>

          <PrintArea testId="ct01-print-area">
            <Ct01Document data={data} input={input} />
          </PrintArea>
        </div>
      )}
    </ModalShell>
  );
}
