import { SUPPORT_EMAIL } from "../../constants/legal";
import { TRIAL_DAYS } from "../../services/subscription-service";

/**
 * Nội dung trang Hướng dẫn sử dụng (`/huong-dan`).
 * Mỗi câu hỏi có `id` cố định để link thẳng: `/huong-dan#phi-dich-vu`.
 * Đổi `id` đã công bố ⇒ phải sửa cả các nút "?" trỏ vào nó.
 * Mô tả đúng cách hệ thống ĐANG chạy; đổi tính năng thì sửa cả đây.
 */
export interface HelpItem {
  id: string;
  question: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface HelpGroup {
  id: string;
  title: string;
  items: HelpItem[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    id: "bat-dau",
    title: "Bắt đầu",
    items: [
      {
        id: "tro-nhanh-la-gi",
        question: "Trọ Nhanh dùng để làm gì?",
        paragraphs: [
          "Trọ Nhanh có hai phần. Phần tìm trọ miễn phí: đăng tin cho thuê, đăng tin tìm phòng, nhắn tin với nhau. Phần Quản lý vận hành dành cho chủ trọ: quản lý khu, phòng, người ở, hợp đồng, ghi điện nước và lập hóa đơn kèm mã VietQR.",
        ],
      },
      {
        id: "dung-thu",
        question: "Dùng thử gói Quản lý vận hành thế nào?",
        paragraphs: [
          `Vào Khu chủ trọ, bấm dùng thử để có ${TRIAL_DAYS} ngày miễn phí. Hết thời gian dùng thử, bạn có thể mua gói qua cổng payOS; giá hiện rõ trước khi thanh toán.`,
          "Nếu chưa gia hạn, dữ liệu vẫn còn nguyên và xem được, chỉ các nút tạo/sửa bị khóa.",
        ],
      },
      {
        id: "thu-tu-thiet-lap",
        question: "Mới bắt đầu thì nên thiết lập theo thứ tự nào?",
        paragraphs: ["Làm theo thứ tự này sẽ lập được hóa đơn đầu tiên nhanh nhất:"],
        bullets: [
          "Tạo khu trọ và các phòng (mã phòng, giá thuê).",
          "Khai báo số tài khoản nhận tiền trong Cài đặt khu trọ để hóa đơn có mã VietQR.",
          "Thêm các khoản ở tab Dịch vụ & phí: điện, nước, wifi, rác, giữ xe…",
          "Thêm người ở và hợp đồng cho từng phòng.",
          "Cuối tháng ghi chỉ số điện nước rồi lập hóa đơn.",
        ],
      },
    ],
  },
  {
    id: "dich-vu-va-phi",
    title: "Dịch vụ & phí",
    items: [
      {
        id: "phi-dich-vu",
        question: "\"Phí dịch vụ\" và \"Thu hộ\" khác nhau thế nào?",
        paragraphs: [
          "Phí dịch vụ là khoản bạn thu và là doanh thu của bạn, ví dụ phí quản lý, phí vệ sinh, wifi do bạn tự trả tiền mạng rồi chia lại cho phòng.",
          "Thu hộ là khoản bạn chỉ thu giúp rồi nộp lại đúng số đó cho bên thứ 3, ví dụ tiền rác nộp cho tổ dân phố, tiền gửi xe nộp cho bãi xe bên ngoài.",
          "Ví dụ: hóa đơn có wifi 100.000đ (Phí dịch vụ) và rác 20.000đ (Thu hộ). Trang Hóa đơn sẽ tính 100.000đ vào Doanh thu và 20.000đ vào Thu hộ. Cách chọn là do bạn quyết định và chỉ để tham khảo, Trọ Nhanh không tư vấn thuế.",
        ],
      },
      {
        id: "dien-nuoc-chon-loai-nao",
        question: "Điện, nước nên chọn loại nào?",
        paragraphs: [
          "Chọn cách tính \"Theo đồng hồ\" để mỗi tháng nhập chỉ số cũ/mới và hệ thống tự nhân đơn giá. Nước tính theo đầu người thì chọn \"Theo số người\".",
          "Về loại khoản thu: nếu bạn bán lại điện nước với giá riêng của mình thì thường chọn Phí dịch vụ; nếu bạn thu đúng theo hóa đơn của nhà cung cấp rồi nộp lại thì có thể chọn Thu hộ. Mỗi trường hợp mỗi khác, hãy hỏi cơ quan thuế hoặc người có chuyên môn khi không chắc.",
        ],
      },
      {
        id: "cach-tinh",
        question: "Ba cách tính \"Theo đồng hồ\", \"Theo số người\", \"Cố định\" là gì?",
        paragraphs: [],
        bullets: [
          "Theo đồng hồ: (chỉ số mới − chỉ số cũ) × đơn giá. Dùng cho điện, nước có công tơ.",
          "Theo số người: số người ở trong phòng × đơn giá. Dùng cho nước, rác tính theo đầu người.",
          "Cố định: một số tiền mỗi tháng cho mỗi phòng. Dùng cho wifi, phí vệ sinh, giữ xe.",
        ],
      },
      {
        id: "gia-rieng-phong",
        question: "Một phòng có giá khác các phòng còn lại thì làm sao?",
        paragraphs: [
          "Mở phòng đó bằng \"Sửa thông tin phòng\", ở phần dịch vụ nhập giá riêng cho khoản cần đổi. Để trống thì phòng dùng đơn giá chung của khu. Thẻ dịch vụ ở tab Dịch vụ & phí sẽ ghi số phòng đang có giá riêng.",
        ],
      },
      {
        id: "phong-tu-lap-wifi",
        question: "Phòng tự lắp wifi riêng thì có bị tính tiền wifi không?",
        paragraphs: [
          "Không, nếu bạn bỏ chọn phòng đó ở phần \"Áp dụng cho phòng\" khi sửa dịch vụ wifi (hoặc bỏ tick wifi trong \"Sửa thông tin phòng\"). Phòng không áp dụng sẽ không có dòng wifi khi lập hóa đơn.",
        ],
      },
    ],
  },
  {
    id: "nguoi-o-va-hop-dong",
    title: "Người ở & hợp đồng",
    items: [
      {
        id: "them-nguoi-o",
        question: "Thêm người ở và hợp đồng như thế nào?",
        paragraphs: [
          "Vào tab Người ở & Hợp đồng, chọn phòng, nhập thông tin người ở, ngày bắt đầu và tiền thuê. Phòng sẽ chuyển sang trạng thái đang thuê. Một phòng không thể có hai hợp đồng đang hiệu lực chồng thời gian.",
        ],
      },
      {
        id: "lien-ket-tai-khoan",
        question: "Liên kết người ở với tài khoản Trọ Nhanh để làm gì?",
        paragraphs: [
          "Khi liên kết, người ở xem được hóa đơn của mình và có thể đánh giá khu trọ sau khi ở đủ lâu. Liên kết cần người ở xác nhận, hệ thống không tự xác nhận thay.",
        ],
      },
      {
        id: "giay-to-nguoi-o",
        question: "Có nên lưu giấy tờ tùy thân, tạm trú của người ở không?",
        paragraphs: [
          "Chỉ lưu những gì thật sự cần và phải được người ở đồng ý. Bạn là người quyết định thu thập thông tin này; Trọ Nhanh chỉ lưu trữ để cung cấp công cụ và không hiển thị cho người dùng khác. Xem thêm Chính sách bảo mật.",
        ],
      },
    ],
  },
  {
    id: "dien-nuoc-va-hoa-don",
    title: "Điện nước & hóa đơn",
    items: [
      {
        id: "ghi-chi-so",
        question: "Ghi chỉ số điện nước thế nào?",
        paragraphs: [
          "Khi lập hóa đơn, nhập chỉ số mới của tháng. Chỉ số cũ lấy từ lần ghi trước. Chỉ số mới không được nhỏ hơn chỉ số cũ; nếu đồng hồ được thay, hãy ghi chú lại để người ở hiểu.",
        ],
      },
      {
        id: "lap-hoa-don",
        question: "Lập hóa đơn gồm những bước nào?",
        paragraphs: ["Mở form lập hóa đơn của phòng, rồi:"],
        bullets: [
          "Kiểm tra kỳ tiền phòng (từ ngày – đến ngày).",
          "Nhập chỉ số điện nước; các khoản cố định và theo số người được điền sẵn.",
          "Thêm khoản Cộng thêm / Giảm trừ nếu có, kèm lý do, và ghi chú nếu cần.",
          "Xem khung Tạm tính: tiền phòng, phí dịch vụ, thu hộ, cộng thêm/giảm trừ được tách riêng.",
          "Bấm Xem trước để kiểm tra lần cuối rồi lưu, sau đó gửi cho người ở.",
        ],
      },
      {
        id: "tinh-theo-ngay",
        question: "Tiền phòng tính theo ngày như thế nào?",
        paragraphs: [
          "Tiền phòng = giá phòng × số tháng đủ + giá phòng × số ngày lẻ ÷ 30.",
          "Ví dụ: giá 3.000.000đ, kỳ 31/10 – 30/11 là 1 tháng 1 ngày, nên tiền phòng = 3.000.000 + 3.000.000 × 1 ÷ 30 = 3.100.000đ. Dùng cách này khi người ở vào giữa tháng hoặc trả phòng sớm.",
        ],
      },
      {
        id: "giam-tru",
        question: "Khi nào dùng Cộng thêm / Giảm trừ?",
        paragraphs: [
          "Dùng cho khoản phát sinh một lần: giảm tiền vì sửa chữa chậm, cộng tiền làm thêm chìa khóa… Mỗi dòng cần ghi lý do để người ở dễ đối chiếu.",
          "Không dùng mục này cho tiền cọc. Tiền cọc là khoản riêng giữa bạn và người ở, không phải tiền của tháng.",
        ],
      },
      {
        id: "xem-truoc-in-anh",
        question: "Xem trước, in, lưu PDF và xuất ảnh hóa đơn ở đâu?",
        paragraphs: [
          "Sau khi lập, hóa đơn có nút Xem trước, In / Lưu PDF (chọn \"Lưu dưới dạng PDF\" trong hộp thoại in) và Xuất ảnh. Ảnh có kèm mã VietQR để gửi qua Zalo hoặc tin nhắn.",
        ],
      },
      {
        id: "hoa-don-thang-truoc",
        question: "Khung \"Hóa đơn tháng trước\" dùng để làm gì?",
        paragraphs: [
          "Khi lập hóa đơn, khung này hiện hóa đơn gần nhất của phòng để bạn so chỉ số, số tiền và xem tháng trước đã thu đủ chưa.",
        ],
      },
      {
        id: "ghi-nhan-da-thu",
        question: "Người ở đã chuyển khoản, cập nhật thế nào?",
        paragraphs: [
          "Kiểm tra tài khoản ngân hàng của bạn, rồi bấm \"Ghi nhận đã thu\" trên hóa đơn và nhập số tiền thực nhận. Thu thiếu thì hóa đơn ở trạng thái thu một phần.",
          "Trọ Nhanh không kết nối ngân hàng, nên không tự biết người ở đã chuyển tiền. Trạng thái \"Đã thu\" là do bạn tự ghi nhận.",
        ],
      },
      {
        id: "qua-han",
        question: "Hóa đơn quá hạn là gì?",
        paragraphs: [
          "Hóa đơn chưa thu đủ khi đã qua hạn thanh toán sẽ chuyển sang Quá hạn để bạn dễ nhắc. Ghi nhận đã thu đủ thì hóa đơn chuyển sang Đã thanh toán.",
        ],
      },
    ],
  },
  {
    id: "tien-va-thue",
    title: "Tiền & thuế",
    items: [
      {
        id: "co-giu-tien-khong",
        question: "Trọ Nhanh có giữ tiền thuê của tôi không?",
        paragraphs: [
          "Không. Mã VietQR trên hóa đơn chuyển tiền thẳng vào tài khoản ngân hàng bạn khai báo. Trọ Nhanh không thu hộ, không giữ tiền thuê, tiền cọc hay tiền điện nước. Khoản duy nhất bạn trả cho Trọ Nhanh là phí gói và phí đẩy tin.",
        ],
      },
      {
        id: "hoa-don-dien-tu",
        question: "Hóa đơn trên Trọ Nhanh có phải hóa đơn điện tử không?",
        paragraphs: [
          "Không. Đây là bảng kê thu tiền giữa bạn và người ở, không phải hóa đơn điện tử hay hóa đơn GTGT, và không thay thế chứng từ kế toán. Nếu bạn cần xuất hóa đơn theo quy định, hãy dùng dịch vụ hóa đơn điện tử được phép.",
        ],
      },
      {
        id: "doanh-thu-ke-khai",
        question: "Có dùng số Doanh thu / Thu hộ để kê khai thuế được không?",
        paragraphs: [
          "Bạn có thể dùng làm số liệu tham khảo. Các con số này được tính từ dữ liệu bạn nhập và cách bạn phân loại từng khoản, Trọ Nhanh không kiểm tra lại. Việc kê khai, nộp thuế là trách nhiệm của bạn theo quy định pháp luật hiện hành; hãy đối chiếu với sổ sách thực tế và hỏi cơ quan thuế khi cần.",
        ],
      },
    ],
  },
  {
    id: "tai-khoan-va-du-lieu",
    title: "Tài khoản & dữ liệu",
    items: [
      {
        id: "het-han-goi",
        question: "Gói hết hạn thì dữ liệu có mất không?",
        paragraphs: [
          "Không. Tài khoản chuyển sang chế độ chỉ xem: mọi khu, phòng, hợp đồng, hóa đơn vẫn còn. Gia hạn xong là tạo/sửa lại được ngay.",
        ],
      },
      {
        id: "ai-xem-du-lieu",
        question: "Ai xem được dữ liệu quản lý của tôi?",
        paragraphs: [
          "Chỉ bạn. Chủ trọ khác không xem được. Người ở đã liên kết tài khoản chỉ thấy thông tin liên quan đến chính họ, như hóa đơn của phòng mình.",
        ],
      },
      {
        id: "lien-he-ho-tro",
        question: "Cần hỗ trợ hoặc muốn xóa tài khoản thì liên hệ ở đâu?",
        paragraphs: [
          `Gửi email về ${SUPPORT_EMAIL} từ email gắn với tài khoản. Yêu cầu hoàn tiền xem Chính sách hoàn tiền.`,
        ],
      },
    ],
  },
];
