export function KV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1">{value ? String(value) : "—"}</span>
    </div>
  );
}
