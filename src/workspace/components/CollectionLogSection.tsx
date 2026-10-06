import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, NotebookPen } from "lucide-react";
import { C, font, radius } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { useCanWrite } from "../../shared/contexts/SubscriptionContext";
import { Button, Skeleton } from "../../shared/components/common";
import {
  COLLECTION_NOTE_REASON_MAX_LENGTH,
  createCollectionNote,
  deleteCollectionNote,
  getCollectionNotes,
  updateCollectionNote,
  type CollectionNote,
  type CollectionNoteInput,
} from "../services/collection-note-service";

/** Lý do hay gặp — bấm một chip là điền sẵn, giữ thao tác ≤ 3 chạm. */
const QUICK_REASONS = [
  "Người ở hẹn trả sau",
  "Không liên lạc được",
  "Người ở đang khó khăn tài chính",
  "Chưa thống nhất số tiền",
  "Người ở đi vắng",
];

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13.5, color: C.textPrimary,
  padding: "9px 12px", background: C.white, border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: "none",
};

interface NoteFormProps {
  initial?: CollectionNoteInput;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (input: CollectionNoteInput) => void;
  onCancel?: () => void;
  testIdPrefix: string;
}

function NoteForm({ initial, submitLabel, isSaving, onSubmit, onCancel, testIdPrefix }: NoteFormProps) {
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [followUpDate, setFollowUpDate] = useState(initial?.followUpDate ?? "");
  const canSubmit = reason.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {QUICK_REASONS.map(quickReason => (
          <button
            key={quickReason}
            type="button"
            onClick={() => setReason(quickReason)}
            style={{
              fontFamily: font, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 10px", borderRadius: radius.pill,
              border: `1px solid ${reason === quickReason ? C.primary : C.border}`,
              background: reason === quickReason ? C.cream : C.white,
              color: reason === quickReason ? C.primary : C.textSecondary,
            }}
          >
            {quickReason}
          </button>
        ))}
      </div>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        maxLength={COLLECTION_NOTE_REASON_MAX_LENGTH}
        rows={2}
        placeholder="Lý do chưa thu được, ví dụ: người ở hẹn cuối tuần trả, đã gọi 2 lần không nghe máy…"
        aria-label="Lý do chưa thu được"
        data-testid={`${testIdPrefix}-input`}
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.45 }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: font, fontSize: 12.5, color: C.textSecondary }}>
          Hẹn thu lại
          <input
            type="date"
            value={followUpDate}
            onChange={e => setFollowUpDate(e.target.value)}
            data-testid={`${testIdPrefix}-date`}
            style={{ ...inputStyle, width: "auto", padding: "6px 10px" }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Hủy</Button>}
          <Button
            variant="secondary"
            size="sm"
            requiresWrite
            disabled={!canSubmit}
            loading={isSaving}
            data-testid={`${testIdPrefix}-submit`}
            onClick={() => onSubmit({ reason, followUpDate: followUpDate || null })}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CollectionLogSectionProps {
  invoiceId: string;
  /** Hóa đơn đã thu đủ: vẫn xem lịch sử, ẩn ô ghi mới. */
  isSettled: boolean;
}

/** "Nhật ký thu tiền": ghi lại các lần chưa thu được + lý do, để đi thu lại. */
export function CollectionLogSection({ invoiceId, isSettled }: CollectionLogSectionProps) {
  const queryClient = useQueryClient();
  const canWrite = useCanWrite();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: notes = [], isPending, isError, error } = useQuery({
    queryKey: qk.billing.collectionNotes(invoiceId),
    queryFn: () => getCollectionNotes(invoiceId),
  });

  // Làm mới cả danh sách hóa đơn (cột "ghi chú gần nhất") lẫn nhật ký này.
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.billing.all });
  const onError = (err: unknown) => setErrorMessage(toUserMessage(err));

  const createMutation = useMutation({
    mutationFn: (input: CollectionNoteInput) => createCollectionNote(invoiceId, input),
    onSuccess: () => { setErrorMessage(null); setFormKey(key => key + 1); void refresh(); },
    onError,
  });
  const updateMutation = useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: CollectionNoteInput }) => updateCollectionNote(noteId, input),
    onSuccess: () => { setErrorMessage(null); setEditingNoteId(null); void refresh(); },
    onError,
  });
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteCollectionNote(noteId),
    onSuccess: () => { setErrorMessage(null); setDeletingNoteId(null); void refresh(); },
    onError,
  });

  const renderNote = (note: CollectionNote) => {
    if (editingNoteId === note.id) {
      return (
        <NoteForm
          initial={{ reason: note.reason, followUpDate: note.follow_up_date }}
          submitLabel="Lưu"
          isSaving={updateMutation.isPending}
          onSubmit={input => updateMutation.mutate({ noteId: note.id, input })}
          onCancel={() => setEditingNoteId(null)}
          testIdPrefix="collection-note-edit"
        />
      );
    }
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 13.5, color: C.textPrimary, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{note.reason}</span>
          <span style={{ fontSize: 11.5, color: C.textSecondary, flexShrink: 0 }}>{formatDate(note.created_at)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 }}>
          {note.follow_up_date ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: C.warning }}>
              <CalendarClock size={13} /> Hẹn thu lại {formatDate(note.follow_up_date)}
            </span>
          ) : <span />}
          {canWrite && (deletingNoteId === note.id ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: C.error }}>Xóa ghi chú này?</span>
              <Button variant="ghost" size="sm" onClick={() => setDeletingNoteId(null)}>Không</Button>
              <Button variant="danger" size="sm" requiresWrite loading={deleteMutation.isPending} data-testid="collection-note-delete-confirm" onClick={() => deleteMutation.mutate(note.id)}>Xóa</Button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4 }}>
              <Button variant="ghost" size="sm" requiresWrite data-testid="collection-note-edit" onClick={() => { setEditingNoteId(note.id); setDeletingNoteId(null); }}>Sửa</Button>
              <Button variant="ghost" size="sm" requiresWrite data-testid="collection-note-delete" onClick={() => { setDeletingNoteId(note.id); setEditingNoteId(null); }}>Xóa</Button>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div data-testid="collection-log" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, fontFamily: font }}>
      <h4 style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: C.textPrimary }}>
        <NotebookPen size={15} color={C.primary} /> Nhật ký thu tiền
      </h4>
      <p style={{ fontSize: 12.5, color: C.textSecondary, margin: "0 0 10px" }}>
        Chưa thu được? Ghi lại lý do và ngày hẹn để lần sau đi thu cho đúng.
      </p>

      {errorMessage && (
        <p role="alert" style={{ fontSize: 12.5, color: C.error, margin: "0 0 8px" }}>{errorMessage}</p>
      )}

      {!isSettled && (
        <div style={{ background: C.bg, borderRadius: radius.md, padding: 12, marginBottom: 10 }}>
          <NoteForm
            key={formKey}
            submitLabel="Ghi nhật ký"
            isSaving={createMutation.isPending}
            onSubmit={input => createMutation.mutate(input)}
            testIdPrefix="collection-note"
          />
        </div>
      )}

      {isPending ? (
        <Skeleton variant="row" count={2} />
      ) : isError ? (
        <p role="alert" style={{ fontSize: 13, color: C.error, margin: 0 }}>{toUserMessage(error)}</p>
      ) : notes.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>Chưa có lần ghi nào.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map(note => (
            <div key={note.id} data-testid="collection-note-item" style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, padding: "10px 12px" }}>
              {renderNote(note)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
