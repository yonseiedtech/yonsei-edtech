# Codex 교차 리뷰 — theory-implementation-matrix.final.v3.md
> Reviewer perspective: Experienced ed-tech journal reviewer
> Run date: 2026-06-01

## Summary verdict
- Overall: [Major Revision]
- Strongest aspects: v3 has a clear central object: a 10×9 theory-implementation matrix, explicit 4-level mapping rubric, visible response to the editorial charter, and a much stronger limitation-future structure than the v2 baseline. The paper is potentially publishable as a design-rationale case study if it narrows its claims.
- Most critical concerns: The manuscript still treats interpretive mapping as if it were empirical validation. The data-source logic is unstable: abstracts and §3.2 mention 7 months of activity logs, while §4.4 and §5.5 say operational effects are outside scope. Several conclusion claims overgeneralize from one insider-built system. Citation coverage is too international and too thin for a Korean graduate society case.

## Findings by severity

### Critical (must fix before submission)
1. **Abstract-method contradiction about operational logs.** The Korean and English abstracts state that analysis combined source code, 30 design documents, and 7 months of anonymized activity logs. §3.2 likewise lists logs as a data source. But §4.4 explicitly says quantitative operational data are outside the manuscript's scope, and §5.5 L3 says measurement remains unverified. This is not a wording issue; it changes the study type. Either remove logs from the abstract as an analysis source or specify exactly which log-derived evidence affected which matrix cells.

2. **Inter-rater reliability is under-specified for ordinal matrix ratings.** §3.3 reports Cohen's κ = 0.78 for 90 cells, and Appendix D adds reviewer profiles. However, there are two external reviewers plus the author, ordinal categories, and post-hoc consensus. The paper does not say whether κ is pairwise, averaged, weighted, or calculated against the author's ratings. Because mapping strength is the core result, this must be reproducible. Report the statistic form, coding unit, category distribution, pre-consensus table, and handling of empty cells.

3. **Insider bias is acknowledged but not methodologically contained.** §5.5 L2 and the COI statement admit the author is a site operator. Yet the same operator extracted design decisions, selected theories, interpreted documents, interviewed operators, and participated in consensus. External raters reviewed the matrix but did not independently audit source-code evidence. This threatens the main contribution. Add an evidence table for at least all ●●● and ●● cells, with file/design-doc/interview anchors.

4. **Conclusion overclaims general design principles.** §6.3 says opt-in should be the default when institutions introduce gamification. From one case and one reported operator interview in §4.3.1, this is too broad. Recast as a design hypothesis or case-derived proposition pending comparative evidence.

### Major (strongly recommended fix)
1. **Motivation-cluster numeric inconsistency.** §4.2 cluster paragraph and §6.1 claim the motivation cluster spans 7–8 domains, but Table 1 and `tables_check.csv` show SRL maps to 5 domains. Either define the motivation cluster as SDT + Self-Efficacy/Gamification only, or change the range to 5–8.

2. **Table 1 ordering weakens quantitative credibility.** `tables_check.csv` flags Formative Assessment mean 1.44 listed below Cognitive Apprenticeship mean 1.33. If the table is meant to show integration rank, reorder it. If not, state the ordering principle.

3. **Entropy is promised but not reported.** Abstract, §1 contribution 2, and §4.2 mention matrix entropy, yet the visible quantitative section reports only row and column means plus cluster prose. Provide the entropy value, formula, interpretation, and why it matters beyond decoration.

4. **§4.4 still contains manuscript-internal placeholder residue.** Screenshot 1 and Screenshot 2 are still marked "사용자 캡쳐 필요" in §4.1.1 and §4.1.5. §4.4 says login-required screenshots will be separated later. For submission, either include verified figures or remove these placeholders.

5. **Limitation-future pairings are sometimes artificial.** L2→F2 only indirectly addresses insider bias; a non-operator-led re-rating or replication would fit better. L4→F4 measures publication-wizard cognitive load, not matrix drift over time. L6 calls the study a "양적 단일 설계," but the method is framework synthesis, not a quantitative design.

6. **IRB/ethics claim is too casual.** Appendix C declares IRB exemption because data are anonymized aggregate and interviews involved verbal consent. Many journals will not accept author-declared exemption for interviews without institutional review or exemption documentation. State the responsible body, approval/exemption status, or that formal review was not obtained.

### Minor (polish)
1. Figure numbering is non-linear: Figure 2 appears before Figure 1, and Screenshot 1 is reused for different assets. Align figure order before DOCX build.
2. The English/Korean mix is still heavy: "central figure," "architecture overview," "historical motivation," and "emerge" read like draft residue.
3. §2.4 uses alphabetized list markers (a)-(d), which is not fatal but conflicts with the charter's resistance to mechanical enumeration.
4. The final reference note "[국내 학회지 보강 필요]" should not appear in a submission manuscript.
5. Appendix A quantitative metrics need measurement date and extraction method, not only approximate counts.

## Theoretical accuracy check
The theory summaries are broadly competent, especially SRL, SDT, CLT, CoP, and formative feedback. The problem is not theory definition but mapping inflation. For example, §4.1.2 maps CRediT roles, assignedUserIds, and attendeeIds to SDT relatedness, but those are affiliation/role traces, not direct evidence of relatedness satisfaction. §4.1.9 merges self-efficacy and gamification as one row, although Bandura's efficacy sources and PBL mechanics have different mechanisms and risks. The combined row may be defensible, but only if the authors explain why it is not two constructs forced together to make the matrix denser.

## Method integrity check
The method is acceptable as framework synthesis plus design-rationale audit, but the manuscript repeatedly borrows the tone of empirical effectiveness research. §3.2 should separate "evidence for implementation existence" from "evidence for learner effect." Code and design documents can justify that a feature exists and was rationalized through a theory; they cannot show that SRL, SDT, or CLT outcomes occurred. Operational logs can support implementation traces only if explicitly linked to cells. Interviews should be reported with a minimal protocol, sampling rationale, coding procedure, and use in adjudication.

## Conclusion claims check
§6.1 is partly supported by Table 1 if the motivation-cluster range is fixed. §6.2 is plausible but should be framed as an analytic classification, not a demonstrated general extension of design-rationale research. §6.3 is the largest overreach: the opt-in claim is interesting, but the evidence is one site's design change plus a single operator report. The conclusion should use "may function as" or "offers a testable design proposition," not "should be the default."

## Limitation-Future pairings audit
The 1:1 structure is a real improvement over the baseline. Still, pair quality varies. L1→F1, L3→F3, and L5→F5 are coherent. L2→F2 should become an independent audit/replication track. L4→F4 should become a longitudinal matrix-versioning track. L6 should be renamed to "framework-synthesis-only limitation" and paired with mixed-method validation, not described as a quantitative single-design limitation.

## Citation spot check
Most international citations are credible, but the manuscript needs verification before submission. McDonald & Yanchar (2020) is cited as AECT publication-workflow digitalization in §2.2, but the reference title shown is about originary theory and humanistic perspectives; this looks mismatched. The final domestic-citation note proves the literature review is unfinished. Also verify Crompton & Burke (2018)'s exact 78% and 12% claims in §1; if those figures are not directly in the source, soften or remove them.

## Style/AI-detection residuals
The charter cleanup helped, but residual machine-like scaffolding remains: dense "본 연구/본 논문" self-reference, enumerated contribution sentences, and repeated "본 사이트는..." implementation paragraphs. More importantly, style should not outrun evidence. Remove internal production notes, reduce bilingual jargon, and vary claims by evidential status: implemented, documented, interpreted, measured, and hypothesized should not be written as the same level of fact.
