import { GraduationCap } from "lucide-react";
import type { User } from "@/types";
import { withGraduateDefaults } from "@/lib/profile-visibility";

interface Props {
  user: User;
}

function formatEnrollment(year?: number, half?: number): string {
  if (!year) return "";
  const label = half === 2 ? "후반기" : "전반기";
  return `${year}년 ${label}`;
}

export default function ProfileGraduateInfo({ user }: Props) {
  const u = withGraduateDefaults(user);
  const rows: { label: string; value: string }[] = [
    { label: "대학", value: u.university ?? "" },
    { label: "대학원", value: u.graduateSchool ?? "" },
    { label: "전공", value: u.graduateMajor ?? "" },
  ];
  const enroll = formatEnrollment(u.enrollmentYear, u.enrollmentHalf);
  if (enroll) rows.push({ label: "입학학기", value: enroll });

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <GraduationCap size={13} />
        대학원 정보
      </h2>
      <ul className="divide-y divide-muted/40 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline gap-3 py-2">
            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{r.label}</span>
            <span className="flex-1 text-slate-700">{r.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
