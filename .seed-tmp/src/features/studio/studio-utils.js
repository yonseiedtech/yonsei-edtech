"use strict";
// 디자인 스튜디오 공용 유틸 — 요소 팩토리·아이콘 큐레이션·브랜드 팔레트
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRAND_ASSETS = exports.STUDIO_ICONS = exports.BRAND_COLORS = void 0;
exports.newId = newId;
exports.makeText = makeText;
exports.makeImage = makeImage;
exports.makeShape = makeShape;
exports.makeIcon = makeIcon;
exports.makePage = makePage;
var lucide_react_1 = require("lucide-react");
function newId(prefix) {
    if (prefix === void 0) { prefix = "el"; }
    try {
        return "".concat(prefix, "-").concat(crypto.randomUUID().slice(0, 8));
    }
    catch (_a) {
        return "".concat(prefix, "-").concat(Date.now(), "-").concat(Math.floor(Math.random() * 1e6));
    }
}
/** 브랜드 팔레트 — 연세 네이비·골드 중심 (색 스프롤 방지: 스튜디오는 이 세트만 노출) */
exports.BRAND_COLORS = [
    "#003378", // 네이비 (브랜드)
    "#0a4da3", // 밝은 네이비
    "#d4af37", // 골드
    "#1b1f27", // 잉크
    "#5b6472", // 그레이
    "#ffffff",
    "#f4f6fa", // 페이퍼
    "#2f7d5c", // 딥 그린 (보조)
];
/** 캔버스에 삽입 가능한 큐레이션 아이콘 (일러스트 대용) */
exports.STUDIO_ICONS = {
    GraduationCap: lucide_react_1.GraduationCap,
    BookOpen: lucide_react_1.BookOpen,
    Users: lucide_react_1.Users,
    Calendar: lucide_react_1.Calendar,
    MapPin: lucide_react_1.MapPin,
    Star: lucide_react_1.Star,
    Award: lucide_react_1.Award,
    Lightbulb: lucide_react_1.Lightbulb,
    Target: lucide_react_1.Target,
    Sparkles: lucide_react_1.Sparkles,
    PenLine: lucide_react_1.PenLine,
    FlaskConical: lucide_react_1.FlaskConical,
    BarChart3: lucide_react_1.BarChart3,
    Presentation: lucide_react_1.Presentation,
    Megaphone: lucide_react_1.Megaphone,
    Heart: lucide_react_1.Heart,
    Check: lucide_react_1.Check,
    ArrowRight: lucide_react_1.ArrowRight,
    Quote: lucide_react_1.Quote,
    PartyPopper: lucide_react_1.PartyPopper,
    Trophy: lucide_react_1.Trophy,
    Coffee: lucide_react_1.Coffee,
    Mic: lucide_react_1.Mic,
    Globe: lucide_react_1.Globe,
};
/** 삽입 가능한 브랜드 이미지 자산 (public/) */
exports.BRAND_ASSETS = [
    { label: "학회 엠블럼", src: "/icons/icon-512.png" },
    { label: "텍스트 로고", src: "/logo-text.png" },
    { label: "연세 캠퍼스", src: "/yonsei-campus.jpg" },
];
function makeText(partial) {
    if (partial === void 0) { partial = {}; }
    return __assign({ id: newId(), type: "text", x: 80, y: 80, w: 600, h: 120, text: "텍스트를 입력하세요", fontSize: 48, fontWeight: 700, fontFamily: "sans", color: "#1b1f27", align: "left", lineHeight: 1.35 }, partial);
}
function makeImage(src, partial) {
    if (partial === void 0) { partial = {}; }
    return __assign({ id: newId(), type: "image", x: 100, y: 100, w: 400, h: 300, src: src, fit: "cover", radius: 0 }, partial);
}
function makeShape(shape, partial) {
    if (partial === void 0) { partial = {}; }
    return __assign({ id: newId(), type: "shape", x: 120, y: 120, w: shape === "line" ? 400 : 240, h: shape === "line" ? 6 : 240, shape: shape, fill: "#003378", radius: shape === "rect" ? 16 : undefined }, partial);
}
function makeIcon(icon, partial) {
    if (partial === void 0) { partial = {}; }
    return __assign({ id: newId(), type: "icon", x: 140, y: 140, w: 120, h: 120, icon: icon, color: "#003378", strokeWidth: 1.8 }, partial);
}
function makePage(background, elements) {
    if (background === void 0) { background = "#ffffff"; }
    if (elements === void 0) { elements = []; }
    return { id: newId("pg"), background: background, elements: elements };
}
