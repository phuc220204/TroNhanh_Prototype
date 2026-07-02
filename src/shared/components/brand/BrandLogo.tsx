import { useState } from "react";
import { C, font } from "../../theme";

type BrandLogoVariant = "full" | "icon";
type BrandLogoSize = "sm" | "md" | "lg";

const ICON_ASSETS = [
  "/brand/tro-nhanh-logo-icon-transparent.png",
  "/brand/tro-nhanh-logo-icon.png",
];

const SIZES: Record<BrandLogoSize, { icon: number; text: number; gap: number }> = {
  sm: { icon: 24, text: 16, gap: 8 },
  md: { icon: 32, text: 20, gap: 10 },
  lg: { icon: 40, text: 24, gap: 10 },
};

export function BrandLogo({
  variant = "full",
  size = "md",
  className,
}: {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
}) {
  const [assetIndex, setAssetIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const dimensions = SIZES[size];

  const handleImageError = () => {
    if (assetIndex < ICON_ASSETS.length - 1) {
      setAssetIndex(index => index + 1);
      return;
    }
    setImageFailed(true);
  };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dimensions.gap,
        color: `var(--tn-brand-logo-color, ${C.primaryDark})`,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {!imageFailed && (
        <img
          src={ICON_ASSETS[assetIndex]}
          alt="Trọ Nhanh"
          onError={handleImageError}
          style={{
            display: "block",
            width: dimensions.icon,
            height: dimensions.icon,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
      )}
      {(variant === "full" || imageFailed) && (
        <span style={{ fontFamily: font, fontSize: dimensions.text, fontWeight: 800, letterSpacing: 0, lineHeight: 1 }}>
          Trọ Nhanh
        </span>
      )}
    </span>
  );
}
