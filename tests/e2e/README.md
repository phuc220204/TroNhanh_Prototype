# Bộ E2E Playwright (T29)

> Đọc hết mục 1 trước khi chạy lần đầu. Bộ test này **ghi dữ liệu thật lên
> Supabase remote** — không có database test riêng.

---

## 1. ⛔ ĐỌC TRƯỚC KHI CHẠY

### 1.1 Phải làm T32 phần 2 TRƯỚC

Bộ test tạo khu trọ, phòng, tin đăng, tin nhu cầu và tin nhắn. Chạy nó trước khi
đi hết `09_T32_CHECKLIST_DB_TRONG.md` là **mất vĩnh viễn** cơ hội kiểm "trải
nghiệm người dùng đầu tiên trên hệ thống trống" — cái đó không dựng lại được sau
khi đã có dữ liệu.

### 1.2 Cấu hình bắt buộc

| Việc | Nơi làm | Vì sao |
|---|---|---|
| **Tắt email confirmation** | Supabase → Auth → Providers → Email | `auth.spec` đăng ký tài khoản mới; còn bật thì `signUp` không trả session và test đứng ở màn "kiểm tra email" |
| **Chế độ kiểm duyệt = Tự động** | `/quan-tri/cai-dat` | `listing.spec` chờ tin lên `/tat-ca-phong`. `moderation.spec` tự bật Thủ công rồi trả lại — nhưng nếu nó chết giữa chừng thì phải trả tay |
| **Có dữ liệu seed** | đăng nhập `seller.a` → DemoFAB → "Seed Dữ liệu mẫu" | `review.spec` cần một đợt ở đã seed để `demo_link_me_to_seeded_occupancy` gắn vào |
| **Dev server port 5173** | mặc định | Google Cloud Console khai redirect URI cố định theo port đó |

### 1.3 Dữ liệu rác mỗi lần chạy

| Spec | Tạo ra | Dọn ở đâu |
|---|---|---|
| `auth` | 1 tài khoản `e2e.<stamp>@tronhanh.test` | Supabase → Auth → Users (lọc `@tronhanh.test`) |
| `listing` | 2 tin đăng + 5 ảnh trong Storage | `/tai-khoan/tin-cho-thue` → xóa tin (ảnh xóa theo) |
| `moderation` | 1 tin đăng | `/tai-khoan/tin-cho-thue` |
| `demand` | 3 tin nhu cầu | `/tai-khoan/tin-nhu-cau` |
| `workspace` | 1 khu + 1 phòng + 1 người ở + chỉ số + 1 hóa đơn | `/chu-tro/quan-ly-phong` → tab Cài đặt → xóa khu |
| `review` | 1 đánh giá + 1 phản hồi | `/tai-khoan/danh-gia` |
| `messaging` | 1 cuộc trò chuyện | không có UI xóa — để lại, vô hại |

Tên đều gắn timestamp (`-e2e-<base36>`) nên tìm lại được, và không bao giờ trùng
với dữ liệu demo thật.

---

## 2. Chạy

```bash
pnpm test:e2e
```

```bash
pnpm test:e2e:ui
```

```bash
pnpm exec playwright test tests/e2e/auth.spec.ts
```

`webServer` trong `playwright.config.ts` tự khởi động `pnpm dev` nếu chưa chạy,
và dùng lại server đang chạy nếu có (`reuseExistingServer`).

Lần đầu trên một máy mới cần tải trình duyệt:

```bash
pnpm exec playwright install chromium
```

Xem báo cáo sau khi chạy:

```bash
pnpm exec playwright show-report
```

---

## 3. Bảy spec

| File | Kiểm điều gì | Assertion negative |
|---|---|---|
| `auth.spec.ts` | đăng ký → có session ngay → reload giữ session → đăng xuất; `?redirect=` | sai mật khẩu không tạo phiên và không lộ chuỗi tiếng Anh; `?redirect=` sang host ngoài bị bỏ qua |
| `listing.spec.ts` | đăng tin 4 bước + upload 3 ảnh thật → ảnh trên Storage; BR-014; BR-005 | thiếu ảnh không qua được bước 3; khách thấy SĐT che |
| `demand.spec.ts` | đăng RoomWanted + RoommateWanted → card hiện field THẬT | 7 chuỗi mock cũ không được quay lại; BR-030 ẩn nút liên hệ |
| `moderation.spec.ts` | Thủ công → chờ duyệt → từ chối có lý do → sửa & gửi lại → duyệt → lên public | tin `PendingApproval` không lên marketplace; từ chối không lý do bị chặn; seller thấy màn 403 |
| `workspace.spec.ts` | khu → phòng (giá riêng) → sửa phòng → người ở → chỉ số → hóa đơn → Đã thu | chỉ số thấp hơn kỳ trước bị chặn; BR-007 seller.b không thấy dữ liệu seller.a |
| `review.spec.ts` | BR-029 xác nhận → đánh giá → chủ trọ trả lời | tài khoản chưa từng ở không có form; BR-024 tắt hồ sơ thì mất link công khai |
| `messaging.spec.ts` | **2 context**: A gửi → B nhận | BR-019 không đẻ thread mới; BR-030 không nhắn cho tin của mình |

---

## 4. Luật viết spec cho repo này

1. **`data-testid` là selector duy nhất cho điều khiển.** Codebase có **zero
   `className`** (§8.1 — mọi style là inline object), nên không có gì khác ổn
   định. Ngoại lệ: `[name="..."]` của field Formik.
   Thiếu testid → **thêm vào component**, không đi vòng bằng `nth()` hay xpath.

2. **Assert bằng văn bản thì được, chọn điều khiển bằng văn bản thì không.** Copy
   tiếng Việt đổi thường xuyên; testid thì không.

3. **Không `waitForTimeout`.** Dùng `expect(...).toBeVisible()` / `toHaveCount()`
   — chúng tự retry tới `expect.timeout`.

4. **Không visual-regression snapshot.** 1.950 inline style + page transition của
   `motion` = flake vô tận, và ảnh chụp khác nhau giữa các máy.

5. **Mỗi spec phải có ít nhất một assertion negative.** Test chỉ đi đường thành
   công thì không phân biệt được "tính năng chạy" với "tính năng luôn trả true".

6. **`workers: 1`, không `retries`.** Bảy spec dùng chung 4 tài khoản demo và một
   database. Retry ở đây che bug thật (race giữa React Query và điều hướng) chứ
   không làm test ổn định hơn.

7. **Không nới business rule cho dễ test.** Đặc biệt `can_review_contract()` —
   cái cổng đó CHÍNH LÀ giá trị của review verified-only. Dùng
   `demo_link_me_to_seeded_occupancy` qua DemoFAB.

---

## 5. Khi test đỏ

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| `auth.spec` đứng ở "kiểm tra email" | Email confirmation đang BẬT |
| `listing.spec` không thấy tin ở `/tat-ca-phong` | Chế độ kiểm duyệt đang **Thủ công** (`moderation.spec` chết giữa chừng?) |
| `review.spec` không có `stay-card` | Chưa seed dữ liệu, hoặc `demo_link_me_to_seeded_occupancy` không còn phòng trống để gắn |
| `workspace.spec` fail ngay test đầu | Gói của `seller.a` hết hạn ⇒ READ_ONLY (BR-015), mọi nút ghi bị khóa |
| Nhiều spec cùng timeout ở bước đăng nhập | Supabase rate limit — nghỉ vài phút, đừng chạy vòng lặp |
| Lỗi "more than one relationship was found" ở console | Embed PostgREST thiếu tên FK — giữa `occupancies` và `contracts` có HAI đường |

Trace của lần chạy hỏng nằm ở `test-results/`; mở bằng:

```bash
pnpm exec playwright show-trace test-results/<thư-mục>/trace.zip
```
