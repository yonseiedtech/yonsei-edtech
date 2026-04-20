/**
 * Denormalization Sync Helpers
 *
 * 비정규화(denorm) 필드는 작성 시점의 스냅샷이라 원본이 바뀌면 stale 됨.
 * 읽기 시점에 원본을 batch-fetch 해서 최신 값으로 overlay 한다.
 *
 * 사용 예:
 *   const fresh = await enrichCertificates(certs);
 *   const fresh = await enrichCourseReviews(reviews);
 *
 * 비용: list 결과당 추가 fetch 1~3회. 100건 단위 list 에서는 무시 가능.
 */

import {
  seminarsApi,
  activitiesApi,
  courseOfferingsApi,
} from "./bkend";
import type {
  Certificate,
  CourseReview,
  Seminar,
  Activity,
  CourseOffering,
} from "@/types";

function uniq(arr: (string | undefined | null)[]): string[] {
  return [...new Set(arr.filter((x): x is string => !!x))];
}

/**
 * 인증서의 seminarTitle/activityTitle 을 원본 최신 값으로 overlay.
 * - seminarId / activityId 가 있는 경우만 갱신.
 * - 원본이 삭제됐으면 기존 denorm 값 유지.
 */
export async function enrichCertificates(certs: Certificate[]): Promise<Certificate[]> {
  if (certs.length === 0) return certs;

  const seminarIds = uniq(certs.map((c) => c.seminarId));
  const activityIds = uniq(certs.map((c) => c.activityId));

  const [seminars, activities] = await Promise.all([
    seminarIds.length > 0
      ? seminarsApi.list().then((r) => r.data as unknown as Seminar[])
      : Promise.resolve([] as Seminar[]),
    activityIds.length > 0
      ? activitiesApi.list().then((r) => r.data as unknown as Activity[])
      : Promise.resolve([] as Activity[]),
  ]);

  const seminarMap = new Map(seminars.map((s) => [s.id, s.title]));
  const activityMap = new Map(activities.map((a) => [a.id, a.title]));

  return certs.map((c) => {
    const out = { ...c };
    if (c.seminarId && seminarMap.has(c.seminarId)) {
      out.seminarTitle = seminarMap.get(c.seminarId);
    }
    if (c.activityId && activityMap.has(c.activityId)) {
      out.activityTitle = activityMap.get(c.activityId);
    }
    return out;
  });
}

/**
 * 강의 후기의 courseName/professor/category 를 CourseOffering 최신 값으로 overlay.
 */
export async function enrichCourseReviews(reviews: CourseReview[]): Promise<CourseReview[]> {
  if (reviews.length === 0) return reviews;

  const offeringIds = uniq(reviews.map((r) => r.courseOfferingId));
  if (offeringIds.length === 0) return reviews;

  const res = await courseOfferingsApi.list({ limit: 1000 });
  const offerings = res.data as unknown as CourseOffering[];
  const map = new Map(offerings.map((o) => [o.id, o]));

  return reviews.map((r) => {
    const src = map.get(r.courseOfferingId);
    if (!src) return r;
    return {
      ...r,
      courseName: src.courseName ?? r.courseName,
      professor: src.professor ?? r.professor,
      category: src.category ?? r.category,
    };
  });
}
