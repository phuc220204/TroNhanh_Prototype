import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { Skeleton } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { getSettings, setAutoApproveListings, setBoostConfig } from "../services/admin-settings-service";

export function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  const [boostPriceDraft, setBoostPriceDraft] = useState<string[]>([]);
  const [boostValidationError, setBoostValidationError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: qk.admin.settings,
    queryFn: getSettings,
  });

  const toggleMutation = useMutation({
    mutationFn: setAutoApproveListings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admin.settings });
      // Đổi chế độ làm tin mới đi vào hàng chờ thay vì Active — làm mới luôn.
      queryClient.invalidateQueries({ queryKey: ["admin", "moderationQueue"] });
    },
  });

  const boostMutation = useMutation({
    mutationFn: setBoostConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.admin.settings }),
  });

  const settings = settingsQuery.data;
  const autoApprove = settings?.autoApproveListings ?? true;
  const boostConfig = settings?.boostConfig;

  useEffect(() => {
    if (boostConfig) setBoostPriceDraft(boostConfig.price.map(String));
  }, [boostConfig]);

  const boostPricesChanged = Boolean(boostConfig && (
    boostPriceDraft.length !== boostConfig.price.length
    || boostPriceDraft.some((price, index) => price !== String(boostConfig.price[index]))
  ));

  const saveBoostPrices = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!boostConfig) return;

    const prices = boostPriceDraft.map((value) => value.trim() === "" ? Number.NaN : Number(value));
    if (prices.length !== boostConfig.days.length || prices.some((price) =>
      !Number.isSafeInteger(price) || price < 1 || price > 1_000_000_000
    )) {
      setBoostValidationError("Mỗi giá phải là số nguyên từ 1 đến 1.000.000.000 đồng.");
      return;
    }

    setBoostValidationError(null);
    boostMutation.mutate({ days: boostConfig.days, price: prices });
  };

  return (
    <AdminShell active="settings">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[5]}px` }}>
          Cài đặt cấu hình hệ thống
        </h1>

        {toggleMutation.isError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {toUserMessage(toggleMutation.error)}
          </div>
        )}

        {settingsQuery.isPending ? (
          <Skeleton variant="card" count={3} />
        ) : settingsQuery.isError ? (
          <div style={{ fontFamily: font, fontSize: 13.5, color: C.error }}>
            {toUserMessage(settingsQuery.error)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[5] }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space[4] }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px` }}>
                    Chế độ kiểm duyệt tin đăng
                  </p>
                  <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
                    <strong>Tự động:</strong> tin hiển thị ngay sau khi đăng.<br />
                    <strong>Thủ công:</strong> tin phải được duyệt trước khi hiển thị.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!autoApprove}
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(!autoApprove)}
                  data-testid="auto-approve-toggle"
                  style={{
                    flexShrink: 0,
                    fontFamily: font, fontSize: 13, fontWeight: 700,
                    color: autoApprove ? C.textSecondary : C.white,
                    background: autoApprove ? C.cream : C.primary,
                    border: `1px solid ${autoApprove ? C.border : C.primary}`,
                    borderRadius: radius.pill,
                    padding: `${space[2]}px ${space[4]}px`,
                    cursor: toggleMutation.isPending ? "wait" : "pointer",
                    minWidth: 110,
                  }}
                >
                  {autoApprove ? "Tự động" : "Thủ công"}
                </button>
              </div>

              <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: `${space[3]}px 0 0` }}>
                Cả hai chế độ đều ghi một dòng vào nhật ký kiểm duyệt, nên vòng đời tin luôn truy vết được.
              </p>
            </div>

            <form
              onSubmit={saveBoostPrices}
              noValidate
              data-testid="boost-prices-form"
              style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[5] }}
            >
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px` }}>
                Giá gói Boost
              </p>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: `0 0 ${space[4]}px`, lineHeight: 1.55 }}>
                Giá được áp dụng cho đơn thanh toán tạo mới. Đơn đã tạo trước đó giữ nguyên số tiền; thời hạn gói không thay đổi tại đây.
              </p>

              {boostMutation.isError && (
                <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
                  <TriangleAlert size={15} /> {toUserMessage(boostMutation.error)}
                </div>
              )}
              {boostMutation.isSuccess && !boostPricesChanged && (
                <div role="status" data-testid="boost-prices-saved" style={{ background: C.cream, border: `1px solid ${C.success}`, color: C.success, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
                  Đã lưu giá gói Boost.
                </div>
              )}
              {boostValidationError && (
                <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
                  <TriangleAlert size={15} /> {boostValidationError}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: space[4], marginBottom: space[4] }}>
                {boostConfig?.days.map((days, index) => (
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
                      value={boostPriceDraft[index] ?? String(boostConfig.price[index])}
                      aria-label={`Giá gói Boost ${days} ngày (đồng)`}
                      data-testid={`boost-price-${days}`}
                      onChange={(event) => {
                        setBoostValidationError(null);
                        boostMutation.reset();
                        setBoostPriceDraft((current) => {
                          const next = [...current];
                          next[index] = event.target.value;
                          return next;
                        });
                      }}
                      style={{ fontFamily: font, fontSize: 14, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, width: "100%", boxSizing: "border-box", background: C.white }}
                    />
                    <span style={{ fontFamily: font, fontSize: 11.5, color: C.textSecondary }}>
                      Hiện tại: {new Intl.NumberFormat("vi-VN").format(boostConfig.price[index])} đ
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={!boostPricesChanged || boostMutation.isPending || !boostConfig}
                data-testid="save-boost-prices"
                style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.white, background: C.primary, border: `1px solid ${C.primary}`, borderRadius: radius.md, padding: `${space[3]}px ${space[5]}px`, cursor: !boostPricesChanged || boostMutation.isPending ? "not-allowed" : "pointer", opacity: !boostPricesChanged || boostMutation.isPending ? 0.6 : 1 }}
              >
                {boostMutation.isPending ? "Đang lưu…" : "Lưu giá gói"}
              </button>
            </form>

            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[5] }}>
              <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px` }}>
                Hạn hiển thị tin được duyệt
              </p>
              <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
                {settings?.listingTtlDays ?? 60} ngày kể từ lúc duyệt (BR-026). Chỉ đọc ở phiên bản này.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

export default PlatformSettingsPage;
