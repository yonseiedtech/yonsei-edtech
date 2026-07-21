"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import { useOrgChart } from "@/features/admin/settings/useOrgChart";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Printer, Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HandoverDocument } from "@/types";
import { HANDOVER_CATEGORY_LABELS } from "@/types";
import { HandoverMarkdown } from "@/lib/markdown-handover";

// 기본 직책 (조직 설정에 직책이 없을 때의 하위호환 폴백)
const STAFF_ROLES = ["회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장"];
const CURRENT_TERM = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;

const PRIORITY_COLORS = {
  high: "bg-destructive/5 text-destructive",
  medium: "bg-warning/5 text-warning",
  low: "bg-success/5 text-success",
};
const PRIORITY_LABELS = { high: "높음", medium: "보통", low: "낮음" };

/** 문서의 참고 직책 배열 (roles 없으면 role 단일 폴백) */
function docRoles(doc: HandoverDocument): string[] {
  return doc.roles && doc.roles.length > 0 ? doc.roles : [doc.role].filter(Boolean);
}

export default function HandoverSection() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const composeParam = searchParams.get("compose");
  const { positions } = useOrgChart();

  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "priority:asc,role:asc",
        limit: 500,
      });
      return res.data;
    },
  });

  // 업무노트 직책 목록 = 운영진 설정(조직도)의 직책명 ∪ 기본 직책(하위호환) ∪ 기존 문서에 실재하는 role(s)
  const roleOptions = useMemo(() => {
    const fromOrg = positions.map((p) => p.title).filter(Boolean);
    const fromDocs = handoverDocs.flatMap(docRoles);
    return Array.from(new Set([...fromOrg, ...STAFF_ROLES, ...fromDocs]));
  }, [positions, handoverDocs]);

  // ?role= 딥링크는 roleOptions에 포함될 때만 유효
  const validRoleParam = roleParam && roleOptions.includes(roleParam) ? roleParam : null;

  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  // ?role= 딥링크 → 필터 프리셋으로 동작
  useEffect(() => {
    if (validRoleParam) setSelectedRole(validRoleParam);
  }, [validRoleParam]);

  // ?compose=1 딥링크 → 새 문서 작성 페이지로 redirect (1회)
  const composedRef = useRef(false);
  useEffect(() => {
    if (composeParam === "1" && !composedRef.current) {
      composedRef.current = true;
      const target = roleParam
        ? `/console/handover/worklog/new?role=${encodeURIComponent(roleParam)}`
        : `/console/handover/worklog/new`;
      router.replace(target);
    }
  }, [composeParam, roleParam, router]);

  // 위키 통합 목록: 역할 필터 + 텍스트 검색
  const filteredDocs = useMemo(() => {
    let docs = handoverDocs;
    if (selectedRole !== "all") {
      docs = docs.filter((d) => docRoles(d).includes(selectedRole));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.content.toLowerCase().includes(q),
      );
    }
    return docs;
  }, [handoverDocs, selectedRole, searchQuery]);

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => dataApi.delete("handover_docs", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover_docs"] });
      toast.success("문서가 삭제되었습니다.");
    },
  });

  return (
    <div className="space-y-4">
      {/* 상단: 직책 필터 칩 + 작성/리포트 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedRole("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              selectedRole === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            전체
          </button>
          {roleOptions.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                selectedRole === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/console/handover/report?term=${CURRENT_TERM}`}>
            <Button variant="outline" size="sm">
              <Printer size={14} className="mr-1" />
              기수 리포트
            </Button>
          </Link>
          <Link href="/console/handover/worklog/new">
            <Button size="sm">
              <Plus size={14} className="mr-1" />
              문서 작성
            </Button>
          </Link>
        </div>
      </div>

      {/* 검색 입력 */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="제목·본문 검색"
          className="pl-8 text-sm"
        />
      </div>

      {/* 위키 통합 목록 */}
      {filteredDocs.length === 0 ? (
        <EmptyState compact icon={FileText} title="등록된 업무수행 문서가 없습니다." />
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="rounded-lg border bg-card">
              <button
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* 참고 직책 배지 (복수) */}
                    {docRoles(doc).map((r) => (
                      <Badge key={r} variant="secondary" className="text-xs">
                        {r}
                      </Badge>
                    ))}
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", PRIORITY_COLORS[doc.priority])}
                    >
                      {PRIORITY_LABELS[doc.priority]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {HANDOVER_CATEGORY_LABELS[doc.category]}
                    </Badge>
                  </div>
                  <p className="mt-1 font-medium text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.authorName} · {doc.term}
                  </p>
                </div>
                {expandedDoc === doc.id ? (
                  <ChevronUp size={16} className="shrink-0" />
                ) : (
                  <ChevronDown size={16} className="shrink-0" />
                )}
              </button>
              {expandedDoc === doc.id && (
                <div className="border-t px-4 py-4">
                  <HandoverMarkdown
                    content={doc.content}
                    className="text-sm leading-relaxed"
                  />
                  <div className="mt-4 flex gap-2">
                    <Link href={`/console/handover/worklog/${doc.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Pencil size={12} className="mr-1" />
                        수정
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("삭제하시겠습니까?"))
                          deleteDocMutation.mutate(doc.id);
                      }}
                    >
                      <Trash2 size={12} className="mr-1" />
                      삭제
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
