import React, { useState } from "react";
import { C, radius, space } from "../../theme";

export interface CardProps {
  padding?: number | string;
  hoverable?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Card({
  padding = space[4],
  hoverable = false,
  onClick,
  children,
  style,
  "data-testid": testId,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      onMouseEnter={() => hoverable && setIsHovered(true)}
      onMouseLeave={() => hoverable && setIsHovered(false)}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: typeof padding === "number" ? `${padding}px` : padding,
        boxShadow: hoverable && isHovered
          ? "0 6px 20px rgba(92, 70, 50, 0.12)"
          : "0 2px 8px rgba(92, 70, 50, 0.06)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        transform: hoverable && isHovered ? "translateY(-2px)" : "none",
        cursor: onClick || hoverable ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
