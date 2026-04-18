import { redirect } from "next/navigation";

export default function TransitionRedirectPage() {
  redirect("/console/handover?tab=transition");
}
