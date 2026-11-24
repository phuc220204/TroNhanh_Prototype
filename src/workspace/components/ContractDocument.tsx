import { C } from "../../shared/theme";
import { formatDate, formatVnd } from "../../shared/utils/format";
import { vndToWords } from "../../shared/utils/number-to-words";
import { contractDuration } from "../services/contract-duration";
import type { ContractPrintData, ContractPrintParty } from "../services/contract-print-service";

/** Văn bản pháp lý in theo kiểu giấy tờ: font có chân, không dùng font giao diện. */
const DOC_FONT = '"Times New Roman", Times, serif';
const BLANK = "....................................";

const p: React.CSSProperties = { margin: "4px 0", lineHeight: 1.6 };
const li: React.CSSProperties = { margin: "3px 0", lineHeight: 1.6 };
const cell: React.CSSProperties = { border: `1px solid ${C.textPrimary}`, padding: "4px 10px", fontSize: 14, verticalAlign: "top" };

const orBlank = (value: string | null | undefined) => (value && value.trim() ? value : BLANK);
const dateOrBlank = (value: string | null | undefined) => (value ? formatDate(value) : BLANK);

function Party({ title, party }: { title: string; party: ContractPrintParty }) {
  return (
    <section style={{ margin: "12px 0" }}>
      <p style={{ ...p, fontWeight: 700 }}>{title}</p>
      <p style={p}>Họ và tên: <strong>{orBlank(party.fullName)}</strong></p>
      <p style={p}>Ngày sinh: {dateOrBlank(party.dateOfBirth)}{party.phone ? <>{"    "}Điện thoại: {party.phone}</> : null}</p>
      <p style={p}>CMND/CCCD: {orBlank(party.idNumber)}</p>
      <p style={p}>Ngày cấp: {dateOrBlank(party.idIssueDate)}{"    "}Nơi cấp: {orBlank(party.idIssuePlace)}</p>
      <p style={p}>Thường trú: {orBlank(party.permanentAddress)}</p>
    </section>
  );
}

/**
 * Hợp đồng cho thuê phòng trọ (T43) — thuần hiển thị. Ô thiếu dữ liệu in dòng chấm
 * để điền tay. Giá dịch vụ lấy theo bản chụp lúc ký (`contract_services`).
 */
export function ContractDocument({ data }: { data: ContractPrintData }) {
  const fullAddress = `${data.roomCode} - ${data.propertyAddress}`;
  const landlord: ContractPrintParty = {
    fullName: data.landlord.fullName,
    dateOfBirth: data.landlord.dateOfBirth || null,
    idNumber: data.landlord.idNumber || null,
    idIssueDate: data.landlord.idIssueDate || null,
    idIssuePlace: data.landlord.idIssuePlace || null,
    permanentAddress: data.landlord.permanentAddress || null,
    phone: data.landlord.phone || null,
  };
  const signedAt = new Date(data.createdAt);

  return (
    <article data-testid="contract-document" style={{ background: C.white, color: C.textPrimary, fontFamily: DOC_FONT, fontSize: 15, maxWidth: 780, margin: "0 auto", padding: "36px 44px", border: `1px solid ${C.border}`, borderRadius: 4, boxSizing: "border-box" }}>
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style={{ fontWeight: 700, textDecoration: "underline", fontSize: 15 }}>Độc lập - Tự do - Hạnh phúc</div>
        <h2 style={{ margin: "18px 0 4px", fontSize: 19, fontWeight: 700 }}>HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ</h2>
        <div style={{ fontStyle: "italic", fontSize: 14 }}>
          Hôm nay, ngày {signedAt.getDate()} tháng {signedAt.getMonth() + 1} năm {signedAt.getFullYear()}, tại {data.propertyAddress}
        </div>
      </header>

      <Party title="BÊN A : BÊN CHO THUÊ (PHÒNG TRỌ)" party={landlord} />
      <Party title="BÊN B : BÊN THUÊ (PHÒNG TRỌ)" party={data.occupant} />
      {data.coOccupantNames.length > 0 && (
        <p style={p}>Người ở cùng: {data.coOccupantNames.join(", ")}.</p>
      )}

      <p style={{ ...p, marginTop: 10 }}>Hai bên cùng thỏa thuận và đồng ý với nội dung sau:</p>

      <p style={{ ...p, fontWeight: 700, marginTop: 12 }}>Điều 1:</p>
      <ul style={{ margin: 0, paddingLeft: 22 }}>
        <li style={li}>Bên A đồng ý cho bên B thuê một phòng trọ thuộc địa chỉ: <strong>{fullAddress}</strong></li>
        <li style={li}>
          Dịch vụ sử dụng
          {data.services.length === 0 ? (
            <span>: {BLANK}</span>
          ) : (
            <table data-testid="contract-services-table" style={{ borderCollapse: "collapse", margin: "6px 0", minWidth: 360 }}>
              <thead>
                <tr>
                  <th style={{ ...cell, textAlign: "center" }}>Tên dịch vụ</th>
                  <th style={{ ...cell, textAlign: "center" }}>Giá tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((service) => (
                  <tr key={service.name}>
                    <td style={cell}>{service.name}{service.feeCategory === "PassThrough" ? " (thu hộ)" : ""}</td>
                    <td style={{ ...cell, textAlign: "center" }}>
                      {formatVnd(service.unitPrice)}/{service.unit}
                      {service.meterType === "Electricity" && data.electricityReading !== null && (
                        <div style={{ fontSize: 12 }}>(Chỉ số hiện tại: {data.electricityReading.toLocaleString("vi-VN")})</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </li>
        <li style={li}>
          Thời hạn thuê phòng trọ là <strong>{contractDuration(data.startDate, data.endDate)}</strong> kể từ ngày {formatDate(data.startDate)} đến ngày {formatDate(data.endDate)}.
        </li>
      </ul>

      <p style={{ ...p, fontWeight: 700, marginTop: 12 }}>Điều 2:</p>
      <ul style={{ margin: 0, paddingLeft: 22 }}>
        <li style={li}>Giá tiền thuê phòng trọ là <strong>{formatVnd(data.rentPrice)}</strong> (Bằng chữ: {vndToWords(data.rentPrice)}).</li>
        <li style={li}>
          Tiền thuê phòng bên B thanh toán cho bên A
          {data.paymentDay ? <> từ ngày <strong>{data.paymentDay}</strong> dương lịch</> : ""}
          {data.billingCycleMonths > 1 ? `, mỗi ${data.billingCycleMonths} tháng một lần.` : " hàng tháng."}
        </li>
        <li style={li}>
          Bên B đặt tiền thế chân trước <strong>{formatVnd(data.deposit)}</strong> (Bằng chữ: {vndToWords(data.deposit)}) cho bên A. Tiền thế chân sẽ được trả lại khi hết hạn hợp đồng.
        </li>
        <li style={li}>Bên B ngưng hợp đồng trước thời hạn thì phải chịu mất tiền thế chân.</li>
        <li style={li}>Bên A ngưng hợp đồng (lấy lại phòng trọ) trước thời hạn thì bồi thường gấp đôi số tiền bên B đã thế chân.</li>
      </ul>

      <p style={{ ...p, marginTop: 12 }}><strong>Điều 3:</strong> Trách nhiệm bên A.</p>
      <ul style={{ margin: 0, paddingLeft: 22 }}>
        <li style={li}>Giao phòng trọ, trang thiết bị trong phòng trọ cho bên B đúng ngày ký hợp đồng.</li>
        <li style={li}>Hướng dẫn bên B chấp hành đúng các quy định của địa phương, hoàn tất mọi thủ tục giấy tờ đăng ký tạm trú cho bên B.</li>
      </ul>

      <p style={{ ...p, marginTop: 12 }}><strong>Điều 4:</strong> Trách nhiệm bên B.</p>
      <ul style={{ margin: 0, paddingLeft: 22 }}>
        <li style={li}>Trả tiền thuê phòng trọ hàng tháng theo hợp đồng.</li>
        <li style={li}>Sử dụng đúng mục đích thuê nhà; khi cần sửa chữa, cải tạo theo yêu cầu sử dụng riêng phải được sự đồng ý của bên A.</li>
        <li style={li}>Đồ đạc, trang thiết bị trong phòng trọ phải có trách nhiệm bảo quản cẩn thận, không làm hư hỏng mất mát.</li>
      </ul>

      <p style={{ ...p, marginTop: 12 }}><strong>Điều 5:</strong> Điều khoản chung.</p>
      <ul style={{ margin: 0, paddingLeft: 22 }}>
        <li style={li}>Bên A và bên B thực hiện đúng các điều khoản ghi trong hợp đồng.</li>
        <li style={li}>Trường hợp có tranh chấp hoặc một bên vi phạm hợp đồng thì hai bên cùng nhau bàn bạc giải quyết; nếu không giải quyết được thì yêu cầu cơ quan có thẩm quyền giải quyết.</li>
        <li style={li}>Hợp đồng được lập thành 02 bản có giá trị ngang nhau, mỗi bên giữ 01 bản.</li>
      </ul>

      {data.extraTerms && (
        <>
          <p style={{ ...p, marginTop: 12 }}><strong>Điều 6:</strong> Điều khoản bổ sung.</p>
          <p data-testid="contract-extra-terms" style={{ ...p, whiteSpace: "pre-wrap", paddingLeft: 22 }}>{data.extraTerms}</p>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", marginTop: 32 }}>
        <div>
          <div style={{ fontWeight: 700 }}>BÊN A</div>
          <div style={{ fontStyle: "italic", fontSize: 13 }}>(Ký và ghi rõ họ tên)</div>
          <div style={{ marginTop: 72 }}>{data.landlord.fullName || BLANK}</div>
        </div>
        <div>
          <div style={{ fontWeight: 700 }}>BÊN B</div>
          <div style={{ fontStyle: "italic", fontSize: 13 }}>(Ký và ghi rõ họ tên)</div>
          <div style={{ marginTop: 72 }}>{data.occupant.fullName || BLANK}</div>
        </div>
      </div>
    </article>
  );
}
