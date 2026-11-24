import { Link } from "react-router";
import { CircleHelp } from "lucide-react";
import { C, font, radius } from "../../theme";
import { HELP_ROUTE } from "../../constants/legal";

/**
 * Nút "?" nhỏ trỏ tới một câu trong trang Hướng dẫn (`/huong-dan#<anchor>`).
 * Mở tab mới: bấm từ giữa form (vd. lập hóa đơn) không được làm mất dữ liệu đang nhập.
 */
export function HelpLink({ anchor, label, text, "data-testid": testId }: {
  /** id câu hỏi trong `HelpPage/content.ts`. */
  anchor: string;
  /** Mô tả cho trình đọc màn hình / tooltip. */
  label: string;
  /** Chữ hiện cạnh dấu "?" — bỏ trống thì chỉ hiện icon. */
  text?: string;
  "data-testid"?: string;
}) {
  return (
    <Link
      to={`${HELP_ROUTE}#${anchor}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text ? undefined : label}
      title={label}
      data-testid={testId}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
        minWidth: 28, minHeight: 28, justifyContent: "center", borderRadius: radius.pill,
        color: C.textSecondary, fontFamily: font, fontSize: 12.5, fontWeight: 600, textDecoration: "none",
      }}
    >
      <CircleHelp size={17} aria-hidden="true" />
      {text && <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>{text}</span>}
    </Link>
  );
}
