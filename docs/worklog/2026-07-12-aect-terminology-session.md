# 2026-07-12 AECT 용어 표준 반영 세션

『교육공학 용어해설』(Rita C. Richey 편, 이현우·임규연·정재삼·허희옥 공역, 학지사 2020 — AECT 공식 용어집, 원서 Springer 2013) 스캔 PDF(456쪽)를 판독해 교육공학 아카이브에 전면 반영.

## 저작권 원칙 (준수 확인)
- 표제어·공식 역어 대응(사실 정보)만 데이터로 수록. 해설 본문 전재 없음.
- 신규/개선 개념 설명은 전량 자체 재서술(패러프레이즈·번역투 순화) + `AECT_REF(page)` 출처 표기.
- PDF 원문·스캔 이미지 미게재.

## 산출물
1. **매핑 데이터**: `docs/plans/aect-terminology-mapping.json` — 186개 표제어·역어·6영역·19하위범주 (책 명시 수치와 일치 검증). 갭 분석: `docs/plans/aect-archive-gap-2026-07-12.md`.
2. **A. 표기 표준화**: `aectTerm` 필드 (ArchiveConcept·FoundationTerm·SeedConcept·FoundationTerm SeedEntry) + 폼 입력(ArchiveItemForm·FoundationTermForm) + 상세 병기 칩(순화어 칩과 나란히 "AECT · {역어}", name과 동일하면 미표시). 기존 개념 14곳·기초용어 7곳 aectTerm 채움.
3. **B. 신규 시드 23개 개념** (archive-seed.ts, 패러프레이즈 정의 + 원 학자 인용 + AECT_REF 페이지):
   행동주의·인지주의 학습이론·구성주의·스키마이론·정보처리이론·인지전략·스캐폴딩·학습전이·상황인지·인지적 도제·선행조직자·문제 기반 학습·프로젝트 기반 학습·자기주도학습·발견학습·블렌디드 러닝·원격교육·모바일 학습·보편적 학습설계·공개교육자료·학습객체·요구사정·경험의 원추.
   개념↔변인 링크 8건 추가 (학습전이·스캐폴딩·자기주도학습·PBL·PjBL·블렌디드·모바일·원격교육).
4. **B-2. 연구방법 2종** (research-methods-seed.ts): 설계 기반 연구(DBR)·설계 개발 연구 — 교육공학 서명 연구방법, 절차 6단계+예시 포함, kind=mixed.
5. **C. 참고문헌 보강**: AECT 표제어 매칭 기존 개념 12곳에 `AECT_REF(표제어 페이지)` 추가 (국문 찾아보기 pp.443~449로 페이지 검증). refreshArchiveSeedReferences가 aectTerm도 갱신하도록 확장.
6. **D. 설명 개선·구분 명시**: 학습공동체 설명 보강(Wenger 영역·공동체·실천 3요소, aectTerm=실천공동체). 기초용어에 **'사정(Assessment) vs 평가(Evaluation)'** 페어 신규 (AECT 공식 구분, confusedWith 상호 연결). 기초용어 aectTerm: 교수설계·교수체제설계·교육과정·체제적 분석(→체제 분석)·근접발달영역·인지부하.
7. **E. 인용 가이드**: citation-guide §4에 번역서 인용(원서/역서 이중 표기, 빗금 연도 병기, 실측 페이지 주의) 카드 추가 — 이 책이 실제 예시.
8. **신규 기능: AECT 용어 표준 사전** `/archive/terminology` — `src/lib/aect-terminology.ts`(186개 트리+flat, aectCitation 헬퍼) + AectTerminologyBrowser(영역 필터·영문/국문 검색·아카이브 개념 자동 매칭 링크) + 아카이브 랜딩 카드 + 커맨드팔레트 등록. executor 구현, 메인 검수 통과.

## 운영 절차 (배포 후 1회)
/console/archive에서 ① "기본 시드 불러오기" (신규 23개 개념 + 기초용어 사정·평가 + 연구방법 2종 생성) ② "메타데이터 갱신" (기존 개념 aectTerm·references·설명 개선 반영). 연구방법·기초용어는 draft 생성 → 운영진 검수 후 published 토글.

## 백로그 (다음 라운드)
- 2차 후보 개념: 완전학습·앵커드 교수법·이중부호화이론·귀인이론·분산인지·디지털 게임 기반 학습·시뮬레이션·인지도구·EPSS·지식경영·학습조직·수행 향상 등.
- 신규 23개 개념 기반 진단평가 concepts 영역 문항 확충 (conceptSeedKey 연결).
- foundation terms에 기존 항목 aectTerm 반영용 refresh 경로 (현재 시드는 신규 생성만).

## 환경 이슈
- node_modules가 WSL(리눅스)에서 설치돼 rolldown Windows 바인딩 누락 → `npm install --no-save @rolldown/binding-win32-x64-msvc`로 해결 (vitest 실행용, package.json 무변경).
