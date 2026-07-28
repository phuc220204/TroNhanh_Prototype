import React, { useEffect } from "react";
import { C, font, radius } from "../../theme";

export interface ToastProps {
  message: string;
  variant?: "success" | "error";
  onClose?: () => void;
  duration?: number;
  style?: React.CSSProperties;
  "data-testid"?: string;
}

export function Toast({
  message,
  variant = "success",
  onClose,
  duration = 2500,
  style,
  "data-testid": testId,
}: ToastProps) {
  useEffect(() => {
    if (!onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isSuccess = variant === "success";
  const bg = isSuccess ? "#EDF2E7" : "#FBEDE9";
  const borderColor = isSuccess ? C.success : C.error;
  const textColor = isSuccess ? C.success : C.error;

  return (
    <div
      data-testid={testId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: radius.md,
        background: bg,
        border: `1px solid ${borderColor}`,
        color: textColor,
        fontFamily: font,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        ...style,
      }}
    >
      <span>{isSuccess ? "✓" : "✕"}</span>
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: textColor,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            padding: "0 0 0 8px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
