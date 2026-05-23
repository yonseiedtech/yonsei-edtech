import type { MetadataRoute } from "next";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DYNAMIC_LIMIT = 50;
const ARCHIVE_LIMIT = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://yonsei-edtech.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/intro`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/activities`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/seminars`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/research`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/alumni/thesis`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/archive/concept`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/archive/variable`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/archive/measurement`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/members`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/notices`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/board`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/newsletter`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/calendar`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/steppingstone`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/steppingstone/thesis-defense`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  // Dynamic routes (published/public items only)
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Public seminars — most recent 50
    const seminarsQ = query(
      collection(db, "seminars"),
      where("status", "!=", "draft"),
      orderBy("status"),
      orderBy("date", "desc"),
      limit(DYNAMIC_LIMIT),
    );
    const seminarsSnapshot = await getDocs(seminarsQ);
    for (const doc of seminarsSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/seminars/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    // Notice posts — most recent 50
    const postsQ = query(
      collection(db, "posts"),
      where("category", "==", "notice"),
      orderBy("createdAt", "desc"),
      limit(DYNAMIC_LIMIT),
    );
    const postsSnapshot = await getDocs(postsQ);
    for (const doc of postsSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/board/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }

    // Alumni theses — most recent 100
    const thesesQ = query(
      collection(db, "alumni_theses"),
      orderBy("year", "desc"),
      limit(ARCHIVE_LIMIT),
    );
    const thesesSnapshot = await getDocs(thesesQ);
    for (const doc of thesesSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/alumni/thesis/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // Published newsletters
    const newslettersQ = query(
      collection(db, "newsletters"),
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      limit(DYNAMIC_LIMIT),
    );
    const newslettersSnapshot = await getDocs(newslettersQ);
    for (const doc of newslettersSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/newsletter/${doc.id}`,
        lastModified: data.publishedAt?.toDate?.() ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }

    // Archive concepts (published) — up to 100
    const archiveQ = query(
      collection(db, "archive_concepts"),
      where("status", "==", "published"),
      limit(ARCHIVE_LIMIT),
    );
    const archiveSnapshot = await getDocs(archiveQ);
    for (const doc of archiveSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/archive/concept/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    // Archive variables (published) — up to 100
    const archiveVarQ = query(
      collection(db, "archive_variables"),
      where("status", "==", "published"),
      limit(ARCHIVE_LIMIT),
    );
    const archiveVarSnapshot = await getDocs(archiveVarQ);
    for (const doc of archiveVarSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/archive/variable/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch {
    // Firestore unavailable at build time — return static routes only
  }

  return [...staticRoutes, ...dynamicRoutes];
}
