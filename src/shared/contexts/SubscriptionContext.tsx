import { createContext, useContext, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import type { SubscriptionStatus } from "../types/status";
import { qk } from "../query/keys";
import {
  getMySubscription,
  setDemoStatus as setDemoStatusApi,
  activateTrial as activateTrialApi,
  SubscriptionData,
} from "../services/subscription-service";

export interface SubscriptionContextValue {
  status: SubscriptionStatus;
  trialDaysLeft: number;
  plan: any | null;
  limits: { maxProperties: number; maxRooms: number };
  isReadOnly: boolean;
  canWrite: boolean;
  isLoading: boolean;
  refresh: () => void;
  setDemoStatus: (s: SubscriptionStatus) => Promise<void>;
  activateTrial: () => Promise<void>;
}

const DEFAULT_CONTEXT: SubscriptionContextValue = {
  status: "NONE",
  trialDaysLeft: 0,
  plan: null,
  limits: { maxProperties: 1, maxRooms: 5 },
  isReadOnly: false,
  canWrite: false,
  isLoading: false,
  refresh: () => {},
  setDemoStatus: async () => {},
  activateTrial: async () => {},
};

export const SubscriptionContext = createContext<SubscriptionContextValue>(DEFAULT_CONTEXT);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SubscriptionData>({
    queryKey: qk.subscription(user?.id),
    queryFn: () => getMySubscription(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const refresh = useCallback(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: qk.subscription(user.id) });
    }
  }, [queryClient, user?.id]);

  const setDemoStatus = useCallback(
    async (s: SubscriptionStatus) => {
      if (!user?.id) return;
      await setDemoStatusApi(user.id, s);
      queryClient.invalidateQueries({ queryKey: qk.subscription(user.id) });
    },
    [queryClient, user?.id]
  );

  const activateTrial = useCallback(async () => {
    if (!user?.id) return;
    await activateTrialApi(user.id);
    queryClient.invalidateQueries({ queryKey: qk.subscription(user.id) });
  }, [queryClient, user?.id]);

  const status: SubscriptionStatus = data?.status || "NONE";
  const isReadOnly = status === "READ_ONLY";
  const canWrite = status === "TRIAL" || status === "ACTIVE";

  const value: SubscriptionContextValue = {
    status,
    trialDaysLeft: data?.trialDaysLeft || 0,
    plan: data?.plan || null,
    limits: data?.limits || { maxProperties: 1, maxRooms: 5 },
    isReadOnly,
    canWrite,
    isLoading,
    refresh,
    setDemoStatus,
    activateTrial,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

export function useCanWrite(): boolean {
  const { canWrite } = useContext(SubscriptionContext);
  return canWrite;
}

/**
 * BR-015 — Lý do (tiếng Việt) khiến thao tác ghi bị khóa, hoặc `null` nếu ghi được.
 *
 * Vì sao cần hàm riêng thay vì để mỗi nút tự viết câu thông báo: hai trạng thái
 * khóa có ý nghĩa KHÁC nhau và người dùng phải phân biệt được.
 *   • NONE      — chưa từng kích hoạt gói ⇒ mời dùng thử
 *   • READ_ONLY — đã hết hạn ⇒ trấn an rằng DỮ LIỆU KHÔNG MẤT, chỉ cần gia hạn
 * Gộp cả hai thành "bạn không có quyền" là làm chủ trọ tưởng mình mất dữ liệu.
 */
export function useWriteBlockReason(): string | null {
  const { status, canWrite } = useContext(SubscriptionContext);
  if (canWrite) return null;
  if (status === "READ_ONLY") {
    return "Gói dịch vụ đã hết hạn. Dữ liệu của bạn vẫn được giữ nguyên — hãy gia hạn để tiếp tục chỉnh sửa.";
  }
  return "Hãy kích hoạt gói dùng thử để sử dụng chức năng quản lý trọ.";
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const { status } = useContext(SubscriptionContext);
  return status;
}
