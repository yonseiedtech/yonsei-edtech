/**
 * 학회 기수(generation) 계산 헬퍼
 *
 * 연세대학교 교육대학원 교육공학 전공 기준:
 *   - 1998년 1반기(전기 입학) = 1기
 *   - 1998년 2반기(후기 입학) = 2기
 *   - 1999년 1반기 = 3기 …
 *
 * 공식: generation = (year - 1998) * 2 + half
 *  - half: 1(전기) | 2(후기)
 */
export function calcGeneration(year?: number | null, half?: number | null): number {
  if (!year || !half) return 0;
  const g = (year - 1998) * 2 + half;
  return g > 0 ? g : 0;
}
