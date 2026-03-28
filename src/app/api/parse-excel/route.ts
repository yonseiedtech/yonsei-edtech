import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/api-auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "member");
  if (authResult instanceof Response) return authResult;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "파일 크기는 10MB 이하여야 합니다." }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

    if (raw.length === 0) {
      return Response.json({ error: "빈 파일입니다." }, { status: 400 });
    }

    // 헤더 정규화
    const headers = (raw[0] as string[]).map((h) =>
      String(h ?? "")
        .replace(/^\d+\.\s*/, "")
        .replace(/\([^)]*\)\s*/g, "")
        .trim(),
    );

    // 데이터 행
    const rows: Record<string, string>[] = [];
    for (let r = 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row || (row as unknown[]).every((c) => !c)) continue;
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h && h !== "타임스탬프") {
          const val = (row as unknown[])[i];
          obj[h] = val != null ? String(val).trim() : "";
        }
      });
      // 최소 하나의 값이 있어야 유효
      if (Object.values(obj).some((v) => v)) rows.push(obj);
    }

    return Response.json({ headers: headers.filter((h) => h && h !== "타임스탬프"), rows, total: rows.length });
  } catch {
    return Response.json({ error: "파일 파싱에 실패했습니다." }, { status: 500 });
  }
}
