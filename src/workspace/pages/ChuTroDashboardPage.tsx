import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Building2, FileText, Wallet, LifeBuoy, Plus, Zap, ChevronDown, ChevronRight, 
  Eye, Pencil, EyeOff, Trash2, Lock, Home, Users, CheckSquare, AlertTriangle, 
  TrendingUp, Clock, Calendar
} from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { LandlordShell, useLandlordShell } from "../../shared/components/LandlordShell";
import type { RoomStatus } from "../../shared/types/status";
import { PROPERTIES, ATTENTION, KPIS, STATUS_DIST, PREVIEW_ROOMS, RECENT_LISTINGS } from "../../shared/data/mockLandlord";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Field, SelectField } from "../../shared/components/common/FormField";
import { useAuth } from "../../shared/contexts/AuthContext";
import { supabase } from "../../shared/supabaseClient";

/* ══════════════════════════════════════════
   SHARED PRIMITIVES
   ══════════════════════════════════════════ */
function PrimaryBtn({ children, onClick, small, disabled }: { children: React.ReactNode; onClick?: () => void; small?: boolean; disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{ 
        display: "inline-flex", alignItems: "center", gap: 7, 
        padding: small ? "8px 16px" : "10px 18px", 
        background: disabled ? C.border : C.primary, 
        color: disabled ? C.textSecondary : C.white, 
        border: "none", borderRadius: 10, fontFamily: font, 
        fontSize: small ? 13 : 13.5, fontWeight: 700, 
        cursor: disabled ? "not-allowed" : "pointer", 
        boxShadow: disabled ? "none" : "0 2px 10px rgba(138,106,69,0.25)", 
        whiteSpace: "nowrap", opacity: disabled ? 0.6 : 1,
        transition: "background 0.15s"
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
      style={{ 
        display: "inline-flex", alignItems: "center", gap: 7, 
        padding: small ? "7px 14px" : "9px 16px", 
        background: C.white, color: C.textSecondary, 
        border: `1.5px solid ${C.border}`, borderRadius: 10, 
        fontFamily: font, fontSize: small ? 13 : 13.5, fontWeight: 600, 
        cursor: "pointer", whiteSpace: "nowrap",
        transition: "all 0.15s"
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}>
      {children}
    </button>
  );
}

function StatusChip({ status }: { status: RoomStatus }) {
  let label = "Trống";
  let bg = "#EBF2E8";
  let color = "#4F7A4A";

  if (status === "available" || status === "Available") {
    label = "Trống";
    bg = "#EBF2E8";
    color = "#4F7A4A";
  } else if (status === "rented" || status === "Rented") {
    label = "Đang thuê";
    bg = "#F5EFE6";
    color = "#9B8C78";
  } else if (status === "deposited" || status === "Deposited" || status === "Đã cọc" || status === "đã cọc") {
    label = "Đã cọc";
    bg = "#FEF6EC";
    color = "#C99B65";
  } else if (status === "hidden" || status === "Hidden") {
    label = "Đã ẩn";
    bg = "#FCECEC";
    color = "#C07B4A";
  }

  return (
    <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color, background: bg, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function PayText({ paid }: { paid: boolean | null }) {
  if (paid === null) return <span style={{ color: C.textSecondary }}>—</span>;
  return <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: paid ? "#4F7A4A" : "#C07B4A" }}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</span>;
}

/* ══════════════════════════════════════════
   PROPERTY SELECTOR
   ══════════════════════════════════════════ */
function PropertySelector({ value, onChange, options, mobile }: { value: string; onChange: (v: string) => void; options: string[]; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", width: mobile ? "100%" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {!mobile && <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textSecondary }}>Đang xem:</span>}
        <button onClick={() => setOpen(o => !o)}
          style={{ 
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, 
            padding: mobile ? "12px 14px" : "9px 14px", minHeight: mobile ? 44 : undefined, 
            background: C.white, border: `1.5px solid ${open ? C.primary : C.border}`, 
            borderRadius: 10, fontFamily: font, fontSize: 13.5, fontWeight: 700, 
            color: C.textPrimary, cursor: "pointer", width: mobile ? "100%" : undefined, 
            minWidth: mobile ? undefined : 200, boxShadow: "0 2px 6px rgba(42,26,12,0.01)" 
          }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Building2 size={15} color={C.primary} />{value}</span>
          <ChevronDown size={16} color={C.textSecondary} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: mobile ? 0 : 80, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(42,26,12,0.1)", padding: 6, zIndex: 41, minWidth: 220 }}>
            {options.map(p => (
              <button key={p} onClick={() => { onChange(p); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "10px 12px", background: p === value ? C.caramelSoft : "transparent", border: "none", borderRadius: 8, fontFamily: font, fontSize: 13.5, fontWeight: p === value ? 700 : 500, color: C.textPrimary, cursor: "pointer" }}>
                {p}
                {p === value && <ChevronRight size={14} color={C.primary} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UtilityModal({ onClose, properties, isReadOnly, onSave }: { onClose: () => void; properties: any[]; isReadOnly: boolean; onSave: () => void }) {
  const { user } = useAuth();
  const [propId, setPropId] = useState(properties[0]?.id || "");
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState("");
  const [electric, setElectric] = useState("");
  const [water, setWater] = useState("");
  const [saving, setSaving] = useState(false);
  const [previousElec, setPreviousElec] = useState(0);
  const [previousWater, setPreviousWater] = useState(0);

  const selectedProp = properties.find(p => p.id === propId);
  const elecPrice = Number(selectedProp?.electricity_unit_price) || 3500;
  const waterPrice = Number(selectedProp?.water_unit_price) || 15000;

  useEffect(() => {
    if (properties.length > 0 && !propId) {
      setPropId(properties[0].id);
    }
  }, [properties]);

  useEffect(() => {
    if (!propId) return;
    const fetchRooms = async () => {
      try {
        const { data } = await supabase
          .from("rooms")
          .select("*")
          .eq("property_id", propId);
        setRooms(data || []);
        if (data && data.length > 0) {
          setRoomId(data[0].id);
        } else {
          setRoomId("");
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchRooms();
  }, [propId]);

  useEffect(() => {
    if (!roomId) {
      setPreviousElec(0);
      setPreviousWater(0);
      return;
    }
    const fetchPrevious = async () => {
      try {
        const { data: elec } = await supabase
          .from("utility_readings")
          .select("current_reading")
          .eq("room_id", roomId)
          .eq("type", "Electricity")
          .order("created_at", { ascending: false })
          .limit(1);
        
        const { data: wat } = await supabase
          .from("utility_readings")
          .select("current_reading")
          .eq("room_id", roomId)
          .eq("type", "Water")
          .order("created_at", { ascending: false })
          .limit(1);
        
        setPreviousElec(elec && elec.length > 0 ? Number(elec[0].current_reading) : 0);
        setPreviousWater(wat && wat.length > 0 ? Number(wat[0].current_reading) : 0);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPrevious();
  }, [roomId]);

  const elecDiff = electric ? Math.max(0, Number(electric) - previousElec) : 0;
  const waterDiff = water ? Math.max(0, Number(water) - previousWater) : 0;
  const elecCost = elecDiff * elecPrice;
  const waterCost = waterDiff * waterPrice;

  const handleSave = async () => {
    if (isReadOnly) {
      alert("Hệ thống đang ở chế độ Chỉ đọc (Read-Only). Vui lòng gia hạn gói SaaS để thực hiện thao tác này.");
      return;
    }
    if (!roomId) {
      alert("Vui lòng chọn phòng trọ!");
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
        room_id: roomId,
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
        room_id: roomId,
        owner_id: user?.id,
        type: "Water",
        period,
        previous_reading: previousWater,
        current_reading: currWater,
        unit_price: waterPrice
      });
      if (watErr) throw watErr;

      alert(`Đã ghi nhận chỉ số thành công!`);
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi ghi nhận: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Ghi điện nước nhanh" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving || isReadOnly} onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu chỉ số"}</PrimaryBtn></>}>
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể thay đổi dữ liệu.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Chọn khu trọ *</span>
          <select value={propId} onChange={e => setPropId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Chọn phòng *</span>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            {rooms.length === 0 && <option value="">Không có phòng nào</option>}
            {rooms.map(r => <option key={r.id} value={r.id}>{r.room_code}</option>)}
          </select>
        </label>
      </div>

      {roomId && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>Chỉ số điện cũ: <strong>{previousElec} kWh</strong></p>
            <Field label="Chỉ số điện mới *" value={electric} onChange={setElectric} placeholder="VD: 1280" />
            {electric && (
              <p style={{ fontFamily: font, fontSize: 11, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
                Tiêu thụ: {elecDiff} kWh ({elecPrice.toLocaleString("vi-VN")}đ/kWh) = {elecCost.toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 6px" }}>Chỉ số nước cũ: <strong>{previousWater} m³</strong></p>
            <Field label="Chỉ số nước mới *" value={water} onChange={setWater} placeholder="VD: 42" />
            {water && (
              <p style={{ fontFamily: font, fontSize: 11, color: C.primary, margin: "4px 0 0", fontWeight: 600 }}>
                Tiêu thụ: {waterDiff} m³ ({waterPrice.toLocaleString("vi-VN")}đ/m³) = {waterCost.toLocaleString("vi-VN")}đ
              </p>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function AddRoomModal({ onClose, properties, isReadOnly, onSave }: { onClose: () => void; properties: any[]; isReadOnly: boolean; onSave: () => void }) {
  const { user } = useAuth();
  const [propId, setPropId] = useState(properties[0]?.id || "");
  const [code, setCode] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("Available");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (properties.length > 0 && !propId) {
      setPropId(properties[0].id);
    }
  }, [properties]);

  const handleSave = async () => {
    if (isReadOnly) {
      alert("Hệ thống đang ở chế độ Chỉ đọc (Read-Only). Vui lòng gia hạn gói SaaS để thực hiện thao tác này.");
      return;
    }
    if (!propId) {
      alert("Vui lòng chọn hoặc tạo khu trọ trước!");
      return;
    }
    if (!code || !area || !price) {
      alert("Vui lòng nhập Mã phòng, Diện tích và Giá thuê!");
      return;
    }
    try {
      setSaving(true);
      const cleanPrice = Number(price.replace(/\D/g, ""));
      const cleanArea = Number(area.replace(/\D/g, ""));
      const cleanFloor = Number(floor) || 1;

      const { error } = await supabase
        .from("rooms")
        .insert({
          property_id: propId,
          owner_id: user?.id,
          room_code: code,
          floor: cleanFloor,
          area: cleanArea,
          price: cleanPrice,
          status,
          description: notes
        });

      if (error) throw error;
      alert(`Đã thêm phòng ${code} thành công!`);
      onSave();
      onClose();
    } catch (e: any) {
      console.error(e);
      alert("Lỗi khi thêm phòng: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Thêm phòng mới" onClose={onClose}
      footer={<><GhostBtn onClick={onClose}>Hủy</GhostBtn><PrimaryBtn disabled={saving || isReadOnly} onClick={handleSave}>{saving ? "Đang lưu..." : "Lưu phòng"}</PrimaryBtn></>}>
      {isReadOnly && (
        <div style={{ background: "#FCECEC", color: C.repairing, padding: "10px 14px", borderRadius: 8, fontFamily: font, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          ⚠️ Tài khoản đang ở chế độ chỉ đọc (Read-Only). Không thể thay đổi dữ liệu.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Chọn khu trọ *</span>
          <select value={propId} onChange={e => setPropId(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <Field label="Mã phòng *" value={code} onChange={setCode} placeholder="VD: P101" />
        <Field label="Số tầng (nhập số)" value={floor} onChange={setFloor} placeholder="VD: 1" />
        <Field label="Diện tích (m²)" value={area} onChange={setArea} placeholder="VD: 25" />
        <Field label="Giá thuê (đ/tháng)" value={price} onChange={setPrice} placeholder="VD: 3.200.000" />

        <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Trạng thái ban đầu</span>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 13px", width: "100%", background: C.white, outline: "none" }}>
            <option value="Available">Trống</option>
            <option value="Rented">Đang thuê</option>
            <option value="Deposited">Đã cọc</option>
            <option value="Hidden">Đã ẩn</option>
          </select>
        </label>

        <Field label="Ghi chú nội bộ" value={notes} onChange={setNotes} placeholder="Ghi chú về phòng này" textarea rows={3} />
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════
   REUSABLE SECTIONS
   ══════════════════════════════════════════ */
function SegmentedBar({ rooms, mockData, property }: { rooms: any[]; mockData: typeof STATUS_DIST; property: string }) {
  const activeRooms = rooms.length > 0 
    ? (property === "Tất cả khu trọ" ? rooms : rooms.filter(r => r.properties?.name === property))
    : (property === "Tất cả khu trọ" ? PREVIEW_ROOMS : PREVIEW_ROOMS.filter(r => r.property === property));

  const total = activeRooms.length;
  
  const data = [
    { label: "Trống", value: activeRooms.filter(r => r.status === "Available" || r.status === "available").length, color: "#4F7A4A" },
    { label: "Đã cọc", value: activeRooms.filter(r => r.status === "Deposited" || r.status === "deposited" || r.status === "Đã cọc" || r.status === "đã cọc").length, color: C.secondary },
    { label: "Đang thuê", value: activeRooms.filter(r => r.status === "Rented" || r.status === "rented").length, color: "#9B8C78" },
    { label: "Đã ẩn", value: activeRooms.filter(r => r.status === "Hidden" || r.status === "hidden").length, color: "#C07B4A" },
  ];

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", marginBottom: 12, background: "#EADCCB" }}>
        {data.map(s => {
          const pct = total > 0 ? (s.value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div 
              key={s.label} 
              style={{ width: `${pct}%`, background: s.color }} 
              title={`${s.label}: ${s.value}`} 
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
        {data.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>{s.label} <b style={{ color: C.textPrimary }}>{s.value}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomTaskBtn({ task, onClick }: { task: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, background: C.caramelSoft, border: "none", borderRadius: 8, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap" }}>{task}</button>
  );
}

function UtilityCard({ 
  title, desc, progress, cta, onClick, color, bgImage 
}: { 
  title: string; desc: string; progress?: { pct: number; label: string }; cta: string; onClick: () => void; color: string; bgImage?: string 
}) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ 
        background: C.white, border: `1px solid ${hov ? color : C.border}`, borderRadius: 16, padding: "20px 22px", 
        display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s", 
        transform: hov ? "translateY(-2px)" : "none", boxShadow: hov ? "0 6px 20px rgba(42,26,12,0.06)" : "0 2px 10px rgba(42,26,12,0.02)", 
        position: "relative", overflow: "hidden", minHeight: 140 
      }}>
      
      <div style={{ zIndex: 2, marginRight: 60 }}>
        <h3 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>{title}</h3>
        <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 12px", lineHeight: 1.45 }}>{desc}</p>
        
        {progress && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
              <span>{progress.label}</span>
            </div>
            <div style={{ height: 6, background: "#EADCCB", borderRadius: 99 }}>
              <div style={{ width: `${progress.pct}%`, height: "100%", background: color, borderRadius: 99 }} />
            </div>
          </div>
        )}

        <button onClick={onClick} style={{ 
          fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.white, background: color, 
          border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", 
          boxShadow: `0 2px 8px ${color}33`, whiteSpace: "nowrap"
        }}>
          {cta}
        </button>
      </div>

      {bgImage && (
        <img src={bgImage} alt="" style={{ position: "absolute", bottom: -8, right: -8, width: 85, height: 85, objectFit: "contain", opacity: 0.85, zIndex: 1, pointerEvents: "none" }} />
      )}
    </div>
  );
}

function ListingRow({ l, onClick }: { l: any; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", justifyContent: "space-between", transition: "border-color 0.15s" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{l.title}</span>
          <span style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: "#4F7A4A", background: "#EBF2E8", borderRadius: 6, padding: "2px 8px" }}>Đang hiển thị</span>
        </div>
        <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>{l.sub}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 12, color: C.textSecondary }}>
          <Eye size={14} /> {l.views || Math.floor(Math.random() * 80) + 50}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 12, color: C.textSecondary }}>
          <Calendar size={14} /> 27/07/2026
        </span>
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <IconBtn><Eye size={14} /></IconBtn>
          <IconBtn><Pencil size={14} /></IconBtn>
          <IconBtn><Trash2 size={14} /></IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}>{children}</button>;
}

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: "20px 0", marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}><b style={{ color: C.primary }}>Trọ Nhanh</b> · © 2026 Trọ Nhanh</span>
      <div style={{ display: "flex", gap: 18 }}>
        {["Chính sách bảo mật", "Điều khoản dịch vụ", "Trung tâm hỗ trợ"].map(t => (
          <span key={t} style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}>{t}</span>
        ))}
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export function ChuTroDashboardPage() {
  const { subStatus } = useLandlordShell();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Chủ trọ";

  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [realListings, setRealListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [property, setProperty] = useState("Tất cả khu trọ");
  const [modal, setModal] = useState<null | "utility" | "room">(null);
  const [revealKPIs, setRevealKPIs] = useState(false);

  const isLocked = subStatus === "NONE";
  const isReadOnly = subStatus === "READ_ONLY";

  const toRooms = () => {
    if (isLocked) {
      alert("Vui lòng kích hoạt dùng thử hoặc đăng ký gói SaaS ở góc dưới Sidebar để truy cập tính năng Quản lý trọ.");
      return;
    }
    navigate("/chu-tro/quan-ly-phong");
  };
  const toListings = () => navigate("/chu-tro/tin-dang");
  const toPost = () => navigate("/chu-tro/dang-tin");

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Load properties
      const { data: props } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id);
      setProperties(props || []);
      
      setProperty("Tất cả khu trọ");

      // Load rooms
      const { data: rms } = await supabase
        .from("rooms")
        .select("*, properties(name)")
        .eq("owner_id", user.id);
      setRooms(rms || []);

      // Load recent listings from user
      const { data: listings } = await supabase
        .from("rental_listings")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      
      setRealListings(listings || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const displayProperties = useMemo(() => {
    return ["Tất cả khu trọ", ...(properties.length > 0 ? properties.map(p => p.name) : PROPERTIES.filter(p => p !== "Tất cả khu trọ"))];
  }, [properties]);

  // Filter rooms based on the selected property name
  const filteredRooms = useMemo(() => {
    if (rooms.length > 0) {
      return property === "Tất cả khu trọ" ? rooms : rooms.filter(r => r.properties?.name === property);
    }
    return [];
  }, [rooms, property]);

  const activeRoomsList = useMemo(() => {
    return rooms.length > 0 
      ? filteredRooms 
      : (property === "Tất cả khu trọ" ? PREVIEW_ROOMS : PREVIEW_ROOMS.filter(r => r.property === property));
  }, [rooms, filteredRooms, property]);

  // Convert rooms data
  const displayRooms = useMemo(() => {
    return activeRoomsList.slice(0, 4).map(r => ({
      code: r.room_code || r.code || "",
      property: r.properties?.name || r.property || "Khu trọ",
      status: (r.status === "Available" ? "available" : r.status === "Deposited" ? "deposited" : r.status === "Rented" ? "rented" : r.status === "Hidden" ? "hidden" : r.status === "available" ? "available" : r.status === "deposited" ? "deposited" : r.status === "rented" ? "rented" : "available") as RoomStatus,
      occupant: r.occupant_name || r.tenant_name || (r.occupant ? r.occupant.name : null),
      paid: r.payment_status === "Paid" ? true : r.payment_status === "Unpaid" ? false : (r.bill ? r.bill.paid : null),
      task: r.status === "Available" || r.status === "available" 
        ? "Tạo tin đăng" 
        : (r.status === "Rented" || r.status === "rented") && (r.payment_status === "Unpaid" || (r.bill && !r.bill.paid))
          ? "Nhắc nợ" 
          : (r.status === "Deposited" || r.status === "deposited" || r.status === "Đã cọc" || r.status === "đã cọc") 
            ? "Gia hạn" 
            : null
    }));
  }, [activeRoomsList]);

  // Convert listings
  const displayListings = useMemo(() => {
    return realListings.length > 0 
      ? realListings.map(l => ({
          title: l.title,
          sub: `${l.property_type} · ${l.district} · ${Number(l.price || 0).toLocaleString("vi-VN")}đ`,
          status: (l.status === "Active" ? "active" : l.status === "Inactive" ? "hidden" : l.status) as any,
          canDelete: true
        }))
      : RECENT_LISTINGS.map(l => ({
          title: l.title,
          sub: l.sub,
          status: l.status,
          canDelete: l.canDelete
        }));
  }, [realListings]);

  // Dynamic KPIs calculations
  const totalRoomsCount = activeRoomsList.length;
  
  const rentedRoomsCount = useMemo(() => {
    return rooms.length > 0 
      ? activeRoomsList.filter(r => r.status === "Rented").length 
      : activeRoomsList.filter(r => r.status === "rented").length;
  }, [rooms, activeRoomsList]);

  const emptyRoomsCount = useMemo(() => {
    return rooms.length > 0 
      ? activeRoomsList.filter(r => r.status === "Available").length 
      : activeRoomsList.filter(r => r.status === "available").length;
  }, [rooms, activeRoomsList]);

  const unpaidRoomsCount = useMemo(() => {
    return rooms.length > 0
      ? activeRoomsList.filter(r => r.payment_status === "Unpaid").length
      : activeRoomsList.filter(r => r.bill && !r.bill.paid).length;
  }, [rooms, activeRoomsList]);

  const revenueAmount = useMemo(() => {
    return rooms.length > 0 
      ? activeRoomsList.filter(r => r.status === "Rented").reduce((sum, r) => sum + Number(r.price || 0), 0)
      : activeRoomsList.filter(r => r.status === "rented").reduce((sum, r) => {
          const priceStr = typeof r.price === "string" ? r.price : String(r.price || "");
          return sum + (Number(priceStr.replace(/\D/g, "")) || 0);
        }, 0);
  }, [rooms, activeRoomsList]);
  
  const revenueFormatted = revenueAmount >= 1000000 
    ? `${(revenueAmount / 1000000).toFixed(1)} triệu`
    : revenueAmount.toLocaleString("vi-VN") + "đ";

  const dynamicKPIS = [
    { label: "Tổng số phòng", value: totalRoomsCount, accent: C.primary, secret: true },
    { label: "Khách đang ở", value: rentedRoomsCount, accent: "#4F7A4A", secret: true },
    { label: "Phòng trống", value: emptyRoomsCount, accent: C.secondary, secret: false },
    { label: "Chưa đóng tiền", value: unpaidRoomsCount, accent: "#C07B4A", secret: false },
    { label: "Doanh thu tháng", value: revenueFormatted, accent: C.primaryDark, secret: true },
  ];

  const handleRoomTask = (task: string, roomCode: string) => {
    if (task === "Tạo tin đăng") {
      toPost();
    } else if (task === "Nhắc nợ") {
      alert(`[Demo] Đã gửi thông báo nhắc đóng tiền phòng và đường link VietQR của hóa đơn cho phòng ${roomCode}!`);
    } else if (task === "Gia hạn") {
      alert(`[Demo] Đã mở yêu cầu gia hạn hợp đồng và gửi thông báo xác nhận cho phòng ${roomCode}!`);
    }
  };

  const handleQuickToolClick = (type: "utility" | "room") => {
    if (isLocked) {
      alert("Vui lòng kích hoạt dùng thử hoặc đăng ký gói SaaS ở góc dưới Sidebar để sử dụng chức năng quản lý SaaS.");
      return;
    }
    setModal(type);
  };

  const Modals = (
    <>
      {modal === "utility" && <UtilityModal onClose={() => setModal(null)} properties={properties} isReadOnly={isReadOnly} onSave={loadDashboardData} />}
      {modal === "room" && <AddRoomModal onClose={() => setModal(null)} properties={properties} isReadOnly={isReadOnly} onSave={loadDashboardData} />}
    </>
  );

  /* ═══════════ MOBILE ═══════════ */
  if (isMobile) {
    return (
      <LandlordShell active="overview" mobileTitle="Dashboard">
        <div style={{ padding: "16px 16px 100px" }}>
          {isLocked && (
            <div style={{ background: "#FEF6EC", border: `1.5px dashed ${C.primary}`, borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Lock size={20} color={C.primary} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontFamily: font, fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Gói SaaS chưa kích hoạt</h4>
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "0 0 10px", lineHeight: 1.4 }}>Hãy bắt đầu dùng thử gói SaaS Quản lý vận hành 30 ngày ở dropdown chân Sidebar để mở khóa đầy đủ tính năng.</p>
              </div>
            </div>
          )}
          
          <p style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Chào {displayName} 👋</p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "0 0 14px" }}>Mọi thứ trong tầm kiểm soát. Chúc bạn một ngày làm việc hiệu quả!</p>

          <div style={{ marginBottom: 18 }}><PropertySelector value={property} onChange={setProperty} options={displayProperties} mobile /></div>

          {/* Vacant Rooms Banner */}
          {emptyRoomsCount > 0 ? (
            <div style={{ background: "#EBF2E8", border: "1px solid #C6D8C1", borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Home size={16} color="#4F7A4A" />
                <span style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{emptyRoomsCount} phòng đang trống</span>
              </div>
              <button onClick={toPost} style={{ background: "none", border: "none", color: "#4F7A4A", fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>Tạo tin đăng</button>
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Chỉ số vận hành</p>
            <button 
              onClick={() => setRevealKPIs(!revealKPIs)}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.primary, fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {revealKPIs ? <EyeOff size={14} /> : <Eye size={14} />} {revealKPIs ? "Ẩn số liệu" : "Hiện số liệu"}
            </button>
          </div>
          
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginBottom: 22 }}>
            {dynamicKPIS.map(k => {
              const isSecret = k.secret && !revealKPIs;
              return (
                <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 16px", minWidth: 120, flexShrink: 0 }}>
                  <p style={{ fontFamily: font, fontSize: 10.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</p>
                  <span style={{ fontFamily: font, fontSize: 26, fontWeight: 900, color: k.accent, lineHeight: 1 }}>{isSecret ? "•••" : k.value}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tình trạng phòng</span>
            <button onClick={toRooms} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Xem tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {displayRooms.slice(0, 3).map((r, i) => (
              <div key={i} onClick={toRooms} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, cursor: isLocked ? "default" : "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{r.code} <span style={{ fontWeight: 500, fontSize: 12.5, color: C.textSecondary }}>· {r.property}</span></span>
                  <StatusChip status={r.status} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: C.textSecondary }}>Người ở</span>
                  <span style={{ color: C.textPrimary, fontWeight: 600 }}>{r.occupant ?? "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font, fontSize: 13 }}>
                  <span style={{ color: C.textSecondary }}>Thanh toán</span>
                  <PayText paid={r.paid} />
                </div>
                {r.task && <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}><RoomTaskBtn task={r.task} onClick={() => handleRoomTask(r.task, r.code)} /></div>}
              </div>
            ))}
          </div>

          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 12px" }}>Quản lý nhanh</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 22 }}>
            <button onClick={toRooms} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <Building2 size={20} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Khu trọ & Phòng</span>
            </button>
            <button onClick={toListings} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <FileText size={20} color={C.primary} />
              <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Quản lý tin đăng</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>Tin đăng gần đây</span>
            <button onClick={toListings} style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer" }}>Tất cả</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayListings.slice(0, 2).map((l, i) => <ListingRow key={i} l={l} onClick={toListings} />)}
          </div>
        </div>

        <button onClick={() => handleQuickToolClick("room")} style={{ position: "fixed", right: 18, bottom: "calc(76px + env(safe-area-inset-bottom))", width: 54, height: 54, borderRadius: "50%", background: C.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(138,106,69,0.36)", zIndex: 90 }}>
          <Plus size={24} color="white" />
        </button>
        {Modals}
      </LandlordShell>
    );
  }

  /* ═══════════ DESKTOP ═══════════ */
  return (
    <LandlordShell active="overview" mobileTitle="Dashboard">
      <div style={{ display: "flex", gap: 24, padding: "28px 32px 0", maxWidth: 1500, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        
        {/* MAIN COLUMN */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {isLocked && (
            <div style={{ background: "#FEF6EC", border: `1.5px dashed ${C.primary}`, borderRadius: 14, padding: 18, marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
              <Lock size={24} color={C.primary} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: "0 0 4px" }}>Trải nghiệm đầy đủ tính năng Quản lý vận hành (SaaS)</h4>
                <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Các tính năng quản lý khu trọ, hóa đơn, người ở đang bị khóa. Hãy chọn trạng thái **Dùng thử (TRIAL)** hoặc **Kích hoạt (ACTIVE)** ở góc dưới Sidebar để trải nghiệm.</p>
              </div>
            </div>
          )}

          {/* Greeting Header Block with Illustration */}
          <div style={{ 
            display: "flex", justifyContent: "space-between", alignItems: "center", 
            background: "#F7EFE2", borderRadius: 20, padding: "24px 32px", marginBottom: 24, 
            border: `1px solid ${C.border}`, position: "relative", overflow: "hidden",
            boxShadow: "0 2px 10px rgba(42,26,12,0.02)"
          }}>
            <div style={{ zIndex: 2 }}>
              <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Chào {displayName} 👋</h1>
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px", maxWidth: 450, lineHeight: 1.45 }}>Mọi thứ trong tầm kiểm soát. Chúc bạn một ngày làm việc hiệu quả!</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <PrimaryBtn onClick={() => handleQuickToolClick("room")}><Plus size={15} /> Thêm phòng</PrimaryBtn>
                <GhostBtn onClick={toPost}><Plus size={15} /> Đăng tin</GhostBtn>
                <GhostBtn onClick={() => handleQuickToolClick("utility")}><Zap size={15} /> Ghi điện nước</GhostBtn>
              </div>
            </div>
            <img src="/assets/dashboard_house_illustration.png" alt="House Illustration" style={{ height: 132, width: "auto", objectFit: "contain", marginRight: -12, zIndex: 1, pointerEvents: "none" }} />
          </div>

          {/* Property Selector */}
          <div style={{ marginBottom: 24 }}>
            <PropertySelector value={property} onChange={setProperty} options={displayProperties} />
          </div>

          {/* Vacant Rooms Banner */}
          {emptyRoomsCount > 0 ? (
            <div style={{ 
              background: "#EBF2E8", border: "1px solid #C6D8C1", borderRadius: 16, 
              padding: "16px 20px", display: "flex", justifyContent: "space-between", 
              alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap",
              boxShadow: "0 2px 8px rgba(79,122,74,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#4F7A4A", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                  <Home size={18} />
                </div>
                <div>
                  <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>{emptyRoomsCount} phòng đang trống</h4>
                  <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Có thể tạo tin đăng để tìm người ở.</p>
                </div>
              </div>
              <button onClick={toPost} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#4F7A4A", fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                Tạo tin đăng <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div style={{ background: "#F5F8F5", border: "1px solid #D5E2D5", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#85A081", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
                <Home size={18} />
              </div>
              <div>
                <h4 style={{ fontFamily: font, fontSize: 14.5, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px" }}>Tất cả phòng hiện đã có người thuê.</h4>
                <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>Bạn đang vận hành hiệu suất 100%!</p>
              </div>
            </div>
          )}

          {/* Operational Metrics (KPI Section) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontFamily: font, fontSize: 13, fontWeight: 800, color: C.textSecondary, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Chỉ số vận hành</h2>
            <button 
              onClick={() => setRevealKPIs(!revealKPIs)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.primary, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {revealKPIs ? <EyeOff size={15} /> : <Eye size={15} />} {revealKPIs ? "Ẩn số liệu nhạy cảm" : "Hiện số liệu ẩn"}
            </button>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
            {dynamicKPIS.map((k, index) => {
              const isSecret = k.secret && !revealKPIs;
              let IconComponent = Home;
              let iconColor = C.primary;
              let iconBg = "rgba(138, 74, 32, 0.06)";
              
              if (index === 0) {
                IconComponent = Home;
                iconColor = C.primary;
                iconBg = "rgba(138, 74, 32, 0.06)";
              } else if (index === 1) {
                IconComponent = Users;
                iconColor = "#4F7A4A";
                iconBg = "rgba(79, 122, 74, 0.06)";
              } else if (index === 2) {
                IconComponent = CheckSquare;
                iconColor = "#4F7A4A";
                iconBg = "rgba(79, 122, 74, 0.06)";
              } else if (index === 3) {
                IconComponent = AlertTriangle;
                iconColor = "#C07B4A";
                iconBg = "rgba(192, 123, 74, 0.06)";
              } else if (index === 4) {
                IconComponent = TrendingUp;
                iconColor = C.primary;
                iconBg = "rgba(138, 74, 32, 0.06)";
              }

              return (
                <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(42,26,12,0.015)" }}>
                  <div>
                    <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</p>
                    <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>
                      {isSecret ? "••••••" : k.value}
                      {!isSecret && <span style={{ fontSize: 12, fontWeight: 500, color: C.textSecondary, marginLeft: 4 }}>
                        {index === 4 ? "" : index === 1 ? "Người" : "Phòng"}
                      </span>}
                    </span>
                    {index === 4 && <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "4px 0 0" }}>Tháng 6/2026</p>}
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                    <IconComponent size={18} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room operations */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 28, boxShadow: "0 2px 10px rgba(42,26,12,0.015)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tình trạng phòng</h2>
              <button onClick={toRooms} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Xem tất cả phòng <ChevronRight size={15} /></button>
            </div>
            
            <SegmentedBar rooms={rooms} mockData={STATUS_DIST} property={property} />
            
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr style={{ background: C.caramelSoft }}>
                    {["Phòng", "Khu trọ", "Trạng thái", "Người ở", "Thanh toán", "Việc cần làm"].map(h => (
                      <th key={h} style={{ fontFamily: font, fontSize: 11.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "left", padding: "12px 14px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRooms.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "rgba(247,239,226,0.2)" : C.white }}>
                      <td style={{ fontFamily: font, fontSize: 13.5, fontWeight: 800, color: C.textPrimary, padding: "13px 14px" }}>{r.code}</td>
                      <td style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, padding: "13px 14px" }}>{r.property}</td>
                      <td style={{ padding: "13px 14px" }}><StatusChip status={r.status} /></td>
                      <td style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: "13px 14px" }}>{r.occupant ?? <span style={{ color: C.textSecondary }}>—</span>}</td>
                      <td style={{ padding: "13px 14px" }}><PayText paid={r.paid} /></td>
                      <td style={{ padding: "13px 14px" }}>{r.task ? <RoomTaskBtn task={r.task} onClick={() => handleRoomTask(r.task, r.code)} /> : <span style={{ fontFamily: font, fontSize: 13, color: C.textSecondary }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "14px 0 0", fontStyle: "italic" }}>Đây chỉ là bản xem nhanh. Quản lý đầy đủ trong “Khu trọ & Phòng”.</p>
          </div>

          {/* Recent listings */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontFamily: font, fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Tin đăng gần đây</h2>
            {displayListings.length > 0 && (
              <button onClick={toListings} style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>Tất cả tin đăng <ChevronRight size={15} /></button>
            )}
          </div>
          {displayListings.length === 0 ? (
            <div style={{ background: C.white, border: `1.5px dashed ${C.border}`, borderRadius: 16, padding: "28px 24px", textAlign: "center" }}>
              <FileText size={24} color={C.textSecondary} style={{ marginBottom: 10, opacity: 0.7 }} />
              <p style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px" }}>Bạn chưa có tin đăng nào</p>
              <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: "0 0 14px", lineHeight: 1.5 }}>Đăng tin phòng trống lên Marketplace để tiếp cận hàng nghìn người thuê trọ.</p>
              <PrimaryBtn onClick={toPost} small><Plus size={14} /> Đăng tin ngay</PrimaryBtn>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {displayListings.map((l, i) => <ListingRow key={i} l={l} onClick={toListings} />)}
            </div>
          )}

          <Footer />
        </main>

        {/* RIGHT COLUMN */}
        <aside style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, paddingTop: 2 }}>
          <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 800, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>Công cụ quản lý</span>
          <UtilityCard 
            title="Khu trọ & Phòng" 
            desc="Quản lý số phòng, danh sách khu trọ và trạng thái từng phòng." 
            cta="Quản lý" 
            onClick={toRooms} 
            color="#4F7A4A" 
            bgImage="/assets/card_house_icon.png" 
          />
          <UtilityCard 
            title="Quản lý tin đăng" 
            desc="Theo dõi các tin cho thuê đang hiển thị cho người thuê." 
            cta="Chi tiết" 
            onClick={toListings} 
            color="#C99B65" 
            bgImage="/assets/card_listing_icon.png" 
          />
          <UtilityCard 
            title="Thanh toán & Điện nước" 
            desc="Theo dõi hóa đơn tháng này và các khoản chưa thu." 
            progress={{ pct: 85, label: "85% đã thu tiền" }}
            cta="Thu tiền" 
            onClick={toRooms} 
            color="#C8861A" 
            bgImage="/assets/card_payment_icon.png" 
          />
          <UtilityCard 
            title="Hỗ trợ" 
            desc="Liên hệ đội ngũ Trọ Nhanh khi cần trợ giúp." 
            cta="Gửi ngay" 
            onClick={() => alert("[Demo] Gửi yêu cầu hỗ trợ thành công! Đội ngũ Trọ Nhanh sẽ phản hồi qua email trong 5 phút.")} 
            color="#6B8E5A" 
            bgImage="/assets/card_support_icon.png" 
          />
        </aside>
      </div>
      {Modals}
    </LandlordShell>
  );
}

export default ChuTroDashboardPage;
