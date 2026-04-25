import type { LucideIcon } from "lucide-react";
import PageHeader from "@/components/ui/page-header";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function ConsolePageHeader(props: Props) {
  return <PageHeader {...props} variant="console" />;
}
