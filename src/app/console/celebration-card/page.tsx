import { Gift } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import CelebrationCardEditor from "@/features/celebration-card/CelebrationCardEditor";

export const metadata = {
  title: "축하카드 | 운영콘솔",
};

export default function CelebrationCardPage() {
  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="축하카드 제작"
        description="회원을 위한 맞춤 축하카드를 제작하고 PNG로 내보냅니다. 유형 프리셋 선택 후 이름과 문구를 편집하세요."
        icon={Gift}
      />
      <CelebrationCardEditor />
    </div>
  );
}
