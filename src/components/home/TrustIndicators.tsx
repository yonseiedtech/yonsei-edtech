"use client";

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Mic, Newspaper, GraduationCap, Users } from "lucide-react";

interface Stats {
  seminars: number;
  newsletters: number;
  theses: number;
  advisors: number;
}

async function fetchYonseiStats(): Promise<Stats> {
  const seminarsP = getCountFromServer(collection(db, "seminars"));
  // 발행된 학회보만 카운트. rules 가 문서 조건(resource.data.status)이라 count 집계는
  // 항상 permission-denied — 쿼리 제약이 조건과 일치하는 getDocs 로 세고, 실패 시 0.
  const newslettersP = getDocs(
    query(collection(db, "newsletters"), where("status", "==", "published")),
  )
    .then((snap) => ({ data: () => ({ count: snap.size }) }))
    .catch(() => ({ data: () => ({ count: 0 }) }));
  const thesesP = getCountFromServer(collection(db, "alumni_theses")).catch(
    () => getCountFromServer(collection(db, "alumniTheses")),
  );
  // P1-1b: users list 가 staff 전용으로 축소 — 공개 랜딩 카운트는 서버 집계 API 사용
  const advisorsP = fetch("/api/stats/advisors")
    .then((r) => (r.ok ? (r.json() as Promise<{ count: number }>) : { count: 0 }))
    .then((j) => ({ data: () => ({ count: j.count }) }));

  const [seminars, newsletters, theses, advisors] = await Promise.all([
    seminarsP.catch(() => null),
    newslettersP.catch(() => null),
    thesesP.catch(() => null),
    advisorsP.catch(() => null),
  ]);

  return {
    seminars: seminars?.data().count ?? 0,
    newsletters: newsletters?.data().count ?? 0,
    theses: theses?.data().count ?? 0,
    advisors: advisors?.data().count ?? 0,
  };
}

function useYonseiStats() {
  return useQuery({
    queryKey: ["yonsei", "trust-stats"],
    queryFn: fetchYonseiStats,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
    retry: false,
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="group relative bg-card p-4 transition-colors hover:bg-muted/30 sm:p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground/80">
        <Icon size={13} aria-hidden className="transition-transform group-hover:scale-110" />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
        {value > 0 ? `${value.toLocaleString()}${suffix ?? ""}` : "—"}
      </p>
    </div>
  );
}

export default function TrustIndicators() {
  const { data, isLoading } = useYonseiStats();

  return (
    <section className="border-b py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            학회 활동 누적 지표
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4"
          aria-busy={isLoading}
          aria-label="학회 누적 활동 지표"
        >
          <StatCard
            icon={Mic}
            label="누적 세미나"
            value={data?.seminars ?? 0}
            suffix="회"
          />
          <StatCard
            icon={Newspaper}
            label="발행 학회보"
            value={data?.newsletters ?? 0}
            suffix="호"
          />
          <StatCard
            icon={GraduationCap}
            label="졸업생 학위논문"
            value={data?.theses ?? 0}
            suffix="편"
          />
          <StatCard
            icon={Users}
            label="지도 교수진"
            value={data?.advisors ?? 0}
            suffix="명"
          />
        </div>
      </div>
    </section>
  );
}
