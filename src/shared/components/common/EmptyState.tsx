import React from "react";
import { C, font, space } from "../../theme";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  style,
  "data-testid": testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${space[8]}px ${space[4]}px`,
        textAlign: "center",
        fontFamily: font,
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: space[3],
            color: C.secondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
      )}
      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
        {title}
      </h4>
      {description && (
        <p
          style={{
            margin: `${space[1]}px 0 0`,
            fontSize: 13,
            color: C.textSecondary,
            maxWidth: 360,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: space[4] }}>{action}</div>}
    </div>
  );
}
