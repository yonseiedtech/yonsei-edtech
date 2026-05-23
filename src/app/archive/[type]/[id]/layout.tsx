import type { Metadata } from "next";
import { archiveConceptsApi, archiveVariablesApi, archiveMeasurementsApi } from "@/lib/bkend";
import { ArchiveItemJsonLd, BreadcrumbListJsonLd } from "@/components/seo/JsonLd";

type ArchiveType = "concept" | "variable" | "measurement";

const TYPE_LABELS: Record<ArchiveType, string> = {
  concept: "핵심 개념",
  variable: "연구 변인",
  measurement: "측정 도구",
};

function isArchiveType(t: string): t is ArchiveType {
  return t === "concept" || t === "variable" || t === "measurement";
}

interface Props {
  params: Promise<{ type: string; id: string }>;
  children: React.ReactNode;
}

async function fetchItem(type: ArchiveType, id: string) {
  if (type === "concept") return archiveConceptsApi.get(id);
  if (type === "variable") return archiveVariablesApi.get(id);
  return archiveMeasurementsApi.get(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, id } = await params;
  if (!isArchiveType(type)) return {};

  try {
    const item = (await fetchItem(type, id)) as unknown as {
      name?: string;
      description?: string;
      keywords?: string[];
    };
    const name = item.name ?? `교육공학 ${TYPE_LABELS[type]}`;
    const desc = (item.description ?? "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 140) || `연세교육공학회 교육공학 아카이브 — ${name}`;
    return {
      title: `${name} · 연세교육공학회 아카이브`,
      description: desc,
      openGraph: {
        title: name,
        description: desc,
        type: "article",
      },
    };
  } catch {
    return {
      title: `교육공학 아카이브 · 연세교육공학회`,
      description: "연세교육공학회 교육공학 아카이브",
    };
  }
}

export default async function ArchiveItemLayout({ params, children }: Props) {
  const { type, id } = await params;

  if (!isArchiveType(type)) return <>{children}</>;

  let itemLd: {
    id: string;
    type: ArchiveType;
    name: string;
    description?: string;
    keywords?: string[];
  } | null = null;

  try {
    const data = (await fetchItem(type, id)) as unknown as {
      name?: string;
      description?: string;
      keywords?: string[];
    };
    if (data?.name) {
      itemLd = {
        id,
        type,
        name: data.name,
        description: data.description,
        keywords: data.keywords,
      };
    }
  } catch {
    // Firestore unavailable — skip JSON-LD
  }

  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: "홈", href: "/" },
          { name: "아카이브", href: "/archive" },
          { name: TYPE_LABELS[type], href: `/archive/${type}` },
        ]}
      />
      {itemLd && <ArchiveItemJsonLd item={itemLd} />}
      {children}
    </>
  );
}
