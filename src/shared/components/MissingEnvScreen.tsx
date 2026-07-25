import React from "react";
import { C, font } from "../theme";

/**
 * Màn hình hiển thị khi thiếu biến môi trường bắt buộc.
 *
 * Vì sao cần component này: `config.ts` trước đây `throw` ngay lúc module load.
 * File đó bị import gián tiếp bởi graph route lazy-load, nên error làm React
 * unmount toàn bộ cây → MÀN HÌNH TRẮNG, không có thông tin gì cho người chạy dự án.
 */
export const MissingEnvScreen: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: C.bg,
      fontFamily: font,
    }}
  >
    <div
      style={{
        maxWidth: 520,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "28px 30px",
        boxShadow: "0 4px 20px rgba(92,70,50,0.08)",
      }}
    >
      <h1 style={{ fontFamily: font, fontSize: 19, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
        Chưa cấu hình được kết nối
      </h1>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 0 18px", lineHeight: 1.65 }}>
        {message}
      </p>
      <pre
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12.5,
          background: C.cream,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          margin: 0,
          overflowX: "auto",
          color: C.textPrimary,
          lineHeight: 1.6,
        }}
      >
{`# .env ở gốc dự án
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>`}
      </pre>
    </div>
  </div>
);
