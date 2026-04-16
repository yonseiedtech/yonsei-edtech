import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-4",
  lg: "h-12 w-12 border-4",
} as const;

export default function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex justify-center py-12", className)} role="status" aria-label="로딩 중">
      <div className={cn("animate-spin rounded-full border-primary border-t-transparent", SIZES[size])} />
    </div>
  );
}
