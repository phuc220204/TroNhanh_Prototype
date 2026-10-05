/**
 * Application Configuration Management
 * Gom toàn bộ truy cập biến môi trường về một chỗ (CLAUDE.md §4).
 *
 * QUAN TRỌNG — fail-soft, KHÔNG throw ở module load:
 * File này bị import gián tiếp bởi graph route lazy-load. Một error throw lúc
 * module-evaluate làm React unmount toàn bộ cây và cho ra MÀN HÌNH TRẮNG, không
 * có thông báo nào. Thay vào đó ta export `configError` và để App.tsx render một
 * màn hình tiếng Việt đọc được.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnvVars: string[] = [];
if (!supabaseUrl) missingEnvVars.push("VITE_SUPABASE_URL");
if (!supabaseAnonKey) missingEnvVars.push("VITE_SUPABASE_ANON_KEY");

/**
 * `null` khi cấu hình hợp lệ. Ngược lại là message tiếng Việt để hiển thị cho user.
 * App.tsx phải kiểm giá trị này TRƯỚC khi render router.
 */
export const configError: string | null =
  missingEnvVars.length > 0
    ? `Thiếu biến môi trường: ${missingEnvVars.join(", ")}. ` +
      `Hãy tạo file .env ở gốc dự án (tham khảo .env.example) rồi khởi động lại dev server.`
    : null;

export const config = {
  supabase: {
    // Chuỗi rỗng khi thiếu — an toàn vì App.tsx đã chặn ở configError trước khi
    // bất kỳ query nào chạy. Giữ kiểu string để createClient không cần cast.
    url: supabaseUrl ?? "",
    anonKey: supabaseAnonKey ?? "",
  },
};
