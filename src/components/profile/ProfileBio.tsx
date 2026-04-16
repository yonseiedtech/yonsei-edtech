interface Props {
  bio?: string;
}

export default function ProfileBio({ bio }: Props) {
  if (!bio?.trim()) return null;
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">학회원 소개</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{bio}</p>
    </section>
  );
}
