# 사이트 스크린샷 가이드

본 폴더는 논문 본문에 삽입할 사이트 스크린샷을 보관합니다.
스크린샷이 추가되면 `python build_docx.py` 재실행으로 docx에 자동 삽입됩니다.

## 필요한 스크린샷 4개

draft.md 본문에 명시된 placeholder 위치별 권장 파일:

| 파일명 | 캡쳐 페이지 | 가이드 |
|--------|-----------|--------|
| `screenshot1_streak.png` | `/mypage` 학습 잔디 섹션 | 365일 잔디 grid 전체. 색상 농도 다양한 시점 권장 |
| `screenshot2_lineage.png` | `/alumni/thesis` 또는 `/about/leadership` 계보도 | 졸업생 라이프사이클 가시화 부분 |
| `screenshot3_publish_wizard.png` | `/collab/{팀ID}/publish/{articleId}` 편집 화면 | 좌측 콘텐츠·저자·코멘트 + 우측 동의 게이트 진행률 |
| `screenshot4_contributions.png` | `/collab/{팀ID}/contributions` | 활동량 매트릭스 표 + CRediT 분포 카드 |

## 추가 권장 스크린샷 (Discussion 보강용)

| 파일명 | 캡쳐 페이지 |
|--------|-----------|
| `screenshot5_journal.png` | `/journal` 공개 연구지 목록 |
| `screenshot6_meeting.png` | `/collab/{팀ID}/meetings` 회의 카드 펼침 |
| `screenshot7_chapter.png` | `/collab/{팀ID}/chapters` 챕터 편집기 + 댓글 |

## 캡쳐 팁

- **해상도**: 1920×1080 이상 (학회지 게재 시 300 DPI 권장)
- **포맷**: PNG (lossless)
- **개인정보 가림**: 회원 이름·이메일 마스킹 또는 자기 자신 계정으로
- **익명화**: anonymized aggregate 데이터만 노출
- **브라우저**: Chrome/Edge에서 F12 → Toggle device toolbar → Responsive → 1920×1080

## 추가 후 docx 재생성

```bash
cd C:\work\yonsei-edtech\docs\papers
python build_docx.py
```

draft.md 의 `[Screenshot N]` 텍스트 라인을 `![alt](figures/site/screenshotN_xxx.png)` 으로
교체 후 재빌드하면 docx 본문에 이미지가 삽입됩니다.
