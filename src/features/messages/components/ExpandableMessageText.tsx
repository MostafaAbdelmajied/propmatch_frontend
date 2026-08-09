"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/src/utils/cn";

const DEFAULT_COLLAPSED_LENGTH = 320;

export function getCollapsedMessageText(text: string, limit = DEFAULT_COLLAPSED_LENGTH): string {
  if (text.length <= limit) return text;

  const candidate = text.slice(0, limit);
  const lastBreak = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf("\n"));
  const cutoff = lastBreak >= Math.floor(limit * 0.6) ? lastBreak : limit;
  return `${text.slice(0, cutoff).trimEnd()}...`;
}

export function ExpandableMessageText({
  text,
  render,
  collapsedLength = DEFAULT_COLLAPSED_LENGTH,
  className,
}: {
  text: string;
  render?: (visibleText: string) => ReactNode;
  collapsedLength?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = text.length > collapsedLength;
  const visibleText = expanded ? text : getCollapsedMessageText(text, collapsedLength);

  return (
    <div className={cn("min-w-0 max-w-full text-start", className)}>
      <div
        className="max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
        dir="auto"
      >
        {render ? render(visibleText) : visibleText}
      </div>
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 inline text-caption font-bold text-current underline underline-offset-2 opacity-90 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {expanded ? "عرض أقل" : "عرض المزيد"}
        </button>
      )}
    </div>
  );
}
