import { redirect } from "next/navigation";

// 연락망은 /directory 가 자체 AuthGuard·헤더·컨테이너를 갖춘 완결 페이지 —
// 콘솔 re-export 시 이중 컨테이너·헤더 변형 불일치가 생겨 redirect 로 통일
export default function ConsoleDirectoryRedirect() {
  redirect("/directory");
}
