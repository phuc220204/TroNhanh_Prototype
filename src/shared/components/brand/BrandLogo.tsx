import { useState } from "react";
import { C, font } from "../../theme";

type BrandLogoVariant = "full" | "icon";
type BrandLogoSize = "sm" | "md" | "lg";
type BrandLogoTone = "light" | "dark";

const SIZES: Record<BrandLogoSize, { icon: number; full: number; text: number }> = {
  sm: { icon: 24, full: 32, text: 16 },
  md: { icon: 32, full: 40, text: 20 },
  lg: { icon: 40, full: 48, text: 24 },
};

export function BrandLogo({
  variant = "full",
  size = "md",
  tone = "light",
}: {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  tone?: BrandLogoTone;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const dimensions = SIZES[size];
  const isIcon = variant === "icon";
  const source = isIcon
    ? "/brand/tro-nhanh-logo-icon-transparent.png"
    : tone === "dark"
      ? "/brand/logo-horizontal-white.png"
      : "/brand/logo-horizontal.png";
  const height = isIcon ? dimensions.icon : dimensions.full;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", color: tone === "dark" ? C.white : C.primaryDark, lineHeight: 1, whiteSpace: "nowrap", flexShrink: 0 }}>
      {failedSource === source ? (
        <span style={{ fontFamily: font, fontSize: dimensions.text, fontWeight: 800, lineHeight: 1 }}>
          Trọ Nhanh
        </span>
      ) : (
        <img
          src={source}
          alt="Trọ Nhanh"
          width={isIcon ? height : height * 4}
          height={height}
          onError={() => setFailedSource(source)}
          style={{ display: "block", width: isIcon ? height : "auto", height, objectFit: "contain", flexShrink: 0, filter: isIcon && tone === "dark" ? "brightness(0) invert(1)" : undefined }}
        />
      )}
    </span>
  );
}
