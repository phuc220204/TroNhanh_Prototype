import React from "react";
import { C, font, radius } from "../../theme";
import {
  ROOM_STATUS_META,
  LISTING_META,
  INVOICE_STATUS_META,
  CONTRACT_STATUS_META,
} from "../../utils/statusMaps";

export interface BadgeProps {
  status: string;
  kind?: "room" | "listing" | "invoice" | "contract";
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

  if (kind === "room") {
    const meta = ROOM_STATUS_META[status as keyof typeof ROOM_STATUS_META];
    if (meta) {
      label = meta.label;
      color = C.white;
      bg = meta.color;
    }
  } else if (kind === "listing") {
    const meta = LISTING_META[status as keyof typeof LISTING_META];
    if (meta) {
      label = meta.label;
      color = meta.color;
      bg = meta.bg;
    }
  } else if (kind === "invoice") {
    const meta = INVOICE_STATUS_META[status as keyof typeof INVOICE_STATUS_META];
    if (meta) {
      label = meta.label;
      color = meta.color;
      bg = meta.bg;
    }
  } else if (kind === "contract") {
    const meta = CONTRACT_STATUS_META[status as keyof typeof CONTRACT_STATUS_META];
    if (meta) {
      label = meta.label;
      color = C.white;
      bg = meta.color;
    }
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
