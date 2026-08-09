import { Check, X, ExternalLink, EyeOff, RotateCcw } from "lucide-react";
import { C, font, radius, space } from "../../../shared/theme";
import { Button } from "../../../shared/components/common/Button";
import { LISTING_META } from "../../../shared/utils/statusMaps";
import { toListingStatus } from "../../../shared/types/status";
import { listingImageUrls } from "../../../marketplace/services/listing-mappers";
import type { ModerationRow as Row } from "../../services/moderation-service";

interface ModerationRowProps {
  row: Row;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  onRestore: () => void;
}

function formatPrice(value: number): string {
  const n = Number(value) || 0;
  return n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr/tháng`
    : `${n.toLocaleString("vi-VN")} đ/tháng`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ModerationRowCard({ row, busy, onApprove, onReject, onHide, onRestore }: ModerationRowProps) {
  const meta = LISTING_META[toListingStatus(row.status)];
  const cover = listingImageUrls(row)[0];
  const isPending = row.status === "PendingApproval";
  const isActive = row.status === "Active";
  const isRejectedOrHidden = row.status === "Rejected" || row.status === "Hidden";

  return (
    <div
      data-testid="moderation-row"
      data-listing-id={row.id}
      style={{
        display: "flex", gap: space[4], alignItems: "flex-start",
        background: C.white, border: `1px solid ${C.border}`,
        borderRadius: radius.lg, padding: space[4],
      }}
    >
      <img
        src={cover}
        alt=""
        style={{ width: 108, height: 80, objectFit: "cover", borderRadius: radius.sm, flexShrink: 0, background: C.cream }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: radius.sm, padding: "3px 9px" }}>
            {meta.label}
          </span>
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>
            Đăng {formatWhen(row.created_at)}
          </span>
        </div>

        <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.title}
        </p>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          {formatPrice(row.price)} · {row.district}
          {row.address ? ` · ${row.address}` : ""}
        </p>

        {row.rejection_reason && (
          <p style={{ fontFamily: font, fontSize: 12.5, color: C.error, margin: `${space[2]}px 0 0` }}>
            Lý do đã từ chối: {row.rejection_reason}
          </p>
        )}

        <div style={{ display: "flex", gap: space[2], marginTop: space[3], flexWrap: "wrap" }}>
          {(isPending || isRejectedOrHidden) && (
            <Button size="sm" icon={<Check size={14} />} disabled={busy} onClick={onApprove} data-testid="moderation-approve-btn">
              Duyệt
            </Button>
          )}
          {isPending && (
            <Button size="sm" variant="danger" icon={<X size={14} />} disabled={busy} onClick={onReject} data-testid="moderation-reject-btn">
              Từ chối
            </Button>
          )}
          {isActive && (
            <>
              <Button size="sm" variant="outline" icon={<EyeOff size={14} />} disabled={busy} onClick={onHide} data-testid="moderation-hide-btn">
                Ẩn tin
              </Button>
              <Button size="sm" variant="danger" icon={<X size={14} />} disabled={busy} onClick={onReject} data-testid="moderation-reject-btn">
                Từ chối
              </Button>
            </>
          )}
          {row.status === "Hidden" && (
            <Button size="sm" variant="outline" icon={<RotateCcw size={14} />} disabled={busy} onClick={onRestore}>
              Khôi phục
            </Button>
          )}
          <a
            href={`#/phong/${row.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, textDecoration: "none", padding: "0 6px" }}
          >
            <ExternalLink size={13} /> Xem chi tiết
          </a>
        </div>
      </div>
    </div>
  );
}
