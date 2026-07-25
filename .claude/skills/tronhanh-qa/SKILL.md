---
name: tronhanh-qa
description: Tự kiểm Definition of Done và Acceptance Criteria trước khi báo hoàn thành một task Trọ Nhanh. Dùng ở cuối MỌI task. Trigger khi thấy "xong chưa", "kiểm DoD", "self-review", "trước khi commit", "hoàn thành task", "verify".
---

# Tự kiểm trước khi báo xong

> Chạy **toàn bộ** phần này trước khi nói "đã xong". Báo xong khi chưa pass là tệ hơn báo chưa xong.

## 1. Cổng tự động (chạy thật, đừng đoán)

```bash
pnpm typecheck
pnpm typecheck:strict
pnpm build
```

Cả 3 phải xanh. Nếu task có SQL:
```bash
supabase db push
pnpm db:types
pnpm typecheck
```
(chạy `typecheck` **lại** sau `db:types` — type mới có thể làm lộ lỗi cũ)

## 2. Grep bắt buộc

```bash
# console.* chỉ được ở supabase-error.ts
grep -rn "console\." src --include=*.ts --include=*.tsx | grep -v "supabase-error.ts"

# không còn [Demo] alert
grep -rn "\[Demo\]" src

# không hex literal mới trong file bạn vừa sửa
# không className mới
grep -rn "className=" src

# giá trị enum bất hợp pháp
grep -rn "\"Inactive\"\|'Inactive'\|Repairing" src

# từ bị cấm
grep -rni "tenant" src

# query profiles sai khoá
grep -rn 'from("profiles")' src -A3 | grep 'eq("id"'

# page gọi supabase trực tiếp (chỉ service được phép)
grep -rn "supabase\.from(" src/marketplace/pages src/workspace/pages src/admin/pages

# query key viết tay
grep -rn "queryKey: \[" src | grep -v "qk\."
```

**Mọi lệnh trên phải ra rỗng.**

## 3. Grep riêng cho task đã xóa/thay thứ gì

Nếu task nói "thay X bằng Y", grep X phải ra **0 hit**. Ví dụ:
- Xóa hack CustomEvent → `grep -rn "tronhanh_sub_status" src` = 0
- Xóa mock fallback → `grep -rn "FEATURED_ROOMS\|INIT_PROPERTIES\|ROOM_WANTED_POSTS" src` chỉ còn file định nghĩa (hoặc 0)
- Xóa field hardcode demand post → `grep -rn '"Khách tìm trọ"\|"ND"\|"Cần 1 người"' src` = 0
- Xóa marker metadata → `grep -rn "appendMetadataToDescription" src` = 0 ở write path

## 4. Đi qua "Cách test" trong file task

Mở lại `docs/cp4/tasks/T<xx>_*.md`, làm **từng bước**, đặc biệt phần **điều kiện FAIL**. Không đọc rồi kết luận — thao tác thật.

Nếu task thuộc 1 trong 5 luồng, đối chiếu click-path tương ứng ở `docs/cp4/06_QA_CHECKLIST.md` §3.

## 5. Acceptance Criteria (PRD §7)

- [ ] Thao tác ghi/đọc **dữ liệu thật**; DB rỗng → `EmptyState`, không mock
- [ ] RLS đúng: tài khoản khác không thấy dữ liệu riêng tư
- [ ] BR liên quan được tôn trọng (`/CLAUDE.md` §9)
- [ ] Không hardcode secret
- [ ] Không `console.*`, không `[Demo]` alert
- [ ] Ghi đa bảng qua RPC — trạng thái không lệch nếu ngắt giữa lúc ghi
- [ ] Không CTA đường cùng
- [ ] Thanh toán giả lập ghi **"(giả lập)"**
- [ ] Element E2E chạm tới có `data-testid`

## 6. Kiểm bảo mật (nếu task chạm SQL/RLS/RPC)

- [ ] Không policy public SELECT lên `properties` (hay bảng nào có cột bank/giá)
- [ ] Không inline `exists()` vào bảng caller đọc không được → phải bọc `security definer`
- [ ] Mọi RPC có ownership assert **trong body** + `set search_path = public` + `revoke`/`grant`
- [ ] Không nhận `owner_id`/`seller_id`/`status`/`total_amount` từ client
- [ ] Hàm demo có tiền tố `demo_` + đã ghi vào danh sách drop-trước-production
- [ ] Chạy `supabase/tests/rls.sql` → mọi cột `ok_*` = `true`

## 7. Kiểm kích thước file

```bash
# file nào vừa sửa mà > 600 dòng thì split là DoD của task này
```
Page mới phải < 400 dòng.

## 8. Báo cáo

Khi báo xong, nói rõ:
1. **Đã làm gì** (danh sách file, không phải văn xuôi)
2. **Đã verify thế nào** — dán output thật của typecheck/build, không nói "đã kiểm"
3. **Cái gì CHƯA làm** và vì sao — nếu có phần bị block, nói thẳng, đừng im lặng bỏ qua
4. **Phát sinh gì mới** — bug tìm thấy dọc đường, quyết định phải tự đưa ra

> Nếu một DoD không pass: **giữ task ở trạng thái chưa xong**, nêu rõ cái gì fail và output lỗi. Đừng báo hoàn thành một phần như thể đã hoàn thành.
