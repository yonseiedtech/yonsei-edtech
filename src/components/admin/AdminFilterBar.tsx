import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  /** 검색 입력 */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** 좌측 필터 영역 (Select, Button 등) */
  filters?: React.ReactNode;
  /** 우측 액션 영역 (버튼 등) */
  actions?: React.ReactNode;
}

export default function AdminFilterBar({ search, filters, actions }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {search && (
        <div className="relative w-full sm:w-60">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "검색..."}
            className="h-9 pl-8 text-sm"
          />
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}
