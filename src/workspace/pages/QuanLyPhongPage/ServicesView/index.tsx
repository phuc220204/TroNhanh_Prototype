import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { C, font, radius } from "../../../../shared/theme";
import { Button, EmptyState, ModalShell, Skeleton } from "../../../../shared/components/common";
import { useToast } from "../../../../shared/contexts/ToastContext";
import { qk } from "../../../../shared/query/keys";
import { toUserMessage } from "../../../../shared/services/supabase-error";
import { formatVnd } from "../../../../shared/utils/format";
import { FEE_CATEGORY_META, QUANTITY_BASIS_META } from "../../../../shared/utils/statusMaps";
import {
  deletePropertyService, getPropertyServices, upsertPropertyService,
  type MeterType, type PropertyService, type PropertyServiceInput,
} from "../../../services/property-services-service";
import type { Property } from "../../../types/room";
import { ServiceFormModal } from "./ServiceFormModal";

interface ServicesViewProps {
  property: Property | null | undefined;
  isReadOnly: boolean;
  /** Giá điện/nước/dịch vụ ở thẻ phòng và form cũ đọc từ dữ liệu trang — tải lại sau khi đổi. */
  onRefreshData: () => void;
}

/**
 * Tab "Dịch vụ" của khu: danh mục phí + loại khoản (doanh thu / thu hộ) + phòng áp dụng.
 * Chỉ số điện nước, hóa đơn và hợp đồng đều đọc đơn giá từ đây.
 */
export function ServicesView({ property, isReadOnly, onRefreshData }: ServicesViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<PropertyService | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PropertyService | null>(null);
  const propertyId = property?.id ?? "";

  const servicesQuery = useQuery({
    queryKey: qk.propertyServices.byProperty(propertyId),
    queryFn: () => getPropertyServices(propertyId),
    enabled: propertyId !== "",
  });

  const afterChange = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: qk.propertyServices.all });
    await queryClient.invalidateQueries({ queryKey: qk.billing.all });
    onRefreshData();
    showToast(message, { testId: "services-toast" });
  };

  const saveMutation = useMutation({
    mutationFn: (input: PropertyServiceInput) => upsertPropertyService(input),
    onSuccess: async (_id, input) => {
      setEditing(null);
      await afterChange(input.id ? "Đã lưu dịch vụ." : "Đã thêm dịch vụ.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: string) => deletePropertyService(serviceId),
    onSuccess: async () => {
      setPendingDelete(null);
      await afterChange("Đã xóa dịch vụ.");
    },
    onError: (error) => showToast(toUserMessage(error), { testId: "services-toast" }),
  });

  if (!property) {
    return <EmptyState title="Chưa chọn khu trọ" description="Chọn hoặc tạo một khu trọ để khai báo dịch vụ." />;
  }

  const services = servicesQuery.data ?? [];
  const usedMeterTypes = services.map((s) => s.meterType).filter((m): m is MeterType => m !== null);
  const roomCount = property.rooms.length;

  return (
    <section data-testid="services-view" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Dịch vụ & phí</h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "4px 0 0", maxWidth: 560, lineHeight: 1.5 }}>
            Mỗi khoản ghi rõ là <strong>phí dịch vụ</strong> (doanh thu của bạn) hay <strong>thu hộ</strong> (thu giúp bên thứ 3).
            Hóa đơn sẽ tách riêng hai nhóm này.
          </p>
        </div>
        <Button variant="primary" requiresWrite disabled={isReadOnly} icon={<Plus size={16} />} onClick={() => setEditing("new")} data-testid="services-add">
          Thêm dịch vụ
        </Button>
      </div>

      {servicesQuery.isPending ? (
        <Skeleton variant="row" count={4} label="Đang tải dịch vụ" />
      ) : servicesQuery.isError ? (
        <div role="alert" style={{ padding: 16, borderRadius: radius.sm, background: C.errorBg, border: `1px solid ${C.errorBorder}`, fontFamily: font, fontSize: 13.5, color: C.error }}>
          {toUserMessage(servicesQuery.error)}{" "}
          <Button variant="ghost" size="sm" onClick={() => void servicesQuery.refetch()}>Thử lại</Button>
        </div>
      ) : services.length === 0 ? (
        <EmptyState icon={Receipt} title="Khu chưa có dịch vụ nào" description="Thêm điện, nước, wifi, rác, giữ xe… để lập hóa đơn nhanh và rõ ràng." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {services.map((service) => {
            const meta = FEE_CATEGORY_META[service.feeCategory];
            const overrides = service.rooms.filter((r) => r.unitPriceOverride !== null).length;
            return (
              <article key={service.id} data-testid={`service-card-${service.name}`} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontFamily: font, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{service.name}</div>
                  <span title={meta.hint} style={{ alignSelf: "flex-start", whiteSpace: "nowrap", padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color, fontFamily: font, fontSize: 11.5, fontWeight: 700 }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.primary }}>
                  {formatVnd(service.unitPrice)} / {service.unit}
                </div>
                <div style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5 }}>
                  {QUANTITY_BASIS_META[service.quantityBasis].label}
                  {" · "}Áp dụng {service.rooms.length}/{roomCount} phòng
                  {overrides > 0 && ` · ${overrides} phòng giá riêng`}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                  <Button variant="outline" size="sm" requiresWrite disabled={isReadOnly} icon={<Pencil size={14} />} onClick={() => setEditing(service)} data-testid={`service-edit-${service.name}`}>
                    Sửa
                  </Button>
                  <Button variant="ghost" size="sm" requiresWrite disabled={isReadOnly || deleteMutation.isPending} icon={<Trash2 size={14} />} onClick={() => setPendingDelete(service)} data-testid={`service-delete-${service.name}`}>
                    Xóa
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pendingDelete && (
        <ModalShell
          title="Xóa dịch vụ?"
          size="sm"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>Hủy</Button>
              <Button variant="danger" requiresWrite loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(pendingDelete.id)} data-testid="service-delete-confirm">
                Xóa dịch vụ
              </Button>
            </>
          }
        >
          <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>
            Bỏ <strong>{pendingDelete.name}</strong> khỏi khu và mọi phòng. Hóa đơn đã lập không bị ảnh hưởng.
          </p>
        </ModalShell>
      )}

      {editing && (
        <ServiceFormModal
          propertyId={property.id}
          rooms={property.rooms}
          service={editing === "new" ? null : editing}
          usedMeterTypes={usedMeterTypes}
          submitting={saveMutation.isPending}
          errorMessage={saveMutation.isError ? toUserMessage(saveMutation.error) : null}
          onCancel={() => { setEditing(null); saveMutation.reset(); }}
          onSubmit={(input) => saveMutation.mutate(input)}
        />
      )}
    </section>
  );
}
