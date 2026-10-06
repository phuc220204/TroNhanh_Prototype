import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Toast } from "../components/common/Toast";
import { useBreakpoint } from "../components/useBreakpoint";

/**
 * Thông báo nổi dùng chung. Trước đây mỗi màn tự giữ `toastMsg` + `setTimeout`
 * riêng, mỗi nơi một kiểu (hộp xanh trong thẻ, Toast góc màn hình, …) và báo
 * lỗi bằng hộp xanh "thành công".
 *
 * Lỗi kiểm tra dữ liệu của form vẫn hiện NGAY TẠI form (để người dùng biết sửa
 * ô nào) — toast dành cho kết quả của một thao tác.
 */

export type ToastVariant = "success" | "error";

export interface ShowToastOptions {
  variant?: ToastVariant;
  /** data-testid cho E2E, ví dụ "occupancy-toast". */
  testId?: string;
}

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
  testId?: string;
}

interface ToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Tối đa bấy nhiêu thông báo cùng lúc — cũ nhất bị đẩy ra. */
const MAX_VISIBLE = 3;

/** Thông báo dài cần đọc lâu hơn; lỗi giữ lâu hơn thành công. */
function durationFor(message: string, variant: ToastVariant) {
  const base = Math.min(8000, Math.max(3000, message.length * 60));
  return variant === "error" ? base + 2000 : base;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  const { isMobile } = useBreakpoint();

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, options: ShowToastOptions = {}) => {
    const entry: ToastEntry = {
      id: nextId.current++,
      message,
      variant: options.variant ?? "success",
      testId: options.testId,
    };
    setToasts((list) => [...list, entry].slice(-MAX_VISIBLE));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          top: 20,
          right: isMobile ? 16 : 20,
          left: isMobile ? 16 : undefined,
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          alignItems: isMobile ? "stretch" : "flex-end",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: number) => void }) {
  // Callback ổn định: Toast đặt hẹn giờ theo `onClose`, đổi tham chiếu là hẹn lại từ đầu.
  const handleClose = useCallback(() => onDismiss(entry.id), [onDismiss, entry.id]);
  return (
    <div role={entry.variant === "error" ? "alert" : "status"} style={{ pointerEvents: "auto" }}>
      <Toast
        message={entry.message}
        variant={entry.variant}
        duration={durationFor(entry.message, entry.variant)}
        onClose={handleClose}
        data-testid={entry.testId}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast phải dùng bên trong ToastProvider");
  return context;
}
