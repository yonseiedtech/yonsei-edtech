"use client";

export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}
