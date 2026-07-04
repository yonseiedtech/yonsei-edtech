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
// 실사용 스냅샷 (2026-07-04) — 다음 사이클 제안서용 읽기 전용 집계.
// count() 집계 위주로 저비용. 어떤 데이터도 수정하지 않는다.
// 실행: set -a; source .env.local; set +a
//   npx tsc scripts/usage-snapshot-2026-07-04.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//   node .seed-tmp/usage-snapshot-2026-07-04.js
var app_1 = require("firebase-admin/app");
var firestore_1 = require("firebase-admin/firestore");
var sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!(0, app_1.getApps)().length)
    (0, app_1.initializeApp)({ credential: (0, app_1.cert)(sa) });
var db = (0, firestore_1.getFirestore)();
db.settings({ preferRest: true });
var now = Date.now();
var iso = function (daysAgo) { return new Date(now - daysAgo * 86400000).toISOString(); };
function cnt(q) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, q.count().get()];
                case 1: return [2 /*return*/, (_b.sent()).data().count];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, -1]; // 인덱스/권한 문제 표시
                case 3: return [2 /*return*/];
            }
        });
    });
}
var col = function (name) { return db.collection(name); };
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var out, _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, evSnap, evByType, _i, _24, d, t, logSnap, logByEvent, oldestLog, _25, _26, d, x, key, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52;
        var _53, _54, _55, _56, _57;
        return __generator(this, function (_58) {
            switch (_58.label) {
                case 0:
                    out = {};
                    // ── 회원·활성 ──
                    _a = out;
                    _b = "users.approved";
                    return [4 /*yield*/, cnt(col("users").where("approved", "==", true))];
                case 1:
                    // ── 회원·활성 ──
                    _a[_b] = _58.sent();
                    _c = out;
                    _d = "users.pending";
                    return [4 /*yield*/, cnt(col("users").where("approved", "==", false))];
                case 2:
                    _c[_d] = _58.sent();
                    _e = out;
                    _f = "users.active7d(lastVisitAt)";
                    return [4 /*yield*/, cnt(col("users").where("lastVisitAt", ">", iso(7)))];
                case 3:
                    _e[_f] = _58.sent();
                    _g = out;
                    _h = "users.active30d(lastVisitAt)";
                    return [4 /*yield*/, cnt(col("users").where("lastVisitAt", ">", iso(30)))];
                case 4:
                    _g[_h] = _58.sent();
                    // ── 연구 여정 문서 ──
                    _j = out;
                    _k = "writing_papers.total";
                    return [4 /*yield*/, cnt(col("writing_papers"))];
                case 5:
                    // ── 연구 여정 문서 ──
                    _j[_k] = _58.sent();
                    _l = out;
                    _m = "writing_papers.updated30d";
                    return [4 /*yield*/, cnt(col("writing_papers").where("lastSavedAt", ">", iso(30)))];
                case 6:
                    _l[_m] = _58.sent();
                    _o = out;
                    _p = "research_reports.total";
                    return [4 /*yield*/, cnt(col("research_reports"))];
                case 7:
                    _o[_p] = _58.sent();
                    _q = out;
                    _r = "research_reports.updated30d";
                    return [4 /*yield*/, cnt(col("research_reports").where("lastSavedAt", ">", iso(30)))];
                case 8:
                    _q[_r] = _58.sent();
                    _s = out;
                    _t = "research_proposals.total";
                    return [4 /*yield*/, cnt(col("research_proposals"))];
                case 9:
                    _s[_t] = _58.sent();
                    _u = out;
                    _v = "research_models.total";
                    return [4 /*yield*/, cnt(col("research_models"))];
                case 10:
                    _u[_v] = _58.sent();
                    _w = out;
                    _x = "writing_paper_versions.total";
                    return [4 /*yield*/, cnt(col("writing_paper_versions"))];
                case 11:
                    _w[_x] = _58.sent();
                    _y = out;
                    _z = "advisor_feedback_notes.total";
                    return [4 /*yield*/, cnt(col("advisor_feedback_notes"))];
                case 12:
                    _y[_z] = _58.sent();
                    // ── 논문 읽기·매트릭스 ──
                    _0 = out;
                    _1 = "research_papers.total";
                    return [4 /*yield*/, cnt(col("research_papers"))];
                case 13:
                    // ── 논문 읽기·매트릭스 ──
                    _0[_1] = _58.sent();
                    _2 = out;
                    _3 = "research_papers.completedRead";
                    return [4 /*yield*/, cnt(col("research_papers").where("readStatus", "==", "completed"))];
                case 14:
                    _2[_3] = _58.sent();
                    _4 = out;
                    _5 = "research_papers.matrix.methodology";
                    return [4 /*yield*/, cnt(col("research_papers").where("methodology", ">", ""))];
                case 15:
                    _4[_5] = _58.sent();
                    _6 = out;
                    _7 = "research_papers.matrix.findings";
                    return [4 /*yield*/, cnt(col("research_papers").where("findings", ">", ""))];
                case 16:
                    _6[_7] = _58.sent();
                    _8 = out;
                    _9 = "research_papers.matrix.sample";
                    return [4 /*yield*/, cnt(col("research_papers").where("sample", ">", ""))];
                case 17:
                    _8[_9] = _58.sent();
                    _10 = out;
                    _11 = "paper_reading_logs.total";
                    return [4 /*yield*/, cnt(col("paper_reading_logs"))];
                case 18:
                    _10[_11] = _58.sent();
                    _12 = out;
                    _13 = "paper_reading_logs.30d";
                    return [4 /*yield*/, cnt(col("paper_reading_logs").where("createdAt", ">", iso(30)))];
                case 19:
                    _12[_13] = _58.sent();
                    // ── 습관·타이머 ──
                    _14 = out;
                    _15 = "study_sessions.total";
                    return [4 /*yield*/, cnt(col("study_sessions"))];
                case 20:
                    // ── 습관·타이머 ──
                    _14[_15] = _58.sent();
                    _16 = out;
                    _17 = "study_sessions.30d";
                    return [4 /*yield*/, cnt(col("study_sessions").where("createdAt", ">", iso(30)))];
                case 21:
                    _16[_17] = _58.sent();
                    _18 = out;
                    _19 = "writing_paper_history.30d";
                    return [4 /*yield*/, cnt(col("writing_paper_history").where("savedAt", ">", iso(30)))];
                case 22:
                    _18[_19] = _58.sent();
                    _20 = out;
                    _21 = "diagnostic_results.total";
                    return [4 /*yield*/, cnt(col("diagnostic_results"))];
                case 23:
                    _20[_21] = _58.sent();
                    _22 = out;
                    _23 = "flashcards.total";
                    return [4 /*yield*/, cnt(col("flashcards"))];
                case 24:
                    _22[_23] = _58.sent();
                    return [4 /*yield*/, col("streak_events").limit(5000).get()];
                case 25:
                    evSnap = _58.sent();
                    evByType = new Map();
                    for (_i = 0, _24 = evSnap.docs; _i < _24.length; _i++) {
                        d = _24[_i];
                        t = (_53 = d.data().type) !== null && _53 !== void 0 ? _53 : "?";
                        evByType.set(t, ((_54 = evByType.get(t)) !== null && _54 !== void 0 ? _54 : 0) + 1);
                    }
                    out["streak_events.byType"] = Object.fromEntries(evByType);
                    return [4 /*yield*/, col("user_activity_logs").orderBy("createdAt", "desc").limit(3000).get()];
                case 26:
                    logSnap = _58.sent();
                    logByEvent = new Map();
                    oldestLog = "";
                    for (_25 = 0, _26 = logSnap.docs; _25 < _26.length; _25++) {
                        d = _26[_25];
                        x = d.data();
                        key = (_56 = (_55 = x.event) !== null && _55 !== void 0 ? _55 : x.type) !== null && _56 !== void 0 ? _56 : "?";
                        logByEvent.set(key, ((_57 = logByEvent.get(key)) !== null && _57 !== void 0 ? _57 : 0) + 1);
                        if (x.createdAt)
                            oldestLog = x.createdAt;
                    }
                    out["activity_logs.byEvent(latest3000)"] = Object.fromEntries(Array.from(logByEvent.entries()).sort(function (a, b) { return b[1] - a[1]; }));
                    out["activity_logs.windowOldest"] = oldestLog;
                    // ── 커뮤니티·행사 ──
                    _27 = out;
                    _28 = "posts.total";
                    return [4 /*yield*/, cnt(col("posts"))];
                case 27:
                    // ── 커뮤니티·행사 ──
                    _27[_28] = _58.sent();
                    _29 = out;
                    _30 = "posts.30d";
                    return [4 /*yield*/, cnt(col("posts").where("createdAt", ">", iso(30)))];
                case 28:
                    _29[_30] = _58.sent();
                    _31 = out;
                    _32 = "comments.30d";
                    return [4 /*yield*/, cnt(col("comments").where("createdAt", ">", iso(30)))];
                case 29:
                    _31[_32] = _58.sent();
                    _33 = out;
                    _34 = "seminar_attendees.checkedIn.total";
                    return [4 /*yield*/, cnt(col("seminar_attendees").where("checkedIn", "==", true))];
                case 30:
                    _33[_34] = _58.sent();
                    _35 = out;
                    _36 = "networking_rsvps.total";
                    return [4 /*yield*/, cnt(col("networking_rsvps"))];
                case 31:
                    _35[_36] = _58.sent();
                    _37 = out;
                    _38 = "networking_reviews.total";
                    return [4 /*yield*/, cnt(col("networking_reviews"))];
                case 32:
                    _37[_38] = _58.sent();
                    _39 = out;
                    _40 = "direct_messages.total";
                    return [4 /*yield*/, cnt(col("direct_messages"))];
                case 33:
                    _39[_40] = _58.sent();
                    _41 = out;
                    _42 = "profile_views.total";
                    return [4 /*yield*/, cnt(col("profile_views"))];
                case 34:
                    _41[_42] = _58.sent();
                    _43 = out;
                    _44 = "design_documents.total";
                    return [4 /*yield*/, cnt(col("design_documents"))];
                case 35:
                    _43[_44] = _58.sent();
                    _45 = out;
                    _46 = "collaborative_research.total";
                    return [4 /*yield*/, cnt(col("collaborative_research"))];
                case 36:
                    _45[_46] = _58.sent();
                    // ── 알림 소비 ──
                    _47 = out;
                    _48 = "notifications.total";
                    return [4 /*yield*/, cnt(col("notifications"))];
                case 37:
                    // ── 알림 소비 ──
                    _47[_48] = _58.sent();
                    _49 = out;
                    _50 = "notifications.unread";
                    return [4 /*yield*/, cnt(col("notifications").where("read", "==", false))];
                case 38:
                    _49[_50] = _58.sent();
                    _51 = out;
                    _52 = "notifications.30d";
                    return [4 /*yield*/, cnt(col("notifications").where("createdAt", ">", iso(30)))];
                case 39:
                    _51[_52] = _58.sent();
                    console.log(JSON.stringify(out, null, 2));
                    return [2 /*return*/];
            }
        });
    });
}
main().then(function () { return process.exit(0); }).catch(function (e) { console.error(e); process.exit(1); });
