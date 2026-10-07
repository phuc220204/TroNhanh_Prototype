import QRCode from "qrcode";
import { C, font } from "../../shared/theme";
import { buildVietQrPayload, toAsciiPurpose } from "../../shared/utils/vietqr";
import { findBankByCode } from "../../shared/utils/vietqr-banks";
import { formatDate, formatPeriod, formatVnd } from "../../shared/utils/format";

/**
 * Ảnh hóa đơn để chủ trọ gửi cho người ở qua Zalo/Messenger.
 *
 * Vẽ thẳng bằng Canvas 2D thay vì chụp DOM (html2canvas…): không thêm thư viện,
 * không phụ thuộc layout của modal, và mã QR là ảnh vẽ tại máy (thư viện
 * `qrcode`) nên không dính CORS. Số tài khoản không đi qua máy chủ nào.
 */

export const ITEM_TYPE_LABELS: Record<string, string> = {
  Rent: "Tiền phòng",
  Electricity: "Tiền điện",
  Water: "Tiền nước",
  Service: "Phí dịch vụ",
  Other: "Khác",
};

export interface InvoiceImageLine {
  label: string;
  /** Dòng phụ: mô tả, hoặc "120 × 3.500 đ" cho điện nước. */
  detail: string | null;
  amount: number;
}

export interface InvoiceImageData {
  propertyName: string;
  roomCode: string;
  /** `YYYY-MM` */
  period: string;
  /** `YYYY-MM-DD` */
  dueDate: string | null;
  /** Ngày lập hóa đơn (`created_at`). */
  issuedAt: string;
  lines: InvoiceImageLine[];
  totalAmount: number;
  paidAmount: number;
  bankCode: string | null | undefined;
  accountNumber: string | null | undefined;
  accountName: string | null | undefined;
}

/** Khoản thu thô (từ `invoice_items` hoặc từ nháp vừa tạo) → dòng hiển thị trên ảnh. */
export function toInvoiceImageLines(
  items: { type: string; description?: string | null; quantity?: number | null; unit_price?: number | null; amount: number }[],
): InvoiceImageLine[] {
  return items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const hasBreakdown = quantity > 0 && unitPrice > 0 && quantity !== 1;
    return {
      label: ITEM_TYPE_LABELS[item.type] || item.type,
      detail: hasBreakdown ? `${item.description ?? ""} · ${quantity} × ${formatVnd(unitPrice)}`.replace(/^ · /, "") : item.description || null,
      amount: Number(item.amount || 0),
    };
  });
}

/**
 * Nội dung chuyển khoản của hóa đơn — dùng chung cho mã VietQR trên màn hình và trên ảnh.
 *
 * NAPAS cắt ở 25 ký tự. Bản cũ "Tien phong P202 ky 2026-08" (26) bị cắt thành
 * "...ky 2026 0" — mất tháng, chủ trọ không đối soát được. "Phong P202 thang 8 2026"
 * = 23 ký tự, phần quan trọng (phòng, tháng) đứng trước.
 */
export function getInvoiceTransferPurpose(roomCode: string, period: string): string {
  const [year, month] = period.split("-");
  return year && month ? `Phong ${roomCode} thang ${Number(month)} ${year}` : `Phong ${roomCode} ${period}`;
}

export function getInvoiceImageFileName(data: Pick<InvoiceImageData, "roomCode" | "period">): string {
  const safeRoom = toAsciiPurpose(data.roomCode).replace(/\s+/g, "-") || "phong";
  return `hoa-don-${safeRoom}-${data.period}.png`;
}

// ── Vẽ ──────────────────────────────────────────────────────────────────────

const WIDTH = 1080;
const PAD = 64;
const CONTENT_WIDTH = WIDTH - PAD * 2;
/** Vẽ trên khung cao dư rồi cắt theo chiều cao thật — số dòng khoản thu thay đổi. */
const DRAFT_HEIGHT = 4000;
const QR_SIZE = 400;

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: 400 | 600 | 700 | 800 = 400) {
  ctx.font = `${weight} ${size}px ${font}`;
}

/** Ngắt dòng theo độ rộng thật của chữ (tiếng Việt có dấu, không đoán theo số ký tự). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawDivider(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = C.border;
  ctx.fillRect(PAD, y, CONTENT_WIDTH, 2);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR_IMAGE_LOAD_FAILED"));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("INVOICE_IMAGE_EXPORT_FAILED"))), "image/png");
  });
}

export async function renderInvoiceImage(data: InvoiceImageData): Promise<Blob> {
  // Chờ webfont (Be Vietnam Pro) — vẽ trước khi font nạp xong thì canvas dùng font hệ thống.
  if (document.fonts?.ready) await document.fonts.ready;

  const remainingAmount = Math.max(0, data.totalAmount - data.paidAmount);
  const purpose = getInvoiceTransferPurpose(data.roomCode, data.period);
  const qr = buildVietQrPayload({ bankCode: data.bankCode, accountNumber: data.accountNumber, amount: remainingAmount, purpose });
  const qrImage = remainingAmount > 0 && qr.payload
    ? await loadImage(await QRCode.toDataURL(qr.payload, { errorCorrectionLevel: "M", margin: 1, width: QR_SIZE, color: { dark: C.textPrimary, light: C.white } }))
    : null;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = DRAFT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNSUPPORTED");
  ctx.textBaseline = "top";

  ctx.fillStyle = C.white;
  ctx.fillRect(0, 0, WIDTH, DRAFT_HEIGHT);

  // ── Đầu trang ──
  const headerHeight = 200;
  ctx.fillStyle = C.primary;
  ctx.fillRect(0, 0, WIDTH, headerHeight);
  ctx.fillStyle = C.white;
  setFont(ctx, 26, 700);
  ctx.textAlign = "right";
  ctx.fillText("Trọ Nhanh", WIDTH - PAD, 56);
  ctx.textAlign = "left";
  setFont(ctx, 46, 800);
  ctx.fillText("HÓA ĐƠN TIỀN PHÒNG", PAD, 50);
  setFont(ctx, 30, 600);
  ctx.fillStyle = C.cream;
  ctx.fillText(wrapText(ctx, data.propertyName, CONTENT_WIDTH)[0] ?? "", PAD, 118);

  // ── Thông tin chung: 2 cột ──
  let y = headerHeight + 48;
  const columnWidth = CONTENT_WIDTH / 2;
  const infoCells: [string, string][] = [
    ["Phòng", data.roomCode],
    ["Kỳ thanh toán", formatPeriod(data.period)],
    ["Hạn thanh toán", data.dueDate ? formatDate(data.dueDate) : "—"],
    ["Ngày lập", formatDate(data.issuedAt)],
  ];
  infoCells.forEach(([label, value], index) => {
    const x = PAD + (index % 2) * columnWidth;
    const rowY = y + Math.floor(index / 2) * 104;
    ctx.fillStyle = C.textSecondary;
    setFont(ctx, 24);
    ctx.fillText(label, x, rowY);
    ctx.fillStyle = C.textPrimary;
    setFont(ctx, 34, 700);
    ctx.fillText(value, x, rowY + 36);
  });
  y += 208 + 8;
  drawDivider(ctx, y);
  y += 36;

  // ── Khoản thu ──
  ctx.fillStyle = C.textPrimary;
  setFont(ctx, 28, 800);
  ctx.fillText("Chi tiết khoản thu", PAD, y);
  y += 56;

  for (const line of data.lines) {
    setFont(ctx, 30, 700);
    ctx.fillStyle = C.textPrimary;
    ctx.textAlign = "left";
    ctx.fillText(line.label, PAD, y);
    ctx.textAlign = "right";
    ctx.fillText(formatVnd(line.amount), WIDTH - PAD, y);
    ctx.textAlign = "left";
    y += 42;
    if (line.detail) {
      setFont(ctx, 24);
      ctx.fillStyle = C.textSecondary;
      for (const detailLine of wrapText(ctx, line.detail, CONTENT_WIDTH - 260)) {
        ctx.fillText(detailLine, PAD, y);
        y += 34;
      }
    }
    y += 18;
    ctx.fillStyle = C.border;
    ctx.fillRect(PAD, y, CONTENT_WIDTH, 1);
    y += 24;
  }

  // ── Tổng ──
  const totalRows: [string, number, string][] = [["Tổng cộng", data.totalAmount, C.textPrimary]];
  if (data.paidAmount > 0) {
    totalRows.push(["Đã thanh toán", data.paidAmount, C.success]);
    totalRows.push(["Còn phải trả", remainingAmount, remainingAmount > 0 ? C.error : C.success]);
  }
  const totalBoxHeight = 40 + totalRows.length * 64;
  ctx.fillStyle = C.caramelSoft;
  roundRect(ctx, PAD, y, CONTENT_WIDTH, totalBoxHeight, 20);
  ctx.fill();
  let totalY = y + 28;
  totalRows.forEach(([label, amount, color], index) => {
    const isEmphasis = index === totalRows.length - 1;
    ctx.fillStyle = C.textPrimary;
    setFont(ctx, isEmphasis ? 32 : 28, isEmphasis ? 800 : 600);
    ctx.textAlign = "left";
    ctx.fillText(label, PAD + 32, totalY + (isEmphasis ? 4 : 8));
    ctx.fillStyle = isEmphasis && totalRows.length === 1 ? C.primary : color;
    setFont(ctx, isEmphasis ? 44 : 32, 800);
    ctx.textAlign = "right";
    ctx.fillText(formatVnd(amount), WIDTH - PAD - 32, totalY);
    ctx.textAlign = "left";
    totalY += 64;
  });
  y += totalBoxHeight + 48;

  // ── Chuyển khoản ──
  if (remainingAmount > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = C.textPrimary;
    setFont(ctx, 30, 800);
    ctx.fillText("Quét mã VietQR để chuyển khoản", WIDTH / 2, y);
    y += 56;

    if (qrImage) {
      const qrX = (WIDTH - QR_SIZE) / 2;
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 2;
      roundRect(ctx, qrX - 16, y - 16, QR_SIZE + 32, QR_SIZE + 32, 20);
      ctx.stroke();
      ctx.drawImage(qrImage, qrX, y, QR_SIZE, QR_SIZE);
      y += QR_SIZE + 48;
    } else {
      setFont(ctx, 24);
      ctx.fillStyle = C.error;
      for (const reasonLine of wrapText(ctx, qr.reason ?? "Chưa tạo được mã VietQR.", CONTENT_WIDTH)) {
        ctx.fillText(reasonLine, WIDTH / 2, y);
        y += 34;
      }
      y += 16;
    }

    const bank = findBankByCode(data.bankCode);
    const bankRows: [string, string][] = [
      ["Ngân hàng", bank?.name ?? data.bankCode ?? "—"],
      ["Số tài khoản", data.accountNumber || "—"],
      ["Chủ tài khoản", data.accountName || "—"],
      ["Nội dung", toAsciiPurpose(purpose)],
    ];
    for (const [label, value] of bankRows) {
      ctx.textAlign = "left";
      ctx.fillStyle = C.textSecondary;
      setFont(ctx, 26);
      ctx.fillText(label, PAD + 80, y);
      ctx.textAlign = "right";
      ctx.fillStyle = C.textPrimary;
      setFont(ctx, label === "Số tài khoản" ? 32 : 28, 700);
      ctx.fillText(value, WIDTH - PAD - 80, y - (label === "Số tài khoản" ? 3 : 0));
      y += 48;
    }
    y += 16;
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = C.success;
    setFont(ctx, 32, 800);
    ctx.fillText("Đã thanh toán đủ — cảm ơn bạn!", WIDTH / 2, y);
    y += 64;
  }

  // ── Chân trang ──
  drawDivider(ctx, y);
  y += 28;
  ctx.textAlign = "center";
  ctx.fillStyle = C.textSecondary;
  setFont(ctx, 22);
  if (remainingAmount > 0) {
    ctx.fillText("Vui lòng chuyển khoản trực tiếp cho chủ trọ theo thông tin trên.", WIDTH / 2, y);
    y += 34;
  }
  ctx.fillText("Lập bằng Trọ Nhanh", WIDTH / 2, y);
  y += 34 + PAD / 2;

  const output = document.createElement("canvas");
  output.width = WIDTH;
  output.height = Math.min(y, DRAFT_HEIGHT);
  const outputCtx = output.getContext("2d");
  if (!outputCtx) throw new Error("CANVAS_UNSUPPORTED");
  outputCtx.drawImage(canvas, 0, 0);
  return canvasToBlob(output);
}
