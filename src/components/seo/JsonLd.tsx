export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "연세교육공학회",
    alternateName: [
      "Yonsei EdTech",
      "Yonsei Educational Technology Association",
      "연세대학교 교육대학원 교육공학전공",
      "연세대학교 교육공학전공",
      "연세대학교 교육공학 전공",
      "연세대 교육공학",
    ],
    url: "https://yonsei-edtech.vercel.app",
    description:
      "연세대학교 교육대학원 교육공학전공 학술 커뮤니티. 에듀테크, 교수설계, 학습과학 분야의 세미나, 프로젝트, 스터디 활동.",
    email: "yonsei.edtech@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "연세로 50 교육과학관",
      addressLocality: "서울시 서대문구",
      addressCountry: "KR",
    },
    parentOrganization: {
      "@type": "EducationalOrganization",
      name: "연세대학교 교육대학원 교육공학전공",
      alternateName: "Yonsei University Graduate School of Education, Educational Technology Major",
      url: "https://gse.yonsei.ac.kr",
      parentOrganization: {
        "@type": "CollegeOrUniversity",
        name: "연세대학교",
        alternateName: "Yonsei University",
        sameAs: "https://www.yonsei.ac.kr",
      },
    },
    knowsAbout: [
      "Educational Technology",
      "EdTech",
      "Instructional Design",
      "Learning Science",
      "교육공학",
      "에듀테크",
      "교수설계",
      "학습과학",
    ],
    sameAs: ["https://www.instagram.com/edtech_yonsei/"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebsiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "연세교육공학회",
    alternateName: "연세대학교 교육대학원 교육공학전공 학술 커뮤니티",
    url: "https://yonsei-edtech.vercel.app",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  href: string;
}

const SITE_ORIGIN = "https://yonsei-edtech.vercel.app";

export function BreadcrumbListJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${SITE_ORIGIN}${item.href}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface SeminarEventLdInput {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  speaker: string;
  speakerAffiliation?: string;
  posterUrl?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  maxAttendees?: number;
}

export function SeminarEventJsonLd({ seminar }: { seminar: SeminarEventLdInput }) {
  const startsAt = (() => {
    try {
      return new Date(`${seminar.date}T${seminar.time}:00+09:00`).toISOString();
    } catch {
      return seminar.date;
    }
  })();

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: seminar.title,
    description: seminar.description?.slice(0, 500),
    startDate: startsAt,
    eventAttendanceMode: seminar.isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: seminar.isOnline
      ? {
          "@type": "VirtualLocation",
          url: seminar.onlineUrl ?? `https://yonsei-edtech.vercel.app/seminars/${seminar.id}`,
        }
      : {
          "@type": "Place",
          name: seminar.location,
          address: { "@type": "PostalAddress", addressLocality: "서울", addressCountry: "KR" },
        },
    organizer: {
      "@type": "Organization",
      name: "연세교육공학회",
      url: "https://yonsei-edtech.vercel.app",
    },
    performer: {
      "@type": "Person",
      name: seminar.speaker,
      ...(seminar.speakerAffiliation ? { affiliation: seminar.speakerAffiliation } : {}),
    },
    url: `https://yonsei-edtech.vercel.app/seminars/${seminar.id}`,
    ...(seminar.posterUrl ? { image: seminar.posterUrl } : {}),
    ...(seminar.maxAttendees ? { maximumAttendeeCapacity: seminar.maxAttendees } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface PostArticleLdInput {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  imageUrls?: string[];
}

export function PostArticleJsonLd({ post }: { post: PostArticleLdInput }) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.content?.replace(/<[^>]+>/g, "").slice(0, 200),
    author: { "@type": "Person", name: post.authorName },
    publisher: {
      "@type": "Organization",
      name: "연세교육공학회",
      logo: {
        "@type": "ImageObject",
        url: "https://yonsei-edtech.vercel.app/logo-text.png",
      },
    },
    datePublished: post.createdAt,
    dateModified: post.updatedAt ?? post.createdAt,
    mainEntityOfPage: `https://yonsei-edtech.vercel.app/board/${post.id}`,
    ...(post.imageUrls?.length ? { image: post.imageUrls } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface AlumniThesisLdInput {
  id: string;
  title?: string;
  titleKo?: string;
  abstract?: string;
  authorName?: string;
  year?: number;
  degreeType?: string;
  keywords?: string[];
  advisor?: string;
}

export function AlumniThesisJsonLd({ thesis }: { thesis: AlumniThesisLdInput }) {
  const title = thesis.titleKo ?? thesis.title ?? "학위논문";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: title,
    name: title,
    ...(thesis.abstract ? { description: thesis.abstract.slice(0, 500) } : {}),
    ...(thesis.authorName
      ? { author: { "@type": "Person", name: thesis.authorName } }
      : {}),
    ...(thesis.year ? { datePublished: `${thesis.year}` } : {}),
    ...(thesis.degreeType ? { genre: `${thesis.degreeType} 학위논문` } : {}),
    ...(thesis.keywords?.length ? { keywords: thesis.keywords.join(", ") } : {}),
    ...(thesis.advisor
      ? {
          contributor: {
            "@type": "Person",
            name: thesis.advisor,
            roleName: "지도교수",
          },
        }
      : {}),
    publisher: {
      "@type": "EducationalOrganization",
      name: "연세대학교 교육대학원 교육공학전공",
      url: "https://gse.yonsei.ac.kr",
    },
    inLanguage: "ko",
    url: `https://yonsei-edtech.vercel.app/alumni/thesis/${thesis.id}`,
    isPartOf: {
      "@type": "Collection",
      name: "연세교육공학회 졸업생 학위논문 아카이브",
      url: "https://yonsei-edtech.vercel.app/alumni/thesis",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface ArchiveConceptLdInput {
  id: string;
  type: "concept" | "variable" | "measurement";
  name: string;
  description?: string;
  keywords?: string[];
  references?: string[];
}

const ARCHIVE_TYPE_LABELS: Record<ArchiveConceptLdInput["type"], string> = {
  concept: "교육공학 핵심 개념",
  variable: "연구 변인",
  measurement: "측정 도구",
};

export function ArchiveItemJsonLd({ item }: { item: ArchiveConceptLdInput }) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: item.name,
    ...(item.description
      ? { description: item.description.replace(/<[^>]+>/g, "").slice(0, 500) }
      : {}),
    ...(item.keywords?.length ? { keywords: item.keywords.join(", ") } : {}),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `연세교육공학회 아카이브 — ${ARCHIVE_TYPE_LABELS[item.type]}`,
      url: `https://yonsei-edtech.vercel.app/archive/${item.type}`,
    },
    url: `https://yonsei-edtech.vercel.app/archive/${item.type}/${item.id}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
