import React from "react";
import { C, font, radius } from "../../theme";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  style,
  "data-testid": testId,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: font,
        fontSize: 13,
        padding: "12px 0",
        ...style,
      }}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        style={{
          padding: "6px 12px",
          borderRadius: radius.sm,
          border: `1px solid ${C.border}`,
          background: C.white,
          color: page <= 1 ? C.textSecondary : C.textPrimary,
          cursor: page <= 1 ? "not-allowed" : "pointer",
          fontWeight: 500,
          opacity: page <= 1 ? 0.5 : 1,
        }}
      >
        Trước
      </button>

      <span style={{ color: C.textSecondary, padding: "0 4px" }}>
        Trang <strong style={{ color: C.textPrimary }}>{page}</strong> / {totalPages}
      </span>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        style={{
          padding: "6px 12px",
          borderRadius: radius.sm,
          border: `1px solid ${C.border}`,
          background: C.white,
          color: page >= totalPages ? C.textSecondary : C.textPrimary,
          cursor: page >= totalPages ? "not-allowed" : "pointer",
          fontWeight: 500,
          opacity: page >= totalPages ? 0.5 : 1,
        }}
      >
        Sau
      </button>
    </div>
  );
}
