export function FullField({ label, value }: { label: string; value?: string | null }) {
  const text = (value ?? "").trim();
  return (
    <div>
      <p className="mb-1 text-muted-foreground">{label}</p>
      {text ? (
        <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-2 leading-relaxed text-foreground">
          {text}
        </pre>
      ) : (
        <p className="text-muted-foreground">—</p>
      )}
    </div>
  );
}
