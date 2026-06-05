# Citation Verification Report — v4 final manuscript
> Run date: 2026-06-01
> Verifier: document-specialist agent (OMC)
> Method: WebSearch (Crossref/Springer/ERIC/author page) + manuscript text inspection

---

## 1. Bannert, Reimann, Sonnenberg (2015)

- **v4 manuscript citation**: Bannert et al.(2015) — used in §2.1: "자기성찰 프롬프트(Bannert et al., 2015)"
- **Verified metadata**:
  - Title: "Process mining techniques for analysing patterns and strategies in students' self-regulated learning"
  - Journal: *Metacognition and Learning*
  - Volume/Issue: **9(2)**
  - Pages: **161–185**
  - DOI: https://doi.org/10.1007/s11409-013-9107-6
  - **Published year: 2014** (the DOI was registered in 2013; Springer lists publication as 2014)
- **Critic flag**: "volume 표기 재검증 필요" — Volume 9(2) pp. 161–185 is CORRECT. The flag was about the year, not the volume.
- **Verdict**: **MINOR_FIX**
- **Recommended fix**: Change in-text citation and reference list from **(2015)** to **(2014)**.

  Corrected reference:
  > Bannert, M., Reimann, P., & Sonnenberg, C. (2014). Process mining techniques for analysing patterns and strategies in students' self-regulated learning. *Metacognition and Learning*, *9*(2), 161–185. https://doi.org/10.1007/s11409-013-9107-6

  All in-text occurrences of "Bannert et al.(2015)" should become "Bannert et al.(2014)". Search the manuscript for `Bannert et al.(2015)` and `Bannert et al., 2015`.

---

## 2. McDonald & Yanchar (2020)

- **v4 manuscript citation**: McDonald & Yanchar, 2020 — used in §2.2: "AECT의 학술 출판 워크플로우 디지털화(McDonald & Yanchar, 2020)"
- **v4 use context (§2.2)**: "학회·기관 차원의 디지털 인프라 구축 사례는 해외에서 일부 보고되었다. AECT의 학술 출판 워크플로우 디지털화(McDonald & Yanchar, 2020), OpenStax의 개방형 교과서 플랫폼 구축은 학회·기관이 자체적으로 학술 인프라를 디지털화한 사례이다."
- **Verified metadata**:
  - True title: **"Towards a view of originary theory in instructional design"**
  - Journal: *Educational Technology Research and Development*
  - Volume/Issue: **68(2)**  (NOT 68(4) as cited in v4; also pages are 633–651, NOT 1597–1614)
  - DOI: https://doi.org/10.1007/s11423-019-09734-8
  - Sources: ERIC EJ1252999, BYU ScholarArchive (author's institutional repository), author's own website (jkmcdonald.com)
- **Verified abstract topic**: The paper argues for "originary theory" in instructional design — theory generated within the field itself rather than imported from other disciplines. It is **purely theoretical and philosophical**. It discusses design theory epistemology. It contains **no discussion of AECT publication workflow digitalization, digital infrastructure, or any institutional SaaS/platform case**.
- **Metadata errors in v4**:
  1. Volume/issue cited as 68(4) pp. 1597–1614 — actual is **68(2) pp. 633–651**
  2. Paper topic completely misrepresents the source
- **Verdict**: **MISATTRIBUTION** (both content and bibliographic metadata are wrong)
- **Recommended fix**:
  - **Remove** "AECT의 학술 출판 워크플로우 디지털화(McDonald & Yanchar, 2020)" from §2.2 entirely. There is no evidence this paper discusses AECT digitalization.
  - If McDonald & Yanchar (2020) is retained elsewhere in the manuscript for its actual contribution (originary vs. imported theory in ID), update the reference to: 68(2), 633–651.
  - If a citation for AECT publication workflow digitalization is needed, it must be sourced from a different, verifiable paper.

  Corrected reference (if retained for proper use):
  > McDonald, J. K., & Yanchar, S. C. (2020). Towards a view of originary theory in instructional design. *Educational Technology Research and Development*, *68*(2), 633–651. https://doi.org/10.1007/s11423-019-09734-8

---

## 3. Crompton & Burke (2018)

- **v4 manuscript citation**: Crompton & Burke, 2018 — used in §1 (서론): "Crompton과 Burke(2018)의 systematic review에 따르면 모바일 학습 환경 연구의 78%가 단일 이론을 적용하였고, 다수 이론의 통합 구현에 대한 보고는 12% 미만에 그쳤다."
- **Verified metadata**:
  - Title: "The use of mobile learning in higher education: A systematic review"
  - Journal: *Computers & Education*
  - Volume/Pages: **123, 53–64** ✓ (confirmed correct)
  - Year: **2018** ✓
  - DOI: https://doi.org/10.1016/j.compedu.2018.04.007
- **Verified figures in source**: Exhaustive web search, Semantic Scholar, and multiple citing papers were consulted. The confirmed findings reported in the paper include:
  - 72 mobile learning studies reviewed (2010–2016)
  - ~70% of studies showed positive learning outcomes
  - ~40% of activities aligned with behaviorist approach
  - Language instruction most researched domain; 74% involved undergraduates
  - No independently verifiable source reproduces the specific figures **"78% single-theory"** or **"less than 12% multi-theory"** as findings of this paper. These percentages do not appear in the abstract, Semantic Scholar summary, or in any citing paper's description of what Crompton & Burke (2018) found. The paper does not appear to report a breakdown of single-theory vs. multi-theory usage as a primary finding.
- **Verdict**: **FABRICATED** (high confidence the specific 78%/12% figures are not in the source; the paper's reported scope is about purposes, outcomes, methods, and subject domains — not a theory-integration meta-count)
- **Recommended fix**: Replace the specific percentages with a softened, defensible paraphrase. Two options:

  **Option A (soften, no percentage)**:
  > "Crompton과 Burke(2018)의 systematic review는 고등교육 모바일 학습 연구의 대다수가 단일 이론 또는 단일 접근법(특히 행동주의)에 의존하며, 복수 이론을 통합한 구현 사례는 드물다는 경향을 보고하였다."

  **Option B (remove and substitute)**:
  > Remove the Crompton & Burke citation for this specific claim. If the single-theory dominance claim is central to the argument, find a systematic review that explicitly counts single-theory vs. multi-theory studies (e.g., Hwang & Tsai, 2011 in *British Journal of Educational Technology* or similar meta-analyses of learning design theory usage).

---

## 4. Summary table for v5 patches

| Citation | Issue | Action needed | Priority |
|---|---|---|---|
| Bannert et al. (2015) | Year is 2014, not 2015; volume/issue correct | Change all "(2015)" → "(2014)" in text and reference list | **Minor** |
| McDonald & Yanchar (2020) | Paper is about originary theory epistemology, NOT AECT digitalization; also volume/pages wrong (68(4) 1597–1614 → should be 68(2) 633–651) | Remove from §2.2 AECT claim entirely; correct metadata if cited elsewhere | **Critical** |
| Crompton & Burke (2018) | Specific figures "78%" and "12%" not verifiable in source | Remove percentages; soften to directional claim, or substitute with a verifiable source | **Critical** |

---

## Notes on verification method

- Bannert year confirmed via Springer DOI page (DOI registered 2013, published volume 9 2014); two independent search queries returned "2014" consistently.
- McDonald & Yanchar topic confirmed via ERIC abstract (EJ1252999), BYU ScholarArchive full citation, and author's own website — all three sources confirm the paper is theoretical/philosophical with no mention of AECT publication workflow.
- Crompton & Burke figures could not be accessed behind the ScienceDirect paywall; assessment is based on: (a) Semantic Scholar abstract/summary, (b) MDPI 2023 citing paper summary, (c) SCIRP reference database entry, (d) no citing paper in the literature reproduces "78%" or "12%" as attributed findings — which is the strongest signal of fabrication. If the submitting author has institutional access, direct inspection of Table 3 or equivalent in the original article is recommended before final submission.
