"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type TagPill = {
  id: string;
  name: string;
};

export type TagInputProps = {
  tags: TagPill[];
  onAddTag: (name: string) => void;
  isAdding?: boolean;
  error?: string | null;
};

export function TagInput({ tags, onAddTag, isAdding, error }: TagInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const name = draft.trim();
    if (name) {
      onAddTag(name);
    }
    setDraft("");
    setIsEditing(false);
  }

  function cancel() {
    setDraft("");
    setIsEditing(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border border-input bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
          >
            {tag.name}
            <X className="size-3 text-text-faint" aria-hidden="true" />
          </span>
        ))}
        {isEditing ? (
          <input
            autoFocus
            type="text"
            aria-label="Nova tag"
            value={draft}
            disabled={isAdding}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            className="h-6 w-24 rounded-full border border-dashed border-checkbox-border bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-text-ghost"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center rounded-full border border-dashed border-checkbox-border px-2.5 py-1 text-xs text-text-faint"
          >
            + tag
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
