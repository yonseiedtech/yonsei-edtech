import { redirect } from "next/navigation";

export default function ConsoleHandoverOverviewRedirect() {
  redirect("/console/handover?tab=overview");
}
