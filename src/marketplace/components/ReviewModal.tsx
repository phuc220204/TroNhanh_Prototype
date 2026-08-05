import { useState } from "react";
import { Star } from "lucide-react";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { Button } from "../../shared/components/common/Button";
import { C, font, radius, space } from "../../shared/theme";

const MAX_CONTENT = 1000;

interface ReviewModalProps {
  propertyName: string;
  initialRating?: number;
  initialContent?: string;
  submitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (rating: number, content: string) => void;
}

export function ReviewModal({
  propertyName,
  initialRating = 0,
  initialContent = "",
  submitting,
  errorMessage,
  onCancel,
  onSubmit,
}: ReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [content, setContent] = useState(initialContent);

  const shown = hover || rating;

  return (
    <ModalShell
      title={`Đánh giá ${propertyName}`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>Hủy</Button>
          <Button
            disabled={rating < 1 || submitting}
            loading={submitting}
            onClick={() => onSubmit(rating, content)}
            data-testid="review-submit-btn"
          >
            Gửi đánh giá
          </Button>
        </>
      }
    >
      <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
        Mức độ hài lòng <span style={{ color: C.error }}>*</span>
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: space[4] }} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} sao`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            data-testid={`review-star-${n}`}
            style={{ background: "none", border: "none", padding: 2, cursor: "pointer", lineHeight: 0 }}
          >
            <Star
              size={30}
              color={n <= shown ? C.warning : C.border}
              fill={n <= shown ? C.warning : "none"}
              strokeWidth={1.6}
            />
          </button>
        ))}
      </div>

      <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
        Nhận xét của bạn
      </p>
      <textarea
        rows={5}
        value={content}
        maxLength={MAX_CONTENT}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Khu trọ có gì tốt, có gì cần cải thiện? Nhận xét cụ thể giúp người tìm trọ sau quyết định dễ hơn."
        data-testid="review-content-input"
        style={{
          width: "100%",
          fontFamily: font,
          fontSize: 14,
          color: C.textPrimary,
          padding: space[3],
          background: C.white,
          border: `1.5px solid ${C.border}`,
          borderRadius: radius.md,
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.55,
          resize: "vertical",
        }}
      />
      <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: `${space[1]}px 0 0`, textAlign: "right" }}>
        {content.length}/{MAX_CONTENT}
      </p>

      {errorMessage && (
        <p style={{ fontFamily: font, fontSize: 13, color: C.error, margin: `${space[2]}px 0 0` }}>
          {errorMessage}
        </p>
      )}
    </ModalShell>
  );
}
