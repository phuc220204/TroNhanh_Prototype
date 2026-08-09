import { supabase } from "../supabaseClient";
import { logError } from "./supabase-error";

/**
 * Hồ sơ của chính người đang đăng nhập.
 *
 * Trước đây KHÔNG có đường nào sửa tên hay số điện thoại: `/tai-khoan/cai-dat`
 * chỉ là một `EmptyState` ghi "Chức năng đang được cập nhật". Người đăng ký
 * bằng Google còn không có `contact_phone` (Google không cấp), nên tin họ đăng
 * hiện số rỗng mà không có chỗ nào bổ sung.
 */

export interface UpdateMyProfileInput {
  fullName: string;
  contactPhone: string;
}

/**
 * Cập nhật hồ sơ của chính mình.
 *
 * Không cần RPC: một bảng, một update, và policy
 * `for update using (auth.uid() = user_id)` đã là biên chặn — không ai sửa được
 * hồ sơ người khác kể cả khi client gửi `user_id` khác.
 *
 * ⚠️ `profiles` khóa theo `user_id`, KHÔNG phải `id` (`profiles.id` là uuid độc
 * lập). Nhầm cột này từng gây bug T01.
 */
export async function updateMyProfile(input: UpdateMyProfileInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("AUTH_REQUIRED");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: input.fullName.trim() || null,
        contact_phone: input.contactPhone.trim() || null,
      })
      .eq("user_id", uid);

    if (error) throw error;
  } catch (err) {
    logError("profile-service.updateMyProfile", err);
    throw err;
  }
}
