import { C, font } from "../../theme";
import { formatVndShort } from "../../utils/format";

/** Chỉ giữ chữ số — "2.000.000đ" → "2000000". */
export function toDigits(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

/** "2000000" → "2.000.000". Rỗng giữ rỗng. */
function groupThousands(digits: string): string {
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

/**
 * Ô nhập tiền VND: hiển thị "2.000.000" + đơn vị, nhưng `value`/`onChange` là
 * CHUỖI CHỮ SỐ thô ("2000000") để form cha `Number(value)` như cũ.
 * `type="text"` + `inputMode="numeric"` thay vì `type="number"`: number không
 * hiện dấu chấm ngăn cách, có nút tăng/giảm vô nghĩa và đổi giá khi lăn chuột.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  suffix = "đ",
  placeholder,
  required,
  invalid,
  "data-testid": testId,
}: {
  id?: string;
  value: string;
  onChange: (digits: string) => void;
  suffix?: string;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  "data-testid"?: string;
}) {
  const amount = Number(value);
  const hint = amount >= 1_000_000 ? `= ${formatVndShort(amount)}` : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", background: C.white, border: `1px solid ${invalid ? C.error : C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          id={id}
          required={required}
          aria-invalid={invalid || undefined}
          placeholder={placeholder}
          value={groupThousands(value)}
          onChange={(e) => onChange(toDigits(e.target.value).slice(0, 12))}
          data-testid={testId}
          style={{ flex: 1, minWidth: 0, padding: "11px 14px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: "none", outline: "none", background: "transparent" }}
        />
        <span style={{ alignSelf: "stretch", display: "flex", alignItems: "center", padding: "0 12px", fontFamily: font, fontSize: 13, color: C.textSecondary, background: C.bg, borderLeft: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
          {suffix}
        </span>
      </div>
      {hint ? (
        <div style={{ marginTop: 4, fontFamily: font, fontSize: 12, color: C.textSecondary }}>{hint}</div>
      ) : null}
    </div>
  );
}
