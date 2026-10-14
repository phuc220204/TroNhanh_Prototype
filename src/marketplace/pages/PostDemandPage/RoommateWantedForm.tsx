import { C, font } from "../../../shared/theme";
import { MoneyInput } from "../../../shared/components/common";

const REQUIREMENTS_OPTIONS = ["Sạch sẽ", "Gọn gàng", "Vui vẻ", "Không nhậu nhẹt", "Tự giác", "Ít tụ tập"];

interface RoommateWantedFormProps {
  neededCount: string;
  setNeededCount: (v: string) => void;
  genderReq: "Any" | "Male" | "Female";
  setGenderReq: (v: "Any" | "Male" | "Female") => void;
  sharePrice: string;
  setSharePrice: (v: string) => void;
  selectedReqs: string[];
  setSelectedReqs: React.Dispatch<React.SetStateAction<string[]>>;
}

export function RoommateWantedForm({
  neededCount,
  setNeededCount,
  genderReq,
  setGenderReq,
  sharePrice,
  setSharePrice,
  selectedReqs,
  setSelectedReqs,
}: RoommateWantedFormProps) {
  const toggleReq = (r: string) => {
    setSelectedReqs((prev) =>
      prev.includes(r) ? prev.filter((item) => item !== r) : [...prev, r]
    );
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
            Số người cần tìm *
          </label>
          <input
            type="number"
            required
            min="1"
            value={neededCount}
            onChange={(e) => setNeededCount(e.target.value)}
            style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
            Yêu cầu giới tính
          </label>
          <select
            value={genderReq}
            onChange={(e) => setGenderReq(e.target.value as any)}
            style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
          >
            <option value="Any">Nam / Nữ đều được</option>
            <option value="Male">Chỉ Nam</option>
            <option value="Female">Chỉ Nữ</option>
          </select>
        </div>

        <div>
          <label htmlFor="demand-share-price" style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
            Giá chia sẻ/người
          </label>
          <MoneyInput
            id="demand-share-price"
            suffix="đ/tháng"
            placeholder="VD: 1.500.000"
            value={sharePrice}
            onChange={setSharePrice}
            data-testid="demand-share-price"
          />
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
          Yêu cầu đối với bạn ở ghép
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {REQUIREMENTS_OPTIONS.map((r) => {
            const active = selectedReqs.includes(r);
            return (
              <button
                type="button"
                key={r}
                onClick={() => toggleReq(r)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${active ? C.secondary : C.border}`,
                  background: active ? C.cream : C.white,
                  color: active ? C.secondary : C.textPrimary,
                  fontFamily: font,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
