"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { certificatesApi } from "@/lib/bkend";
import { enrichCertificates } from "@/lib/denorm-sync";
import type { Certificate, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  owner: User;
}

export default function ProfileCertificates({ owner }: Props) {
  const { data: allCerts = [], isLoading } = useQuery({
    queryKey: ["profile-certificates", owner.id],
    queryFn: async () => {
      const res = await certificatesApi.list();
      const certs = res.data as unknown as Certificate[];
      return enrichCertificates(certs);
    },
  });

  const myCerts = useMemo(
    () =>
      allCerts
        .filter(
          (c) =>
            c.recipientUserId === owner.id ||
            c.recipientEmail === owner.email ||
            (c.recipientStudentId && c.recipientStudentId === owner.studentId),
        )
        .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? "")),
    [allCerts, owner.id, owner.email, owner.studentId],
  );

  if (isLoading) return null;
  if (myCerts.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">수료증</h2>
        <span className="text-[11px] text-muted-foreground">총 {myCerts.length}건</span>
      </div>
      <ul className="space-y-2">
        {myCerts.map((cert) => (
          <li key={cert.id} className="flex items-start gap-3 rounded-xl border px-4 py-3">
            <Award size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{cert.seminarTitle}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {cert.certificateNo && (
                  <Badge variant="outline" className="text-[10px]">
                    No. {cert.certificateNo}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={
                    cert.type === "completion"
                      ? "bg-green-50 text-[10px] text-green-700"
                      : "bg-blue-50 text-[10px] text-blue-700"
                  }
                >
                  {cert.type === "completion" ? "수료" : "감사장"}
                </Badge>
                {cert.issuedAt && <span>{formatDate(cert.issuedAt)}</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
