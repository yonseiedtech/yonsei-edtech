"use client";

/**
 * 본문 텍스트 wiki 링크 렌더러 (사이클 104, 사용자 요청)
 *
 * 아카이브에 등록된 개념명을 본문에서 찾아 새 탭 링크(점선 밑줄)로 표시한다.
 * 페이지 이동 없이 클릭 시 해당 개념 상세를 새 탭으로 연다.
 *
 * 사용 예:
 *   <p className="...">
 *     <ConceptLinkedText text={item.description} excludeConceptId={id} />
 *   </p>
 */

import { Fragment, useMemo } from "react";
import {
  useConceptIndex,
  splitTextByConcepts,
} from "@/features/archive/useConceptIndex";

interface Props {
  text: string;
  /** 현재 보고 있는 개념 id — 자기 자신은 링크하지 않음 */
  excludeConceptId?: string;
  className?: string;
}

export default function ConceptLinkedText({
  text,
  excludeConceptId,
  className,
}: Props) {
  const { data: index } = useConceptIndex();
  const parts = useMemo(
    () => splitTextByConcepts(text, index ?? [], excludeConceptId),
    [text, index, excludeConceptId],
  );

  return (
    <span className={className}>
      {parts.map((p, idx) =>
        p.conceptId ? (
          <a
            key={idx}
            href={`/archive/concept/${p.conceptId}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`아카이브에서 '${p.text}' 개념 보기 (새 탭)`}
            className="font-medium text-violet-600 underline decoration-dotted decoration-violet-300 underline-offset-2 transition-colors hover:text-violet-700 hover:decoration-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
          >
            {p.text}
          </a>
        ) : (
          <Fragment key={idx}>{p.text}</Fragment>
        ),
      )}
    </span>
  );
}
