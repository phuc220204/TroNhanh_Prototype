-- content_reports: thu hồi quyền mặc định Supabase cấp cho bảng mới.
-- RLS đã chặn (không policy nào cho anon, không policy ghi nào), đây là lớp
-- phòng thủ thứ hai: anon không chạm bảng; authenticated chỉ SELECT, mọi ghi
-- qua RPC report_content / resolve_reports. Idempotent.
revoke all on public.content_reports from anon;
revoke insert, update, delete, truncate on public.content_reports from authenticated;
grant select on public.content_reports to authenticated;
