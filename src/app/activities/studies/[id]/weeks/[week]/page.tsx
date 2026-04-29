import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; week: string }>;
}) {
  const { id } = await params;
  redirect(`/activities/studies/${id}?tab=progress`);
}
