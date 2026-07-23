"use client";

/**
 * 러닝 가이드 네이티브 페이지용 최소 마크다운 렌더러.
 * 외부 라이브러리 없음 — 시맨틱 토큰만 사용 (raw 색상 금지).
 *
 * 지원 구문:
 *  - # / ## / ### 헤딩
 *  - ``` ... ``` 코드 블록
 *  - `inline code`
 *  - **bold** / *italic*
 *  - [text](url) 링크
 *  - - / * 목록 (비정렬)
 *  - 1. 목록 (정렬)
 *  - 빈 줄 단락 구분
 */

import { type ReactNode, Fragment } from "react";

// ── 인라인 파서 ────────────────────────────────────────────────────────────────

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; children: InlineToken[] }
  | { type: "italic"; children: InlineToken[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: InlineToken[] };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;

  while (i < text.length) {
    // inline code
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        tokens.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // bold **...**
    if (text.slice(i, i + 2) === "**") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        tokens.push({ type: "bold", children: parseInline(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    // italic *...*
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1) {
        tokens.push({ type: "italic", children: parseInline(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    // link [text](url)
    if (text[i] === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          tokens.push({ type: "link", href, children: parseInline(linkText) });
          i = closeParen + 1;
          continue;
        }
      }
    }
    // plain text (consume until next special char)
    let end = i + 1;
    while (end < text.length) {
      const c = text[end];
      if (c === "`" || c === "*" || c === "[") break;
      end++;
    }
    tokens.push({ type: "text", value: text.slice(i, end) });
    i = end;
  }

  return tokens;
}

function renderInline(tokens: InlineToken[], keyPrefix: string): ReactNode[] {
  return tokens.map((t, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (t.type) {
      case "text":
        return <Fragment key={key}>{t.value}</Fragment>;
      case "code":
        return (
          <code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono text-foreground">
            {t.value}
          </code>
        );
      case "bold":
        return <strong key={key}>{renderInline(t.children, key)}</strong>;
      case "italic":
        return <em key={key}>{renderInline(t.children, key)}</em>;
      case "link":
        return (
          <a
            key={key}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {renderInline(t.children, key)}
          </a>
        );
      default:
        return null;
    }
  });
}

// ── 블록 파서 ─────────────────────────────────────────────────────────────────

type BlockNode =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "code_block"; lang: string; code: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string }
  | { type: "blank" };

function parseBlocks(markdown: string): BlockNode[] {
  const lines = markdown.split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 코드 블록 ``` ... ```
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code_block", lang, code: codeLines.join("\n") });
      i++; // skip closing ```
      continue;
    }

    // 헤딩
    const h3 = line.match(/^### (.+)$/);
    if (h3) { blocks.push({ type: "h3", text: h3[1] }); i++; continue; }
    const h2 = line.match(/^## (.+)$/);
    if (h2) { blocks.push({ type: "h2", text: h2[1] }); i++; continue; }
    const h1 = line.match(/^# (.+)$/);
    if (h1) { blocks.push({ type: "h1", text: h1[1] }); i++; continue; }

    // 비정렬 목록
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // 정렬 목록
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // 빈 줄
    if (line.trim() === "") {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    // 단락
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].match(/^[#`*-]/) && !/^\d+\./.test(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: "p", text: paragraphLines.join(" ") });
    }
  }

  return blocks;
}

// ── 렌더 ──────────────────────────────────────────────────────────────────────

function renderBlock(block: BlockNode, idx: number): ReactNode {
  const key = `block-${idx}`;

  switch (block.type) {
    case "h1":
      return (
        <h2 key={key} className="mt-6 mb-2 text-xl font-bold text-foreground first:mt-0">
          {renderInline(parseInline(block.text), key)}
        </h2>
      );
    case "h2":
      return (
        <h3 key={key} className="mt-5 mb-1.5 text-lg font-semibold text-foreground first:mt-0">
          {renderInline(parseInline(block.text), key)}
        </h3>
      );
    case "h3":
      return (
        <h4 key={key} className="mt-4 mb-1 text-base font-semibold text-foreground first:mt-0">
          {renderInline(parseInline(block.text), key)}
        </h4>
      );
    case "code_block":
      return (
        <pre key={key} className="my-3 overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm font-mono leading-relaxed text-foreground">
          <code>{block.code}</code>
        </pre>
      );
    case "ul":
      return (
        <ul key={key} className="my-2 ml-4 list-disc space-y-1 text-foreground">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(parseInline(item), `${key}-li-${i}`)}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="my-2 ml-4 list-decimal space-y-1 text-foreground">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(parseInline(item), `${key}-li-${i}`)}
            </li>
          ))}
        </ol>
      );
    case "p":
      return (
        <p key={key} className="leading-relaxed text-foreground">
          {renderInline(parseInline(block.text), key)}
        </p>
      );
    case "blank":
      return <div key={key} className="h-3" />;
    default:
      return null;
  }
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

interface SimpleMarkdownProps {
  body: string;
  className?: string;
}

export default function SimpleMarkdown({ body, className }: SimpleMarkdownProps) {
  const blocks = parseBlocks(body);
  return (
    <div className={className}>
      {blocks.map((block, idx) => renderBlock(block, idx))}
    </div>
  );
}
