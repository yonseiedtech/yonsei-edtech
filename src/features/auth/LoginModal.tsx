"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoginForm from "./LoginForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 가입 페이지로 이동할 때 returnUrl로 사용할 경로 (예: 현재 게시글) */
  returnUrl?: string;
  /** 로그인 성공 시 추가로 실행할 콜백 (모달 닫기는 자동 처리) */
  onLoggedIn?: () => void;
  title?: string;
  description?: string;
}

export default function LoginModal({
  open,
  onOpenChange,
  returnUrl,
  onLoggedIn,
  title = "로그인이 필요합니다",
  description = "이 페이지를 떠나지 않고 로그인할 수 있습니다.",
}: Props) {
  const signupHref = returnUrl
    ? `/signup?next=${encodeURIComponent(returnUrl)}`
    : "/signup";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-3">
          <LoginForm
            signupHref={signupHref}
            onSuccess={() => {
              onOpenChange(false);
              onLoggedIn?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
