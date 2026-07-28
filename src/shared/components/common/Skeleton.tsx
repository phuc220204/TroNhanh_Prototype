import React from "react";
import { C, radius } from "../../theme";

export interface SkeletonProps {
  variant?: "card" | "row" | "text";
  count?: number;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Skeleton({
  variant = "text",
  count = 1,
  style,
  "data-testid": testId,
}: SkeletonProps) {
  const items = Array.from({ length: count });

  const baseStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${C.cream} 25%, ${C.bg} 50%, ${C.cream} 75%)`,
    backgroundSize: "200% 100%",
    borderRadius: radius.sm,
  };

  if (variant === "card") {
    return (
      <div data-testid={testId} style={{ display: "flex", flexDirection: "column", gap: 12, ...style }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: radius.lg,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ ...baseStyle, height: 140, borderRadius: radius.md }} />
            <div style={{ ...baseStyle, height: 18, width: "70%" }} />
            <div style={{ ...baseStyle, height: 14, width: "40%" }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div data-testid={testId} style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyle,
              height: 40,
              width: "100%",
              borderRadius: radius.sm,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid={testId} style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {items.map((_, i) => (
        <div
          key={i}
          style={{
            ...baseStyle,
            height: 16,
            width: i === count - 1 && count > 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}
