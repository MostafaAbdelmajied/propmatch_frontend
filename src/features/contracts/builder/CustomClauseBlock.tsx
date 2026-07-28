"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { CustomClause } from "./types";

/**
 * One custom clause, in the document flow like any other paragraph — not a
 * dashboard card. `draft` clauses open straight into edit mode (a clause
 * just added has nothing to view yet); `saved` ones render as plain text
 * with hover-revealed Edit/Delete actions.
 */
export function CustomClauseBlock({
  clause,
  index,
  onSave,
  onDelete,
}: {
  clause: CustomClause;
  index: number;
  onSave: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(clause.state === "draft");
  const [draft, setDraft] = useState(clause.content);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave(clause.id, trimmed);
    setEditing(false);
  }

  function cancel() {
    if (clause.state === "draft" && !clause.content) {
      onDelete(clause.id);
      return;
    }
    setDraft(clause.content);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="group flex flex-col gap-2 rounded-control border-2 border-primary/40 bg-primary-tint/30 p-3">
        <p className="text-small font-bold text-ink">
          بند إضافي {index + 1}: <span className="font-normal text-muted">(بند متفق عليه بين الطرفين)</span>
        </p>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          dir="auto"
          placeholder="اكتب نص البند هنا…"
          className="w-full resize-y rounded-control border border-hairline bg-surface px-3 py-2.5 text-body text-ink outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1 rounded-control bg-primary px-3 py-1.5 text-caption font-semibold text-white disabled:opacity-50"
          >
            <Check className="size-3.5" aria-hidden />
            حفظ
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 rounded-control border border-hairline px-3 py-1.5 text-caption font-semibold text-body-text hover:bg-background"
          >
            <X className="size-3.5" aria-hidden />
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start justify-between gap-3 rounded-control p-2 hover:bg-background">
      <p className="text-body leading-relaxed text-body-text">
        <b className="text-ink">بند إضافي {index + 1}:</b> {clause.content}
      </p>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="تعديل البند"
          className="flex size-8 items-center justify-center rounded-control text-muted hover:bg-primary-tint hover:text-primary"
        >
          <Pencil className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onDelete(clause.id)}
          aria-label="حذف البند"
          className="flex size-8 items-center justify-center rounded-control text-muted hover:bg-error-tint hover:text-error"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
