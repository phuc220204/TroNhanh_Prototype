import { useState } from "react";
import { ImageDown } from "lucide-react";
import { Button } from "../../shared/components/common";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { useToast } from "../../shared/contexts/ToastContext";
import { logError } from "../../shared/services/supabase-error";
import { getInvoiceImageFileName, renderInvoiceImage, type InvoiceImageData } from "../services/invoice-image";

interface ExportInvoiceImageButtonProps {
  data: InvoiceImageData;
  variant?: "primary" | "outline";
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Trình duyệt cần URL còn sống tới lúc bắt đầu tải.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

/**
 * Xuất hóa đơn thành ảnh PNG để gửi cho người ở.
 * Điện thoại: mở bảng chia sẻ của hệ điều hành (gửi thẳng Zalo/Messenger).
 * Máy tính: tải file về.
 * Chỉ đọc dữ liệu ⇒ không gác `requiresWrite`: gói hết hạn vẫn gửi lại được hóa đơn cũ.
 */
export function ExportInvoiceImageButton({ data, variant = "outline" }: ExportInvoiceImageButtonProps) {
  const { isMobile } = useBreakpoint();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await renderInvoiceImage(data);
      const fileName = getInvoiceImageFileName(data);
      const file = new File([blob], fileName, { type: "image/png" });

      if (isMobile && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Hóa đơn phòng ${data.roomCode}` });
        } catch (shareError) {
          // Người dùng đóng bảng chia sẻ — không phải lỗi.
          if ((shareError as DOMException)?.name !== "AbortError") throw shareError;
        }
        return;
      }

      downloadBlob(blob, fileName);
      showToast("Đã tải ảnh hóa đơn về máy.", { variant: "success" });
    } catch (err) {
      logError("ExportInvoiceImageButton.handleExport", err);
      showToast("Chưa tạo được ảnh hóa đơn. Vui lòng thử lại.", { variant: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      loading={isExporting}
      icon={<ImageDown size={16} />}
      onClick={() => void handleExport()}
      data-testid="export-invoice-image-btn"
      style={{ whiteSpace: "nowrap" }}
    >
      {isExporting ? "Đang tạo ảnh..." : "Xuất ảnh hóa đơn"}
    </Button>
  );
}
