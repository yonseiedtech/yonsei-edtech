"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import AuthGuard from "@/features/auth/AuthGuard";
import ProfileEditor from "@/features/auth/ProfileEditor";
import PasswordChangeForm from "@/features/auth/PasswordChangeForm";
import MyPostList from "@/features/auth/MyPostList";
import { usePosts } from "@/features/board/useBoard";
import { useSeminars, useToggleAttendance } from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi, attendeesApi } from "@/lib/bkend";
import AttendanceCertificate from "@/features/seminar/AttendanceCertificate";
import type { Certificate } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, LogOut, Calendar, X, FileText, KeyRound, UserCog, Award } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS } from "@/types";
import { formatDate, formatGeneration } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { key: "profile", label: "프로필", icon: UserCog },
  { key: "password", label: "비밀번호", icon: KeyRound },
  { key: "seminars", label: "세미나", icon: Calendar },
  { key: "certificates", label: "수료증", icon: Award },
  { key: "posts", label: "내 글", icon: FileText },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function MypageContent() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { posts } = usePosts();
  const { seminars } = useSeminars();
  const { toggleAttendance } = useToggleAttendance();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const myPosts = posts.filter((p) => p.authorId === user?.id);
  const mySeminars = seminars.filter((s) => user && s.attendeeIds.includes(user.id));

  const { data: allCertificates = [] } = useQuery({
    queryKey: ["certificates", "my"],
    queryFn: async () => {
      const res = await certificatesApi.list();
      return res.data as unknown as Certificate[];
    },
    enabled: !!user,
  });
  const myCertificates = allCertificates.filter((c) => c.recipientName === user?.name);

  // 내 출석 기록 (참석 확인서용)
  const { data: myAttendeeRecords = [] } = useQuery({
    queryKey: ["my-attendees", user?.id],
    queryFn: async () => {
      const results = [];
      for (const s of mySeminars) {
        const res = await attendeesApi.check(s.id, user!.id);
        const attendee = (res.data as unknown as { checkedIn: boolean; checkedInAt: string | null }[])?.[0];
        if (attendee?.checkedIn) {
          results.push({ seminarId: s.id, checkedInAt: attendee.checkedInAt });
        }
      }
      return results;
    },
    enabled: !!user && mySeminars.length > 0,
  });
  const checkedInMap = new Map(myAttendeeRecords.map((r) => [r.seminarId, r.checkedInAt]));

  function handleCancelAttendance(seminarId: string) {
    if (!user) return;
    toggleAttendance(seminarId, user.id);
    toast.success("참석이 취소되었습니다.");
  }

  if (!user) return null;

  return (
    <div className="py-16">
      <div className="mx-auto max-w-2xl px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">마이페이지</h1>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={16} className="mr-1" />
            로그아웃
          </Button>
        </div>

        {/* 프로필 카드 */}
        <div className="mt-8 rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{formatGeneration(user.generation, user.enrollmentYear, user.enrollmentHalf)}</Badge>
                <Badge>{ROLE_LABELS[user.role]}</Badge>
                {user.studentId && (
                  <span className="text-xs text-muted-foreground">{user.studentId}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex flex-none items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === "profile" && (
            <div className="rounded-2xl border bg-white p-6">
              <ProfileEditor user={user} />
            </div>
          )}

          {activeTab === "password" && (
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-lg font-bold">비밀번호 변경</h3>
              <div className="mt-4">
                <PasswordChangeForm />
              </div>
            </div>
          )}

          {activeTab === "seminars" && (
            <div className="space-y-3">
              {mySeminars.length === 0 ? (
                <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                  신청한 세미나가 없습니다.{" "}
                  <Link href="/seminars" className="text-primary hover:underline">
                    세미나 보러가기
                  </Link>
                </p>
              ) : (
                mySeminars.map((s) => (
                  <div key={s.id} className="rounded-xl border bg-white px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/seminars/${s.id}`} className="font-medium hover:text-primary hover:underline">
                          {s.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatDate(s.date)} {s.time} · {s.location}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleCancelAttendance(s.id)}>
                        <X size={14} className="mr-1" />취소
                      </Button>
                    </div>
                    {checkedInMap.has(s.id) && (
                      <div className="mt-2 flex items-center gap-2 border-t pt-2">
                        <Badge variant="secondary" className="bg-green-50 text-green-700">출석 완료</Badge>
                        <AttendanceCertificate
                          seminarTitle={s.title}
                          seminarDate={s.date}
                          seminarLocation={s.location}
                          attendeeName={user?.name ?? ""}
                          generation={user?.generation}
                          checkedInAt={checkedInMap.get(s.id)}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "certificates" && (
            <div className="space-y-3">
              {myCertificates.length === 0 ? (
                <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">
                  발급된 수료증이 없습니다.
                </p>
              ) : (
                myCertificates.map((c) => (
                  <div key={c.id} className="rounded-xl border bg-white px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={c.type === "completion" ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700"}>
                            {c.type === "completion" ? "수료증" : "감사장"}
                          </Badge>
                          {c.certificateNo && (
                            <span className="text-xs text-muted-foreground">No. {c.certificateNo}</span>
                          )}
                        </div>
                        <p className="mt-1 font-medium">{c.seminarTitle}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          발급일: {new Date(c.issuedAt).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <Award size={24} className="shrink-0 text-primary/30" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "posts" && (
            <MyPostList posts={myPosts} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MypagePage() {
  return (
    <AuthGuard>
      <MypageContent />
    </AuthGuard>
  );
}
