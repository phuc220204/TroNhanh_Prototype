import { useEffect, useMemo, useState } from "react";
import { C, font } from "../../theme";
import { AppSelect, type SelectOption } from "./AppSelect";
import { VN_PROVINCES, loadVnWards, provinceName, type VnWard } from "../../utils/vn-regions";

/**
 * Chọn khu vực theo mô hình hành chính 2 cấp: tỉnh/thành → phường/xã.
 *
 * Dùng chung cho cả BỘ LỌC (cho phép "tất cả") lẫn FORM ĐĂNG TIN (bắt buộc
 * chọn). Trước đây mỗi trang tự map `REGIONS` thành `<option>` — sáu bản sao của
 * cùng một danh sách, và khi cấp quận/huyện bị bãi bỏ 01/07/2025 thì phải sửa
 * sáu chỗ.
 *
 * Danh sách phường/xã (3.321 mục) chỉ được tải khi component này thực sự được
 * mount — xem `loadVnWards()`.
 */

export interface AreaSelectValue {
  provinceCode: number | null;
  wardCode: number | null;
}

/**
 * Payload khi người dùng đổi lựa chọn — kèm TÊN đã tra sẵn.
 *
 * Form đăng tin phải lưu cả mã (để lọc) lẫn tên (để hiển thị, xem
 * `rental_listings.district`). Bắt mỗi form tự nạp lại danh sách 3.321 phường
 * chỉ để đổi mã ra tên là lãng phí và dễ quên — component này đã có sẵn danh
 * sách trong tay rồi.
 */
export interface AreaSelectChange extends AreaSelectValue {
  provinceName: string | null;
  wardName: string | null;
}

interface AreaSelectProps {
  value: AreaSelectValue;
  onChange: (next: AreaSelectChange) => void;
  /** Cho phép "Tất cả tỉnh/thành". Bật ở bộ lọc, tắt ở form đăng tin. */
  allowAllProvinces?: boolean;
  /** Cho phép "Tất cả phường/xã" trong tỉnh đã chọn. Bật ở bộ lọc. */
  allowAllWards?: boolean;
  /** Xếp dọc (form) hay ngang (thanh lọc). */
  layout?: "stack" | "inline";
  labels?: boolean;
  testIdPrefix?: string;
}

const ALL = "";

export function AreaSelect({
  value,
  onChange,
  allowAllProvinces,
  allowAllWards,
  layout = "stack",
  labels = true,
  testIdPrefix = "area",
}: AreaSelectProps) {
  const [wards, setWards] = useState<readonly VnWard[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadVnWards()
      .then((w) => { if (!cancelled) setWards(w); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const provinceOptions: SelectOption[] = useMemo(() => {
    const base = VN_PROVINCES.map((p) => ({ label: p.name, value: String(p.code) }));
    return allowAllProvinces ? [{ label: "Tất cả tỉnh/thành", value: ALL }, ...base] : base;
  }, [allowAllProvinces]);

  const wardOptions: SelectOption[] = useMemo(() => {
    if (!wards || value.provinceCode == null) return [];
    const base = wards
      .filter((w) => w.provinceCode === value.provinceCode)
      .map((w) => ({ label: w.name, value: String(w.code) }));
    return allowAllWards ? [{ label: "Tất cả phường/xã", value: ALL }, ...base] : base;
  }, [wards, value.provinceCode, allowAllWards]);

  const handleProvince = (raw: string) => {
    const next = raw === ALL ? null : Number(raw);
    // Đổi tỉnh thì phải bỏ phường đang chọn: giữ lại sẽ thành một cặp vô nghĩa
    // như "Phường Bến Nghé, Tỉnh Lào Cai", và bộ lọc trả về rỗng mà không ai
    // hiểu tại sao.
    onChange({
      provinceCode: next,
      wardCode: null,
      provinceName: provinceName(next),
      wardName: null,
    });
  };

  const handleWard = (raw: string) => {
    const code = raw === ALL ? null : Number(raw);
    onChange({
      provinceCode: value.provinceCode,
      wardCode: code,
      provinceName: provinceName(value.provinceCode),
      wardName: code == null ? null : wards?.find((w) => w.code === code)?.name ?? null,
    });
  };

  const wardPlaceholder = value.provinceCode == null
    ? "Chọn tỉnh/thành trước"
    : loadFailed
      ? "Không tải được danh sách"
      : wards === null
        ? "Đang tải…"
        : allowAllWards ? "Tất cả phường/xã" : "Chọn phường/xã";

  const box = {
    background: C.white,
    border: `1.5px solid ${C.border}`,
    borderRadius: 10,
    padding: "10px 13px",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontFamily: font,
    fontSize: 13,
    fontWeight: 700,
    color: C.textPrimary,
    marginBottom: 5,
  };

  return (
    <div
      style={
        layout === "inline"
          ? { display: "flex", gap: 10, flexWrap: "wrap" }
          : { display: "flex", flexDirection: "column", gap: 12 }
      }
    >
      <div style={layout === "inline" ? { flex: "1 1 180px", minWidth: 0 } : undefined}>
        {labels && <span style={labelStyle}>Tỉnh / Thành phố</span>}
        <div style={box}>
          <AppSelect
            value={value.provinceCode == null ? ALL : String(value.provinceCode)}
            options={provinceOptions}
            onChange={handleProvince}
            placeholder={allowAllProvinces ? "Tất cả tỉnh/thành" : "Chọn tỉnh/thành"}
            searchable
            fontSize={14}
            data-testid={`${testIdPrefix}-province`}
          />
        </div>
      </div>

      <div style={layout === "inline" ? { flex: "1 1 180px", minWidth: 0 } : undefined}>
        {labels && <span style={labelStyle}>Phường / Xã</span>}
        <div style={{ ...box, opacity: value.provinceCode == null ? 0.55 : 1 }}>
          <AppSelect
            value={value.wardCode == null ? ALL : String(value.wardCode)}
            options={wardOptions}
            onChange={handleWard}
            placeholder={wardPlaceholder}
            searchable
            fontSize={14}
            emptyText="Không có phường/xã nào khớp"
            data-testid={`${testIdPrefix}-ward`}
          />
        </div>
      </div>
    </div>
  );
}
