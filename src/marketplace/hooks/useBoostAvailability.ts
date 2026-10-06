import { useQuery } from "@tanstack/react-query";
import { qk } from "../../shared/query/keys";
import { useAuth } from "../../shared/contexts/AuthContext";
import { getBoostPackages, type BoostPackage } from "../services/boost-payment-service";

/** Server trả mã này khi secret PAYOS_CHECKOUT_ENABLED tắt — Boost đóng cho mọi người. */
const BOOST_DISABLED_ERROR = "PAYMENT_NOT_AVAILABLE";

export interface BoostAvailability {
  /** Có ít nhất một gói hợp lệ từ server ⇒ hiện lối vào thanh toán Boost. */
  isBoostAvailable: boolean;
  packages: BoostPackage[];
  isPending: boolean;
  /** Lỗi tải gói (mạng, cấu hình) — KHÔNG tính trường hợp server chủ động tắt Boost. */
  hasLoadError: boolean;
  retry: () => void;
}

/**
 * Nguồn duy nhất quyết định có hiện Boost hay không: hỏi `payos-boost-packages`.
 * Bật/tắt Boost cho toàn hệ thống chỉ cần đổi secret trên Supabase, không cần
 * build lại frontend.
 */
export function useBoostAvailability(): BoostAvailability {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: qk.boost.packages(user?.id),
    queryFn: getBoostPackages,
    enabled: Boolean(user?.id),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isDisabledByServer = query.error instanceof Error && query.error.message.includes(BOOST_DISABLED_ERROR);
  const packages = query.data ?? [];

  return {
    isBoostAvailable: packages.length > 0,
    packages,
    isPending: Boolean(user?.id) && query.isPending,
    hasLoadError: query.isError && !isDisabledByServer,
    retry: () => void query.refetch(),
  };
}
