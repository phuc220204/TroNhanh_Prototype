import { C } from "../../shared/theme";
import { formatDate } from "../../shared/utils/format";
import { GENDER_LABELS } from "../services/occupancy-profile-service";
import type { Ct01Data } from "../services/ct01-service";

const DOC_FONT = '"Times New Roman", Times, serif';
const DOTS = "..............................";

/** Phần người chủ trọ nhập tay ngay trên modal (không lưu DB). */
export interface Ct01FormInput {
  /** "Kính gửi" — cơ quan đăng ký cư trú, ví dụ "Công an phường …". */
  recipient: string;
  /** Mục 7: họ tên chủ hộ (người thuê trọ thường để trống). */
  householdHeadName: string;
  /** Mục 8: quan hệ với chủ hộ — mặc định "Thuê trọ". */
  relationToHead: string;
  /** Mục 10: nội dung đề nghị. */
  request: string;
  email: string;
  /** Nơi ký, ví dụ "TP.HCM". */
  place: string;
  /** Ngày ký `YYYY-MM-DD`. */
  date: string;
}

const row: React.CSSProperties = { margin: "6px 0", lineHeight: 1.6 };
const cell: React.CSSProperties = { border: `1px solid ${C.textPrimary}`, padding: "6px 6px", fontSize: 13, textAlign: "center", verticalAlign: "middle" };

/** Số định danh 12 ô — ô trống khi chưa có. */
function IdBoxes({ value }: { value: string | null }) {
  const chars = (value ?? "").replace(/\s/g, "").slice(0, 12).split("");
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 8 }}>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} style={{ width: 20, height: 22, border: `1px solid ${C.textPrimary}`, borderLeftWidth: i === 0 ? 1 : 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
          {chars[i] ?? ""}
        </span>
      ))}
    </span>
  );
}

function SignBlock({ dateLine, title, note, name }: { dateLine: string; title: string; note?: string; name?: string }) {
  return (
    <div style={{ textAlign: "center", fontSize: 12.5 }}>
      <div style={{ fontStyle: "italic" }}>{dateLine}</div>
      <div style={{ fontWeight: 700, marginTop: 2 }}>{title}</div>
      {/* Giữ chỗ dòng ghi chú ở mọi khối để dòng tên ký thẳng hàng. */}
      <div style={{ fontSize: 12, marginTop: 4, minHeight: 16 }}>{note ?? ""}</div>
      <div style={{ height: 70 }} />
      <div>{name || DOTS}</div>
    </div>
  );
}

/**
 * Tờ khai thay đổi thông tin cư trú (CT01) điền sẵn từ hồ sơ người ở — T44.
 * Bố cục theo mẫu CT01 hiện hành; người dùng tự kiểm tra lại trước khi nộp.
 */
export function Ct01Document({ data, input }: { data: Ct01Data; input: Ct01FormInput }) {
  const { declarant } = data;
  const [year, month, day] = (input.date || "").split("-");
  const dateLine = `${input.place || "......"}, ngày ${day ?? ".."} tháng ${month ?? ".."} năm ${year ?? "...."}`;
  const genderText = (g: Ct01Data["declarant"]["gender"]) => (g ? GENDER_LABELS[g] : "");
  const memberRows = Math.max(data.members.length, 1) + 1;

  return (
    <article data-testid="ct01-document" style={{ background: C.white, color: C.textPrimary, fontFamily: DOC_FONT, fontSize: 15, maxWidth: 820, margin: "0 auto", padding: "28px 36px", border: `1px solid ${C.border}`, borderRadius: 4, boxSizing: "border-box" }}>
      <div style={{ textAlign: "center", fontSize: 13.5 }}>
        Mẫu CT01 ban hành kèm theo Thông tư số 53/2025/TT-BCA<br />ngày 01/7/2025 của Bộ trưởng Bộ Công an
      </div>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style={{ fontWeight: 700, textDecoration: "underline" }}>Độc lập - Tự do - Hạnh phúc</div>
        <h2 style={{ margin: "16px 0 6px", fontSize: 18, fontWeight: 700 }}>TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ</h2>
        <div>Kính gửi: {input.recipient || DOTS + DOTS}</div>
      </div>

      <div style={{ marginTop: 14 }}>
        <p style={row}>1. Họ, chữ đệm và tên: <strong>{declarant.fullName}</strong></p>
        <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <span>2. Ngày, tháng, năm sinh: {declarant.dateOfBirth ? formatDate(declarant.dateOfBirth) : DOTS}</span>
          <span>3. Giới tính: {genderText(declarant.gender) || DOTS}</span>
        </div>
        <p style={row}>4. Số định danh cá nhân: <IdBoxes value={declarant.idNumber} /></p>
        <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <span>5. Số điện thoại liên hệ: {declarant.phone || DOTS}</span>
          <span>6. Email: {input.email || DOTS}</span>
        </div>
        <div style={{ ...row, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <span>7. Họ, chữ đệm và tên chủ hộ: {input.householdHeadName || DOTS}</span>
          <span>8. Quan hệ với chủ hộ: {input.relationToHead || DOTS}</span>
        </div>
        <p style={row}>9. Số định danh cá nhân của chủ hộ: <IdBoxes value={null} /></p>
        <p style={row}>10. Nội dung đề nghị: {input.request || DOTS + DOTS}</p>
        <p style={row}>11. Những thành viên trong hộ gia đình cùng thay đổi:</p>
      </div>

      <table data-testid="ct01-members" style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
        <thead>
          <tr>
            {["TT", "Họ, chữ đệm và tên", "Ngày, tháng, năm sinh", "Giới tính", "Số định danh cá nhân/CMND", "Mối quan hệ với chủ hộ"].map((h) => (
              <th key={h} style={{ ...cell, fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: memberRows }, (_, i) => {
            const member = data.members[i];
            return (
              <tr key={i}>
                <td style={cell}>{member ? i + 1 : ""}</td>
                <td style={cell}>{member?.fullName ?? ""}</td>
                <td style={cell}>{member?.dateOfBirth ? formatDate(member.dateOfBirth) : ""}</td>
                <td style={cell}>{member ? genderText(member.gender) : ""}</td>
                <td style={cell}>{member?.idNumber ?? ""}</td>
                <td style={cell}>{member?.relationToPrimary ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 20 }}>
        <SignBlock dateLine={dateLine} title="Ý KIẾN CỦA CHỦ HỘ" name={input.householdHeadName} />
        <SignBlock dateLine={dateLine} title="Ý KIẾN CỦA CHỦ SỞ HỮU CHỖ Ở HỢP PHÁP" note="Đồng ý cho đăng ký cư trú." name={data.landlord.fullName ? `${data.landlord.fullName}${data.landlord.idNumber ? ` · ${data.landlord.idNumber}` : ""}` : undefined} />
        <SignBlock dateLine={dateLine} title="Ý KIẾN CỦA CHA, MẸ HOẶC NGƯỜI GIÁM HỘ" />
        <SignBlock dateLine={dateLine} title="NGƯỜI KÊ KHAI" name={declarant.fullName} />
      </div>
    </article>
  );
}
