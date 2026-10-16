import { SUPPORT_EMAIL, type LegalDocKind } from "../../constants/legal";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/**
 * Nội dung 3 trang chính sách. Mô tả đúng cách hệ thống ĐANG chạy (BR/AS trong
 * CLAUDE.md) — sửa tính năng liên quan thì sửa cả đây và tăng LEGAL_VERSION.
 */
export const LEGAL_DOCS: Record<LegalDocKind, LegalDoc> = {
  terms: {
    title: "Điều khoản sử dụng",
    intro: `Trọ Nhanh là nền tảng kết nối người tìm phòng với người cho thuê và cung cấp công cụ quản lý khu trọ. Khi tạo tài khoản hoặc sử dụng dịch vụ, bạn đồng ý với các điều khoản dưới đây.`,
    sections: [
      {
        heading: "1. Vai trò của Trọ Nhanh",
        bullets: [
          "Trọ Nhanh là nơi đăng và tìm tin cho thuê, tin tìm phòng, tin tìm người ở ghép; không phải bên cho thuê, môi giới hay bên trung gian giữ tiền.",
          "Trọ Nhanh không thu, không giữ tiền thuê hay tiền cọc. Hóa đơn và mã VietQR trên hệ thống chuyển tiền thẳng vào tài khoản của chủ trọ.",
          "Mọi thỏa thuận thuê phòng là giữa người thuê và người cho thuê. Hãy xem phòng trực tiếp và kiểm tra giấy tờ trước khi đặt cọc.",
        ],
      },
      {
        heading: "2. Tài khoản",
        bullets: [
          "Bạn chịu trách nhiệm về thông tin đăng ký và bảo mật mật khẩu của mình.",
          "Mỗi người dùng một tài khoản cho chính mình; không mạo danh người khác.",
          "Trọ Nhanh có thể tạm khóa tài khoản vi phạm điều khoản hoặc có dấu hiệu lừa đảo.",
        ],
      },
      {
        heading: "3. Đăng tin",
        bullets: [
          "Tin đăng phải mô tả đúng phòng thật: giá, diện tích, chi phí điện nước, ảnh chụp chính phòng đó.",
          "Không đăng tin trùng lặp, tin cho phòng không có quyền cho thuê, hoặc nội dung vi phạm pháp luật.",
          "Tin có thể được kiểm duyệt trước khi hiển thị. Trọ Nhanh có quyền ẩn hoặc từ chối tin vi phạm và nêu lý do.",
          "Tin được duyệt hiển thị 60 ngày; sau đó tự hết hạn và người đăng có thể gia hạn.",
        ],
      },
      {
        heading: "4. Đánh giá và nhắn tin",
        bullets: [
          "Chỉ người đã ở và được chủ trọ xác nhận liên kết mới đánh giá được khu trọ. Đánh giá phải trung thực, không xúc phạm.",
          "Không dùng tin nhắn để quấy rối, quảng cáo hàng loạt hoặc dụ chuyển tiền ngoài thỏa thuận thuê.",
        ],
      },
      {
        heading: "5. Dịch vụ trả phí",
        bullets: [
          "Boost (đẩy tin) và gói Quản lý vận hành là dịch vụ trả phí cho Trọ Nhanh, thanh toán qua cổng payOS. Giá hiển thị trước khi thanh toán.",
          "Gói Quản lý vận hành hết hạn thì dữ liệu vẫn được giữ và xem được; chỉ các thao tác tạo/sửa bị khóa đến khi gia hạn.",
          "Hoàn tiền theo Chính sách hoàn tiền.",
        ],
      },
      {
        heading: "6. Giới hạn trách nhiệm",
        paragraphs: [
          "Trọ Nhanh không bảo đảm tính chính xác của thông tin do người dùng đăng và không chịu trách nhiệm về giao dịch thuê giữa các bên. Khi phát hiện tin sai sự thật hoặc lừa đảo, hãy báo cho chúng tôi qua email để xử lý.",
        ],
      },
      {
        heading: "7. Liên hệ",
        paragraphs: [`Mọi câu hỏi về điều khoản xin gửi về ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  privacy: {
    title: "Chính sách bảo mật",
    intro: `Chính sách này giải thích Trọ Nhanh thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn như thế nào, theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.`,
    sections: [
      {
        heading: "1. Dữ liệu chúng tôi thu thập",
        bullets: [
          "Thông tin tài khoản: họ tên, email, số điện thoại, ảnh đại diện (nếu đăng nhập bằng Google).",
          "Nội dung bạn tạo: tin đăng, tin nhu cầu, tin nhắn, đánh giá.",
          "Dữ liệu quản lý khu trọ (với chủ trọ dùng gói Quản lý vận hành): khu trọ, phòng, người ở, hợp đồng, chỉ số điện nước, hóa đơn, số tài khoản ngân hàng nhận tiền.",
          "Thông tin giao dịch trả phí: mã đơn, số tiền, trạng thái. Trọ Nhanh không nhận và không lưu thông tin thẻ hay tài khoản ngân hàng dùng để thanh toán — việc đó do payOS xử lý.",
        ],
      },
      {
        heading: "2. Mục đích sử dụng",
        bullets: [
          "Vận hành tài khoản, hiển thị tin đăng và kết nối người thuê với người cho thuê.",
          "Cung cấp công cụ quản lý khu trọ, lập hóa đơn và mã VietQR cho chủ trọ.",
          "Kiểm duyệt nội dung, phòng chống lừa đảo và xử lý khiếu nại.",
          "Xác nhận thanh toán dịch vụ trả phí.",
        ],
      },
      {
        heading: "3. Chia sẻ và hiển thị",
        bullets: [
          "Khách chưa đăng nhập chỉ thấy số điện thoại liên hệ đã che một phần; người đã đăng nhập mới thấy đủ.",
          "Dữ liệu quản lý khu trọ là riêng tư giữa chủ trọ và người ở liên quan; người dùng khác không xem được. Số tài khoản ngân hàng chỉ hiện trên hóa đơn gửi người ở.",
          "Chúng tôi dùng các nhà cung cấp hạ tầng để lưu trữ và vận hành: Supabase (cơ sở dữ liệu, đăng nhập), Vercel (máy chủ web), Google (đăng nhập bằng Google), payOS (thanh toán). Họ chỉ xử lý dữ liệu cần cho dịch vụ đó.",
          "Chúng tôi không bán dữ liệu cá nhân.",
        ],
      },
      {
        heading: "4. Lưu trữ",
        paragraphs: [
          "Dữ liệu được lưu khi tài khoản còn hoạt động. Tin đăng bị xóa được xóa mềm để phục vụ xử lý khiếu nại. Dữ liệu quản lý khu trọ được giữ cả khi gói hết hạn để chủ trọ không mất dữ liệu.",
        ],
      },
      {
        heading: "5. Quyền của bạn",
        bullets: [
          "Xem và sửa thông tin tài khoản trong mục Tài khoản.",
          "Yêu cầu cung cấp bản sao, xóa dữ liệu, hạn chế xử lý hoặc rút lại sự đồng ý.",
          `Gửi yêu cầu về ${SUPPORT_EMAIL} từ email gắn với tài khoản để chúng tôi xác minh và xử lý theo thời hạn pháp luật quy định.`,
        ],
      },
      {
        heading: "6. Bảo mật",
        paragraphs: [
          "Dữ liệu được truyền qua kết nối mã hóa (HTTPS) và được phân quyền ở tầng cơ sở dữ liệu để mỗi người chỉ đọc được phần của mình. Không hệ thống nào an toàn tuyệt đối; nếu phát hiện sự cố, chúng tôi sẽ thông báo theo quy định.",
        ],
      },
    ],
  },

  refund: {
    title: "Chính sách hoàn tiền",
    intro: "Áp dụng cho các khoản phí bạn trả cho Trọ Nhanh: Boost tin cho thuê, đẩy tin nhu cầu và gói Quản lý vận hành. Tiền thuê, tiền cọc chuyển cho chủ trọ không đi qua Trọ Nhanh nên không thuộc chính sách này.",
    sections: [
      {
        heading: "1. Trường hợp được hoàn 100%",
        bullets: [
          "Bạn đã bị trừ tiền nhưng dịch vụ không được kích hoạt do lỗi của hệ thống.",
          "Bạn bị trừ tiền hai lần cho cùng một đơn.",
          "Tin trả phí Boost bị từ chối hoặc gỡ trước khi Boost bắt đầu chạy. (Khi tin bị từ chối, khoản Boost được giữ lại để bạn sửa tin và gửi duyệt lại; nếu không muốn dùng nữa, bạn có thể yêu cầu hoàn.)",
        ],
      },
      {
        heading: "2. Trường hợp không hoàn",
        bullets: [
          "Dịch vụ đã được kích hoạt và đang hoặc đã được sử dụng (Boost đã chạy, gói đã kích hoạt).",
          "Đổi ý sau khi dịch vụ đã kích hoạt.",
          "Tin bị ẩn hoặc gỡ do vi phạm Điều khoản sử dụng.",
        ],
      },
      {
        heading: "3. Cách yêu cầu",
        bullets: [
          `Gửi email về ${SUPPORT_EMAIL} trong vòng 7 ngày kể từ ngày thanh toán.`,
          "Ghi rõ email tài khoản, mã đơn payOS, số tiền và lý do.",
          "Sau khi xác minh, tiền được hoàn về tài khoản đã dùng để thanh toán.",
        ],
      },
    ],
  },
};
