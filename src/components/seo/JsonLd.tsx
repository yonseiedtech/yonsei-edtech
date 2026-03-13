export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "연세교육공학회",
    alternateName: [
      "Yonsei EdTech",
      "Yonsei Educational Technology Association",
      "연세대학교 교육공학 전공",
      "연세대 교육공학",
    ],
    url: "https://yonsei-edtech.vercel.app",
    description:
      "연세대학교 교육공학 전공 학술 커뮤니티. 에듀테크, 교수설계, 학습과학 분야의 세미나, 프로젝트, 스터디 활동.",
    email: "yonsei.edtech@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "연세로 50 교육과학관",
      addressLocality: "서울시 서대문구",
      addressCountry: "KR",
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "연세대학교",
      alternateName: "Yonsei University",
      sameAs: "https://www.yonsei.ac.kr",
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
    alternateName: "연세대학교 교육공학 전공 학술 커뮤니티",
    url: "https://yonsei-edtech.vercel.app",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
