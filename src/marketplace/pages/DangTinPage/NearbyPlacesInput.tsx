import { useState } from "react";
import { Plus, X } from "lucide-react";
import { C, font, radius, space } from "../../../shared/theme";
import { NEARBY_CATEGORY_META } from "../../../shared/constants/nearby";

export interface NearbyEntry {
  category: string;
  name: string;
  dist: string;
}

interface NearbyPlacesInputProps {
  value: NearbyEntry[];
  onChange: (next: NearbyEntry[]) => void;
}

const inputStyle = {
  fontFamily: font,
  fontSize: 13.5,
  color: C.textPrimary,
  padding: `${space[2] + 2}px ${space[3]}px`,
  background: C.white,
  border: `1.5px solid ${C.border}`,
  borderRadius: radius.sm,
  outline: "none",
  boxSizing: "border-box" as const,
  width: "100%",
};

/**
 * Nhập tiện ích xung quanh (trường học, chợ, bệnh viện…) cho tin đăng.
 * Ghi vào `metadata.nearby` và hiển thị ở khối "Vị trí & Tiện ích xung quanh".
 */
export function NearbyPlacesInput({ value, onChange }: NearbyPlacesInputProps) {
  const [category, setCategory] = useState(NEARBY_CATEGORY_META[0]!.key);
  const [name, setName] = useState("");
  const [dist, setDist] = useState("");

  const add = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onChange([...value, { category, name: trimmedName, dist: dist.trim() || "gần đây" }]);
    setName("");
    setDist("");
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 150px) minmax(0, 1fr) minmax(0, 110px) auto", gap: space[2], alignItems: "start" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="nearby-category-select"
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {NEARBY_CATEGORY_META.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="VD: Đại học Bách Khoa"
          data-testid="nearby-name-input"
          style={inputStyle}
        />

        <input
          value={dist}
          onChange={(e) => setDist(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="VD: 500m"
          data-testid="nearby-dist-input"
          style={inputStyle}
        />

        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          data-testid="nearby-add-btn"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: font, fontSize: 13, fontWeight: 700,
            color: name.trim() ? C.white : C.textSecondary,
            background: name.trim() ? C.primary : C.cream,
            border: `1px solid ${name.trim() ? C.primary : C.border}`,
            borderRadius: radius.sm,
            padding: `${space[2] + 2}px ${space[4]}px`,
            cursor: name.trim() ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={14} /> Thêm
        </button>
      </div>

      {value.length === 0 ? (
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
          Chưa thêm địa điểm nào. Phần này không bắt buộc, nhưng tin có tiện ích xung quanh thường được liên hệ nhiều hơn.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
          {NEARBY_CATEGORY_META.map((cat) => {
            const items = value
              .map((entry, index) => ({ entry, index }))
              .filter(({ entry }) => entry.category === cat.key);
            if (items.length === 0) return null;
            const Icon = cat.Icon;
            return (
              <div key={cat.key} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: space[3] }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: space[2] }}>
                  <Icon size={14} color={C.primary} />
                  <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{cat.label}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map(({ entry, index }) => (
                    <div key={index} data-testid="nearby-item" style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, flex: 1, minWidth: 0 }}>{entry.name}</span>
                      <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.secondary, background: C.cream, borderRadius: radius.pill, padding: "2px 9px" }}>{entry.dist}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        aria-label={`Xóa ${entry.name}`}
                        data-testid="nearby-remove-btn"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "inline-flex", color: C.error }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
