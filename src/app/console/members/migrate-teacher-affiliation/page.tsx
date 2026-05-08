"use client";

/**
 * 운영 콘솔 — 학교 교사 affiliation 분리 마이그레이션 UI
 *
 * Phase 2 (school_level + affiliationOffice) 도입으로 affiliation 이
 * '소속 교육청 + 학교명' 통합 입력 → '소속 학교명' 만 으로 의미 변경되었음.
 * 기존 학교 교사 회원의 affiliation 값을 운영진이 한 명씩 split.
 *
 * 대상: occupation === "teacher" AND affiliation !== "" AND affiliationOffice == undefined/""
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import SkeletonWidget from "@/components/ui/skeleton-widget";
import { OFFICE_OF_EDUCATION_OPTIONS, type SchoolLevel, type User } from "@/types";
import OfficeOfEducationField from "@/components/ui/office-of-education-field";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { GraduationCap } from "lucide-react";

interface TeacherRow {
  user: User;
  /** 자동 추정한 split 결과 — affiliation 텍스트에서 17개 시·도교육청 키워드 발견 시 분리 */
  suggested: {
    office: string;
    school: string;
  };
}

/** 17개 시·도교육청 키워드 매칭으로 affiliation 텍스트에서 office 추정 */
function suggestSplit(affiliation: string): { office: string; school: string } {
  const trimmed = affiliation.trim();
  if (!trimmed) return { office: "", school: "" };

  // 매칭 키워드 목록 — 교육청 정식 명칭 + 약식 (예: 서울교육청 ↔ 서울특별시교육청)
  const aliasMap: Record<string, string> = {};
  for (const full of OFFICE_OF_EDUCATION_OPTIONS) {
    aliasMap[full] = full;
    // 약식 alias 생성 — "서울특별시교육청" → "서울교육청", "경기도교육청" → "경기교육청"
    const short = full
      .replace(/특별시|광역시|특별자치시|특별자치도/g, "")
      .replace(/도교육청$/, "교육청");
    if (short !== full) aliasMap[short] = full;
  }

  // 본문에서 가장 긴 매치 우선
  const sortedAliases = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (trimmed.includes(alias)) {
      const office = aliasMap[alias];
      const school = trimmed
        .replace(alias, "")
        .replace(/^[\s,/·\-]+/, "")
        .replace(/[\s,/·\-]+$/, "")
        .trim();
      return { office, school };
    }
  }

  // 매치 없음 — 전체를 학교명으로 추정 (운영진이 수동 분리 권장)
  return { office: "", school: trimmed };
}

const SCHOOL_LEVEL_OPTIONS: { key: SchoolLevel | ""; label: string }[] = [
  { key: "", label: "선택 안 함" },
  { key: "kindergarten", label: "유아교육" },
  { key: "elementary", label: "초등학교" },
  { key: "middle", label: "중학교" },
  { key: "high", label: "고등학교" },
];

function MigratePageContent() {
  const qc = useQueryClient();
  const { data: usersRes, isLoading } = useQuery({
    queryKey: ["console-migrate-teachers"],
    queryFn: () => profilesApi.list({ limit: 1000 }),
    staleTime: 60_000,
  });

  const allUsers = (usersRes?.data ?? []) as User[];

  // 마이그레이션 대상 — 학교 교사 + affiliation 입력 + affiliationOffice 비어있음
  const targets: TeacherRow[] = useMemo(() => {
    return allUsers
      .filter(
        (u) =>
          u.occupation === "teacher" &&
          !!(u.affiliation ?? "").trim() &&
          !(u.affiliationOffice ?? "").trim(),
      )
      .map((u) => ({
        user: u,
        suggested: suggestSplit(u.affiliation ?? ""),
      }));
  }, [allUsers]);

  // 이미 마이그레이션된 (affiliationOffice 있는) 교사 — 참고용
  const completed = useMemo(
    () =>
      allUsers.filter(
        (u) => u.occupation === "teacher" && !!(u.affiliationOffice ?? "").trim(),
      ),
    [allUsers],
  );

  // 각 row 별 입력 상태 (id → { office, school, schoolLevel })
  const [edits, setEdits] = useState<
    Record<string, { office: string; school: string; schoolLevel: SchoolLevel | "" }>
  >({});

  function getEdit(row: TeacherRow) {
    return (
      edits[row.user.id] ?? {
        office: row.suggested.office,
        school: row.suggested.school,
        schoolLevel: row.user.schoolLevel ?? "",
      }
    );
  }

  function patchEdit(
    id: string,
    next: Partial<{ office: string; school: string; schoolLevel: SchoolLevel | "" }>,
  ) {
    setEdits((prev) => {
      const current = prev[id] ?? {
        office: "",
        school: "",
        schoolLevel: "",
      };
      const target = targets.find((t) => t.user.id === id);
      const seed = target
        ? { office: target.suggested.office, school: target.suggested.school, schoolLevel: target.user.schoolLevel ?? "" }
        : current;
      return { ...prev, [id]: { ...seed, ...current, ...next } };
    });
  }

  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(row: TeacherRow) {
    const e = getEdit(row);
    if (!e.school.trim()) {
      toast.error("학교명은 비워둘 수 없습니다.");
      return;
    }
    setSavingId(row.user.id);
    try {
      await profilesApi.update(row.user.id, {
        affiliation: e.school.trim(),
        affiliationOffice: e.office.trim() || undefined,
        schoolLevel: e.schoolLevel || undefined,
      });
      toast.success(`${row.user.name} 회원 정보 저장 완료`);
      await qc.invalidateQueries({ queryKey: ["console-migrate-teachers"] });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.user.id];
        return next;
      });
    } catch (err) {
      toast.error(`저장 실패: ${(err as Error).message}`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <ConsolePageHeader
        icon={GraduationCap}
        title="학교 교사 affiliation 분리"
        description="Phase 2 도입으로 학교 교사의 affiliation 이 '교육청 + 학교 통합' → '학교명만'으로 의미가 변경됨. 기존 통합 입력값을 운영진이 한 명씩 분리 저장합니다."
      />

      {isLoading ? (
        <SkeletonWidget rows={3} />
      ) : targets.length === 0 ? (
        <EmptyState
          icon={Check}
          title="마이그레이션할 회원이 없습니다"
          description={
            completed.length > 0
              ? `이미 ${completed.length}명의 학교 교사가 마이그레이션 완료된 상태입니다.`
              : "학교 교사로 affiliation 이 입력된 회원이 아직 없습니다."
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            대상 {targets.length}명 · 자동 추정 결과를 검토 후 저장하세요. 키워드 매칭에 실패한 행은 교육청을 직접 선택해야 합니다.
          </p>
          {targets.map((row) => {
            const e = getEdit(row);
            const autoMatched = row.suggested.office !== "";
            return (
              <div
                key={row.user.id}
                className="rounded-2xl border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {row.user.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {row.user.generation}기 · {row.user.studentId ?? "-"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      현재 affiliation:{" "}
                      <span className="font-mono text-foreground">
                        &ldquo;{row.user.affiliation}&rdquo;
                      </span>
                    </p>
                  </div>
                  {autoMatched && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      <Sparkles size={11} /> 자동 추정 매치
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">소속 교육청</label>
                    <OfficeOfEducationField
                      value={e.office}
                      onChange={(next) => patchEdit(row.user.id, { office: next })}
                      compact
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">소속 학교</label>
                    <Input
                      value={e.school}
                      onChange={(ev) => patchEdit(row.user.id, { school: ev.target.value })}
                      placeholder="예: ○○초등학교"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">학교급</label>
                    <select
                      value={e.schoolLevel}
                      onChange={(ev) =>
                        patchEdit(row.user.id, {
                          schoolLevel: ev.target.value as SchoolLevel | "",
                        })
                      }
                      className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {SCHOOL_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => save(row)}
                    disabled={savingId === row.user.id}
                  >
                    {savingId === row.user.id ? "저장 중..." : (
                      <>
                        저장 <ArrowRight size={12} className="ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-8 rounded-2xl border bg-muted/20 p-5">
          <p className="text-xs text-muted-foreground">
            마이그레이션 완료 {completed.length}명: {completed.map((u) => u.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function MigrateTeacherAffiliationPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <MigratePageContent />
    </AuthGuard>
  );
}
