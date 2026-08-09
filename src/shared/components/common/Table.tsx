import React from "react";
import { C, font, radius } from "../../theme";
import { EmptyState } from "./EmptyState";

export interface Column<T = any> {
  key: string;
  label: string;
  width?: string | number;
  align?: "left" | "center" | "right";
}

export interface TableProps<T = any> {
  columns: Column<T>[];
  rows: T[];
  renderCell?: (row: T, key: string, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  rows,
  renderCell,
  emptyState,
  style,
  "data-testid": testId,
}: TableProps<T>) {
  if (!rows || rows.length === 0) {
    return (
      <div data-testid={testId} style={{ background: C.white, borderRadius: radius.lg, border: `1px solid ${C.border}`, padding: 16, ...style }}>
        {emptyState || <EmptyState title="Không có dữ liệu" description="Chưa có bản ghi nào để hiển thị." />}
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      style={{
        width: "100%",
        overflowX: "auto",
        background: C.white,
        borderRadius: radius.lg,
        border: `1px solid ${C.border}`,
        ...style,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font, fontSize: 14 }}>
        <thead>
          <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "12px 16px",
                  textAlign: col.align || "left",
                  width: col.width,
                  fontWeight: 600,
                  color: C.textSecondary,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              style={{
                borderBottom: rowIndex === rows.length - 1 ? "none" : `1px solid ${C.border}`,
                transition: "background 0.15s",
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "12px 16px",
                    textAlign: col.align || "left",
                    color: C.textPrimary,
                  }}
                >
                  {renderCell ? renderCell(row, col.key, rowIndex) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
