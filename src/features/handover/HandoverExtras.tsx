/**
 * HandoverExtras — 업무노트의 워크플로우(순서 단계) · TO-DO(체크리스트) 조회 렌더.
 * WorkLogView(펼침 상세) / report(기수 리포트) 양쪽에서 공용.
 * 값이 없으면 아무것도 렌더하지 않아 하위호환.
 */

import { ListOrdered, ListChecks, User as UserIcon, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HandoverWorkflowStep, HandoverTodoItem } from "@/types";

export function HandoverWorkflow({
  steps,
  className,
}: {
  steps?: HandoverWorkflowStep[];
  className?: string;
}) {
  const items = (steps ?? []).filter((s) => s.title.trim() || (s.description ?? "").trim());
  if (items.length === 0) return null;
  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ListOrdered size={13} /> 워크플로우
      </p>
      <ol className="space-y-2">
        {items.map((step, idx) => (
          <li key={idx} className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {idx + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{step.title}</p>
              {(step.description ?? "").trim() && (
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HandoverTodos({
  todos,
  className,
}: {
  todos?: HandoverTodoItem[];
  className?: string;
}) {
  const items = (todos ?? []).filter((t) => t.text.trim());
  if (items.length === 0) return null;
  const doneCount = items.filter((t) => t.done).length;
  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ListChecks size={13} /> TO-DO
        <span className="font-normal">
          ({doneCount}/{items.length} 완료)
        </span>
      </p>
      <ul className="space-y-1">
        {items.map((todo, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={todo.done}
              readOnly
              className="mt-[0.2em] h-3.5 w-3.5 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1">
              <span className={cn(todo.done ? "text-muted-foreground line-through" : "text-foreground")}>
                {todo.text}
              </span>
              {(todo.assignee?.trim() || todo.due?.trim()) && (
                <span className="ml-2 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 align-middle text-[11px] text-muted-foreground">
                  {todo.assignee?.trim() && (
                    <span className="inline-flex items-center gap-0.5">
                      <UserIcon size={10} /> {todo.assignee}
                    </span>
                  )}
                  {todo.due?.trim() && (
                    <span className="inline-flex items-center gap-0.5">
                      <CalendarDays size={10} /> {todo.due}
                    </span>
                  )}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
