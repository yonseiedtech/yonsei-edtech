/**
 * 교육공학 아카이브 리스트 — 서버 컴포넌트 래퍼 (v5-H1)
 *
 * 방문마다 컬렉션 전량을 클라이언트 fetch 하던 구조를 서버 프리패치 + ISR 로 전환한다.
 * - generateStaticParams(concept·variable·measurement) + revalidate 300(5분 ISR)
 * - firebase-admin 으로 이름순 초기 60건 + 전체 count() 를 서버에서 조회해
 *   클라이언트 리스트 컴포넌트에 initialItems/initialTotal 로 전달(첫 화면 = 60건).
 * - 이후 "더 보기"(startAfter 커서)·검색 시 전량 승격은 클라이언트가 담당.
 *
 * admin↔client 데이터 형태 통일: Firestore Timestamp 는 ISO 문자열로 직렬화
 * (클라이언트 SDK serializeDoc 과 동일 규약 — createdAt/updatedAt 등).
 */

import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type {
  ArchiveConcept,
  ArchiveVariable,
  ArchiveMeasurementTool,
  ArchiveItemType,
} from "@/types";
import ArchiveTypeListClient from "./ArchiveTypeListClient";

export const runtime = "nodejs";
export const revalidate = 300;

type ArchiveItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

const INITIAL_PAGE_SIZE = 60;

const TYPE_TO_COLLECTION: Record<ArchiveItemType, string> = {
  concept: "archive_concepts",
  variable: "archive_variables",
  measurement: "archive_measurements",
};

export function generateStaticParams(): { type: ArchiveItemType }[] {
  return [{ type: "concept" }, { type: "variable" }, { type: "measurement" }];
}

/** admin Firestore 문서 → 클라이언트 직렬화 형태(Timestamp → ISO 문자열). */
function serializeAdminDoc(id: string, data: Record<string, unknown>): ArchiveItem {
  const result: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    result[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
  }
  return result as unknown as ArchiveItem;
}

interface Props {
  params: Promise<{ type: string }>;
}

export default async function ArchiveTypeListPage({ params }: Props) {
  const { type } = await params;
  if (type !== "concept" && type !== "variable" && type !== "measurement") {
    notFound();
  }
  const collectionName = TYPE_TO_COLLECTION[type];

  // 서버 프리패치 — 실패(빌드 시 자격 증명 부재·조회 오류 등) 시 빈 결과로 폴백해
  // 빌드/렌더를 막지 않고, 클라이언트가 첫 페이지를 직접 로드하도록 위임한다(회귀 없음).
  let initialItems: ArchiveItem[] = [];
  let initialTotal = 0;
  let prefetched = false;
  try {
    const db = getAdminDb();
    const col = db.collection(collectionName);
    const [snap, countSnap] = await Promise.all([
      col.orderBy("name").limit(INITIAL_PAGE_SIZE).get(),
      col.count().get(),
    ]);
    initialItems = snap.docs.map((d) => serializeAdminDoc(d.id, d.data()));
    initialTotal = countSnap.data().count;
    prefetched = true;
  } catch (err) {
    console.error("[archive-list] server prefetch failed", err);
  }

  return (
    <ArchiveTypeListClient
      type={type}
      initialItems={initialItems}
      initialTotal={initialTotal}
      prefetched={prefetched}
    />
  );
}
