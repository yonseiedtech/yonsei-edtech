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
