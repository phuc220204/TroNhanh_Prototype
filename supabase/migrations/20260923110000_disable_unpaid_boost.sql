-- Không thể ghi payment thật khi dự án chưa tích hợp cổng thanh toán Boost.
-- RPC cũ tạo dòng payments(method='BankTransfer') chỉ từ một click của seller,
-- rồi cấp ưu tiên VIP ngay. Khóa cả lời gọi trực tiếp, không chỉ ẩn nút ở UI.
create or replace function public.boost_listing(
  p_listing_id uuid,
  p_days integer
) returns timestamptz
language plpgsql volatile security definer set search_path = public as $$
begin
  raise exception 'BOOST_PAYMENT_NOT_CONFIGURED' using errcode = '0A000';
end $$;

revoke execute on function public.boost_listing(uuid, integer) from public, anon, authenticated;
