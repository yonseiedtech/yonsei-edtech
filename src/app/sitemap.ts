import type { MetadataRoute } from "next";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
      url: `${baseUrl}/members`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/board`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/seminars`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/notices`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
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
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "monthly",
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
  ];

  // Dynamic seminar routes
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const seminarsSnapshot = await getDocs(collection(db, "seminars"));
    for (const doc of seminarsSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/seminars/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    const postsSnapshot = await getDocs(collection(db, "posts"));
    for (const doc of postsSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/board/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }

    const thesesSnapshot = await getDocs(collection(db, "alumni_theses"));
    for (const doc of thesesSnapshot.docs) {
      const data = doc.data();
      dynamicRoutes.push({
        url: `${baseUrl}/alumni/thesis/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }

    const newslettersSnapshot = await getDocs(collection(db, "newsletters"));
    for (const doc of newslettersSnapshot.docs) {
      const data = doc.data();
      if (data.status !== "published") continue;
      dynamicRoutes.push({
        url: `${baseUrl}/newsletter/${doc.id}`,
        lastModified: data.publishedAt?.toDate?.() ?? new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // Firestore unavailable at build time — return static routes only
  }

  return [...staticRoutes, ...dynamicRoutes];
}
