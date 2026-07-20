"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { useOrgChart } from "@/features/admin/settings/useOrgChart";
import { toast } from "sonner";
import WorkLogEditor, { type WorkLogFormValues } from "@/features/handover/WorkLogEditor";
import type { HandoverDocument } from "@/types";

const STAFF_ROLES = ["회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장"];
const CURRENT_TERM = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;

function NewWorkLogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { positions } = useOrgChart();

  const { data: handoverDocs = [] } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc",
        limit: 500,
      });
      return res.data;
    },
  });

  const roleOptions = useMemo(() => {
    const fromOrg = positions.map((p) => p.title).filter(Boolean);
    const fromDocs = handoverDocs.flatMap((d) =>
      d.roles && d.roles.length > 0 ? d.roles : [d.role],
    ).filter(Boolean);
    return Array.from(new Set([...fromOrg, ...STAFF_ROLES, ...fromDocs]));
  }, [positions, handoverDocs]);

  const mutation = useMutation({
    mutationFn: async (values: WorkLogFormValues) => {
      await dataApi.create("handover_docs", {
        ...values,
        // 하위호환: role = 첫 번째 태그
        role: values.roles[0] ?? "",
        term: CURRENT_TERM,
        authorId: user?.id ?? "",
        authorName: user?.name ?? "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover_docs"] });
      toast.success("문서가 등록되었습니다.");
      router.push("/console/handover?tab=worklog");
    },
    onError: () => {
      toast.error("저장 중 오류가 발생했습니다.");
    },
  });

  // ?role= 프리필 (roleOptions에 포함된 값만 초기 선택)
  const initialRoles = useMemo(
    () => (roleParam && roleOptions.includes(roleParam) ? [roleParam] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roleParam, roleOptions.join(",")],
  );

  function handleSave(values: WorkLogFormValues) {
    if (!values.title.trim()) { toast.error("제목을 입력하세요."); return; }
    if (!values.content.trim()) { toast.error("내용을 입력하세요."); return; }
    if (values.roles.length === 0) { toast.error("직책을 1개 이상 선택하세요."); return; }
    mutation.mutate(values);
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">업무수행 문서 작성</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          새 업무수행 문서를 작성합니다. 저장 후 업무수행철에 표시됩니다.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <WorkLogEditor
          initialValues={{
            roles: initialRoles,
            title: "",
            content: "",
            category: "routine",
            priority: "medium",
          }}
          roleOptions={roleOptions}
          onSave={handleSave}
          isSaving={mutation.isPending}
          onCancel={() => router.push("/console/handover?tab=worklog")}
          isEditing={false}
        />
      </div>
    </div>
  );
}

export default function NewWorkLogPage() {
  return (
    <Suspense fallback={null}>
      <NewWorkLogInner />
    </Suspense>
  );
}
