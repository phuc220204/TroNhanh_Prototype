import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
// @ts-ignore
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import {
  Plus, Search, ChevronDown, ChevronRight, Home,
  X, Building2, MapPin, Settings, Zap, FileText, Wallet, StickyNote,
  Users, RefreshCw, Pencil, ExternalLink, AlertTriangle, MoreHorizontal, Eye, Bell, Lock
} from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { LandlordShell, type LandlordNavId, useLandlordShell } from "../../shared/components/LandlordShell";
import type { RoomStatus } from "../../shared/types/status";
import { ROOM_STATUS_META } from "../../shared/utils/statusMaps";
import { INIT_PROPERTIES, type Room, type Property } from "../../shared/data/mockProperties";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Field, SelectField } from "../../shared/components/common/FormField";
import { useAuth } from "../../shared/contexts/AuthContext";
import { supabase } from "../../shared/supabaseClient";

/* ══════════════════════════════════════════
   TYPES & CONSTANTS
   ══════════════════════════════════════════ */

const FILTER_CHIPS: { label: string; value: RoomStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Trống", value: "available" },
  { label: "Đã cọc", value: "deposited" },
  { label: "Đang thuê", value: "rented" },
  { label: "Đã ẩn", value: "hidden" },
];

const SORT_OPTIONS = ["Mới cập nhật", "Mã phòng", "Giá thuê", "Trạng thái"];

const VND = (n: string) => n;

type RoomActionModalType = "utility" | "paymentReminder" | "renewContract" | "occupantReminder" | "invoice" | "editRoom";

/**
 * Hợp đồng sắp hết hạn (≤30 ngày). Trạng thái DẪN XUẤT, không phải RoomStatus.
 * BR-002 chỉ có 4 giá trị: available / deposited / rented / hidden.
 */
const isContractExpiringSoon = (room: Room): boolean => {
  if (!room.contract?.end) return false;
  const end = new Date(room.contract.end);
  if (Number.isNaN(end.getTime())) return false;
  const daysLeft = (end.getTime() - Date.now()) / 86_400_000;
  return daysLeft >= 0 && daysLeft <= 30;
};
type RoomActionModalState = { type: RoomActionModalType; room: Room } | null;

/* Helper map DB Room to UI Room */
const mapDbRoomToRoom = (dbRoom: any): Room => {
  // Find the active contract
  const activeContract = dbRoom.contracts?.find((c: any) => c.status === "Active" || c.status === "active") || dbRoom.contracts?.[0];
  
  let occupant = null;
  let contract = null;
  
  if (activeContract) {
    const occ = activeContract.occupancies || activeContract.occupancy;
    occupant = {
      name: occ?.full_name || "Người ở",
      phone: occ?.phone_number || "",
      startDate: activeContract.start_date || "",
      occupantCount: Number(occ?.occupant_count || 1)
    };
    contract = {
      start: activeContract.start_date,
      end: activeContract.end_date,
      deposit: `${Number(activeContract.deposit || 0).toLocaleString("vi-VN")}đ`,
      status: activeContract.status === "Active" ? "Đang hiệu lực" : activeContract.status
    };
  } else if (dbRoom.occupant_name) {
    occupant = {
      name: dbRoom.occupant_name,
      phone: dbRoom.occupant_phone || "0901234567",
      startDate: dbRoom.lease_start_date || "01/01/2026",
      occupantCount: Number(dbRoom.occupant_count || 1)
    };
    contract = {
      start: dbRoom.lease_start_date,
      end: dbRoom.lease_end_date || "01/01/2027",
      deposit: `${Number(dbRoom.deposit_amount || 0).toLocaleString("vi-VN")}đ`,
      status: "Đang hiệu lực"
    };
  }

  // Find latest invoice of the room
  const latestInvoice = dbRoom.invoices && dbRoom.invoices.length > 0 
    ? [...dbRoom.invoices].sort((a: any, b: any) => b.period.localeCompare(a.period))[0]
    : null;

  let bill = null;
  if (latestInvoice) {
    const rentItem = latestInvoice.invoice_items?.find((i: any) => i.type === "Rent");
    const elecItem = latestInvoice.invoice_items?.find((i: any) => i.type === "Electricity");
    const waterItem = latestInvoice.invoice_items?.find((i: any) => i.type === "Water");
    const serviceItem = latestInvoice.invoice_items?.find((i: any) => i.type === "Service");
    
    bill = {
      rent: `${Number(rentItem?.amount || dbRoom.price).toLocaleString("vi-VN")}đ`,
      electric: `${Number(elecItem?.amount || 0).toLocaleString("vi-VN")}đ`,
      water: `${Number(waterItem?.amount || 0).toLocaleString("vi-VN")}đ`,
      service: `${Number(serviceItem?.amount || 0).toLocaleString("vi-VN")}đ`,
      total: `${Number(latestInvoice.total_amount || 0).toLocaleString("vi-VN")}đ`,
      paid: latestInvoice.status === "Paid"
    };
  } else if (dbRoom.rent_due_amount) {
    bill = {
      rent: `${Number(dbRoom.price || 0).toLocaleString("vi-VN")}đ`,
      electric: `${Number(dbRoom.electric_due_amount || 0).toLocaleString("vi-VN")}đ`,
      water: `${Number(dbRoom.water_due_amount || 0).toLocaleString("vi-VN")}đ`,
      service: `${Number(dbRoom.service_due_amount || 0).toLocaleString("vi-VN")}đ`,
      total: `${Number(dbRoom.total_due_amount || 0).toLocaleString("vi-VN")}đ`,
      paid: dbRoom.payment_status === "Paid"
    };
  }

  return {
    id: dbRoom.id,
    code: dbRoom.room_code || dbRoom.code || "",
    floor: typeof dbRoom.floor === "number" ? `Tầng ${dbRoom.floor}` : (dbRoom.floor || "Tầng 1"),
    status: (dbRoom.status === "Available" ? "available" : dbRoom.status === "Deposited" ? "deposited" : dbRoom.status === "Rented" ? "rented" : dbRoom.status === "Hidden" ? "hidden" : "available") as RoomStatus,
    area: `${dbRoom.area || 20} m²`,
    price: `${Number(dbRoom.price || 0).toLocaleString("vi-VN")}đ`,
    amenities: [],
    note: dbRoom.description || "",
    occupant,
    contract,
    bill
  };
};

/* ══════════════════════════════════════════
   SHARED PRIMITIVES (consistent with design system)
   ══════════════════════════════════════════ */
function StatusChip({ status, small }: { status: RoomStatus; small?: boolean }) {
  const m = ROOM_STATUS_META[status];
  return (
    <span style={{ fontFamily: font, fontSize: small ? 11 : 12, fontWeight: 700, color: C.white, background: m?.color || C.textSecondary, borderRadius: 999, padding: small ? "2px 9px" : "3px 11px", display: "inline-block", whiteSpace: "nowrap" }}>
      {m?.label || status}
    </span>
  );
}

function PayBadge({ paid }: { paid: boolean }) {
  return (
    <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: paid ? "#4A7A34" : "#B5503C" }}>
      {paid ? "Đã thanh toán" : "Chưa thanh toán"}
    </span>
  );
}

function PrimaryBtn({ children, onClick, small, disabled }: { children: React.ReactNode; onClick?: () => void; small?: boolean; disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: 7, 
        padding: small ? "8px 16px" : "11px 22px", 
        background: disabled ? C.border : C.primary, 
        color: disabled ? C.textSecondary : C.white, 
        border: "none", 
        borderRadius: 10, 
        fontFamily: font, 
        fontSize: small ? 13 : 14, 
        fontWeight: 700, 
        cursor: disabled ? "not-allowed" : "pointer", 
        boxShadow: disabled ? "none" : "0 2px 10px rgba(138,106,69,0.25)", 
        transition: "background 0.13s", 
        whiteSpace: "nowrap", 
        opacity: disabled ? 0.6 : 1 
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = C.primaryHover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = C.primary; }}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: small ? "7px 14px" : "10px 18px", background: C.white, color: C.textSecondary, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: small ? 13 : 14, fontWeight: 600, cursor: "pointer", transition: "all 0.13s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
      {children}
    </button>
  );
}

function AddPropertyModal({ onClose, onSave, isReadOnly }: { onClose: () => void; onSave: () => void; isReadOnly: boolean }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [floors, setFloors] = useState("");
  const [notes, setNotes] = useState("");
  const [bankName, setBankName] = useState("MB");
  const [bankAcc, setBankAcc] = useState("");
  const [bankNameHolder, setBankNameHolder] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!name || !address || !district) {
      alert("Vui lòng điền đầy đủ Tên, Địa chỉ và Quận/Huyện!");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from("properties")
        .insert({
          owner_id: user?.id,
          name,
          address,
          district,
          floor_count: Number(floors) || 1,
          electricity_unit_price: 3500,
          water_unit_price: 15000,
          service_fee: 100000,
          bank_name: bankName,
          bank_account_number: bankAcc,
          bank_account_name: bankNameHolder.toUpperCase()
        });
      if (error) throw error;
      alert("Đã lưu khu trọ mới thành công!");
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi thêm khu trọ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Thêm khu trọ" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving || isReadOnly} onClick={handleSubmit}>{saving ? "Đang lưu..." : "Lưu khu trọ"}</PrimaryBtn></>}>
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể thêm khu trọ.
        </div>
      )}
      <Field label="Tên khu trọ *" value={name} onChange={setName} placeholder="VD: Khu trọ Phan Văn Trị" />
      <Field label="Địa chỉ *" value={address} onChange={setAddress} placeholder="Số nhà, tên đường" />
      <Field label="Quận / Huyện *" value={district} onChange={setDistrict} placeholder="VD: Bình Thạnh, TP.HCM" />
      <Field label="Số tầng" value={floors} onChange={setFloors} placeholder="VD: 3" />
      
      <div style={{ margin: "16px 0 8px", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary }}>Thông tin ngân hàng (nhận chuyển khoản & QR)</span>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Ngân hàng thụ hưởng</span>
        <select value={bankName} onChange={e => setBankName(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
          <option value="MB">MB Bank (Ngân hàng Quân Đội)</option>
          <option value="VCB">Vietcombank</option>
          <option value="TCB">Techcombank</option>
          <option value="BIDV">BIDV</option>
          <option value="ACB">ACB</option>
        </select>
      </label>
      <Field label="Số tài khoản" value={bankAcc} onChange={setBankAcc} placeholder="Nhập số tài khoản ngân hàng" />
      <Field label="Tên chủ tài khoản" value={bankNameHolder} onChange={v => setBankNameHolder(v.toUpperCase())} placeholder="VD: NGUYEN VAN A" />

      <Field label="Ghi chú" value={notes} onChange={setNotes} placeholder="Ghi chú nội bộ về khu trọ" textarea rows={3} />
    </ModalShell>
  );
}

function AddRoomModal({ roomToEdit, onClose, properties, currentId, onSave, isReadOnly }: { 
  roomToEdit?: Room | null; onClose: () => void; properties: Property[]; currentId: string; onSave: () => void; isReadOnly: boolean 
}) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [propertyId, setPropertyId] = useState(currentId || (properties[0]?.id || ""));
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentId) setPropertyId(currentId);
  }, [currentId]);

  useEffect(() => {
    if (roomToEdit) {
      setCode(roomToEdit.code);
      setFloor(roomToEdit.floor);
      setArea(roomToEdit.area.replace(/\D/g, ""));
      setPrice(roomToEdit.price.replace(/\D/g, ""));
      // BR-002: rooms.status chỉ có Available | Deposited | Rented | Hidden
      setStatus(roomToEdit.status === "available" ? "Available" : roomToEdit.status === "hidden" ? "Hidden" : "Rented");
      setDescription(roomToEdit.note || "");
    }
  }, [roomToEdit]);

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!code || !price || !propertyId) {
      alert("Vui lòng điền đầy đủ Mã phòng, Giá thuê và Chọn khu trọ!");
      return;
    }
    try {
      setSaving(true);
      const cleanPrice = parseFloat(price.replace(/\D/g, ""));
      const cleanArea = area ? parseFloat(area.replace(/\D/g, "")) : 20;

      if (roomToEdit) {
        if (roomToEdit.id.startsWith("pvt") || roomToEdit.id.startsWith("q7") || roomToEdit.id.startsWith("td")) {
          alert("[Demo] Đã cập nhật phòng thành công!");
        } else {
          const { error } = await supabase
            .from("rooms")
            .update({
              property_id: propertyId,
              code,
              floor: floor || "Tầng 1",
              area: cleanArea,
              price: cleanPrice,
              status,
              description
            })
            .eq("id", roomToEdit.id);
          if (error) throw error;
          alert("Đã cập nhật phòng thành công!");
        }
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert({
            owner_id: user?.id,
            property_id: propertyId,
            code,
            floor: floor || "Tầng 1",
            area: cleanArea,
            price: cleanPrice,
            status,
            description
          });
        if (error) throw error;
        alert("Đã lưu phòng mới thành công!");
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi lưu phòng: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!roomToEdit;

  return (
    <ModalShell title={isEdit ? `Cập nhật phòng ${roomToEdit?.code}` : "Thêm phòng"} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving || isReadOnly} onClick={handleSubmit}>{saving ? "Đang lưu..." : (isEdit ? "Cập nhật" : "Lưu phòng")}</PrimaryBtn></>}>
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể {isEdit ? "cập nhật" : "thêm"} phòng.
        </div>
      )}
      <Field label="Mã phòng *" value={code} onChange={setCode} placeholder="VD: P101" />
      <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Thuộc khu trọ *</span>
        <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <Field label="Tầng / khu" value={floor} onChange={setFloor} placeholder="VD: Tầng 1" />
      <Field label="Diện tích (m²)" value={area} onChange={setArea} placeholder="VD: 25" />
      <Field label="Giá thuê (đ/tháng) *" value={price} onChange={setPrice} placeholder="VD: 3.200.000" />
      <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Trạng thái ban đầu</span>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
          <option value="Available">Trống</option>
          <option value="Deposited">Đã cọc</option>
          <option value="Rented">Đang thuê</option>
          <option value="Hidden">Đang ẩn / bảo trì</option>
        </select>
      </label>
      <Field label="Ghi chú" value={description} onChange={setDescription} placeholder="Ghi chú nội bộ" textarea rows={3} />
    </ModalShell>
  );
}

function UtilityMeterModal({ room, property, onClose, isReadOnly }: { room: Room; property: any; onClose: () => void; isReadOnly: boolean }) {
  const { user } = useAuth();
  const [electric, setElectric] = useState("");
  const [water, setWater] = useState("");
  const [saving, setSaving] = useState(false);
  const [previousElec, setPreviousElec] = useState(0);
  const [previousWater, setPreviousWater] = useState(0);

  const elecPrice = Number(property?.electricity_unit_price) || 3500;
  const waterPrice = Number(property?.water_unit_price) || 15000;

  useEffect(() => {
    const loadPrevious = async () => {
      try {
        const { data: elec } = await supabase
          .from("utility_readings")
          .select("current_reading")
          .eq("room_id", room.id)
          .eq("type", "Electricity")
          .order("created_at", { ascending: false })
          .limit(1);
        
        const { data: wat } = await supabase
          .from("utility_readings")
          .select("current_reading")
          .eq("room_id", room.id)
          .eq("type", "Water")
          .order("created_at", { ascending: false })
          .limit(1);
        
        if (elec && elec.length > 0) setPreviousElec(Number(elec[0].current_reading));
        if (wat && wat.length > 0) setPreviousWater(Number(wat[0].current_reading));
      } catch (e) {
        console.error(e);
      }
    };
    loadPrevious();
  }, [room.id]);

  const elecDiff = electric ? Math.max(0, Number(electric) - previousElec) : 0;
  const waterDiff = water ? Math.max(0, Number(water) - previousWater) : 0;
  const elecCost = elecDiff * elecPrice;
  const waterCost = waterDiff * waterPrice;

  const handleSave = async () => {
    if (isReadOnly) {
      alert("Hệ thống đang ở chế độ Chỉ đọc (Read-Only). Vui lòng gia hạn gói SaaS để thực hiện thao tác này.");
      return;
    }
    const currElec = Number(electric);
    const currWater = Number(water);

    if (!electric || !water) {
      alert("Vui lòng điền chỉ số điện và nước!");
      return;
    }
    if (currElec < previousElec) {
      alert("Lỗi: Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ!");
      return;
    }
    if (currWater < previousWater) {
      alert("Lỗi: Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ!");
      return;
    }

    try {
      setSaving(true);
      const period = new Date().toISOString().substring(0, 7);

      // Save electricity
      const { error: elecErr } = await supabase.from("utility_readings").insert({
        room_id: room.id,
        owner_id: user?.id,
        type: "Electricity",
        period,
        previous_reading: previousElec,
        current_reading: currElec,
        unit_price: elecPrice
      });
      if (elecErr) throw elecErr;

      // Save water
      const { error: watErr } = await supabase.from("utility_readings").insert({
        room_id: room.id,
        owner_id: user?.id,
        type: "Water",
        period,
        previous_reading: previousWater,
        current_reading: currWater,
        unit_price: waterPrice
      });
      if (watErr) throw watErr;

      alert(`Đã ghi nhận chỉ số thành công cho phòng ${room.code}!`);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi ghi nhận điện nước: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Ghi điện nước - ${room.code}`} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving || isReadOnly} onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu chỉ số"}</PrimaryBtn></>}>
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể thay đổi dữ liệu.
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>Chỉ số điện cũ: <strong>{previousElec} kWh</strong></p>
          <Field label="Chỉ số điện mới *" value={electric} onChange={setElectric} placeholder="VD: 1280" />
          {electric && (
            <p style={{ fontFamily: font, fontSize: 12, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
              Tiêu thụ: {elecDiff} kWh ({elecPrice.toLocaleString("vi-VN")}đ/kWh) = {elecCost.toLocaleString("vi-VN")}đ
            </p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>Chỉ số nước cũ: <strong>{previousWater} m³</strong></p>
          <Field label="Chỉ số nước mới *" value={water} onChange={setWater} placeholder="VD: 42" />
          {water && (
            <p style={{ fontFamily: font, fontSize: 12, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
              Tiêu thụ: {waterDiff} m³ ({waterPrice.toLocaleString("vi-VN")}đ/m³) = {waterCost.toLocaleString("vi-VN")}đ
            </p>
          )}
        </div>
      </div>
      <Field label="Ghi chú" placeholder="Ghi chú nếu có" textarea rows={3} />
    </ModalShell>
  );
}

function RoomInvoiceModal({ room, property, onClose, isReadOnly, onSave }: { room: Room; property: any; onClose: () => void; isReadOnly: boolean; onSave: () => void }) {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("invoices")
          .select("*")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setInvoice(data[0]);
          const { data: itms } = await supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", data[0].id);
          setItems(itms || []);
        } else if (room.bill) {
          // Fallback to room's mocked bill data so user can review the invoice UI instantly
          const mockRent = Number(room.bill.rent.replace(/\D/g, ""));
          const mockElec = Number(room.bill.electric.replace(/\D/g, ""));
          const mockWater = Number(room.bill.water.replace(/\D/g, ""));
          const mockServ = Number(room.bill.service.replace(/\D/g, ""));
          const mockTotal = Number(room.bill.total.replace(/\D/g, ""));

          setInvoice({
            id: `mock-inv-${room.id}`,
            room_id: room.id,
            period: "2026-07",
            due_date: "2026-07-10",
            total_amount: mockTotal,
            status: room.bill.paid ? "Paid" : "Unpaid",
            isMock: true
          });

          setItems([
            { description: "Tiền thuê phòng", amount: mockRent },
            { description: "Tiền điện", amount: mockElec },
            { description: "Tiền nước", amount: mockWater },
            { description: "Phí dịch vụ cố định", amount: mockServ }
          ]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [room.id, room.bill]);

  if (loading) {
    return (
      <ModalShell title={`Hóa đơn phòng ${room.code}`} onClose={onClose} footer={<GhostBtn onClick={onClose}>Đóng</GhostBtn>}>
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "20px 0" }}>Đang tải hóa đơn...</p>
      </ModalShell>
    );
  }

  if (!invoice) {
    return (
      <ModalShell title={`Hóa đơn phòng ${room.code}`} onClose={onClose} footer={<GhostBtn onClick={onClose}>Đóng</GhostBtn>}>
        <div style={{ textAlign: "center", padding: "24px 16px" }}>
          <p style={{ fontFamily: font, fontSize: 14.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.6 }}>
            Chưa phát sinh hóa đơn cho phòng <strong>{room.code}</strong> trong kỳ này.
          </p>
          <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
            Vui lòng ghi chỉ số điện nước trước, sau đó vào mục <strong>Hóa đơn &amp; Thanh toán</strong> để tạo hóa đơn tháng.
          </p>
        </div>
      </ModalShell>
    );
  }

  const bank = property?.bank_name || "MB";
  const acc = property?.bank_account_number || "0901234567";
  const name = property?.bank_account_name || "NGUYEN VAN A";
  const info = `Thanh toan hoa don phong ${room.code} ky ${invoice.period}`;
  const qrUrl = `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${invoice.total_amount}&addInfo=${encodeURIComponent(info)}&accountName=${encodeURIComponent(name)}`;

  const handleConfirmPaid = async () => {
    if (isReadOnly) {
      alert("Hệ thống ở chế độ Chỉ đọc (Read-Only)!");
      return;
    }
    try {
      setConfirming(true);
      if (invoice.isMock) {
        alert("[Demo] Ghi nhận đã thu tiền thành công!");
        onSave();
        onClose();
        return;
      }
      const { error } = await supabase
        .from("invoices")
        .update({ status: "Paid" })
        .eq("id", invoice.id);
      if (error) throw error;

      await supabase
        .from("payments")
        .insert({
          invoice_id: invoice.id,
          owner_id: user?.id,
          amount: invoice.total_amount,
          method: "BankTransfer",
          purpose: "RentInvoice"
        });

      // No rooms table update needed as payment status is calculated dynamically from invoices
      alert("Ghi nhận đã thu tiền thành công!");
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi ghi nhận thanh toán: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleCopyMsg = () => {
    const text = `[Hóa đơn thanh toán - Phòng ${room.code}]
Kỳ hóa đơn: ${invoice.period}
Hạn nộp: ${invoice.due_date}
Tổng tiền cần thanh toán: ${Number(invoice.total_amount).toLocaleString("vi-VN")}đ

Thông tin chuyển khoản:
- Ngân hàng: ${bank}
- Số tài khoản: ${acc}
- Chủ tài khoản: ${name}
- Nội dung: ${info}

Quét mã VietQR để thanh toán: ${qrUrl}`;

    navigator.clipboard.writeText(text);
    alert("Đã sao chép thông tin hóa đơn và link VietQR vào clipboard để gửi cho người thuê!");
  };

  return (
    <ModalShell 
      title={`Hóa đơn phòng ${room.code} - Kỳ ${invoice.period}`} 
      onClose={onClose}
      footer={
        <>
          <GhostBtn onClick={handleCopyMsg}>Gửi cho người thuê</GhostBtn>
          {invoice.status !== "Paid" ? (
            <PrimaryBtn disabled={confirming || isReadOnly} onClick={handleConfirmPaid}>
              {confirming ? "Đang ghi nhận..." : "Xác nhận đã thu"}
            </PrimaryBtn>
          ) : (
            <GhostBtn onClick={onClose}>Đóng</GhostBtn>
          )}
        </>
      }
    >
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể ghi nhận thanh toán.
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexDirection: isMobile ? "column" : "row" }}>
        {/* QR Code */}
        <div style={{ flex: 1.2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, background: C.white }}>
          <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 10px", textTransform: "uppercase" }}>Mã VietQR Thanh toán</p>
          <img src={qrUrl} alt="VietQR Code" style={{ width: "100%", maxWidth: 220, height: "auto" }} />
          <p style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, margin: "10px 0 0", textAlign: "center" }}>Quét bằng ứng dụng ngân hàng của người thuê</p>
        </div>

        {/* Invoice details */}
        <div style={{ flex: 1.8, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", margin: "0 0 4px" }}>Hạn nộp</p>
            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.primary }}>{invoice.due_date}</span>
          </div>

          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", margin: "0 0 4px" }}>Thông tin tài khoản</p>
            <div style={{ background: C.bg, padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
              <Row k="Ngân hàng" v={bank} />
              <Row k="Số tài khoản" v={acc} />
              <Row k="Chủ tài khoản" v={name} />
            </div>
          </div>

          <div>
            <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", margin: "0 0 6px" }}>Chi tiết chi phí</p>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
              {items.map((it, i) => (
                <div key={it.id || i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderBottom: i === items.length - 1 ? "none" : `1px solid ${C.border}`, fontSize: 13, background: C.white }}>
                  <span style={{ fontFamily: font, color: C.textPrimary }}>{it.description}</span>
                  <span style={{ fontFamily: font, fontWeight: 700, color: C.textPrimary }}>{Number(it.amount).toLocaleString("vi-VN")}đ</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `2px dashed ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>Tổng cần thu</span>
            <span style={{ fontFamily: font, fontSize: 18, fontWeight: 900, color: C.primary }}>{Number(invoice.total_amount).toLocaleString("vi-VN")}đ</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Trạng thái</span>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: invoice.status === "Paid" ? "#4A7A34" : "#B5503C", background: invoice.status === "Paid" ? "#E8F5E1" : "#FCECEC", padding: "4px 12px", borderRadius: 999 }}>
              {invoice.status === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}
            </span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function RoomActionPlaceholderModal({ state, onClose, isReadOnly }: { state: Exclude<RoomActionModalState, null>; onClose: () => void; isReadOnly: boolean }) {
  const copy: Record<RoomActionModalType, { title: string; body: string; cta: string }> = {
    utility: { title: "Ghi điện nước", body: "", cta: "Lưu chỉ số" },
    paymentReminder: { title: "Nhắc thanh toán", body: `Gửi nhắc thanh toán cho phòng ${state.room.code}.`, cta: "Gửi nhắc" },
    renewContract: { title: "Gia hạn hợp đồng", body: `Mở luồng gia hạn hợp đồng cho phòng ${state.room.code}.`, cta: "Tiếp tục" },
    occupantReminder: { title: "Nhắc người thuê", body: `Gửi nhắc người thuê phòng ${state.room.code} về hợp đồng sắp hết hạn.`, cta: "Gửi nhắc" },
    invoice: { title: "Xem hóa đơn", body: "", cta: "Đóng" },
    editRoom: { title: "Cập nhật phòng", body: "", cta: "Lưu" },
  };
  const c = copy[state.type];
  return (
    <ModalShell title={`${c.title} - ${state.room.code}`} onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={isReadOnly} onClick={onClose}>{c.cta}</PrimaryBtn></>}>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, lineHeight: 1.6, margin: 0 }}>{c.body}</p>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════
   ROOM DETAIL — shared content
   ══════════════════════════════════════════ */
function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {icon}
        <span style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{k}</span>
      <span style={{ fontFamily: font, fontSize: 13, fontWeight: strong ? 800 : 600, color: C.textPrimary, textAlign: "right" }}>{v}</span>
    </div>
  );
}

function RoomDetailContent({ room, onCreateListing }: { room: Room; onCreateListing: () => void }) {
  return (
    <div>
      <DetailSection icon={<Home size={16} color={C.primary} />} title="Thông tin phòng">
        <Row k="Mã phòng" v={room.code} />
        <Row k="Tầng / khu" v={room.floor} />
        <Row k="Diện tích" v={room.area} />
        <Row k="Giá thuê" v={VND(room.price)} strong />
        <Row k="Tiện ích" v={room.amenities.join(", ") || "—"} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
          <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Trạng thái</span>
          <StatusChip status={room.status} small />
        </div>
      </DetailSection>

      <DetailSection icon={<Users size={16} color={C.primary} />} title="Người thuê hiện tại">
        {room.occupant ? (
          <>
            <Row k="Họ tên" v={room.occupant.name} />
            <Row k="Số điện thoại" v={room.occupant.phone} />
            <Row k="Ngày bắt đầu thuê" v={room.occupant.startDate} />
            <Row k="Số người ở" v={`${room.occupant.occupantCount} người`} />
          </>
        ) : <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chưa có người thuê.</p>}
      </DetailSection>

      <DetailSection icon={<FileText size={16} color={C.primary} />} title="Hợp đồng">
        {room.contract ? (
          <>
            <Row k="Ngày bắt đầu" v={room.contract.start} />
            <Row k="Ngày kết thúc" v={room.contract.end} />
            <Row k="Tiền cọc" v={VND(room.contract.deposit)} />
            <Row k="Trạng thái hợp đồng" v={room.contract.status} />
          </>
        ) : <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Phòng chưa có hợp đồng.</p>}
      </DetailSection>

      <DetailSection icon={<Wallet size={16} color={C.primary} />} title="Thanh toán tháng này">
        {room.bill ? (
          <>
            <Row k="Tiền phòng" v={VND(room.bill.rent)} />
            <Row k="Tiền điện" v={VND(room.bill.electric)} />
            <Row k="Tiền nước" v={VND(room.bill.water)} />
            <Row k="Dịch vụ" v={VND(room.bill.service)} />
            <div style={{ borderTop: `1px dashed ${C.border}`, marginTop: 6, paddingTop: 6 }}>
              <Row k="Tổng cần thu" v={VND(room.bill.total)} strong />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>Trạng thái</span>
              <PayBadge paid={room.bill.paid} />
            </div>
          </>
        ) : <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Chưa phát sinh hóa đơn.</p>}
      </DetailSection>

      <DetailSection icon={<StickyNote size={16} color={C.primary} />} title="Ghi chú & bảo trì">
        <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.6 }}>{room.note || "Không có ghi chú."}</p>
        {room.status === "hidden" && (
          <div style={{ marginTop: 10, background: "#FDF0E4", border: `1px solid #EAD2BC`, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={15} color="#C07B4A" style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontFamily: font, fontSize: 12.5, color: "#8A5A30", lineHeight: 1.5 }}>Phòng đang ẩn khỏi danh sách (bảo trì hoặc chưa cho thuê).</span>
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function DetailActions({ room, onCreateListing, onUpdate, isReadOnly, onActionModal }: { room: Room; onCreateListing: () => void; onUpdate: (patch: Partial<Room>) => void; isReadOnly: boolean; onActionModal: (type: RoomActionModalType, room: Room) => void }) {
  const [panel, setPanel] = useState<null | "status">(null);

  const statusBtn = (s: RoomStatus) => {
    const m = ROOM_STATUS_META[s];
    const active = room.status === s;
    return (
      <button key={s} disabled={isReadOnly} onClick={() => { onUpdate({ status: s }); setPanel(null); }}
        style={{ fontFamily: font, fontSize: 12.5, fontWeight: active ? 800 : 600, color: active ? C.white : m?.color, background: active ? m?.color : C.white, border: `1.5px solid ${m?.color}`, borderRadius: 999, padding: "6px 13px", cursor: isReadOnly ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: isReadOnly && !active ? 0.5 : 1 }}>
        {m?.label || s}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {panel === "status" && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 10px" }}>Chọn trạng thái mới</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(Object.keys(ROOM_STATUS_META) as RoomStatus[]).map(statusBtn)}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <PrimaryBtn disabled={isReadOnly} small onClick={() => onActionModal("editRoom", room)}><Pencil size={14} /> Cập nhật phòng</PrimaryBtn>
        {room.status !== "available" && (
          <GhostBtn small onClick={() => onActionModal("utility", room)}><Zap size={14} /> Ghi điện nước</GhostBtn>
        )}
        {room.status !== "available" && (
          <GhostBtn small onClick={() => onActionModal("invoice", room)}><FileText size={14} /> Xem hóa đơn</GhostBtn>
        )}
        <GhostBtn small onClick={() => { if (isReadOnly) { alert("Chế độ chỉ đọc!"); return; } setPanel(p => p === "status" ? null : "status"); }}><RefreshCw size={14} /> Đổi trạng thái</GhostBtn>
        {room.status === "available" && (
          <button onClick={onCreateListing}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "#EBF1E5", color: "#4A7A34", border: `1.5px solid #C7D9B8`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            <ExternalLink size={14} /> Tạo tin đăng
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ATTENTION CARDS
   ══════════════════════════════════════════ */
function AttentionCards({ expiring, unpaid }: { expiring: number; unpaid: number }) {
  if (expiring === 0 && unpaid === 0) return null;
  const card = (color: string, bg: string, border: string, text: string) => (
    <div style={{ flex: 1, minWidth: 220, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <AlertTriangle size={17} color="#fff" />
      </div>
      <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary }}>{text}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
      {expiring > 0 && card("#C8861A", "#FBF1DD", "#EAD8B4", `${expiring} phòng sắp hết hạn hợp đồng`)}
      {unpaid > 0 && card("#C07B4A", "#FDF0E4", "#EAD2BC", `${unpaid} phòng chưa thanh toán tháng này`)}
    </div>
  );
}

/* ══════════════════════════════════════════
   KPI CARDS
   ══════════════════════════════════════════ */
function KpiCards({ rooms, scroll }: { rooms: Room[]; scroll?: boolean }) {
  const total = rooms.length;
  const empty = rooms.filter(r => r.status === "available").length;
  // "expiring"/"unpaid" không phải RoomStatus — phòng sắp hết hạn hoặc chưa
  // thanh toán VẪN là "rented", nên 2 nhánh cũ luôn false và vô nghĩa.
  const rented = rooms.filter(r => r.status === "rented").length;
  const hiddenCount = rooms.filter(r => r.status === "hidden").length;
  const items = [
    { label: "Tổng số phòng", value: total, accent: C.primary },
    { label: "Phòng trống", value: empty, accent: "#6B8E5A" },
    { label: "Đang thuê", value: rented, accent: C.secondary },
    { label: "Đang ẩn / bảo trì", value: hiddenCount, accent: "#C07B4A" },
  ];
  return (
    <div style={{ display: scroll ? "flex" : "grid", gridTemplateColumns: scroll ? undefined : "repeat(4, 1fr)", gap: 12, marginBottom: 16, overflowX: scroll ? "auto" : undefined, paddingBottom: scroll ? 4 : 0 }}>
      {items.map(it => (
        <div key={it.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", minWidth: scroll ? 130 : undefined, flexShrink: scroll ? 0 : undefined }}>
          <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{it.label}</p>
          <span style={{ fontFamily: font, fontSize: 30, fontWeight: 900, color: it.accent, lineHeight: 1, letterSpacing: "-0.03em" }}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   CONTROLS (search + chips + sort)
   ══════════════════════════════════════════ */
function RoomControls({ search, onSearch, filter, onFilter, sort, onSort, mobile }: {
  search: string; onSearch: (v: string) => void;
  filter: RoomStatus | "all"; onFilter: (v: RoomStatus | "all") => void;
  sort: string; onSort: (v: string) => void; mobile?: boolean;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: mobile ? "nowrap" : "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: mobile ? undefined : 240 }}>
          <Search size={16} color={C.textSecondary} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="Tìm theo mã phòng, người thuê..."
            style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px 10px 38px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
        </div>
        {!mobile && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setSortOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary, cursor: "pointer", whiteSpace: "nowrap" }}>
              {sort} <ChevronDown size={15} color={C.textSecondary} />
            </button>
            {sortOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(42,26,12,0.16)", padding: 6, zIndex: 40, minWidth: 180 }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o} onClick={() => { onSort(o); setSortOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", background: o === sort ? C.caramelSoft : "transparent", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: o === sort ? 700 : 500, color: C.textPrimary, cursor: "pointer" }}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_CHIPS.map(c => {
          const active = filter === c.value;
          return (
            <button key={c.value} onClick={() => onFilter(c.value)}
              style={{ fontFamily: font, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.white : C.textSecondary, background: active ? C.primary : C.white, border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 999, padding: mobile ? "9px 15px" : "7px 15px", minHeight: mobile ? 40 : undefined, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.12s" }}>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ROOM TABLE
   ══════════════════════════════════════════ */
function RoomActionMenu({ room, openActionMenuRoomId, setOpenActionMenuRoomId, onOpen, onCreateListing, onActionModal, mobile }: {
  room: Room;
  openActionMenuRoomId: string | null;
  setOpenActionMenuRoomId: (id: string | null) => void;
  onOpen: (r: Room) => void;
  onCreateListing: (r: Room) => void;
  onActionModal: (type: RoomActionModalType, room: Room) => void;
  mobile?: boolean;
}) {
  const open = openActionMenuRoomId === room.id;
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const update = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
  };
  useLayoutEffect(() => { if (open) update(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const reposition = () => update();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenActionMenuRoomId(null); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpenActionMenuRoomId(null);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, setOpenActionMenuRoomId]);

  const itemsByStatus: Record<RoomStatus, { icon: React.ReactNode; label: string; onClick: () => void }[]> = {
    available: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onActionModal("editRoom", room) },
      { icon: <ExternalLink size={15} />, label: "Tạo tin đăng", onClick: () => onCreateListing(room) },
    ],
    deposited: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <FileText size={15} />, label: "Xem hợp đồng", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onActionModal("editRoom", room) },
    ],
    // "expiring" và "unpaid" KHÔNG phải RoomStatus (BR-002 chỉ có 4 giá trị):
    // phòng sắp hết hạn hoặc chưa thanh toán VẪN ở trạng thái "rented". Thao tác
    // của 2 nhánh cũ đó đã được gộp vào đây.
    rented: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <Zap size={15} />, label: "Ghi điện nước", onClick: () => onActionModal("utility", room) },
      { icon: <Wallet size={15} />, label: "Xem hóa đơn", onClick: () => onActionModal("invoice", room) },
      { icon: <Bell size={15} />, label: "Nhắc thanh toán", onClick: () => onActionModal("paymentReminder", room) },
      { icon: <RefreshCw size={15} />, label: "Gia hạn hợp đồng", onClick: () => onActionModal("renewContract", room) },
      { icon: <Bell size={15} />, label: "Nhắc người ở", onClick: () => onActionModal("occupantReminder", room) },
      { icon: <FileText size={15} />, label: "Xem hợp đồng", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onActionModal("editRoom", room) },
    ],
    hidden: [
      { icon: <Eye size={15} />, label: "Xem chi tiết", onClick: () => onOpen(room) },
      { icon: <RefreshCw size={15} />, label: "Cập nhật trạng thái", onClick: () => onOpen(room) },
      { icon: <Pencil size={15} />, label: "Cập nhật phòng", onClick: () => onActionModal("editRoom", room) },
    ],
  };
  const items = itemsByStatus[room.status] || itemsByStatus.available;

  return (
    <>
      <button ref={btnRef} type="button" aria-label={`Mở thao tác phòng ${room.code}`} onClick={e => { e.stopPropagation(); setOpenActionMenuRoomId(open ? null : room.id); }}
        style={{ width: mobile ? 40 : 32, height: mobile ? 40 : 32, borderRadius: 8, border: `1px solid ${C.border}`, background: open ? C.caramelSoft : C.white, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = C.bg; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = C.white; }}>
        <MoreHorizontal size={17} />
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} onClick={e => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 190, background: C.white, border: "1px solid #DDD0BC", borderRadius: 12, boxShadow: "0 8px 24px rgba(92,70,50,0.12)", padding: 8, zIndex: 1000 }}>
          {items.map((it, i) => (
            <button key={i} type="button" onClick={() => { it.onClick(); setOpenActionMenuRoomId(null); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 38, padding: "0 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: "#3E2E1E", textAlign: "left", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F0E7D6")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ color: C.primary, display: "flex", flexShrink: 0 }}>{it.icon}</span>{it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function RoomTable({ rooms, openActionMenuRoomId, setOpenActionMenuRoomId, onOpen, onCreateListing, onActionModal }: {
  rooms: Room[];
  openActionMenuRoomId: string | null;
  setOpenActionMenuRoomId: (id: string | null) => void;
  onOpen: (r: Room) => void;
  onCreateListing: (r: Room) => void;
  onActionModal: (type: RoomActionModalType, room: Room) => void;
}) {
  const cols = [
    { label: "Mã phòng", w: "13%" },
    { label: "Trạng thái", w: "14%" },
    { label: "Người thuê", w: "19%" },
    { label: "Giá thuê", w: "14%" },
    { label: "Hợp đồng", w: "14%" },
    { label: "Thanh toán", w: "16%" },
    { label: "Thao tác", w: "10%" },
  ];
  const cell = { fontFamily: font, fontSize: 13, color: C.textPrimary, padding: "12px 9px", verticalAlign: "middle" as const, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const };
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
        <colgroup>{cols.map((c, i) => <col key={i} style={{ width: c.w }} />)}</colgroup>
        <thead>
          <tr style={{ background: C.caramelSoft }}>
            {cols.map((c, i) => (
              <th key={i} style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: i === cols.length - 1 ? "center" : "left", padding: "12px 9px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((r, i) => (
              <tr key={r.id} onClick={() => onOpen(r)}
                style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 ? "rgba(240,231,214,0.35)" : C.white }}
                onMouseEnter={e => (e.currentTarget.style.background = C.caramelSoft)}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? "rgba(240,231,214,0.35)" : C.white)}>
                <td style={cell}>
                  <div style={{ fontWeight: 800 }}>{r.code}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: C.textSecondary, marginTop: 2 }}>{r.floor}</div>
                </td>
                <td style={cell}><StatusChip status={r.status} small /></td>
                <td style={cell} title={r.occupant?.name}>{r.occupant ? r.occupant.name : <span style={{ color: C.textSecondary }}>—</span>}</td>
                <td style={{ ...cell, fontWeight: 700 }}>{VND(r.price)}</td>
                <td style={{ ...cell, color: C.textSecondary }} title={r.contract?.status}>{r.contract ? r.contract.status : "—"}</td>
                <td style={cell}>{r.bill ? <PayBadge paid={r.bill.paid} /> : <span style={{ color: C.textSecondary }}>—</span>}</td>
                <td style={{ ...cell, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                  <RoomActionMenu room={r} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={onOpen} onCreateListing={onCreateListing} onActionModal={onActionModal} />
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileRoomCard({ room, openActionMenuRoomId, setOpenActionMenuRoomId, onOpen, onCreateListing, onActionModal }: {
  room: Room;
  openActionMenuRoomId: string | null;
  setOpenActionMenuRoomId: (id: string | null) => void;
  onOpen: (r: Room) => void;
  onCreateListing: (r: Room) => void;
  onActionModal: (type: RoomActionModalType, room: Room) => void;
}) {
  return (
    <div onClick={() => onOpen(room)} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{room.code} <span style={{ fontWeight: 500, fontSize: 12.5, color: C.textSecondary }}>· {room.floor}</span></span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusChip status={room.status} small />
          <div onClick={e => e.stopPropagation()}>
            <RoomActionMenu room={room} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={onOpen} onCreateListing={onCreateListing} onActionModal={onActionModal} mobile />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: font, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.textSecondary }}>Người thuê</span>
          <span style={{ color: C.textPrimary, fontWeight: 600 }}>{room.occupant?.name || "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: C.textSecondary }}>Giá thuê</span>
          <span style={{ color: C.textPrimary, fontWeight: 700 }}>{room.price}</span>
        </div>
        {room.bill && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.textSecondary }}>Thanh toán</span>
            <PayBadge paid={room.bill.paid} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   EMPTY STATES
   ══════════════════════════════════════════ */
function EmptyBlock({ icon, title, sub, btn, onClick }: { icon: React.ReactNode; title: string; sub: string; btn: string; onClick: () => void }) {
  return (
    <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 16, padding: "56px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.caramelSoft, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{title}</h3>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 14px", maxWidth: 320 }}>{sub}</p>
      <PrimaryBtn onClick={onClick}><Plus size={16} /> {btn}</PrimaryBtn>
    </div>
  );
}

/* ══════════════════════════════════════════
   SETTINGS VIEW (tab=settings)
   ══════════════════════════════════════════ */
function SettingsView({ property, isReadOnly, onSave }: { property: any; isReadOnly: boolean; onSave: () => void }) {
  const [elecPrice, setElecPrice] = useState(3500);
  const [waterPrice, setWaterPrice] = useState(15000);
  const [serviceFee, setServiceFee] = useState(100000);
  const [bankName, setBankName] = useState("MB");
  const [bankAcc, setBankAcc] = useState("");
  const [bankNameHolder, setBankNameHolder] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (property) {
      setElecPrice(Number(property.electricity_unit_price) || 3500);
      setWaterPrice(Number(property.water_unit_price) || 15000);
      setServiceFee(Number(property.service_fee) || 100000);
      setBankName(property.bank_name || "MB");
      setBankAcc(property.bank_account_number || "");
      setBankNameHolder(property.bank_account_name || "");
    }
  }, [property]);

  const handleSave = async () => {
    if (isReadOnly) {
      alert("Hệ thống đang ở chế độ Chỉ đọc (Read-Only)!");
      return;
    }
    if (!bankAcc || !bankNameHolder) {
      alert("Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản nhận tiền!");
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from("properties")
        .update({
          electricity_unit_price: Number(elecPrice),
          water_unit_price: Number(waterPrice),
          service_fee: Number(serviceFee),
          bank_name: bankName,
          bank_account_number: bankAcc,
          bank_account_name: bankNameHolder.toUpperCase()
        })
        .eq("id", property.id);

      if (error) throw error;
      alert("Đã cập nhật cấu hình dịch vụ và tài khoản nhận tiền thành công!");
      onSave();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi lưu cấu hình: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, maxWidth: 640, width: "100%", boxSizing: "border-box" }}>
      <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px" }}>Cài đặt vận hành khu: {property.name}</h2>
      
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể thay đổi cấu hình.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        <h3 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.primary, margin: 0, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>Biểu phí dịch vụ của khu</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Giá điện (đ/kWh)</span>
            <input type="number" value={elecPrice} onChange={e => setElecPrice(Number(e.target.value))} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Giá nước (đ/m³)</span>
            <input type="number" value={waterPrice} onChange={e => setWaterPrice(Number(e.target.value))} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
          </label>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Phí dịch vụ cố định (đ/phòng/tháng)</span>
          <input type="number" value={serviceFee} onChange={e => setServiceFee(Number(e.target.value))} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
        </label>

        <h3 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.primary, margin: "12px 0 0", borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>Tài khoản nhận tiền chuyển khoản (Mã QR)</h3>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Ngân hàng thụ hưởng</span>
          <select value={bankName} onChange={e => setBankName(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            <option value="MB">MB Bank (Ngân hàng Quân Đội)</option>
            <option value="VCB">Vietcombank</option>
            <option value="TCB">Techcombank</option>
            <option value="BIDV">BIDV</option>
            <option value="ACB">ACB</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Số tài khoản ngân hàng</span>
          <input value={bankAcc} onChange={e => setBankAcc(e.target.value)} placeholder="Nhập số tài khoản ngân hàng" style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>Tên người thụ hưởng (viết hoa không dấu)</span>
          <input value={bankNameHolder} onChange={e => setBankNameHolder(e.target.value.toUpperCase())} placeholder="VD: NGUYEN VAN A" style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", boxSizing: "border-box", background: C.white, outline: "none" }} />
        </label>

        {bankAcc && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 16, border: `1px solid ${C.border}`, borderRadius: 12, background: C.caramelSoft, marginTop: 8 }}>
            <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary }}>Xem trước mã QR thanh toán (VietQR)</span>
            <img 
              src={`https://img.vietqr.io/image/${bankName}-${bankAcc}-compact2.png?amount=50000&addInfo=Demo%20Thanh%20Toan&accountName=${encodeURIComponent(bankNameHolder || 'NGUYEN VAN A')}`} 
              alt="VietQR Preview" 
              style={{ width: 150, height: 150, borderRadius: 8, background: C.white, border: `1px solid ${C.border}`, padding: 4 }} 
            />
            <span style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary, textAlign: "center" }}>Hệ thống tự động tạo mã QR động kèm số tiền và nội dung chuyển khoản cho từng hóa đơn khi xuất bản.</span>
          </div>
        )}
      </div>

      <PrimaryBtn disabled={saving || isReadOnly} onClick={handleSave}>
        {saving ? "Đang lưu..." : "Lưu cấu hình"}
      </PrimaryBtn>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAYMENTS & INVOICES VIEW (tab=payments)
   ══════════════════════════════════════════ */
function PaymentsView({ property, isReadOnly, user, loadDbData, mobile }: { property: any; isReadOnly: boolean; user: any; loadDbData: () => void; mobile?: boolean }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [period, setPeriod] = useState("2026-07");
  const [dueDate, setDueDate] = useState("2026-07-10");
  const [loading, setLoading] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const loadInvoices = async () => {
    if (!property) return;

    // Check if using mock property
    if (property.id.startsWith("pvt") || property.id.startsWith("q7") || property.id.startsWith("td")) {
      setLoading(true);
      if (property.id === "pvt") {
        setInvoices([
          { id: "inv-pvt-102", room_code: "P102", rooms: { room_code: "P102" }, period: "2026-06", total_amount: 3170000, status: "Paid", due_date: "2026-06-10" },
          { id: "inv-pvt-202", room_code: "P202", rooms: { room_code: "P202" }, period: "2026-06", total_amount: 3405000, status: "Unpaid", due_date: "2026-06-10" },
          { id: "inv-pvt-203", room_code: "P203", rooms: { room_code: "P203" }, period: "2026-06", total_amount: 3230000, status: "Paid", due_date: "2026-06-10" },
          { id: "inv-pvt-301", room_code: "P301", rooms: { room_code: "P301" }, period: "2026-06", total_amount: 4070000, status: "Paid", due_date: "2026-06-10" }
        ]);
      } else if (property.id === "q7") {
        setInvoices([
          { id: "inv-q7-a01", room_code: "A01", rooms: { room_code: "A01" }, period: "2026-06", total_amount: 5770000, status: "Paid", due_date: "2026-06-10" }
        ]);
      } else if (property.id === "td") {
        setInvoices([
          { id: "inv-td-p01", room_code: "P01", rooms: { room_code: "P01" }, period: "2026-06", total_amount: 2430000, status: "Paid", due_date: "2026-06-10" }
        ]);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("*, rooms!inner(room_code)")
        .eq("owner_id", user.id)
        .eq("rooms.property_id", property.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (e) {
      console.error(e);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [property]);

  const handleOpenDetail = async (inv: any) => {
    setSelectedInvoice(inv);
    if (inv.id.startsWith("inv-pvt") || inv.id.startsWith("inv-q7") || inv.id.startsWith("inv-td") || inv.id.startsWith("mock-inv")) {
      const rent = inv.total_amount - 370000;
      setInvoiceItems([
        { id: "item-1", type: "Rent", description: "Tiền thuê phòng", quantity: 1, unit_price: rent, amount: rent },
        { id: "item-2", type: "Electricity", description: "Tiền điện (50 kWh)", quantity: 50, unit_price: 3500, amount: 175000 },
        { id: "item-3", type: "Water", description: "Tiền nước (4 m³)", quantity: 4, unit_price: 15000, amount: 60000 },
        { id: "item-4", type: "Service", description: "Phí dịch vụ cố định", quantity: 1, unit_price: 135000, amount: 135000 }
      ]);
      return;
    }

    try {
      const { data } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id);
      setInvoiceItems(data || []);
    } catch (e) {
      console.error(e);
      setInvoiceItems([
        { type: "Rent", description: "Tiền thuê phòng", amount: inv.total_amount - 500000 },
        { type: "Electricity", description: "Tiền điện", amount: 350000 },
        { type: "Water", description: "Tiền nước", amount: 150000 },
      ]);
    }
  };

  const handleConfirmPaid = async () => {
    if (isReadOnly) {
      alert("Hệ thống ở chế độ Chỉ đọc (Read-Only)!");
      return;
    }
    if (!selectedInvoice) return;

    if (selectedInvoice.id.startsWith("inv-pvt") || selectedInvoice.id.startsWith("inv-q7") || selectedInvoice.id.startsWith("inv-td") || selectedInvoice.id.startsWith("mock-inv")) {
      setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? { ...inv, status: "Paid" } : inv));
      alert("Ghi nhận đã thu tiền thành công!");
      setSelectedInvoice(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "Paid" })
        .eq("id", selectedInvoice.id);
      if (error) throw error;

      await supabase
        .from("payments")
        .insert({
          invoice_id: selectedInvoice.id,
          owner_id: user.id,
          amount: selectedInvoice.total_amount,
          method: "BankTransfer",
          purpose: "RentInvoice"
        });

      alert("Ghi nhận đã thu tiền thành công!");
      setSelectedInvoice(null);
      loadInvoices();
      loadDbData();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi ghi nhận: " + err.message);
    }
  };

  const handleGenerate = async () => {
    if (isReadOnly) {
      alert("Chế độ chỉ đọc!");
      return;
    }
    try {
      if (property.id.startsWith("pvt") || property.id.startsWith("q7") || property.id.startsWith("td")) {
        const rentedRooms = property.rooms.filter(r => r.status === "rented");
        if (rentedRooms.length === 0) {
          alert("Không có phòng nào đang ở trạng thái 'Đang thuê' để tạo hóa đơn!");
          return;
        }

        const elecPrice = Number(property?.electricity_unit_price) || 3500;
        const waterPrice = Number(property?.water_unit_price) || 15000;
        const serviceFee = Number(property?.service_fee) || 100000;

        const newInvoices = rentedRooms.map((r) => {
          const rentAmt = Number(r.price.replace(/\D/g, "")) || 3000000;
          const total = rentAmt + (100 * elecPrice) + (4 * waterPrice) + serviceFee;
          return {
            id: `mock-inv-${r.id}-${period}`,
            room_code: r.code,
            rooms: { room_code: r.code },
            period,
            due_date: dueDate,
            total_amount: total,
            status: "Unpaid"
          };
        });

        setInvoices(prev => [...newInvoices, ...prev]);
        alert(`[Demo] Đã khởi tạo thành công ${newInvoices.length} hóa đơn cho kỳ ${period}!`);
        setShowAddInvoice(false);
        return;
      }

      const { data: dbRooms } = await supabase
        .from("rooms")
        .select("*")
        .eq("property_id", property.id)
        .eq("status", "Rented");

      if (!dbRooms || dbRooms.length === 0) {
        alert("Không có phòng nào đang ở trạng thái 'Đang thuê' để tạo hóa đơn!");
        return;
      }

      const elecPrice = Number(property?.electricity_unit_price) || 3500;
      const waterPrice = Number(property?.water_unit_price) || 15000;
      const serviceFee = Number(property?.service_fee) || 100000;

      let count = 0;
      for (const r of dbRooms) {
        // Fetch active contract & occupants
        const { data: activeContract } = await supabase
          .from("contracts")
          .select(`
            id,
            occupancies (
              occupant_count
            )
          `)
          .eq("room_id", r.id)
          .eq("status", "Active")
          .limit(1)
          .maybeSingle();

        const occupants = Number((activeContract as any)?.occupancies?.occupant_count || 1);

        const { data: readings } = await supabase
          .from("utility_readings")
          .select("*")
          .eq("room_id", r.id)
          .eq("period", period);

        const elecR = readings?.find(rd => rd.type === "Electricity");
        const waterR = readings?.find(rd => rd.type === "Water");

        const elecQty = elecR ? Math.max(0, Number(elecR.current_reading) - Number(elecR.previous_reading)) : 0;
        const waterQty = waterR ? Math.max(0, Number(waterR.current_reading) - Number(waterR.previous_reading)) : 0;

        const elecAmt = elecQty * elecPrice;
        const waterAmt = waterR ? (waterQty * waterPrice) : (occupants * waterPrice);
        const rentAmt = Number(r.price);
        const total = rentAmt + elecAmt + waterAmt + serviceFee;

        // Insert invoice
        const { data: newInv, error: invErr } = await supabase
          .from("invoices")
          .insert({
            room_id: r.id,
            contract_id: activeContract?.id || null,
            owner_id: user.id,
            period,
            due_date: dueDate,
            total_amount: total,
            status: "Unpaid"
          })
          .select()
          .single();

        if (invErr) throw invErr;

        // Insert items
        const items = [
          { invoice_id: newInv.id, type: "Rent", description: "Tiền thuê phòng", quantity: 1, unit_price: rentAmt, amount: rentAmt },
          { invoice_id: newInv.id, type: "Electricity", description: `Tiền điện (${elecQty} kWh)`, quantity: elecQty, unit_price: elecPrice, amount: elecAmt },
          { 
            invoice_id: newInv.id, 
            type: "Water", 
            description: waterR ? `Tiền nước (${waterQty} m³)` : `Tiền nước (${occupants} người)`, 
            quantity: waterR ? waterQty : occupants, 
            unit_price: waterPrice, 
            amount: waterAmt 
          },
          { invoice_id: newInv.id, type: "Service", description: "Phí dịch vụ cố định", quantity: 1, unit_price: serviceFee, amount: serviceFee }
        ];

        await supabase.from("invoice_items").insert(items);

        // No rooms table update needed as payment status is calculated dynamically from invoices
        count++;
      }

      alert(`Đã khởi tạo thành công ${count} hóa đơn cho kỳ ${period}!`);
      setShowAddInvoice(false);
      loadInvoices();
      loadDbData();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi tạo hóa đơn: " + err.message);
    }
  };

  const getQR = (inv: any) => {
    const bank = property?.bank_name || "MB";
    const acc = property?.bank_account_number || "0901234567";
    const name = encodeURIComponent(property?.bank_account_name || "NGUYEN VAN A");
    const total = inv.total_amount;
    const info = encodeURIComponent(`Thanh toan hoa don phong ${inv.rooms?.room_code || inv.room_code || "P101"} ky ${inv.period}`);
    return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${total}&addInfo=${info}&accountName=${name}`;
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Quản lý hóa đơn &amp; đóng tiền</h2>
        <PrimaryBtn disabled={isReadOnly} onClick={() => setShowAddInvoice(true)}><Plus size={15} /> Tạo hóa đơn tháng</PrimaryBtn>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ background: C.caramelSoft }}>
              {["Phòng", "Kỳ hóa đơn", "Hạn nộp", "Tổng tiền", "Trạng thái", "Thao tác"].map(h => (
                <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", padding: "10px 12px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, idx) => (
              <tr key={inv.id || idx} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, padding: "12px" }}>{inv.rooms?.room_code || inv.room_code}</td>
                <td style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "12px" }}>{inv.period}</td>
                <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "12px" }}>{inv.due_date}</td>
                <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary, padding: "12px" }}>{Number(inv.total_amount).toLocaleString("vi-VN")}đ</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: inv.status === "Paid" ? "#4A7A34" : "#B5503C", background: inv.status === "Paid" ? "#E8F5E1" : "#FCECEC", padding: "3px 10px", borderRadius: 999 }}>
                    {inv.status === "Paid" ? "Đã thu" : "Chưa thu"}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => handleOpenDetail(inv)} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <ModalShell title={`Chi tiết hóa đơn phòng ${selectedInvoice.rooms?.room_code || selectedInvoice.room_code}`} onClose={() => setSelectedInvoice(null)}
          footer={
            <>
              <GhostBtn onClick={() => setSelectedInvoice(null)}>Đóng</GhostBtn>
              {selectedInvoice.status !== "Paid" && (
                <PrimaryBtn disabled={isReadOnly} onClick={handleConfirmPaid}>Xác nhận đã thu</PrimaryBtn>
              )}
            </>
          }>
          {isReadOnly && (
            <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              ⚠️ Tài khoản ở chế độ chỉ đọc. Không thể ghi nhận đóng tiền.
            </div>
          )}
          
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 6px" }}>Kỳ hóa đơn: <strong>{selectedInvoice.period}</strong></p>
            <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>Hạn thanh toán: <strong>{selectedInvoice.due_date}</strong></p>
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 10px" }}>Khoản phí chi tiết</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {invoiceItems.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13 }}>
                  <span style={{ color: C.textSecondary }}>{item.description}</span>
                  <span style={{ color: C.textPrimary, fontWeight: 600 }}>{Number(item.amount).toLocaleString("vi-VN")}đ</span>
                </div>
              ))}
              <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 14.5, fontWeight: 800 }}>
                <span style={{ color: C.textPrimary }}>Tổng tiền hóa đơn</span>
                <span style={{ color: C.primary }}>{Number(selectedInvoice.total_amount).toLocaleString("vi-VN")}đ</span>
              </div>
            </div>
          </div>

          {selectedInvoice.status !== "Paid" && (
            <div style={{ textAlign: "center", borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 12px" }}>Quét mã QR bằng app Ngân hàng để chuyển khoản</p>
              <img src={getQR(selectedInvoice)} alt="Mã VietQR đóng tiền phòng" style={{ width: 220, height: 220, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8 }} />
              <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "8px 0 0" }}>STK: {property?.bank_account_number || "—"} · Ngân hàng: {property?.bank_name || "—"}</p>
            </div>
          )}
        </ModalShell>
      )}

      {showAddInvoice && (
        <ModalShell title="Tạo hóa đơn tháng mới" onClose={() => setShowAddInvoice(false)}
          footer={<><GhostBtn onClick={() => setShowAddInvoice(false)}>Hủy</GhostBtn><PrimaryBtn onClick={handleGenerate}>Tạo hóa đơn</PrimaryBtn></>}>
          <Field label="Kỳ hóa đơn (YYYY-MM)" value={period} onChange={setPeriod} placeholder="VD: 2026-07" />
          <Field label="Hạn nộp hóa đơn (YYYY-MM-DD)" value={dueDate} onChange={setDueDate} placeholder="VD: 2026-07-10" />
        </ModalShell>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   OCCUPANTS & CONTRACTS VIEW (tab=occupants)
   ══════════════════════════════════════════ */
function OccupantsView({ property, mobile }: { property: any; mobile?: boolean }) {
  const [occupants, setOccupants] = useState<any[]>([]);

  useEffect(() => {
    if (!property) return;
    const loadOccupants = () => {
      const activeOccupants: any[] = [];
      property.rooms.forEach((r: any) => {
        if (r.occupant) {
          activeOccupants.push({
            roomCode: r.code,
            name: r.occupant.name,
            phone: r.occupant.phone,
            startDate: r.occupant.startDate,
            endDate: r.contract?.end || "—",
            price: r.price,
            deposit: r.contract?.deposit || "—"
          });
        }
      });
      setOccupants(activeOccupants);
    };
    loadOccupants();
  }, [property]);

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: mobile ? 16 : 22 }}>
      <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, marginBottom: 18 }}>Người thuê trọ &amp; Hợp đồng</h2>
      
      {occupants.length === 0 ? (
        <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>Chưa có người thuê nào ở khu trọ này.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: C.caramelSoft }}>
                {["Phòng", "Họ và tên", "Số điện thoại", "Bắt đầu thuê", "Hết hạn HĐ", "Tiền cọc", "Tiền thuê"].map(h => (
                  <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", padding: "10px 12px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {occupants.map((t, idx) => (
                <tr key={idx} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, padding: "12px" }}>{t.roomCode}</td>
                  <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 600, color: C.textPrimary, padding: "12px" }}>{t.name}</td>
                  <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "12px" }}>{t.phone}</td>
                  <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "12px" }}>{t.startDate}</td>
                  <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "12px" }}>{t.endDate}</td>
                  <td style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "12px" }}>{t.deposit}</td>
                  <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary, padding: "12px" }}>{t.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export function QuanLyPhongPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();

  const [subStatus, setSubStatus] = useState<"NONE" | "TRIAL" | "ACTIVE" | "READ_ONLY">("NONE");

  // Read activeTab directly from location query parameters to support sub-page tabs reactively
  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("tab") || "rooms") as LandlordNavId;
  }, [location.search]);

  // Fetch initial subStatus and subscribe to updates
  useEffect(() => {
    const fetchSub = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("user_subscriptions")
          .select("status")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          setSubStatus(data[0].status);
        } else {
          setSubStatus("NONE");
        }
      } catch (err) {
        console.error("Error fetching sub status in QuanLyPhongPage:", err);
      }
    };
    fetchSub();

    const handleSubChange = (e: any) => {
      setSubStatus(e.detail);
    };
    window.addEventListener("tronhanh_sub_status", handleSubChange);
    return () => window.removeEventListener("tronhanh_sub_status", handleSubChange);
  }, [user]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [modal, setModal] = useState<null | "property" | "room">(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [openActionMenuRoomId, setOpenActionMenuRoomId] = useState<string | null>(null);
  const [roomActionModal, setRoomActionModal] = useState<RoomActionModalState>(null);
  const [loading, setLoading] = useState(true);

  const isReadOnly = subStatus === "READ_ONLY";

  const loadDbData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: props, error: propsErr } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id);
      if (propsErr) throw propsErr;

      const { data: rms, error: rmsErr } = await supabase
        .from("rooms")
        .select(`
          *,
          contracts(
            id,
            start_date,
            end_date,
            rent_price,
            deposit,
            status,
            occupancies(
              id,
              full_name,
              phone_number,
              occupant_count
            )
          ),
          invoices(
            id,
            period,
            due_date,
            total_amount,
            status,
            invoice_items(
              id,
              type,
              description,
              quantity,
              unit_price,
              amount
            )
          )
        `)
        .eq("owner_id", user.id);
      if (rmsErr) throw rmsErr;

      if (props && props.length > 0) {
        const mapped: Property[] = props.map((p: any) => {
          const propertyRooms = (rms || [])
            .filter((r: any) => r.property_id === p.id)
            .map((r: any) => mapDbRoomToRoom(r));
          return {
            id: p.id,
            name: p.name,
            address: p.address,
            district: p.district,
            electricity_unit_price: Number(p.electricity_unit_price) || 3500,
            water_unit_price: Number(p.water_unit_price) || 15000,
            service_fee: Number(p.service_fee) || 100000,
            bank_name: p.bank_name || "MB",
            bank_account_number: p.bank_account_number || "",
            bank_account_name: p.bank_account_name || "",
            rooms: propertyRooms
          } as any;
        });

        setProperties(mapped);
        if (!mapped.some(p => p.id === selectedId)) {
          setSelectedId(mapped[0].id);
        }
      } else {
        setProperties(INIT_PROPERTIES);
        setSelectedId(INIT_PROPERTIES[0].id);
      }
    } catch (err) {
      console.error("Error loading properties/rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDbData();
  }, [user]);

  const selected = properties.find(p => p.id === selectedId) || null;

  const updateRoom = async (roomId: string, patch: Partial<Room>) => {
    if (isReadOnly) {
      alert("Hệ thống đang ở chế độ Chỉ đọc (Read-Only). Vui lòng gia hạn gói SaaS để thực hiện thao tác này.");
      return;
    }
    setProperties(prev => prev.map(p =>
      p.id !== selectedId ? p : { ...p, rooms: p.rooms.map(r => r.id === roomId ? { ...r, ...patch } : r) }
    ));
    setDetailRoom(prev => prev && prev.id === roomId ? { ...prev, ...patch } : prev);

    if (roomId.startsWith("pvt") || roomId.startsWith("q7") || roomId.startsWith("td")) {
      return;
    }

    try {
      const dbPatch: any = {};
      if (patch.status) {
        // BR-002: chỉ 4 giá trị hợp lệ. "Repairing" vi phạm CHECK constraint.
        dbPatch.status = patch.status === "available" ? "Available"
          : patch.status === "rented" ? "Rented"
          : patch.status === "hidden" ? "Hidden"
          : "Deposited";
      }
      // Cột thật là room_code, không phải code. `description` được thêm ở migration 0100.
      if (patch.code) dbPatch.room_code = patch.code;
      if (patch.note !== undefined) dbPatch.description = patch.note;

      const { error } = await supabase
        .from("rooms")
        .update(dbPatch)
        .eq("id", roomId);
      if (error) throw error;
    } catch (err: any) {
      console.error("Error updating room in DB:", err);
    }
  };

  const filteredRooms = useMemo(() => {
    if (!selected) return [];
    let rs = selected.rooms;
    const q = search.trim().toLowerCase();
    if (q) rs = rs.filter(r =>
      r.code.toLowerCase().includes(q) ||
      r.floor.toLowerCase().includes(q) ||
      (r.occupant?.name.toLowerCase().includes(q) ?? false));
    if (filter !== "all") rs = rs.filter(r => r.status === filter);
    const arr = [...rs];
    if (sort === "Mã phòng") arr.sort((a, b) => a.code.localeCompare(b.code));
    else if (sort === "Giá thuê") arr.sort((a, b) => parseInt(b.price.replace(/\D/g, "")) - parseInt(a.price.replace(/\D/g, "")));
    else if (sort === "Trạng thái") arr.sort((a, b) => a.status.localeCompare(b.status));
    return arr;
  }, [selected, search, filter, sort]);

  const handleCreateListing = (room: Room) => navigate("/dang-tin", {
    state: {
      prefill: {
        title: `Phòng ${room.code} - ${selected?.name ?? ""}`.trim(),
        address: selected?.address ?? "",
        area: room.area.replace(/\D/g, ""),
        price: room.price.replace(/\D/g, ""),
        roomType: "Phòng trọ",
      }
    }
  });

  const counts = (p: Property) => ({
    total: p.rooms.length,
    empty: p.rooms.filter(r => r.status === "available").length,
  });

  // "expiring" / "unpaid" KHÔNG phải RoomStatus (BR-002 chỉ có 4 giá trị) — đó là
  // trạng thái DẪN XUẤT từ hợp đồng và hóa đơn. Trước đây code so sánh
  // r.status === "expiring" nên luôn ra 0.
  const propStats = selected ? {
    expiring: selected.rooms.filter(r => isContractExpiringSoon(r)).length,
    unpaid: selected.rooms.filter(r => r.bill != null && !r.bill.paid).length,
  } : { expiring: 0, unpaid: 0 };

  /* ───────────────────── PROPERTY LIST (desktop left panel) ──────── */
  const PropertyCard = ({ p }: { p: Property }) => {
    const c = counts(p);
    const active = p.id === selectedId;
    return (
      <button onClick={() => { setSelectedId(p.id); setFilter("all"); setSearch(""); }}
        style={{ textAlign: "left", width: "100%", position: "relative", background: active ? C.white : "transparent", border: `1px solid ${active ? C.border : "transparent"}`, borderRadius: 12, padding: "14px 16px 14px 18px", cursor: "pointer", boxShadow: active ? "0 2px 10px rgba(92,70,50,0.08)" : "none", transition: "all 0.13s" }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.55)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        {active && <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 4, borderRadius: 4, background: C.primary }} />}
        <p style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>{p.name}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9 }}>
          <MapPin size={12} color={C.textSecondary} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{p.district}</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>{c.total} phòng</span>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: "#6B8E5A" }}>{c.empty} trống</span>
        </div>
      </button>
    );
  };

  /* ───────────────────── DRAWER / BOTTOM SHEET ──────── */
  const RoomDetail = () => {
    if (!detailRoom) return null;
    return (
      <div onClick={() => setDetailRoom(null)} style={{ position: "fixed", inset: 0, background: "rgba(42,26,12,0.5)", zIndex: 300, display: "flex", justifyContent: isMobile ? "center" : "flex-end", alignItems: isMobile ? "flex-end" : "stretch" }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: C.bg, width: isMobile ? "100%" : 440, maxHeight: isMobile ? "92vh" : "100%", height: isMobile ? undefined : "100%", borderTopLeftRadius: isMobile ? 20 : 0, borderTopRightRadius: isMobile ? 20 : 0, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(42,26,12,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: C.white, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div>
              <h3 style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Chi tiết phòng {detailRoom.code}</h3>
              <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>{selected?.name}</span>
            </div>
            <button onClick={() => setDetailRoom(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={22} color={C.textSecondary} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 22px 22px" }}>
            <RoomDetailContent room={detailRoom} onCreateListing={() => handleCreateListing(detailRoom)} />
          </div>
          <div style={{ padding: "16px 22px", background: C.white, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <DetailActions room={detailRoom} isReadOnly={isReadOnly} onUpdate={patch => updateRoom(detailRoom.id, patch)} onCreateListing={() => { setDetailRoom(null); handleCreateListing(detailRoom); }} onActionModal={(type, r) => { setDetailRoom(null); setRoomActionModal({ type, room: r }); }} />
          </div>
        </div>
      </div>
    );
  };

  const Modals = () => (
    <>
      {modal === "property" && <AddPropertyModal onClose={() => setModal(null)} onSave={loadDbData} isReadOnly={isReadOnly} />}
      {modal === "room" && <AddRoomModal onClose={() => setModal(null)} properties={properties} currentId={selectedId} onSave={loadDbData} isReadOnly={isReadOnly} />}
      {roomActionModal?.type === "utility" && <UtilityMeterModal room={roomActionModal.room} property={selected} onClose={() => setRoomActionModal(null)} isReadOnly={isReadOnly} />}
      {roomActionModal?.type === "invoice" && <RoomInvoiceModal room={roomActionModal.room} property={selected} onClose={() => setRoomActionModal(null)} isReadOnly={isReadOnly} onSave={loadDbData} />}
      {roomActionModal?.type === "editRoom" && <AddRoomModal roomToEdit={roomActionModal.room} onClose={() => setRoomActionModal(null)} properties={properties} currentId={selectedId} onSave={loadDbData} isReadOnly={isReadOnly} />}
      {roomActionModal && roomActionModal.type !== "utility" && roomActionModal.type !== "invoice" && roomActionModal.type !== "editRoom" && <RoomActionPlaceholderModal state={roomActionModal} onClose={() => setRoomActionModal(null)} isReadOnly={isReadOnly} />}
    </>
  );

  const getMobileTitle = () => {
    if (activeTab === "settings") return "Cài đặt khu trọ";
    if (activeTab === "payments") return "Hóa đơn & Thanh toán";
    if (activeTab === "occupants") return "Người thuê & Hợp đồng";
    return "Khu trọ & Phòng";
  };

  const renderTabContent = (isMobileView?: boolean) => {
    if (!selected) {
      return <EmptyBlock icon={<Building2 size={28} color={C.primary} />} title="Bạn chưa có khu trọ nào" sub="Tạo khu trọ đầu tiên để quản lý danh sách phòng." btn="Thêm khu trọ" onClick={() => setModal("property")} />;
    }
    switch (activeTab) {
      case "settings":
        return <SettingsView property={selected} isReadOnly={isReadOnly} onSave={loadDbData} />;
      case "payments":
        return <PaymentsView property={selected} isReadOnly={isReadOnly} user={user} loadDbData={loadDbData} mobile={isMobileView} />;
      case "occupants":
        return <OccupantsView property={selected} mobile={isMobileView} />;
      default:
        return selected.rooms.length === 0 ? (
          <EmptyBlock icon={<Home size={28} color={C.primary} />} title="Khu trọ này chưa có phòng" sub="Thêm phòng đầu tiên để bắt đầu quản lý." btn="Thêm phòng" onClick={() => setModal("room")} />
        ) : (
          <>
            {isMobileView ? (
              <>
                <AttentionCards expiring={propStats.expiring} unpaid={propStats.unpaid} />
                <KpiCards rooms={selected.rooms} scroll />
                <p style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "8px 0 14px" }}>Danh sách phòng</p>
                <RoomControls search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} mobile />
                {filteredRooms.length === 0
                  ? <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "32px 0" }}>Không tìm thấy phòng phù hợp.</p>
                  : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {filteredRooms.map(r => <MobileRoomCard key={r.id} room={r} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={setDetailRoom} onCreateListing={handleCreateListing} onActionModal={(type, room) => setRoomActionModal({ type, room })} />)}
                    </div>
                  )}
              </>
            ) : (
              <>
                <KpiCards rooms={selected.rooms} />
                <AttentionCards expiring={propStats.expiring} unpaid={propStats.unpaid} />
                <p style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 16px" }}>Danh sách phòng</p>
                <RoomControls search={search} onSearch={setSearch} filter={filter} onFilter={setFilter} sort={sort} onSort={setSort} />
                {filteredRooms.length === 0
                  ? <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "48px", textAlign: "center", fontFamily: font, fontSize: 14, color: C.textSecondary }}>Không tìm thấy phòng phù hợp với bộ lọc.</div>
                  : <RoomTable rooms={filteredRooms} openActionMenuRoomId={openActionMenuRoomId} setOpenActionMenuRoomId={setOpenActionMenuRoomId} onOpen={setDetailRoom} onCreateListing={handleCreateListing} onActionModal={(type, room) => setRoomActionModal({ type, room })} />}
              </>
            )}
          </>
        );
    }
  };

  /* ════════════════════════ MOBILE ════════════════════════ */
  if (isMobile) {
    return (
      <LandlordShell active={activeTab} mobileTitle={getMobileTitle()}>
        {properties.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyBlock icon={<Building2 size={26} color={C.primary} />} title="Bạn chưa có khu trọ nào" sub="Tạo khu trọ đầu tiên để quản lý danh sách phòng." btn="Thêm khu trọ" onClick={() => setModal("property")} />
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px" }}>
            {activeTab === "rooms" && (
              <button onClick={() => setSwitcherOpen(true)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 16, cursor: "pointer", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building2 size={18} color={C.primary} />
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontFamily: font, fontSize: 10, fontWeight: 700, color: C.textSecondary, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Khu trọ</p>
                    <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{selected?.name}</span>
                  </div>
                </div>
                <ChevronDown size={18} color={C.textSecondary} />
              </button>
            )}

            {renderTabContent(true)}
          </div>
        )}

        {/* FAB */}
        {activeTab === "rooms" && (
          <button onClick={() => { if (isReadOnly) { alert("Chế độ chỉ đọc!"); return; } setModal("room"); }}
            style={{ position: "fixed", right: 18, bottom: "calc(76px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: "50%", background: C.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(138,106,69,0.36)", zIndex: 90 }}>
            <Plus size={24} color="white" />
          </button>
        )}

        {/* Property switcher bottom sheet */}
        {switcherOpen && (
          <div onClick={() => setSwitcherOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(42,26,12,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.bg, width: "100%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "10px 16px 24px", maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: C.border, margin: "0 auto 16px" }} />
              <p style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px" }}>Khu trọ của tôi</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {properties.map(p => {
                  const c = counts(p);
                  const active = p.id === selectedId;
                  return (
                    <button key={p.id} onClick={() => { setSelectedId(p.id); setFilter("all"); setSearch(""); setSwitcherOpen(false); }}
                      style={{ textAlign: "left", background: active ? C.white : "transparent", border: `1.5px solid ${active ? C.primary : C.border}`, borderRadius: 12, padding: "13px 15px", cursor: "pointer" }}>
                      <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 3px" }}>{p.name}</p>
                      <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{p.district} · {c.total} phòng · {c.empty} trống</span>
                    </button>
                  );
                })}
              </div>
              <GhostBtn onClick={() => { setSwitcherOpen(false); setModal("property"); }}><Plus size={15} /> Thêm khu trọ</GhostBtn>
            </div>
          </div>
        )}

        <RoomDetail />
        <Modals />
      </LandlordShell>
    );
  }

  /* ════════════════════════ DESKTOP ════════════════════════ */
  return (
    <LandlordShell active={activeTab} mobileTitle={getMobileTitle()}>
      {properties.length === 0 ? (
        <div style={{ maxWidth: 600, margin: "60px auto", width: "100%", padding: "0 32px" }}>
          <EmptyBlock icon={<Building2 size={28} color={C.primary} />} title="Bạn chưa có khu trọ nào" sub="Tạo khu trọ đầu tiên để quản lý danh sách phòng." btn="Thêm khu trọ" onClick={() => setModal("property")} />
        </div>
      ) : (
        <div style={{ flex: 1, maxWidth: 1320, margin: "0 auto", width: "100%", padding: "28px 32px 80px", display: "flex", gap: 28, alignItems: "flex-start" }}>
          {/* LEFT PANEL */}
          <aside style={{ width: 300, flexShrink: 0, position: "sticky", top: 16 }}>
            <p style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: "0 0 14px" }}>Khu trọ của tôi</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {properties.map(p => <PropertyCard key={p.id} p={p} />)}
            </div>
            <button onClick={() => setModal("property")}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", background: "transparent", border: `1.5px dashed ${C.border}`, borderRadius: 12, fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.primary, cursor: "pointer", transition: "all 0.13s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "rgba(255,255,255,0.55)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}>
              <Plus size={16} /> Thêm khu trọ
            </button>
          </aside>

          {/* MAIN CONTENT */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
              <span onClick={() => navigate("/chu-tro")} style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>Dashboard chủ trọ</span>
              <ChevronRight size={15} color={C.textSecondary} />
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary }}>Quản lý khu trọ &amp; phòng</span>
              <ChevronRight size={15} color={C.textSecondary} />
              <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary }}>{selected!.name}</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: font, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{selected!.name}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={14} color={C.textSecondary} />
                  <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>{selected!.address}</span>
                </div>
              </div>
              {activeTab === "rooms" && (
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <GhostBtn onClick={() => navigate("/chu-tro/quan-ly-phong?tab=settings")}><Settings size={15} /> Cài đặt khu trọ</GhostBtn>
                  <PrimaryBtn disabled={isReadOnly} onClick={() => setModal("room")}><Plus size={16} /> Thêm phòng</PrimaryBtn>
                </div>
              )}
            </div>

            {renderTabContent(false)}
          </main>
        </div>
      )}

      <RoomDetail />
      <Modals />
    </LandlordShell>
  );
}

export default QuanLyPhongPage;
