import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import type { BoostConfig } from "../services/admin-settings-service";

interface BoostPriceFormProps {
  title: string;
  description: string;
  /** Nhãn từng ô giá, vd. "Gói Boost" ⇒ "Giá gói Boost 7 ngày (đồng)". */
  priceLabel: string;
  config: BoostConfig;
  onSave: (config: BoostConfig) => Promise<void>;
  /** Tiền tố data-testid: "boost" ⇒ boost-prices-form, boost-price-7, save-boost-prices… */
  testIdPrefix: string;
}

const alertStyle = { display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 } as const;

/**
 * Sửa giá một cấu hình đẩy tin dạng `{ days: number[], price: number[] }` trong
 * `platform_settings`. Chỉ đổi GIÁ — số ngày của từng gói giữ nguyên. Ghi qua
 * RPC `set_platform_setting` (Admin) trong service được truyền vào.
 */
export function BoostPriceForm({ title, description, priceLabel, config, onSave, testIdPrefix }: BoostPriceFormProps) {
  const queryClient = useQueryClient();
  const [priceDraft, setPriceDraft] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: onSave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admin.settings }),
  });

  useEffect(() => {
    setPriceDraft(config.price.map(String));
  }, [config]);

  const isChanged = priceDraft.length !== config.price.length
    || priceDraft.some((price, index) => price !== String(config.price[index]));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prices = priceDraft.map((value) => value.trim() === "" ? Number.NaN : Number(value));
    if (prices.length !== config.days.length || prices.some((price) =>
      !Number.isSafeInteger(price) || price < 1 || price > 1_000_000_000
    )) {
      setValidationError("Mỗi giá phải là số nguyên từ 1 đến 1.000.000.000 đồng.");
      return;
    }
    setValidationError(null);
    mutation.mutate({ days: config.days, price: prices });
  };

  const isDisabled = !isChanged || mutation.isPending;

  return (
    <form
      onSubmit={submit}
      noValidate
      data-testid={`${testIdPrefix}-prices-form`}
      style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[5] }}
    >
      <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px` }}>{title}</p>
      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: `0 0 ${space[4]}px`, lineHeight: 1.55 }}>{description}</p>

      {mutation.isError && (
        <div role="alert" style={alertStyle}>
          <TriangleAlert size={15} /> {toUserMessage(mutation.error)}
        </div>
      )}
      {mutation.isSuccess && !isChanged && (
        <div role="status" data-testid={`${testIdPrefix}-prices-saved`} style={{ background: C.cream, border: `1px solid ${C.success}`, color: C.success, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
          Đã lưu {title.charAt(0).toLowerCase() + title.slice(1)}.
        </div>
      )}
      {validationError && (
        <div role="alert" style={alertStyle}>
          <TriangleAlert size={15} /> {validationError}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: space[4], marginBottom: space[4] }}>
        {config.days.map((days, index) => (
          <label key={days} style={{ display: "flex", flex: "1 1 180px", flexDirection: "column", gap: space[2], maxWidth: 240 }}>
            <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              Gói {days} ngày (VNĐ)
            </span>
            <input
              type="number"
              min={1}
              max={1_000_000_000}
              step={1}
              required
              value={priceDraft[index] ?? String(config.price[index])}
              aria-label={`Giá ${priceLabel} ${days} ngày (đồng)`}
              data-testid={`${testIdPrefix}-price-${days}`}
              onChange={(event) => {
                setValidationError(null);
                mutation.reset();
                setPriceDraft((current) => {
                  const next = [...current];
                  next[index] = event.target.value;
                  return next;
                });
              }}
              style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, width: "100%", boxSizing: "border-box", background: C.white }}
            />
            <span style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary }}>
              Hiện tại: {new Intl.NumberFormat("vi-VN").format(config.price[index] ?? 0)} đ
            </span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        data-testid={`save-${testIdPrefix}-prices`}
        style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.white, background: C.primary, border: `1px solid ${C.primary}`, borderRadius: radius.md, padding: `${space[3]}px ${space[5]}px`, cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.6 : 1 }}
      >
        {mutation.isPending ? "Đang lưu…" : "Lưu giá gói"}
      </button>
    </form>
  );
}
