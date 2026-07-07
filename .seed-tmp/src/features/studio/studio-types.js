"use strict";
// ── 디자인 스튜디오 (2026-07-02) — 카드뉴스·포스터·발표 슬라이드 자유 편집 ──
//
// 기존 카드뉴스(CardSpec)는 고정 템플릿(필드 채우기) 모델. 스튜디오는 Canva 식
// "요소(element) 배열 + 좌표" 자유 캔버스 모델로, 회원 누구나 본인 문서를 만들고
// 세미나·스터디·대외활동과 연계(프리필·포스터 게시)할 수 있다.
//
// 좌표계: 문서 원본 해상도(px) 기준 절대좌표. 렌더는 CSS transform scale 로 축소.
// Firestore `design_documents` — 본인 rw, published=true 는 회원 read.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DESIGN_LINK_KIND_LABELS = exports.DESIGN_CANVAS_SIZES = exports.DESIGN_DOC_TYPE_LABELS = void 0;
exports.DESIGN_DOC_TYPE_LABELS = {
    cardnews: "카드뉴스",
    poster: "포스터",
    ppt: "발표 슬라이드",
};
/** 문서 타입별 캔버스 크기 (px) */
exports.DESIGN_CANVAS_SIZES = {
    cardnews: { width: 1080, height: 1080 },
    poster: { width: 1080, height: 1350 }, // 인스타 세로형 4:5
    ppt: { width: 1280, height: 720 }, // 16:9
};
exports.DESIGN_LINK_KIND_LABELS = {
    seminar: "세미나",
    study: "스터디",
    project: "프로젝트",
    external: "대외활동",
    conference: "학술대회",
};
