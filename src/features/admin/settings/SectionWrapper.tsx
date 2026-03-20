"use client";

export default function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}
