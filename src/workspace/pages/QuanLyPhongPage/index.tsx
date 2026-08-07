import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { Plus, Building2, ChevronDown, RefreshCw } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { useBreakpoint } from "../../../shared/components/useBreakpoint";
import { LandlordShell, LandlordBreadcrumb, type LandlordNavId } from "../../../shared/components/LandlordShell";
import type { Room, Property } from "../../types/room";
import type { RoomStatus } from "../../../shared/types/status";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCanWrite } from "../../../shared/contexts/SubscriptionContext";
import { getPropertiesByOwner } from "../../services/property-service";
import { getRoomsByOwner } from "../../services/room-service";
import { RoomsView } from "./RoomsView";
import { OccupantsView } from "./OccupantsView";
import { PaymentsView } from "./PaymentsView";
import { SettingsView } from "./SettingsView";
import { RoomDrawer } from "./RoomDrawer";
import { UtilityReadingForm } from "./UtilityReadingForm";
import { InvoicePreview } from "./InvoicePreview";
import { AddRoomModal } from "../../components/AddRoomModal";
import { AddPropertyModal } from "../../components/AddPropertyModal";

const mapDbRoomToRoom = (dbRoom: any): Room => {
  const activeContract = dbRoom.contracts?.find((c: any) => c.status === "Active" || c.status === "active") || dbRoom.contracts?.[0];
  let occupant = null;
  let contract = null;
  if (activeContract) {
    const occ = activeContract.occupancies || activeContract.occupancy;
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
      status: activeContract.status === "Active" ? "Đang hiệu lực" : activeContract.status,
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
    bill: null,
  };
};

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

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("tab") || "rooms") as LandlordNavId;
  }, [location.search]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [sort, setSort] = useState("Mới cập nhật");
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ type: "utility" | "invoice"; room: Room } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);

  const loadDbData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const props = await getPropertiesByOwner(user.id);
      const rms = await getRoomsByOwner(user.id);

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
      // Error handling
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
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    zIndex: 100,
                    minWidth: 220,
                    overflow: "hidden",
                  }}
                >
                  {properties.map((p) => (
                    <div
                      key={p.id}
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

        {/* View Component by Tab */}
        {loading ? (
          <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, textAlign: "center", padding: "48px 0" }}>
            Đang tải dữ liệu...
          </p>
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
                isReadOnly={isReadOnly}
                mobile={isMobile}
              />
            )}

            {activeTab === "occupants" && (
              <OccupantsView
                property={selectedProperty}
                mobile={isMobile}
                isReadOnly={isReadOnly}
                onRefreshData={loadDbData}
              />
            )}

            {activeTab === "payments" && (
              <PaymentsView
                property={selectedProperty}
                mobile={isMobile}
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === "settings" && (
              <SettingsView
                property={selectedProperty}
                mobile={isMobile}
                isReadOnly={isReadOnly}
                onRefreshData={loadDbData}
              />
            )}
          </>
        )}
      </div>

      {/* Slideover Detail Drawer */}
      {detailRoom && (
        <RoomDrawer
          room={detailRoom}
          onClose={() => setDetailRoom(null)}
          onOpenActionModal={(type, room) => setActionModal({ type, room })}
        />
      )}

      {/* Action Modals */}
      {actionModal?.type === "utility" && (
        <UtilityReadingForm
          room={actionModal.room}
          onClose={() => setActionModal(null)}
          onSuccess={loadDbData}
          isReadOnly={isReadOnly}
        />
      )}

      {actionModal?.type === "invoice" && (
        <InvoicePreview
          room={actionModal.room}
          property={selectedProperty}
          onClose={() => setActionModal(null)}
          onSuccess={loadDbData}
          isReadOnly={isReadOnly}
        />
      )}

      {showAddRoom && (
        <AddRoomModal
          properties={properties.map((p) => ({ id: p.id, name: p.name }))}
          defaultPropertyId={selectedId}
          onClose={() => setShowAddRoom(false)}
          onCreated={loadDbData}
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
