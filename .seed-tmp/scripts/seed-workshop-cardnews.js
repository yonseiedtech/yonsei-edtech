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
// C-3 워크숍 안내 카드뉴스 — 스튜디오 브랜드 템플릿으로 생성 (2026-07-06)
//  · 소유자: 운영 계정(education@yonsei.ac.kr) — /studio 목록에서 열어 편집·PNG 내보내기
//  · 실행: npx tsc scripts/seed-workshop-cardnews.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//         node .seed-tmp/scripts/seed-workshop-cardnews.js [--apply]
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var templates_1 = require("../src/features/studio/templates");
var APPLY = process.argv.includes("--apply");
var sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)({ credential: (0, app_1.cert)(sa) });
var db = (0, firestore_1.getFirestore)();
// 템플릿 요소의 옵션 필드(undefined)는 클라이언트 dataApi 가 strip 하던 것 — admin 에선 설정으로 무시
db.settings({ preferRest: true, ignoreUndefinedProperties: true });
var TITLE = "논문 도구 워크숍 안내";
function replaceText(pages, from, to) {
    for (var _i = 0, pages_1 = pages; _i < pages_1.length; _i++) {
        var p = pages_1[_i];
        for (var _a = 0, _b = p.elements; _a < _b.length; _a++) {
            var el = _b[_a];
            if (el.type === "text" && el.text === from) {
                el.text = to;
            }
        }
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var users, owner, ownerName, dup, pages, now, doc, ref;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db.collection("users").where("email", "==", "education@yonsei.ac.kr").limit(1).get()];
                case 1:
                    users = _b.sent();
                    if (!users.empty) return [3 /*break*/, 3];
                    return [4 /*yield*/, db.collection("users").where("role", "in", ["sysadmin", "admin", "president"]).limit(1).get()];
                case 2:
                    users = _b.sent();
                    _b.label = 3;
                case 3:
                    if (users.empty)
                        throw new Error("운영 계정을 찾을 수 없습니다");
                    owner = users.docs[0];
                    ownerName = (_a = owner.data().name) !== null && _a !== void 0 ? _a : "운영진";
                    return [4 /*yield*/, db.collection("design_documents")
                            .where("userId", "==", owner.id).where("title", "==", TITLE).limit(1).get()];
                case 4:
                    dup = _b.sent();
                    if (!dup.empty) {
                        console.log("skip (\uC774\uBBF8 \uC874\uC7AC): design_documents/".concat(dup.docs[0].id));
                        return [2 /*return*/];
                    }
                    pages = (0, templates_1.buildTemplatePages)("cardnews", {
                        title: "논문 도구\n워크숍",
                        subtitle: "주제 탐색부터 계획서까지, 35분 완주",
                        date: "9월 첫 세미나에서 (일정 추후 공지)",
                        location: "세미나 현장 · 노트북 지참 권장",
                        speaker: "시연 체인 — 주제 탐색 → 문헌 매트릭스 → 연구 모형 → 계획서 시딩",
                        description: "방학 동안 논문 도구가 크게 업그레이드됐습니다. 7문항 인터뷰로 연구 주제 문장을 추천받고, DOI 하나로 서지를 자동으로 채우고, 변인을 이어 연구 모형을 그리고, 계획서가 논문 1~3장의 뼈대가 되는 과정을 실제 여정 순서 그대로 시연합니다.",
                    });
                    // CTA 페이지를 워크숍 문구로
                    replaceText(pages, "지금 신청하세요", "9월 첫 세미나에서 만나요");
                    replaceText(pages, "자세한 내용은 학회 홈페이지에서", "체크리스트 미션 3종을 준비해 오세요");
                    now = new Date().toISOString();
                    doc = {
                        userId: owner.id,
                        authorName: ownerName,
                        docType: "cardnews",
                        title: TITLE,
                        pages: pages,
                        published: false,
                        createdAt: now,
                        updatedAt: now,
                    };
                    console.log("".concat(APPLY ? "CREATE" : "would create", ": ").concat(TITLE, " (").concat(pages.length, "\uD398\uC774\uC9C0, owner=").concat(ownerName, ")"));
                    if (!APPLY) return [3 /*break*/, 6];
                    return [4 /*yield*/, db.collection("design_documents").add(doc)];
                case 5:
                    ref = _b.sent();
                    console.log("\uC0DD\uC131 \uC644\uB8CC: /studio/".concat(ref.id));
                    _b.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
main().then(function () { return process.exit(0); }).catch(function (e) { console.error(e); process.exit(1); });
