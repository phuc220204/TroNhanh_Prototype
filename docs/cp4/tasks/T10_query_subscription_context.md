# T10 — React Query provider + SubscriptionContext (xóa hack CustomEvent)

**Phụ thuộc:** T04b.
**Chặn:** T11a/b/c.
**Skill:** `tronhanh-service`

> Phần đã xong: `shared/query/keys.ts`, `shared/query/queryClient.ts`, `AuthContext` có `roles`/`hasRole` + sửa bug spinner nháy.

## Việc còn lại

### 1. Mount provider trong `App.tsx`
```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <SubscriptionProvider>
      <RouterProvider router={router} />
    </SubscriptionProvider>
  </AuthProvider>
</QueryClientProvider>
```
`QueryClientProvider` **ngoài** `AuthProvider`; `SubscriptionProvider` **trong** (nó cần `user`).

### 2. `src/shared/services/subscription-service.ts`
`getMySubscription()` · `activateTrial()` · `setDemoStatus(s)` → gọi RPC **`set_subscription_status`** (đã có). Không ghi trực tiếp vào `user_subscriptions` từ client nữa — RPC đảm bảo `seller_id := auth.uid()` nên toggle demo không thể chạm row người khác.

### 3. `src/shared/contexts/SubscriptionContext.tsx`
```ts
interface SubscriptionContextValue {
  status: SubscriptionStatus;      // NONE | TRIAL | ACTIVE | READ_ONLY
  trialDaysLeft: number;
  plan: SubscriptionPlan | null;
  limits: { maxProperties: number; maxRooms: number };
  isReadOnly: boolean;
  canWrite: boolean;               // TRIAL | ACTIVE
  isLoading: boolean;
  refresh: () => void;             // = invalidateQueries(qk.subscription(userId))
  setDemoStatus: (s: SubscriptionStatus) => Promise<void>;
}
```
Backed bởi query `qk.subscription(userId)`. "Broadcast một thay đổi" trở thành `invalidateQueries` — mọi consumer re-render **qua React**, không qua global event.

Thêm `useCanWrite()` cho BR-015 — **một chỗ**, không check per-button.

### 4. ⚠️ Xóa hack event bus
`LandlordShell.tsx`: xóa state `subStatus` local (~dòng 337), `updateSubStatus`, và `window.dispatchEvent(new CustomEvent("tronhanh_sub_status"))` (~dòng 346). Xóa mọi `addEventListener("tronhanh_sub_status")`.

```bash
grep -rn "tronhanh_sub_status" src   # phải = 0
```

### 5. Split `LandlordShell.tsx` (853 dòng)
Task này chạm nó nhiều → split-on-touch áp dụng: tách `SubscriptionBanner.tsx`, `TrialModal.tsx`, `SidebarNav.tsx`.

## Cách test
1. Toggle demo vẫn chuyển đúng **cả 4** trạng thái NONE → TRIAL → ACTIVE → READ_ONLY
2. Ở READ_ONLY: nút tạo/sửa/xóa trong zone SaaS **disabled**, dữ liệu **vẫn xem được** (BR-015)
3. Ở NONE: nhóm SaaS hiện **icon khóa** + CTA "Dùng thử miễn phí 1 tháng"
4. Ở TRIAL: banner "Còn X ngày dùng thử"
5. Đổi trạng thái ở tab này → tab khác `refresh()` thấy đúng
6. **Để app mở ~1 giờ** (hoặc gọi `supabase.auth.refreshSession()`) → spinner **không** nháy
7. `grep -rn "tronhanh_sub_status" src` = 0

## DoD
- [ ] 4 trạng thái gating hoạt động qua context, không qua CustomEvent
- [ ] `grep tronhanh_sub_status` = 0
- [ ] Toggle demo đi qua RPC `set_subscription_status`
- [ ] `useCanWrite()` tồn tại và được dùng
- [ ] Không spinner nháy khi token refresh
- [ ] `LandlordShell.tsx` < 600 dòng sau split
- [ ] typecheck + strict = 0
