import { Plus, Trash2 } from "lucide-react";
import { C, font, radius } from "../../../../shared/theme";
import { Button } from "../../../../shared/components/common";
import { VEHICLE_TYPE_LABELS, type VehicleForm, type VehicleType } from "../../../services/occupancy-profile-service";
import { ProfileSection, TextInput, twoColumns } from "./fields";

/** Danh sách xe của người ở — dùng để tính "Giữ xe" theo số xe trên hóa đơn. */
export function VehiclesSection({ vehicles, onChange }: { vehicles: VehicleForm[]; onChange: (vehicles: VehicleForm[]) => void }) {
  const update = (index: number, patch: Partial<VehicleForm>) =>
    onChange(vehicles.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  return (
    <ProfileSection title="Thông tin xe" subtitle="Dịch vụ tính “theo số xe” (giữ xe) lấy số lượng từ đây.">
      {vehicles.map((vehicle, index) => (
        <div key={index} data-testid="profile-vehicle-row" style={{ border: `1px dashed ${C.border}`, borderRadius: radius.sm, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontFamily: font, fontSize: 13, color: C.textPrimary }}>Xe #{index + 1}</strong>
            <button type="button" aria-label={`Xóa xe #${index + 1}`} onClick={() => onChange(vehicles.filter((_, i) => i !== index))} style={{ border: "none", background: "none", cursor: "pointer", color: C.error, padding: 4 }}>
              <Trash2 size={15} />
            </button>
          </div>
          <div style={twoColumns}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
              Loại phương tiện
              <select
                value={vehicle.vehicleType}
                onChange={(e) => update(index, { vehicleType: e.target.value as VehicleType })}
                style={{ padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.sm, background: C.white }}
                data-testid="profile-vehicle-type"
              >
                {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((type) => (
                  <option key={type} value={type}>{VEHICLE_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <TextInput label="Tên / dòng xe" value={vehicle.name} maxLength={60} placeholder="VD: Wave, Vision" onChange={(name) => update(index, { name })} />
            <TextInput label="Biển số" value={vehicle.plateNumber} maxLength={20} placeholder="VD: 59D1-104.02" onChange={(plateNumber) => update(index, { plateNumber })} testId="profile-vehicle-plate" />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        icon={<Plus size={14} />}
        disabled={vehicles.length >= 10}
        onClick={() => onChange([...vehicles, { vehicleType: "Motorbike", name: "", plateNumber: "" }])}
        data-testid="profile-vehicle-add"
      >
        Thêm xe
      </Button>
    </ProfileSection>
  );
}
