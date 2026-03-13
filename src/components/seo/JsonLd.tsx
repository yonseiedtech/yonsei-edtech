export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "연세교육공학회",
    alternateName: "Yonsei EdTech",
    url: "https://yonsei-edtech.vercel.app",
    description:
      "교육의 미래를 함께 설계하는 연세대학교 교육공학 학술 커뮤니티",
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "연세대학교",
      alternateName: "Yonsei University",
    },
    knowsAbout: [
      "Educational Technology",
      "EdTech",
      "Instructional Design",
      "Learning Science",
    ],
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
    alternateName: "Yonsei EdTech",
    url: "https://yonsei-edtech.vercel.app",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
