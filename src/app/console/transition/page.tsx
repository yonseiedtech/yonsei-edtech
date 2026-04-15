import { redirect } from "next/navigation";

export default function ConsoleTransitionRedirect() {
  redirect("/console/handover?tab=transition");
}
