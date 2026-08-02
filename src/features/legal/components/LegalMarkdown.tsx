"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => <h2 className="mb-2 mt-4 text-title font-bold first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-body font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => (
    <h4 className="mb-1.5 mt-3 text-body font-semibold first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pe-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pe-5">{children}</ol>,
  li: ({ children }) => <li className="pe-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-r-4 border-primary/40 bg-primary-tint/40 px-3 py-2 text-body-text">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-card border border-hairline">
      <table className="w-full min-w-[36rem] border-collapse text-right text-small">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primary-tint text-ink">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-hairline bg-surface">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="divide-x divide-x-reverse divide-hairline">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 align-top font-bold">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top leading-relaxed">{children}</td>,
  code: ({ children }) => (
    <code className="rounded bg-ink/5 px-1 py-0.5 font-mono text-[0.9em]" dir="ltr">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-hairline" />,
};

export function LegalMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {content}
    </ReactMarkdown>
  );
}
