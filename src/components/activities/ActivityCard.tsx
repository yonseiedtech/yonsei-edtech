import { Calendar, type LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  category: string;
  title: string;
  desc: string;
  schedule: string;
  color: string;
}

export default function ActivityCard({ icon: Icon, category, title, desc, schedule, color }: Props) {
  return (
    <div className="rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {category}
      </span>
      <h3 className="mt-1 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar size={14} />
        {schedule}
      </div>
    </div>
  );
}
