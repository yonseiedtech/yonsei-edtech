import { cn } from "@/lib/utils";

export function ToggleFullButton({
  showFull,
  setShowFull,
}: {
  showFull: boolean;
  setShowFull: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setShowFull(!showFull)}
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md border px-3 text-[11px] font-medium transition",
        showFull
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-input bg-background text-foreground hover:bg-accent",
      )}
    >
      {showFull ? "간단히 보기" : "전체 보기"}
    </button>
  );
}
