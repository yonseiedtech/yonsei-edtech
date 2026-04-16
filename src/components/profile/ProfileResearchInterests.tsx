interface Props {
  interests?: string[];
  field?: string;
}

export default function ProfileResearchInterests({ interests, field }: Props) {
  const tags = (interests ?? []).filter((t) => t.trim().length > 0);
  if (tags.length === 0 && !field) return null;
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">관심 연구 키워드</h2>
      <div className="flex flex-wrap gap-1.5">
        {field && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {field}
          </span>
        )}
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
