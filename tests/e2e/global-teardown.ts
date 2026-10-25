import { cleanupE2eRecords } from "./cleanup";
import { canWriteToTarget } from "./e2e-env";

/**
 * Chạy MỘT lần sau toàn bộ lần chạy — kể cả khi spec đỏ — để không còn bản ghi
 * `-e2e-` nào nằm lại trên database.
 *
 * Không throw khi dọn lỗi: teardown fail sẽ che kết quả thật của các spec. Thay
 * vào đó in danh sách bản ghi còn sót để người chạy xử lý.
 */
export default async function globalTeardown(): Promise<void> {
  // Guard chặn spec ghi thì cũng không có gì để dọn — và không chạm production.
  if (!canWriteToTarget()) return;

  const report = await cleanupE2eRecords();
  const lines = [
    `[e2e-cleanup] đã xóa mềm: ${report.demandPosts} tin nhu cầu, ${report.listings} tin đăng, ${report.properties} khu trọ`,
    ...report.failures.map((failure) => `[e2e-cleanup] CÒN SÓT — ${failure}`),
  ];
  // Không dùng console.* (CLAUDE.md §7) — ghi thẳng ra stdout của runner.
  process.stdout.write(`${lines.join("\n")}\n`);
}
