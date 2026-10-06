import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Nhật ký thu hóa đơn — mỗi lần đi thu chưa được thì ghi một dòng (lý do + ngày
 * hẹn thu lại). Bảng `invoice_collection_notes`, chỉ chủ trọ đọc/ghi (RLS).
 *
 * ⚠️ KHÔNG gửi `owner_id`: DB tự gán `auth.uid()` và policy `with check` chốt lại.
 */

export const COLLECTION_NOTE_REASON_MAX_LENGTH = 500;

export interface CollectionNote {
  id: string;
  invoice_id: string;
  reason: string;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionNoteInput {
  reason: string;
  /** "YYYY-MM-DD" hoặc null nếu chưa hẹn ngày. */
  followUpDate: string | null;
}

const NOTE_COLUMNS = "id, invoice_id, reason, follow_up_date, created_at, updated_at";

function toRow(input: CollectionNoteInput) {
  return {
    reason: input.reason.trim(),
    follow_up_date: input.followUpDate || null,
  };
}

/** Mới nhất trước. Lỗi được ném ra để UI hiện trạng thái lỗi thay vì list rỗng giả. */
export async function getCollectionNotes(invoiceId: string): Promise<CollectionNote[]> {
  try {
    const { data, error } = await supabase
      .from("invoice_collection_notes")
      .select(NOTE_COLUMNS)
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    logError("collection-note-service.getCollectionNotes", err);
    throw err;
  }
}

export async function createCollectionNote(invoiceId: string, input: CollectionNoteInput): Promise<CollectionNote> {
  try {
    const { data, error } = await supabase
      .from("invoice_collection_notes")
      .insert({ invoice_id: invoiceId, ...toRow(input) })
      .select(NOTE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    logError("collection-note-service.createCollectionNote", err);
    throw err;
  }
}

export async function updateCollectionNote(noteId: string, input: CollectionNoteInput): Promise<CollectionNote> {
  try {
    const { data, error } = await supabase
      .from("invoice_collection_notes")
      .update(toRow(input))
      .eq("id", noteId)
      .select(NOTE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    logError("collection-note-service.updateCollectionNote", err);
    throw err;
  }
}

export async function deleteCollectionNote(noteId: string): Promise<void> {
  try {
    const { error } = await supabase.from("invoice_collection_notes").delete().eq("id", noteId);
    if (error) throw error;
  } catch (err) {
    logError("collection-note-service.deleteCollectionNote", err);
    throw err;
  }
}
