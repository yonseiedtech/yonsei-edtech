"use client";

import { useQuery } from "@tanstack/react-query";
import { activitiesApi } from "@/lib/bkend";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "완료",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700",
  ongoing: "bg-amber-50 text-amber-700",
  completed: "bg-muted text-muted-foreground",
};

interface Props {
  type: ActivityType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

export default function ActivityPage({ type, icon, title, subtitle, color }: Props) {
  const { data: activities = [] } = useQuery({
    queryKey: ["activities", type],
    queryFn: async () => {
      const res = await activitiesApi.list(type);
      return res.data;
    },
  });

  const ongoing = activities.filter((a) => a.status === "ongoing" || a.status === "upcoming");
  const completed = activities.filter((a) => a.status === "completed");

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", color)}>
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* 진행 중 / 예정 */}
        {ongoing.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold">진행 중 & 예정</h2>
            <div className="mt-4 space-y-3">
              {ongoing.map((a) => (
                <div key={a.id} className="rounded-xl border bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[a.status])}>
                      {STATUS_LABELS[a.status]}
                    </Badge>
                    <h3 className="text-lg font-semibold">{a.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar size={12} />{a.date}{a.endDate ? ` ~ ${a.endDate}` : ""}</span>
                    {a.leader && <span className="flex items-center gap-1"><User size={12} />{a.leader}</span>}
                    {a.location && <span className="flex items-center gap-1"><MapPin size={12} />{a.location}</span>}
                    {a.members && a.members.length > 0 && <span className="flex items-center gap-1"><Users size={12} />{a.members.length}명</span>}
                  </div>
                  {a.tags && a.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 완료된 활동 */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">활동 내역</h2>
          {completed.length === 0 && ongoing.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">등록된 활동이 없습니다.</p>
          ) : completed.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">완료된 활동이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {completed.map((a) => (
                <div key={a.id} className="flex gap-4 rounded-xl border bg-white p-4">
                  <div className="shrink-0 text-sm font-bold text-primary">{a.date}</div>
                  <div className="min-w-0">
                    <h3 className="font-medium">{a.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                    {a.tags && a.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
