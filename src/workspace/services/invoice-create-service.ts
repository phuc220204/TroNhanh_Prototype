/**
 * Lập hóa đơn v2 (T41): đọc dữ liệu cho form + gọi RPC `create_invoice_v2`.
 *
 * ⚠️ Client KHÔNG gửi giá, tiền phòng, chỉ số điện nước hay tổng. Chỉ gửi:
 * kỳ, hạn, khoảng ngày, dịch vụ được chọn (+ số lượng với khoản không theo
 * đồng hồ), các dòng cộng thêm/giảm trừ và ghi chú. Server tự tính lại hết.
 */
import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import type { FeeCategory, MeterType, QuantityBasis } from "./property-services-service";

export interface InvoiceFormService {
  serviceId: string;
  name: string;
  unit: string;
  feeCategory: FeeCategory;
  quantityBasis: QuantityBasis;
  meterType: MeterType | null;
  /** Giá đang áp cho phòng (giá riêng ?? giá khu). Với đồng hồ, giá dùng là giá đã lưu ở chỉ số. */
  unitPrice: number;
}

export interface InvoiceFormReading {
  type: MeterType;
  previousReading: number;
  currentReading: number;
  /** Đơn giá snapshot lúc ghi chỉ số — server tính tiền theo giá này. */
  unitPrice: number;
}

export interface InvoiceFormSources {
  contract: { id: string; rentPrice: number; startDate: string } | null;
  services: InvoiceFormService[];
  /** Chỉ số của ĐÚNG kỳ đang lập, theo loại đồng hồ. */
  readings: Partial<Record<MeterType, InvoiceFormReading>>;
  /** Số người mặc định cho khoản "theo số người". */
  occupantCount: number;
  /** Tổng còn nợ của các hóa đơn cũ chưa thu đủ của phòng. */
  outstandingDebt: number;
  /** Người ở chính của hợp đồng — in trên hóa đơn. */
  occupant: InvoiceOccupant | null;
  /** Hóa đơn gần nhất TRƯỚC kỳ đang lập (khung "Hóa đơn tháng trước"). */
  previousInvoice: PreviousInvoice | null;
}

export interface InvoiceOccupant {
  fullName: string;
  phoneNumber: string | null;
}

export interface PreviousInvoiceItem {
  type: string;
  fee_category: string;
  service_id: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  amount: number;
  meta: unknown;
}

export interface PreviousInvoice {
  id: string;
  period: string;
  dueDate: string;
  createdAt: string;
  billingFrom: string | null;
  billingTo: string | null;
  note: string | null;
  totalAmount: number;
  paidAmount: number;
  items: PreviousInvoiceItem[];
}

export interface CreateInvoiceV2Input {
  roomId: string;
  period: string;
  dueDate: string;
  billingFrom: string;
  billingTo: string;
  services: { serviceId: string; quantity: number }[];
  adjustments: { reason: string; amount: number }[];
  note: string;
}

export async function getInvoiceFormSources(roomId: string, period: string): Promise<InvoiceFormSources> {
  try {
    const [contractRes, servicesRes, readingsRes, debtRes] = await Promise.all([
      supabase
        .from("contracts")
        .select("id, rent_price, start_date, occupancy_id")
        .eq("room_id", roomId)
        .eq("status", "Active")
        .is("deleted_at", null)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("room_services")
        .select("unit_price_override, property_services!inner(id, name, unit, fee_category, quantity_basis, meter_type, unit_price, sort_order, is_active, deleted_at)")
        .eq("room_id", roomId)
        .eq("property_services.is_active", true)
        .is("property_services.deleted_at", null),
      supabase
        .from("utility_readings")
        .select("type, previous_reading, current_reading, unit_price")
        .eq("room_id", roomId)
        .eq("period", period)
        .is("deleted_at", null),
      supabase
        .from("invoices")
        .select("total_amount, payments(amount)")
        .eq("room_id", roomId)
        .neq("status", "Paid")
        .is("deleted_at", null),
    ]);
    if (contractRes.error) throw contractRes.error;
    if (servicesRes.error) throw servicesRes.error;
    if (readingsRes.error) throw readingsRes.error;
    if (debtRes.error) throw debtRes.error;

    const contract = contractRes.data
      ? { id: contractRes.data.id, rentPrice: Number(contractRes.data.rent_price), startDate: contractRes.data.start_date }
      : null;

    let occupantCount = 1;
    const occupant = contractRes.data?.occupancy_id ? await getOccupancyContact(contractRes.data.occupancy_id) : null;
    const previousInvoice = await getPreviousInvoice(roomId, period);
    if (contract) {
      const occupantsRes = await supabase
        .from("occupancies")
        .select("occupant_count, is_primary")
        .eq("contract_id", contract.id)
        .eq("is_active", true)
        .is("deleted_at", null);
      if (occupantsRes.error) throw occupantsRes.error;
      const rows = occupantsRes.data ?? [];
      const primaryCount = Number(rows.find((r) => r.is_primary)?.occupant_count ?? 1);
      occupantCount = Math.max(rows.length, primaryCount, 1);
    }

    const services = (servicesRes.data ?? [])
      .map((row) => ({ override: row.unit_price_override, service: row.property_services }))
      .sort((a, b) => a.service.sort_order - b.service.sort_order)
      .map(({ override, service }) => ({
        serviceId: service.id,
        name: service.name,
        unit: service.unit,
        feeCategory: service.fee_category as FeeCategory,
        quantityBasis: service.quantity_basis as QuantityBasis,
        meterType: (service.meter_type as MeterType | null) ?? null,
        unitPrice: Number(override ?? service.unit_price),
      }));

    const readings: Partial<Record<MeterType, InvoiceFormReading>> = {};
    for (const r of readingsRes.data ?? []) {
      if (r.type !== "Electricity" && r.type !== "Water") continue;
      readings[r.type] = {
        type: r.type,
        previousReading: Number(r.previous_reading),
        currentReading: Number(r.current_reading),
        unitPrice: Number(r.unit_price),
      };
    }

    const outstandingDebt = (debtRes.data ?? []).reduce((sum, invoice) => {
      const paid = (invoice.payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
      return sum + Math.max(0, Number(invoice.total_amount) - paid);
    }, 0);

    return { contract, services, readings, occupantCount, outstandingDebt, occupant, previousInvoice };
  } catch (err) {
    logError("invoice-create-service.getInvoiceFormSources", err);
    throw err;
  }
}

export async function createInvoiceV2(input: CreateInvoiceV2Input): Promise<string> {
  const { data, error } = await supabase.rpc("create_invoice_v2", {
    p_room_id: input.roomId,
    p_period: input.period,
    p_due_date: input.dueDate,
    p_billing_from: input.billingFrom,
    p_billing_to: input.billingTo,
    p_services: input.services.map((s) => ({ service_id: s.serviceId, quantity: s.quantity })),
    p_adjustments: input.adjustments.map((a) => ({ reason: a.reason.trim(), amount: a.amount })),
    p_note: input.note.trim(),
  });
  if (error) {
    logError("invoice-create-service.createInvoiceV2", error);
    throw error;
  }
  return data as string;
}

export interface CreatedInvoice {
  id: string;
  period: string;
  dueDate: string;
  createdAt: string;
  billingFrom: string | null;
  billingTo: string | null;
  note: string | null;
  totalAmount: number;
  items: {
    type: string;
    fee_category: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    amount: number;
    unit: string | null;
    meta: unknown;
  }[];
}

/** Đọc lại hóa đơn vừa tạo — màn "Đã tạo" và ảnh hóa đơn dùng số SERVER đã tính. */
export async function getCreatedInvoice(invoiceId: string): Promise<CreatedInvoice> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, period, due_date, created_at, billing_from, billing_to, note, total_amount, invoice_items(type, fee_category, description, quantity, unit_price, amount, unit, meta, created_at)")
    .eq("id", invoiceId)
    .single();
  if (error) {
    logError("invoice-create-service.getCreatedInvoice", error);
    throw error;
  }
  return {
    id: data.id,
    period: data.period,
    dueDate: data.due_date,
    createdAt: data.created_at,
    billingFrom: data.billing_from,
    billingTo: data.billing_to,
    note: data.note,
    totalAmount: Number(data.total_amount),
    items: [...(data.invoice_items ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((item) => ({
        type: item.type,
        fee_category: item.fee_category,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: Number(item.amount),
        unit: item.unit,
        meta: item.meta,
      })),
  };
}

async function getOccupancyContact(occupancyId: string): Promise<InvoiceOccupant | null> {
  const { data, error } = await supabase
    .from("occupancies")
    .select("full_name, phone_number")
    .eq("id", occupancyId)
    .maybeSingle();
  if (error) throw error;
  return data ? { fullName: data.full_name, phoneNumber: data.phone_number } : null;
}

/** Hóa đơn gần nhất của phòng có kỳ trước `period`. */
async function getPreviousInvoice(roomId: string, period: string): Promise<PreviousInvoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, period, due_date, created_at, billing_from, billing_to, note, total_amount, payments(amount), invoice_items(type, fee_category, service_id, description, quantity, unit, unit_price, amount, meta)")
    .eq("room_id", roomId)
    .lt("period", period)
    .is("deleted_at", null)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    period: data.period,
    dueDate: data.due_date,
    createdAt: data.created_at,
    billingFrom: data.billing_from,
    billingTo: data.billing_to,
    note: data.note,
    totalAmount: Number(data.total_amount),
    paidAmount: (data.payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0),
    items: (data.invoice_items ?? []).map((item) => ({
      type: item.type,
      fee_category: item.fee_category,
      service_id: item.service_id,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unit_price: Number(item.unit_price),
      amount: Number(item.amount),
      meta: item.meta,
    })),
  };
}

/** Người ở chính của một hợp đồng — cho "Xem bản in" ở chi tiết hóa đơn đã lập. */
export async function getInvoiceOccupant(contractId: string): Promise<InvoiceOccupant | null> {
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("occupancy_id")
      .eq("id", contractId)
      .maybeSingle();
    if (error) throw error;
    return data?.occupancy_id ? await getOccupancyContact(data.occupancy_id) : null;
  } catch (err) {
    logError("invoice-create-service.getInvoiceOccupant", err);
    throw err;
  }
}
