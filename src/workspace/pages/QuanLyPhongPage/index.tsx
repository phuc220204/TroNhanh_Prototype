import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { Plus, Building2, ChevronDown, RefreshCw } from "lucide-react";
import { C, font, shadow } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { LandlordShell, LandlordBreadcrumb, type LandlordNavId } from "../../../shared/components/LandlordShell";
import { ROOM_PAGE_TABS } from "../../../shared/components/landlord/SidebarNav";
import type { Room, Property } from "../../types/room";
import type { RoomStatus } from "../../../shared/types/status";
import { CONTRACT_STATUS_META, normalizeContractStatus, normalizeRoomStatus } from "../../../shared/utils/statusMaps";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCanWrite } from "../../../shared/contexts/SubscriptionContext";
import { getPropertiesByOwnerOrThrow } from "../../services/property-service";
import { getRoomsByOwnerOrThrow } from "../../services/room-service";
import { logError } from "../../../shared/services/supabase-error";
import { Button, Skeleton } from "../../../shared/components/common";
import { RoomsView } from "./RoomsView";
import { OccupantsView } from "./OccupantsView";
import { SettingsView } from "./SettingsView";
import { RoomDetailModal } from "./RoomDetailModal";
import { UtilityReadingForm } from "./UtilityReadingForm";
import { InvoicePreview } from "./InvoicePreview";
import { AddOccupantModal } from "./AddOccupantModal";
import type { RoomActionType } from "./RoomActions";
import { AddRoomModal } from "../../components/AddRoomModal";
import { AddPropertyModal } from "../../components/AddPropertyModal";
import { EditRoomModal } from "../../components/EditRoomModal";

const mapDbRoomToRoom = (dbRoom: any): Room => {
  const activeContract = dbRoom.contracts?.find(
    (c: any) => normalizeContractStatus(c.status) === "active",
  );
  let occupant = null;
  let contract = null;
  if (activeContract) {
    // `occupancies!occupancies_contract_id_fkey` is the reverse side of a
    // one-to-many relationship, so PostgREST returns an array here.
    const embeddedOccupancies = activeContract.occupancies;
    const occ = Array.isArray(embeddedOccupancies)
      ? embeddedOccupancies[0]
      : embeddedOccupancies || activeContract.occupancy;
    occupant = {
      name: occ?.full_name || "Người ở",
      phone: occ?.phone_number || "",
      startDate: activeContract.start_date || "",
      occupantCount: Number(occ?.occupant_count || 1),
    };
    contract = {
      start: activeContract.start_date,
      end: activeContract.end_date,
      deposit: `${Number(activeContract.deposit || 0).toLocaleString("vi-VN")}đ`,
      status: CONTRACT_STATUS_META[normalizeContractStatus(activeContract.status) ?? "active"].label,
    };
  }

  return {
    id: dbRoom.id,
    code: dbRoom.room_code || dbRoom.code || "",
    // Không điền số bịa (trước: "Tầng 1", 20 m²) khi chủ trọ chưa khai báo.
    floor: typeof dbRoom.floor === "number" ? `Tầng ${dbRoom.floor}` : (dbRoom.floor || "Chưa khai báo"),
    status: normalizeRoomStatus(dbRoom.status) ?? "available",
    area: dbRoom.area ? `${dbRoom.area} m²` : "Chưa khai báo",
    price: `${Number(dbRoom.price || 0).toLocaleString("vi-VN")}đ`,
    amenities: [],
    note: dbRoom.description || "",
    occupant,
    contract,
    bill: null,
  };
};

const ROOM_TABS: { id: LandlordNavId; label: string }[] = [
  { id: "rooms", label: "Phòng" },
  { id: "occupants", label: "Người ở" },
  { id: "settings", label: "Cài đặt khu" },
];

export function QuanLyPhongPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const { user } = useAuth();
  // BR-015 — nguồn DUY NHẤT quyết định được ghi hay không.
  // Trước đây lấy `isReadOnly` (chỉ đúng với status READ_ONLY) nên tài khoản
  // status NONE vào thẳng URL /chu-tro/quan-ly-phong là GHI ĐƯỢC: dashboard
  // chặn NONE ở nút điều hướng, còn màn này thì không chặn gì cả.
  const canWrite = useCanWrite();
  const isReadOnly = !canWrite;

  const rawTab = new URLSearchParams(location.search).get("tab");
  // Tab hóa đơn cũ đã gộp về /chu-tro/hoa-don (một màn hóa đơn duy nhất).
  useEffect(() => {
    if (rawTab === "payments") navigate("/chu-tro/hoa-don", { replace: true });
  }, [rawTab, navigate]);
  const activeTab: LandlordNavId = rawTab && (ROOM_PAGE_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as LandlordNavId)
    : "rooms";
  const goToTab = (tab: LandlordNavId) => navigate(`/chu-tro/quan-ly-phong?tab=${tab}`);

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [sort, setSort] = useState("Mới cập nhật");
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ type: RoomActionType; room: Room } | null>(null);
  const [loading, setLoading] = useState(true);
  // Lỗi tải KHÁC "chưa có khu": trước đây lỗi bị nuốt và trang hiện "Bạn chưa có
  // khu trọ nào" + nút tạo khu ⇒ chủ trọ tưởng mất dữ liệu và tạo trùng.
  const [loadError, setLoadError] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  // Giữ ID chứ không giữ cả `Room`: form sửa cần giá trị THÔ, mà `Room` đã format
  // để hiển thị. `EditRoomModal` tự đọc lại qua `getRoomById()`.
  const [editRoomId, setEditRoomId] = useState<string | null>(null);

  const loadDbData = async (showLoading = true) => {
    if (!user) return;
    try {
      // Keep the active tab mounted during background refreshes. Unmounting
      // OccupantsView here discarded success/error toasts immediately after an RPC.
      if (showLoading) setLoading(true);
      const [props, rms] = await Promise.all([
        getPropertiesByOwnerOrThrow(user.id),
        getRoomsByOwnerOrThrow(user.id),
      ]);
      setLoadError(false);

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
            // Chưa cấu hình thì để trống — KHÔNG điền giá/ngân hàng bịa (trước đây
            // 3.500 / 15.000 / 100.000 / "MB" lọt vào hóa đơn và mã VietQR).
            electricity_unit_price: p.electricity_unit_price == null ? undefined : Number(p.electricity_unit_price),
            water_unit_price: p.water_unit_price == null ? undefined : Number(p.water_unit_price),
            service_fee: p.service_fee == null ? undefined : Number(p.service_fee),
            bank_name: p.bank_name || "",
            bank_account_number: p.bank_account_number || "",
            bank_account_name: p.bank_account_name || "",
            rooms: propertyRooms,
          } as any;
        });

        setProperties(mapped);
        if (!selectedId || !mapped.find((p) => p.id === selectedId)) {
          setSelectedId(mapped[0]!.id);
        }
      } else {
        setProperties([]);
      }
    } catch (err) {
      logError("QuanLyPhongPage.loadDbData", err);
      // Làm mới ngầm thất bại thì giữ dữ liệu đang hiện; chỉ báo lỗi toàn trang
      // khi chưa có gì để hiện.
      if (showLoading || properties.length === 0) setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDbData();
  }, [user]);

  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedId) || properties[0] || null;
  }, [properties, selectedId]);

  return (
    <LandlordShell active="rooms" mobileTitle="Quản lý phòng">
      <div style={{ padding: isMobile ? 16 : 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Breadcrumb & Header Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <LandlordBreadcrumb trail={["Quản lý phòng"]} />
            <h1 style={{ fontFamily: font, fontSize: isMobile ? 22 : 26, fontWeight: 800, color: C.textPrimary, margin: "6px 0 0" }}>
              Quản lý khu trọ &amp; Phòng
            </h1>
          </div>

          {/* Property Selector Dropdown */}
          {properties.length > 0 && selectedProperty && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                data-testid="property-switcher"
                onClick={() => setSwitcherOpen(!switcherOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: C.white,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "9px 16px",
                  fontFamily: font,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.textPrimary,
                  cursor: "pointer",
                }}
              >
                <Building2 size={16} color={C.primary} />
                {selectedProperty.name}
                <ChevronDown size={14} color={C.textSecondary} />
              </button>

              {switcherOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    boxShadow: shadow.md,
                    zIndex: 100,
                    minWidth: 220,
                    overflow: "hidden",
                  }}
                >
                  {properties.map((p) => (
                    <div
                      key={p.id}
                      data-testid="property-option"
                      onClick={() => {
                        setSelectedId(p.id);
                        setSwitcherOpen(false);
                      }}
                      style={{
                        padding: "10px 16px",
                        fontFamily: font,
                        fontSize: 13.5,
                        fontWeight: p.id === selectedProperty.id ? 700 : 500,
                        color: p.id === selectedProperty.id ? C.primary : C.textPrimary,
                        background: p.id === selectedProperty.id ? C.caramelSoft : C.white,
                        cursor: "pointer",
                      }}
                    >
                      {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Điện thoại không có sidebar: thanh tab để vào Người ở / Cài đặt (trước đây không có lối vào). */}
        {isMobile && (
          <div role="tablist" aria-label="Mục quản lý" data-testid="rooms-mobile-tabs" style={{ display: "flex", gap: 4, padding: 4, background: C.cream, borderRadius: 12 }}>
            {ROOM_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`rooms-tab-${tab.id}`}
                  onClick={() => goToTab(tab.id)}
                  style={{ flex: 1, minHeight: 40, border: "none", borderRadius: 9, cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: isSelected ? 800 : 600, background: isSelected ? C.white : "transparent", color: isSelected ? C.primary : C.textSecondary }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* View Component by Tab */}
        {loading ? (
          <Skeleton variant="row" count={6} label="Đang tải danh sách phòng" style={{ padding: "16px 0" }} />
        ) : loadError ? (
          <div role="alert" data-testid="rooms-load-error" style={{ maxWidth: 520, margin: "40px auto", padding: 24, textAlign: "center", background: C.white, border: `1px solid ${C.errorBorder}`, borderRadius: 16, fontFamily: font }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Chưa tải được dữ liệu khu trọ</p>
            <p style={{ fontSize: 13.5, color: C.textSecondary, margin: "0 0 16px", lineHeight: 1.5 }}>Dữ liệu của bạn vẫn an toàn. Kiểm tra kết nối mạng rồi thử lại.</p>
            <Button variant="primary" onClick={() => void loadDbData(true)}>Thử lại</Button>
          </div>
        ) : (
          <>
            {activeTab === "rooms" && (
              <RoomsView
                property={selectedProperty}
                rooms={selectedProperty?.rooms || []}
                search={search}
                setSearch={setSearch}
                filter={filter}
                setFilter={setFilter}
                sort={sort}
                setSort={setSort}
                onSelectRoom={(r) => setDetailRoom(r)}
                onOpenActionModal={(type, room) => setActionModal({ type, room })}
                onAddRoom={() => setShowAddRoom(true)}
                onAddProperty={() => setShowAddProperty(true)}
                onOpenSettings={() => goToTab("settings")}
                isReadOnly={isReadOnly}
                mobile={isMobile}
              />
            )}

            {activeTab === "occupants" && (
              <OccupantsView
                property={selectedProperty}
                mobile={isMobile}
                isReadOnly={isReadOnly}
                onRefreshData={() => loadDbData(false)}
              />
            )}

            {activeTab === "settings" && (
              <SettingsView
                // key theo khu: form khởi tạo từ `property` một lần — không có key thì
                // đổi khu vẫn giữ giá/STK khu cũ và bấm Lưu sẽ ghi đè sang khu mới.
                key={selectedProperty?.id ?? "none"}
                property={selectedProperty}
                mobile={isMobile}
                isReadOnly={isReadOnly}
                onRefreshData={() => loadDbData(false)}
                // Khu vừa xóa không còn gì để cài đặt ⇒ về danh sách phòng của khu còn lại.
                onDeleted={() => {
                  goToTab("rooms");
                  void loadDbData(false);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Slideover Detail Drawer */}
      {detailRoom && (
        <RoomDetailModal
          room={detailRoom}
          onClose={() => setDetailRoom(null)}
          property={selectedProperty}
          onOpenActionModal={(type, room) => {
            // Hai modal chồng nhau thì Esc đóng nhầm — đóng chi tiết trước khi mở thao tác.
            setDetailRoom(null);
            setActionModal({ type, room });
          }}
          onEdit={(room) => {
            // Đóng modal chi tiết trước: hai modal chồng nhau thì Esc đóng nhầm cái
            // dưới, và người dùng không biết mình đang ở form nào.
            setDetailRoom(null);
            setEditRoomId(room.id);
          }}
        />
      )}

      {editRoomId && (
        <EditRoomModal
          roomId={editRoomId}
          propertyPrices={{
            electricity: selectedProperty?.electricity_unit_price,
            water: selectedProperty?.water_unit_price,
            service: selectedProperty?.service_fee,
          }}
          onClose={() => setEditRoomId(null)}
          onUpdated={() => void loadDbData(false)}
        />
      )}

      {/* Action Modals */}
      {actionModal?.type === "utility" && (
        <UtilityReadingForm
          room={actionModal.room}
          onClose={() => setActionModal(null)}
          onSuccess={() => void loadDbData(false)}
          isReadOnly={isReadOnly}
        />
      )}

      {actionModal?.type === "add-occupant" && (
        <AddOccupantModal
          property={selectedProperty}
          mobile={isMobile}
          initialRoomId={actionModal.room.id}
          onClose={() => setActionModal(null)}
          onCreated={() => {
            setActionModal(null);
            void loadDbData(false);
            // Đưa sang tab Người ở để thấy ngay người vừa thêm.
            goToTab("occupants");
          }}
        />
      )}

      {actionModal?.type === "invoice" && (
        <InvoicePreview
          room={actionModal.room}
          property={selectedProperty}
          onClose={() => setActionModal(null)}
          onSuccess={() => void loadDbData(false)}
          isReadOnly={isReadOnly}
        />
      )}

      {showAddRoom && (
        <AddRoomModal
          properties={properties.map((p) => ({ id: p.id, name: p.name }))}
          defaultPropertyId={selectedId}
          onClose={() => setShowAddRoom(false)}
          onCreated={() => void loadDbData(false)}
        />
      )}

      {showAddProperty && (
        <AddPropertyModal
          onClose={() => setShowAddProperty(false)}
          onCreated={(id) => {
            setShowAddProperty(false);
            setSelectedId(id);
            loadDbData();
          }}
        />
      )}
    </LandlordShell>
  );
}

export default QuanLyPhongPage;
