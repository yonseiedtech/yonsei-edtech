"use client";

import { useCallback, useState } from "react";
import { UploadCloud, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadToStorage, type UploadedFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  folder: string;
  accept?: string;
  multiple?: boolean;
  value?: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  label?: string;
  maxSizeMb?: number;
  className?: string;
}

export default function FileUploader({ folder, accept, multiple = false, value = [], onChange, label, className }: Props) {
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFiles = useCallback(async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    try {
      const uploaded: UploadedFile[] = [];
      for (const f of files) {
        setProgress(0);
        const u = await uploadToStorage(f, folder, (pct) => setProgress(pct));
        uploaded.push(u);
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded);
      toast.success(`${uploaded.length}개 파일이 업로드되었습니다.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setProgress(null);
    }
  }, [folder, multiple, onChange, value]);

  const isBusy = progress !== null;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          drag ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/20",
          isBusy && "pointer-events-none opacity-70",
        )}
      >
        {isBusy ? (
          <>
            <Loader2 size={20} className="animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">업로드 중… {progress}%</p>
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress ?? 0}%` }} />
            </div>
          </>
        ) : (
          <>
            <UploadCloud size={24} className="text-muted-foreground" />
            <p className="text-sm font-medium">클릭하거나 드래그하여 업로드</p>
            <p className="text-[11px] text-muted-foreground">
              {accept?.includes("image") ? "이미지 최대 10MB" : "파일 최대 20MB"}{multiple ? " · 여러 개 가능" : ""}
            </p>
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              accept={accept}
              multiple={multiple}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </>
        )}
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((f, i) => (
            <li key={`${f.url}-${i}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
              {f.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt={f.name} className="h-10 w-10 flex-none rounded object-cover" />
              ) : (
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded bg-muted">
                  {f.type.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:text-primary">{f.name}</a>
                <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
