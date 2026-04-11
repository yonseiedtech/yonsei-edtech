"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dataApi, profilesApi, seminarsApi } from "@/lib/bkend";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BarChart3, Users, FileText, CalendarDays, TrendingUp,
  Star, Award,
} from "lucide-react";
import type { User, Post, Seminar, SeminarAttendee, SeminarReview, Certificate } from "@/types";

// ── helpers ──

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [, m] = key.split("-");
  return `${Number(m)}월`;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16",
];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  // ── data queries (parallel) ──
  const { data: membersRes } = useQuery({
    queryKey: ["analytics", "members"],
    queryFn: () => profilesApi.list({ limit: 1000 }),
  });
  const { data: seminarsRes } = useQuery({
    queryKey: ["analytics", "seminars"],
    queryFn: () => seminarsApi.list({ limit: 1000 }),
  });
  const { data: postsRes } = useQuery({
    queryKey: ["analytics", "posts"],
    queryFn: () => dataApi.list<Post>("posts", { limit: 1000 }),
  });
  const { data: attendeesRes } = useQuery({
    queryKey: ["analytics", "attendees"],
    queryFn: () => dataApi.list<SeminarAttendee>("seminar_attendees", { limit: 5000 }),
  });
  const { data: reviewsRes } = useQuery({
    queryKey: ["analytics", "reviews"],
    queryFn: () => dataApi.list<SeminarReview>("seminar_reviews", { limit: 2000 }),
  });
  const { data: certsRes } = useQuery({
    queryKey: ["analytics", "certificates"],
    queryFn: () => dataApi.list<Certificate>("certificates", { limit: 2000 }),
  });

  const members = membersRes?.data ?? [];
  const seminars = seminarsRes?.data ?? [];
  const posts = postsRes?.data ?? [];
  const attendees = attendeesRes?.data ?? [];
  const reviews = reviewsRes?.data ?? [];
  const certs = certsRes?.data ?? [];

  // ── computed analytics ──
  const analytics = useMemo(() => {
    const approved = members.filter((m) => m.approved);
    const now = new Date();
    const thisYear = now.getFullYear();

    // -- Member role distribution --
    const roleCounts = new Map<string, number>();
    const ROLE_KR: Record<string, string> = {
      admin: "관리자", president: "회장", staff: "운영진",
      advisor: "자문위원", alumni: "졸업생", member: "회원",
    };
    for (const m of approved) {
      const label = ROLE_KR[m.role] ?? m.role;
      roleCounts.set(label, (roleCounts.get(label) ?? 0) + 1);
    }
    const roleDistribution = [...roleCounts.entries()].map(([name, value]) => ({ name, value }));

    // -- Monthly new members (last 12 months) --
    const monthlyMembers = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, now.getMonth() - i, 1);
      monthlyMembers.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const m of members) {
      if (!m.createdAt) continue;
      const mk = monthKey(m.createdAt);
      if (monthlyMembers.has(mk)) monthlyMembers.set(mk, (monthlyMembers.get(mk) ?? 0) + 1);
    }
    const memberGrowth = [...monthlyMembers.entries()].map(([key, count]) => ({
      month: monthLabel(key), count,
    }));

    // -- Seminar monthly count + attendance --
    const monthlySeminars = new Map<string, { count: number; totalAttendees: number; checkedIn: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlySeminars.set(k, { count: 0, totalAttendees: 0, checkedIn: 0 });
    }

    const seminarMap = new Map(seminars.map((s) => [s.id, s]));
    // build attendee stats per seminar
    const seminarAttendeeStats = new Map<string, { total: number; checkedIn: number }>();
    for (const a of attendees) {
      const stat = seminarAttendeeStats.get(a.seminarId) ?? { total: 0, checkedIn: 0 };
      stat.total++;
      if (a.checkedIn) stat.checkedIn++;
      seminarAttendeeStats.set(a.seminarId, stat);
    }

    for (const s of seminars) {
      if (!s.date) continue;
      const mk = monthKey(s.date);
      const entry = monthlySeminars.get(mk);
      if (entry) {
        entry.count++;
        const stat = seminarAttendeeStats.get(s.id);
        if (stat) {
          entry.totalAttendees += stat.total;
          entry.checkedIn += stat.checkedIn;
        }
      }
    }
    const seminarMonthly = [...monthlySeminars.entries()].map(([key, v]) => ({
      month: monthLabel(key),
      seminars: v.count,
      attendees: v.totalAttendees,
      checkedIn: v.checkedIn,
    }));

    // -- Review ratings distribution --
    const ratingCounts = [0, 0, 0, 0, 0]; // index 0 = 1star, index 4 = 5star
    let ratingSum = 0;
    let ratingCount = 0;
    for (const r of reviews) {
      if (r.rating && r.rating >= 1 && r.rating <= 5) {
        ratingCounts[r.rating - 1]++;
        ratingSum += r.rating;
        ratingCount++;
      }
    }
    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "-";
    const ratingDistribution = ratingCounts.map((count, i) => ({
      rating: `${i + 1}점`, count,
    }));

    // -- Posts by category --
    const catCounts = new Map<string, number>();
    const CAT_KR: Record<string, string> = {
      notice: "공지사항", seminar: "세미나 자료", free: "자유게시판",
      promotion: "홍보", press: "보도자료",
    };
    for (const p of posts) {
      const label = CAT_KR[p.category] ?? p.category;
      catCounts.set(label, (catCounts.get(label) ?? 0) + 1);
    }
    const postsByCategory = [...catCounts.entries()].map(([name, value]) => ({ name, value }));

    // -- Top seminars by attendance --
    const topSeminars = seminars
      .map((s) => {
        const stat = seminarAttendeeStats.get(s.id);
        return { title: s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title, attendees: stat?.total ?? 0, checkedIn: stat?.checkedIn ?? 0 };
      })
      .sort((a, b) => b.attendees - a.attendees)
      .slice(0, 5);

    // Totals
    const completedSeminars = seminars.filter((s) => s.status === "completed").length;
    const totalCheckedIn = attendees.filter((a) => a.checkedIn).length;
    const attendanceRate = attendees.length > 0 ? Math.round((totalCheckedIn / attendees.length) * 100) : 0;

    return {
      totalMembers: approved.length,
      totalSeminars: seminars.length,
      completedSeminars,
      totalPosts: posts.length,
      totalCerts: certs.length,
      totalReviews: reviews.length,
      avgRating,
      attendanceRate,
      roleDistribution,
      memberGrowth,
      seminarMonthly,
      ratingDistribution,
      postsByCategory,
      topSeminars,
    };
  }, [members, seminars, posts, attendees, reviews, certs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" />
        <h2 className="text-lg font-bold">분석 대시보드</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="승인 회원" value={analytics.totalMembers} color="bg-blue-50 text-blue-600" />
        <StatCard icon={CalendarDays} label="세미나" value={analytics.totalSeminars} sub={`완료 ${analytics.completedSeminars}건`} color="bg-violet-50 text-violet-600" />
        <StatCard icon={TrendingUp} label="출석률" value={`${analytics.attendanceRate}%`} color="bg-green-50 text-green-600" />
        <StatCard icon={Star} label="평균 만족도" value={analytics.avgRating} sub={`후기 ${analytics.totalReviews}건`} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={FileText} label="게시글" value={analytics.totalPosts} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Award} label="수료증/감사장" value={analytics.totalCerts} color="bg-pink-50 text-pink-600" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="월별 신규 회원">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="신규 회원" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="회원 역할 분포">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics.roleDistribution}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={90}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {analytics.roleDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="월별 세미나 현황">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.seminarMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="seminars" name="세미나 수" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="attendees" name="참가자" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="checkedIn" name="출석" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="게시글 카테고리 분포">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics.postsByCategory}
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={90}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {analytics.postsByCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="세미나 만족도 분포">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.ratingDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="응답 수" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="참가자 많은 세미나 Top 5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.topSeminars} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="attendees" name="참가자" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="checkedIn" name="출석" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
