import React, { useState } from "react";
import { C, font, radius } from "../../theme";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  disabled,
  loading,
  fullWidth,
  icon,
  children,
  onClick,
  type = "button",
  style,
  "data-testid": testId,
}: ButtonProps) {
  const [s, setS] = useState<"idle" | "hover" | "pressed">("idle");
  const isDisabled = disabled || loading;

  const styleMap: Record<NonNullable<ButtonProps["variant"]>, Record<string, React.CSSProperties>> = {
    primary: {
      idle: { background: C.primary, color: C.white, border: "none" },
      hover: { background: C.primaryHover, color: C.white, border: "none" },
      pressed: { background: C.primaryPress, color: C.white, border: "none" },
      disabled: { background: C.border, color: C.textSecondary, border: "none" },
    },
    secondary: {
      idle: { background: C.secondary, color: C.white, border: "none" },
      hover: { background: C.secondaryHover, color: C.white, border: "none" },
      pressed: { background: C.secondaryPress, color: C.white, border: "none" },
      disabled: { background: C.border, color: C.textSecondary, border: "none" },
    },
    outline: {
      idle: { background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` },
      hover: { background: C.cream, color: C.primary, border: `1.5px solid ${C.primary}` },
      pressed: { background: C.cream, color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
      disabled: { background: "transparent", color: C.textSecondary, border: `1.5px solid ${C.border}` },
    },
    ghost: {
      idle: { background: "transparent", color: C.textSecondary, border: "none" },
      hover: { background: C.cream, color: C.primaryDark, border: "none" },
      pressed: { background: C.border, color: C.primaryDark, border: "none" },
      disabled: { background: "transparent", color: C.textSecondary, border: "none" },
    },
    danger: {
      idle: { background: C.error, color: C.white, border: "none" },
      hover: { background: "#9E4230", color: C.white, border: "none" },
      pressed: { background: "#873727", color: C.white, border: "none" },
      disabled: { background: C.border, color: C.textSecondary, border: "none" },
    },
  };

  const pad = size === "sm" ? "6px 14px" : size === "lg" ? "12px 26px" : "9px 20px";
  const fs = size === "sm" ? 13 : size === "lg" ? 16 : 14;
  const key = isDisabled ? "disabled" : s;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      data-testid={testId}
      style={{
        fontFamily: font,
        fontSize: fs,
        fontWeight: 600,
        borderRadius: radius.sm,
        padding: pad,
        width: fullWidth ? "100%" : undefined,
        justifyContent: fullWidth ? "center" : undefined,
        cursor: isDisabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "background 0.12s, color 0.12s",
        opacity: loading ? 0.8 : 1,
        ...styleMap[variant][key],
        ...style,
      }}
      onMouseEnter={() => !isDisabled && setS("hover")}
      onMouseLeave={() => !isDisabled && setS("idle")}
      onMouseDown={() => !isDisabled && setS("pressed")}
      onMouseUp={() => !isDisabled && setS("hover")}
    >
      {loading ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> : icon}
      {children}
    </button>
  );
}
