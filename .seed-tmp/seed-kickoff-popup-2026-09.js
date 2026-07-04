"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// C-1(2026-07-04): 2026-2학기 개강 사이트 팝업 예약 발행.
//  · 노출: 2026-08-25 ~ 2026-09-07 (KST) · 로그인 회원 · 우측 하단 배너 · 7일 보지 않기
//  · 멱등: 고정 doc id. 운영진은 콘솔(/console/popups)에서 수정·비활성 가능.
//  · 실행: set -a; source .env.local; set +a
//    npx tsc scripts/seed-kickoff-popup-2026-09.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//    node .seed-tmp/seed-kickoff-popup-2026-09.js [--apply]
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var APPLY = process.argv.includes("--apply");
var sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)({ credential: (0, app_1.cert)(sa) });
var db = (0, firestore_1.getFirestore)();
db.settings({ preferRest: true });
var DOC_ID = "kickoff-2026-fall";
var now = new Date().toISOString();
var popup = {
    title: "2026년 2학기 개강 🎓",
    content: "방학 동안 논문 도구가 크게 업그레이드됐어요 — 문헌 리뷰 매트릭스, 연구모형 마법사, 논문 에디터(목차·표·윤리 체크리스트), 디자인 스튜디오까지. 새 학기 첫 걸음으로 둘러보세요.",
    ctaLabel: "새 기능 보기",
    ctaUrl: "/whats-new",
    startsAt: "2026-08-24T15:00:00.000Z", // KST 2026-08-25 00:00
    endsAt: "2026-09-07T14:59:59.000Z", // KST 2026-09-07 23:59
    audience: "member",
    position: "bottom-right",
    dismissDuration: "7d",
    active: true,
    priority: 90,
    createdAt: now,
    updatedAt: now,
    createdBy: "system:c1-kickoff",
};
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var ref, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ref = db.collection("site_popups").doc(DOC_ID);
                    return [4 /*yield*/, ref.get()];
                case 1:
                    existing = _a.sent();
                    if (existing.exists) {
                        console.log("skip (already exists): site_popups/".concat(DOC_ID));
                        return [2 /*return*/];
                    }
                    console.log("".concat(APPLY ? "CREATE" : "would create", ": site_popups/").concat(DOC_ID));
                    console.log(JSON.stringify(popup, null, 2));
                    if (!APPLY) return [3 /*break*/, 3];
                    return [4 /*yield*/, ref.set(popup)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
main().then(function () { return process.exit(0); }).catch(function (e) { console.error(e); process.exit(1); });
