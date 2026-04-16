"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConsoleCertificatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/academic-admin/certificates");
  }, [router]);
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      수료증·감사장 메뉴가 학술활동 관리로 이동되었습니다. 잠시만 기다려주세요...
    </div>
  );
}
