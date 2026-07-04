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
// QA-v2(2026-07-03): 질적·혼합 연구방법 8종 published=false → true 전환.
//  · 배경: 파인더(research-finder)가 listPublished() 만 조회 — draft 라 일반 회원 결과가
//    폴백 라벨만 남고 상세 링크·선배논문 매칭이 소실됨 (QA 전수감사 High).
//  · 대상: seedKey = research-method:{slug} 8종. 멱등: 이미 published=true 면 건너뜀.
//  · 실행: set -a; source .env.local; set +a
//          npx tsc scripts/publish-qual-mixed-methods-2026-07-03.ts --module commonjs --outDir .seed-tmp \
//            --esModuleInterop --skipLibCheck && node .seed-tmp/scripts/publish-qual-mixed-methods-2026-07-03.js [--apply]
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var APPLY = process.argv.includes("--apply");
var COLLECTION = "archive_research_methods";
var TARGET_SLUGS = [
    "phenomenology",
    "ethnography",
    "narrative-inquiry",
    "qualitative-content-analysis",
    "convergent-parallel",
    "explanatory-sequential",
    "exploratory-sequential",
    "mixed-methods-overview",
];
var sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)({ credential: (0, app_1.cert)(sa) });
var db = (0, firestore_1.getFirestore)();
db.settings({ preferRest: true });
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var targets, snap, flipped, _i, _a, d, x;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    targets = new Set(TARGET_SLUGS.map(function (s) { return "research-method:".concat(s); }));
                    return [4 /*yield*/, db.collection(COLLECTION).get()];
                case 1:
                    snap = _b.sent();
                    flipped = 0;
                    _i = 0, _a = snap.docs;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 6];
                    d = _a[_i];
                    x = d.data();
                    if (!x.seedKey || !targets.has(x.seedKey))
                        return [3 /*break*/, 5];
                    if (x.published === true) {
                        console.log("skip (already published): ".concat(x.name, " [").concat(x.seedKey, "]"));
                        return [3 /*break*/, 5];
                    }
                    console.log("".concat(APPLY ? "PUBLISH" : "would publish", ": ").concat(x.name, " [").concat(x.seedKey, "]"));
                    if (!APPLY) return [3 /*break*/, 4];
                    return [4 /*yield*/, d.ref.update({ published: true, updatedAt: new Date().toISOString() })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    flipped += 1;
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6:
                    console.log("".concat(APPLY ? "published" : "dry-run", ": ").concat(flipped, "/").concat(TARGET_SLUGS.length));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (e) {
    console.error(e);
    process.exit(1);
});
