interface Props {
  interests?: string[];
  field?: string;
}

function splitByComma(arr: string[]): string[] {
  return arr.flatMap((s) => s.split(/[,，]/)).map((s) => s.trim()).filter(Boolean);
}

export default function ProfileResearchInterests({ interests, field }: Props) {
  const tags = splitByComma(interests ?? []);
  if (tags.length === 0 && !field) return null;
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">관심 연구 키워드</h2>
      <div className="flex flex-wrap gap-1.5">
        {field && splitByComma([field]).map((f) => (
          <span
            key={f}
            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >
            {f}
          </span>
        ))}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-foreground"
          >
            #{tag}
          </span>
        ))}
      </div>
    </section>
  );
}
