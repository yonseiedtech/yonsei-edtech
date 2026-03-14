"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-primary">오류</h1>
      <p className="mt-4 text-xl font-medium text-foreground">
        문제가 발생했습니다
      </p>
      <p className="mt-2 text-muted-foreground">
        잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        다시 시도
      </button>
    </div>
  );
}
