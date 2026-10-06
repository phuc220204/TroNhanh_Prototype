import React from "react";
import { C, font, radius } from "../../theme";
import {
  ROOM_STATUS_META,
  LISTING_META,
  INVOICE_STATUS_META,
  CONTRACT_STATUS_META,
  LINK_STATUS_META,
  normalizeRoomStatus,
  normalizeInvoiceStatus,
  normalizeContractStatus,
  normalizeLinkStatus,
} from "../../utils/statusMaps";
import { toListingStatus } from "../../types/status";

export interface BadgeProps {
  status: string;
  /** Nhận cả giá trị DB ("Rented", "PartiallyPaid") lẫn khóa META ("rented"). */
  kind?: "room" | "listing" | "invoice" | "contract" | "link";
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Badge({
  status,
  kind = "room",
  style,
  "data-testid": testId,
}: BadgeProps) {
  let label = status;
  let color = C.textSecondary;
  let bg = C.cream;

  const meta =
    kind === "room" ? ROOM_STATUS_META[normalizeRoomStatus(status) ?? ("" as never)]
    : kind === "listing" ? LISTING_META[toListingStatus(status)]
    : kind === "invoice" ? INVOICE_STATUS_META[normalizeInvoiceStatus(status) ?? ("" as never)]
    : kind === "contract" ? CONTRACT_STATUS_META[normalizeContractStatus(status) ?? ("" as never)]
    : LINK_STATUS_META[normalizeLinkStatus(status)];
  if (meta) {
    label = meta.label;
    color = meta.color;
    bg = meta.bg;
  }

  return (
    <span
      data-testid={testId}
      style={{
        fontFamily: font,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: radius.pill,
        padding: "3px 10px",
        background: bg,
        color: color,
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1.4,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
