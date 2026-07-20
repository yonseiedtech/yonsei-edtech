"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { useOrgChart } from "@/features/admin/settings/useOrgChart";
import { toast } from "sonner";
import WorkLogEditor, { type WorkLogFormValues } from "@/features/handover/WorkLogEditor";
import type { HandoverDocument } from "@/types";

const STAFF_ROLES = ["회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장"];
const CURRENT_TERM = `${new Date().getFullYear()}-${new Date().getMonth() < 6 ? 1 : 2}`;

export default function EditWorkLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { positions } = useOrgChart();

  const { data: handoverDocs = [], isLoading } = useQuery({
    queryKey: ["handover_docs"],
    queryFn: async () => {
      const res = await dataApi.list<HandoverDocument>("handover_docs", {
        sort: "role:asc",
        limit: 500,
      });
      return res.data;
    },
  });

  const doc = handoverDocs.find((d) => d.id === params.id);

  const roleOptions = useMemo(() => {
    const fromOrg = positions.map((p) => p.title).filter(Boolean);
    const fromDocs = handoverDocs.flatMap((d) =>
      d.roles && d.roles.length > 0 ? d.roles : [d.role],
    ).filter(Boolean);
    return Array.from(new Set([...fromOrg, ...STAFF_ROLES, ...fromDocs]));
  }, [positions, handoverDocs]);

  const mutation = useMutation({
    mutationFn: async (values: WorkLogFormValues) => {
      await dataApi.update("handover_docs", params.id, {
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
      toast.success("문서가 수정되었습니다.");
      router.push("/console/handover?tab=worklog");
    },
    onError: () => {
      toast.error("저장 중 오류가 발생했습니다.");
    },
  });

  function handleSave(values: WorkLogFormValues) {
    if (!values.title.trim()) { toast.error("제목을 입력하세요."); return; }
    if (!values.content.trim()) { toast.error("내용을 입력하세요."); return; }
    if (values.roles.length === 0) { toast.error("직책을 1개 이상 선택하세요."); return; }
    mutation.mutate(values);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>;
  }
  if (!doc) {
    return <p className="text-sm text-muted-foreground">문서를 찾을 수 없습니다.</p>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">업무수행 문서 수정</h1>
        <p className="mt-0.5 text-sm text-muted-foreground truncate">
          &ldquo;{doc.title}&rdquo; 문서를 수정합니다.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6">
        <WorkLogEditor
          initialValues={{
            roles:
              doc.roles && doc.roles.length > 0
                ? doc.roles
                : [doc.role].filter(Boolean),
            title: doc.title,
            content: doc.content,
            category: doc.category,
            priority: doc.priority,
          }}
          roleOptions={roleOptions}
          onSave={handleSave}
          isSaving={mutation.isPending}
          onCancel={() => router.push("/console/handover?tab=worklog")}
          isEditing={true}
        />
      </div>
    </div>
  );
}
