import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { C, font } from "../../theme";

export interface ImageWithFallbackProps {
  /** Rỗng/null ⇒ hiện ô "Chưa có ảnh" ngay, không gọi mạng. */
  src: string | null | undefined;
  alt: string;
  /** Áp cho cả <img> lẫn ô placeholder để giữ nguyên khung bố cục. */
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: React.MouseEventHandler<HTMLImageElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLImageElement>;
  /** Cỡ icon trong placeholder; ảnh nhỏ (thumbnail 72px) dùng cỡ nhỏ. */
  iconSize?: number;
  /** Ẩn dòng chữ khi khung quá nhỏ để chứa. */
  hideLabel?: boolean;
}

/**
 * Ảnh tin đăng. Tin không có ảnh (hoặc ảnh lỗi) hiện ô trung tính "Chưa có ảnh"
 * — KHÔNG thay bằng ảnh mẫu: người thuê sẽ tưởng đó là ảnh thật của phòng.
 */
export function ImageWithFallback({ src, alt, style, onClick, onMouseEnter, onMouseLeave, iconSize = 28, hideLabel }: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`${alt} — chưa có ảnh`}
        data-testid="image-placeholder"
        onClick={onClick}
        style={{
          ...style,
          background: C.cream,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: C.textSecondary,
        }}
      >
        <ImageOff size={iconSize} color={C.secondary} />
        {!hideLabel && <span style={{ fontFamily: font, fontSize: 12, fontWeight: 600 }}>Chưa có ảnh</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onError={() => setFailedSrc(src)}
      style={style}
    />
  );
}
