"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi, profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RefreshCw, FileText, Plus, Pencil, Trash2, ChevronDown,
  ChevronUp, Users, ArrowRightLeft, BookOpen, Loader2,
  AlertTriangle, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { User, HandoverDocument } from "@/types";
import { HANDOVER_CATEGORY_LABELS } from "@/types";

type Section = "handover" | "transition";

const STAFF_ROLES = ["회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장"];
const CURRENT_TERM = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;

export default function TransitionPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [section, setSection] = useState<Section>("handover");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HandoverDocument | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({
    role: STAFF_ROLES[0],
    title: "",
    content: "",
    category: "routine" as HandoverDocument["category"],
    priority: "medium" as HandoverDocument["priority"],
  });

  // 운영진 교체 상태
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [transitionPlan, setTransitionPlan] = useState<{ userId: string; newRole: string }[]>([]);

  // 데이터 조회
  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc,priority:asc",
        limit: 500,
      });
      return res.data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["admin", "all-members-transition"],
    queryFn: async () => {
      const res = await profilesApi.list({ "filter[approved]": "true", limit: 500 });
      return res.data as unknown as User[];
    },
  });

  const staffMembers = members.filter((m) =>
    ["staff", "president", "admin"].includes(m.role),
  );

  const filteredDocs = selectedRole === "all"
    ? handoverDocs
    : handoverDocs.filter((d) => d.role === selectedRole);

  // 문서 CRUD
  const docMutation = useMutation({
    mutationFn: async (data: typeof docForm & { id?: string }) => {
      const payload = {
        ...data,
        term: CURRENT_TERM,
        authorId: user?.id ?? "",
        authorName: user?.name ?? "",
      };
      if (data.id) {
        await dataApi.update("handover_docs", data.id, payload);
      } else {
        await dataApi.create("handover_docs", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover_docs"] });
      setShowDocDialog(false);
      setEditingDoc(null);
      toast.success(editingDoc ? "문서가 수정되었습니다." : "문서가 등록되었습니다.");
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => dataApi.delete("handover_docs", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover_docs"] });
      toast.success("문서가 삭제되었습니다.");
    },
  });

  function openDocDialog(doc?: HandoverDocument) {
    if (doc) {
      setEditingDoc(doc);
      setDocForm({ role: doc.role, title: doc.title, content: doc.content, category: doc.category, priority: doc.priority });
    } else {
      setEditingDoc(null);
      setDocForm({ role: STAFF_ROLES[0], title: "", content: "", category: "routine", priority: "medium" });
    }
    setShowDocDialog(true);
  }

  // 운영진 교체 실행
  const transitionMutation = useMutation({
    mutationFn: async (plan: { userId: string; newRole: string }[]) => {
      // 기존 운영진을 member로 변경
      const currentStaff = staffMembers.filter(
        (m) => !plan.some((p) => p.userId === m.id),
      );
      for (const s of currentStaff) {
        if (s.role === "staff" || s.role === "president") {
          await profilesApi.update(s.id, { role: "alumni" });
        }
      }
      // 새 운영진 역할 지정
      for (const p of plan) {
        const newRole = p.newRole === "회장" ? "president" : "staff";
        await profilesApi.update(p.userId, { role: newRole });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      setShowTransitionDialog(false);
      setTransitionPlan([]);
      toast.success("운영진 교체가 완료되었습니다.");
    },
  });

  const PRIORITY_COLORS = {
    high: "bg-red-50 text-red-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-green-50 text-green-700",
  };
  const PRIORITY_LABELS = { high: "높음", medium: "보통", low: "낮음" };

  const SECTIONS: { value: Section; label: string; icon: React.ReactNode }[] = [
    { value: "handover", label: "업무수행철", icon: <BookOpen size={14} /> },
    { value: "transition", label: "운영진 교체", icon: <ArrowRightLeft size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <RefreshCw size={20} className="text-primary" />
        <h2 className="text-lg font-bold">운영진 관리</h2>
      </div>

      <div className="flex flex-wrap gap-1">
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSection(s.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              section === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* 업무수행철 */}
      {section === "handover" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedRole("all")}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", selectedRole === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
              >
                전체
              </button>
              {STAFF_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", selectedRole === r ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground")}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => openDocDialog()}>
              <Plus size={14} className="mr-1" />
              문서 작성
            </Button>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="rounded-lg border bg-white py-12 text-center">
              <FileText size={32} className="mx-auto text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">등록된 업무수행 문서가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="rounded-lg border bg-white">
                  <button
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{doc.role}</Badge>
                        <Badge variant="secondary" className={cn("text-xs", PRIORITY_COLORS[doc.priority])}>{PRIORITY_LABELS[doc.priority]}</Badge>
                        <Badge variant="outline" className="text-xs">{HANDOVER_CATEGORY_LABELS[doc.category]}</Badge>
                      </div>
                      <p className="mt-1 font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.authorName} · {doc.term}</p>
                    </div>
                    {expandedDoc === doc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedDoc === doc.id && (
                    <div className="border-t px-4 py-4">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{doc.content}</div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDocDialog(doc)}>
                          <Pencil size={12} className="mr-1" />
                          수정
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => { if (confirm("삭제하시겠습니까?")) deleteDocMutation.mutate(doc.id); }}
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
      )}

      {/* 운영진 교체 */}
      {section === "transition" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">운영진 교체 안내</p>
                <p className="mt-1 text-xs text-amber-700">
                  이 기능은 임기 변경 시 운영진 역할을 일괄 교체합니다.
                  기존 운영진은 졸업생(alumni)으로 변경되고, 선택한 회원에게 새 역할이 부여됩니다.
                  교체 전 업무수행철 작성을 완료해 주세요.
                </p>
              </div>
            </div>
          </div>

          {/* 현재 운영진 */}
          <div className="rounded-lg border bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Shield size={16} className="text-primary" />
              현재 운영진
            </h3>
            {staffMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">운영진이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {staffMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{m.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {m.role === "president" ? "회장" : m.role === "admin" ? "관리자" : "운영진"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{m.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={() => { setTransitionPlan([]); setShowTransitionDialog(true); }} className="w-full">
            <ArrowRightLeft size={16} className="mr-2" />
            운영진 교체 시작
          </Button>
        </div>
      )}

      {/* 문서 작성/수정 다이얼로그 */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "문서 수정" : "업무수행 문서 작성"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">직책</label>
                <select value={docForm.role} onChange={(e) => setDocForm((f) => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">분류</label>
                <select value={docForm.category} onChange={(e) => setDocForm((f) => ({ ...f, category: e.target.value as HandoverDocument["category"] }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  {Object.entries(HANDOVER_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">우선순위</label>
                <select value={docForm.priority} onChange={(e) => setDocForm((f) => ({ ...f, priority: e.target.value as HandoverDocument["priority"] }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">제목</label>
              <Input value={docForm.title} onChange={(e) => setDocForm((f) => ({ ...f, title: e.target.value }))} placeholder="업무 제목" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">내용</label>
              <textarea
                value={docForm.content}
                onChange={(e) => setDocForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="업무 내용, 절차, 주의사항 등을 작성하세요..."
                rows={8}
                className="w-full rounded-lg border px-3 py-2 text-sm resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocDialog(false)}>취소</Button>
            <Button
              onClick={() => {
                if (!docForm.title) { toast.error("제목을 입력하세요."); return; }
                if (!docForm.content) { toast.error("내용을 입력하세요."); return; }
                docMutation.mutate(editingDoc ? { ...docForm, id: editingDoc.id } : docForm);
              }}
              disabled={docMutation.isPending}
            >
              {docMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              {editingDoc ? "수정" : "작성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 운영진 교체 다이얼로그 */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>운영진 교체</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            새 임기 운영진을 선택하세요. 기존 운영진은 졸업생으로 변경됩니다.
          </p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {STAFF_ROLES.map((role) => {
              const entry = transitionPlan.find((p) => p.newRole === role);
              return (
                <div key={role} className="rounded-lg border p-3">
                  <label className="mb-1 block text-sm font-medium">{role}</label>
                  <select
                    value={entry?.userId ?? ""}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setTransitionPlan((prev) => {
                        const next = prev.filter((p) => p.newRole !== role);
                        if (uid) next.push({ userId: uid, newRole: role });
                        return next;
                      });
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="">선택 안함</option>
                    {members
                      .filter((m) => m.approved)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransitionDialog(false)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (transitionPlan.length === 0) { toast.error("최소 1명의 운영진을 지정해 주세요."); return; }
                if (!confirm("운영진을 교체하시겠습니까? 기존 운영진은 졸업생으로 변경됩니다.")) return;
                transitionMutation.mutate(transitionPlan);
              }}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              교체 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
