import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { C, font, radius } from "../../shared/theme";
import { Button, MoneyInput, Skeleton } from "../../shared/components/common";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { formatVnd } from "../../shared/utils/format";
import { FEE_CATEGORY_META } from "../../shared/utils/statusMaps";
import {
  getPropertyServices, setRoomServices, type RoomServiceSetting,
} from "../services/property-services-service";

interface Row extends RoomServiceSetting {
  /** Chuỗi chữ số của ô giá riêng; "" = theo giá khu. */
  overrideInput: string;
}

/**
 * Dịch vụ áp cho MỘT phòng + giá riêng (T40). Lưu riêng bằng RPC
 * `set_room_services` — tách khỏi nút "Lưu thay đổi" của thông tin phòng để mỗi
 * lần ghi là một thao tác atomic trên đúng một nhóm bảng (§6).
 *
 * Hóa đơn các kỳ đã lập giữ nguyên giá cũ: chỉ số điện nước lưu sẵn đơn giá lúc ghi.
 */
export function RoomServicesSection({ roomId, propertyId, onSaved }: {
  roomId: string;
  propertyId: string;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const servicesQuery = useQuery({
    queryKey: qk.propertyServices.byProperty(propertyId),
    queryFn: () => getPropertyServices(propertyId),
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (!servicesQuery.data) return;
    setRows(servicesQuery.data.map((service) => {
      const link = service.rooms.find((r) => r.roomId === roomId);
      return {
        serviceId: service.id,
        applied: Boolean(link),
        unitPriceOverride: link?.unitPriceOverride ?? null,
        overrideInput: link?.unitPriceOverride == null ? "" : String(link.unitPriceOverride),
      };
    }));
  }, [servicesQuery.data, roomId]);

  const saveMutation = useMutation({
    mutationFn: () => setRoomServices(roomId, rows.map((r) => ({
      serviceId: r.serviceId,
      applied: r.applied,
      unitPriceOverride: r.applied && r.overrideInput !== "" ? Number(r.overrideInput) : null,
    }))),
    onSuccess: async () => {
      setSavedMessage("Đã lưu dịch vụ của phòng.");
      await queryClient.invalidateQueries({ queryKey: qk.propertyServices.all });
      await queryClient.invalidateQueries({ queryKey: qk.billing.all });
      onSaved();
    },
  });

  const update = (serviceId: string, patch: Partial<Row>) => {
    setSavedMessage("");
    setRows((current) => current.map((r) => (r.serviceId === serviceId ? { ...r, ...patch } : r)));
  };

  return (
    <div data-testid="room-services-section" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>Dịch vụ của phòng</div>
        <div style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, lineHeight: 1.45 }}>
          Bỏ chọn dịch vụ phòng không dùng. Để trống ô giá = theo giá của khu.
        </div>
      </div>

      {servicesQuery.isPending ? (
        <Skeleton variant="row" count={3} label="Đang tải dịch vụ" />
      ) : servicesQuery.isError ? (
        <p role="alert" style={{ fontFamily: font, fontSize: 13, color: C.error, margin: 0 }}>{toUserMessage(servicesQuery.error)}</p>
      ) : rows.length === 0 ? (
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Khu chưa khai dịch vụ nào (tab "Dịch vụ & phí").</p>
      ) : (
        servicesQuery.data.map((service) => {
          const row = rows.find((r) => r.serviceId === service.id);
          if (!row) return null;
          const meta = FEE_CATEGORY_META[service.feeCategory];
          return (
            <div key={service.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: radius.sm, border: `1px solid ${row.applied ? C.border : "transparent"}`, background: row.applied ? C.white : C.bg }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontFamily: font }}>
                <input type="checkbox" checked={row.applied} onChange={(e) => update(service.id, { applied: e.target.checked })} data-testid={`room-service-toggle-${service.name}`} style={{ marginTop: 3 }} />
                <span>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>{service.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: meta.color }}>{meta.label} · khu: {formatVnd(service.unitPrice)}/{service.unit}</span>
                </span>
              </label>
              {row.applied && (
                <MoneyInput value={row.overrideInput} onChange={(digits) => update(service.id, { overrideInput: digits })} suffix={`đ/${service.unit}`} placeholder="Giá khu" data-testid={`room-service-price-${service.name}`} />
              )}
            </div>
          );
        })
      )}

      {saveMutation.isError && (
        <p role="alert" style={{ fontFamily: font, fontSize: 13, color: C.error, margin: 0 }}>{toUserMessage(saveMutation.error)}</p>
      )}
      {savedMessage && (
        <p data-testid="room-services-saved" style={{ fontFamily: font, fontSize: 13, color: C.success, margin: 0 }}>{savedMessage}</p>
      )}
      {rows.length > 0 && (
        <div>
          <Button variant="outline" size="sm" requiresWrite loading={saveMutation.isPending} onClick={() => saveMutation.mutate()} data-testid="room-services-save">
            Lưu dịch vụ của phòng
          </Button>
        </div>
      )}
    </div>
  );
}
