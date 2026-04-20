/**
 * 인수인계 전용 경량 Markdown 렌더러.
 *
 * HandoverSection 의 toolbar 가 만들어내는 4개 패턴만 다룬다:
 *   - "## " 헤딩 (한 줄)
 *   - "**텍스트**" 볼드 (인라인)
 *   - "- " 리스트 항목
 *   - "- [ ] " / "- [x] " 체크박스 항목
 *
 * 외부 마크다운 라이브러리 의존 없이 React node 트리로 변환한다.
 * print(PDF) / 화면 양쪽에서 동일하게 렌더링.
 */

import { Fragment, type ReactNode } from "react";

const BOLD_RE = /\*\*([^*]+)\*\*/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  text.replace(BOLD_RE, (match, inner: string, offset: number) => {
    if (offset > last) {
      out.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last, offset)}</Fragment>);
    }
    out.push(
      <strong key={`${keyPrefix}-b-${i++}`} className="font-semibold">
        {inner}
      </strong>,
    );
    last = offset + match.length;
    return match;
  });
  if (last < text.length) {
    out.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last)}</Fragment>);
  }
  return out;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: { text: string; checked: boolean | null }[] }
  | { kind: "para"; lines: string[] }
  | { kind: "blank" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let listBuf: { text: string; checked: boolean | null }[] = [];

  function flushPara() {
    if (buf.length > 0) {
      blocks.push({ kind: "para", lines: buf });
      buf = [];
    }
  }
  function flushList() {
    if (listBuf.length > 0) {
      blocks.push({ kind: "list", items: listBuf });
      listBuf = [];
    }
  }

  for (const raw of lines) {
    const line = raw;
    if (/^##\s+/.test(line)) {
      flushPara();
      flushList();
      blocks.push({ kind: "heading", text: line.replace(/^##\s+/, "") });
      continue;
    }
    const checkboxMatch = line.match(/^-\s+\[( |x|X)\]\s+(.*)$/);
    if (checkboxMatch) {
      flushPara();
      listBuf.push({ text: checkboxMatch[2], checked: checkboxMatch[1].toLowerCase() === "x" });
      continue;
    }
    const listMatch = line.match(/^-\s+(.*)$/);
    if (listMatch) {
      flushPara();
      listBuf.push({ text: listMatch[1], checked: null });
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      blocks.push({ kind: "blank" });
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function HandoverMarkdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content ?? "");
  let bi = 0;
  return (
    <div className={className}>
      {blocks.map((b) => {
        const key = `b-${bi++}`;
        if (b.kind === "heading") {
          return (
            <h4 key={key} className="mt-3 mb-1 text-sm font-bold text-foreground first:mt-0">
              {renderInline(b.text, key)}
            </h4>
          );
        }
        if (b.kind === "list") {
          return (
            <ul key={key} className="my-1 space-y-0.5 pl-1">
              {b.items.map((it, idx) => (
                <li key={`${key}-i-${idx}`} className="flex gap-2 text-sm leading-relaxed">
                  {it.checked === null ? (
                    <span className="mt-[0.4em] inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={it.checked}
                      readOnly
                      className="mt-[0.25em] h-3 w-3 shrink-0 accent-primary"
                    />
                  )}
                  <span className={it.checked ? "text-muted-foreground line-through" : ""}>
                    {renderInline(it.text, `${key}-i-${idx}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.kind === "para") {
          return (
            <p key={key} className="my-1 whitespace-pre-wrap text-sm leading-relaxed">
              {renderInline(b.lines.join("\n"), key)}
            </p>
          );
        }
        return <div key={key} className="h-2" />;
      })}
    </div>
  );
}
