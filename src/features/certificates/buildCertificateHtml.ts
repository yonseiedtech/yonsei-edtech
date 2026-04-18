/**
 * 서버 사이드용 수료증/감사장/임명장 HTML 빌더.
 * - DOM/React 의존성 없이 순수 문자열을 반환한다.
 * - `/api/certificates/pdf`(Puppeteer)에 그대로 전달 가능.
 * - 운영자 콘솔의 CertificatePreview "정통 격식체" 프리셋과 시각적으로 동등.
 */

import type { Certificate } from "@/types";

const FONT_STACK = "'Hahmlet', 'Noto Serif KR', 'Gowun Batang', serif";
const BORDER_COLOR = "#003378"; // 연세 블루

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inferSemester(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}년 ${m >= 3 && m <= 8 ? "1" : "2"}학기`;
}

function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function getTitle(type: Certificate["type"]): string {
  if (type === "completion") return "수 료 증";
  if (type === "appreciation") return "감 사 장";
  return "임 명 장";
}

function getDefaultBody(cert: Certificate): string {
  const semester = inferSemester(cert.issuedAt);
  const seminarTitle = cert.seminarTitle || "___";
  if (cert.type === "completion") {
    return `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle}>에 참석하여 소정의 과정을 이수하였기에 이 수료증을 수여합니다.`;
  }
  if (cert.type === "appointment") {
    const position = cert.appointmentPosition || seminarTitle;
    return `귀하를 ${semester} 연세대학교 교육공학회 ${position}(으)로 임명합니다.\n\n귀하의 헌신적인 활동을 기대하며, 학회 발전에 크게 기여해주시기 바랍니다.`;
  }
  return `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle}>에서 귀하께서 지니신 지식과 경험을 헌신적이고 열정적으로 공유해주심으로서 구성원들의 성장에 큰 도움을 주셨음에 감사드리며, 연세교육공학회 구성원들의 마음을 담아 감사장을 드립니다.`;
}

/**
 * 서버 사이드 cert HTML 생성.
 * /api/certificates/pdf 의 buildHtml() 안쪽에 들어가는 div.cert-page 자식 본문.
 */
export function buildCertificateHtml(cert: Certificate): string {
  const title = getTitle(cert.type);
  const body = getDefaultBody(cert);
  const dateStr = formatKoreanDate(cert.issuedAt);
  const certNo = cert.certificateNo ? `제 ${escapeHtml(cert.certificateNo)} 호` : "";
  const recipient = escapeHtml(cert.recipientName || "");
  const bodyHtml = escapeHtml(body).replace(/\n/g, "<br/>");

  return `
<div style="
  width: 210mm;
  min-height: 297mm;
  padding: 24mm 26mm;
  box-sizing: border-box;
  background: #fff;
  font-family: ${FONT_STACK};
  color: #1a1a1a;
  display: flex;
  flex-direction: column;
  border: 6px double ${BORDER_COLOR};
  position: relative;
">
  <div style="
    font-size: 11pt;
    letter-spacing: 0.08em;
    text-align: left;
    color: #444;
    margin-bottom: 18mm;
  ">${certNo}</div>

  <div style="
    font-size: 42pt;
    letter-spacing: 0.3em;
    text-align: center;
    font-weight: 700;
    color: ${BORDER_COLOR};
    margin-bottom: 10mm;
  ">${escapeHtml(title)}</div>

  <div style="
    font-size: 26pt;
    letter-spacing: 0.25em;
    text-align: right;
    margin-bottom: 14mm;
    font-weight: 600;
  ">${recipient} <span style="font-size: 18pt; font-weight: 400;">귀하</span></div>

  <div style="
    font-size: 12.5pt;
    line-height: 2.5;
    text-align: justify;
    flex: 1;
  ">${bodyHtml}</div>

  <div style="
    font-size: 13pt;
    letter-spacing: 0.15em;
    text-align: center;
    margin-top: 22mm;
  ">${escapeHtml(dateStr)}</div>

  <div style="
    font-size: 26px;
    letter-spacing: 0.2em;
    text-align: center;
    margin-top: 18mm;
    font-weight: 700;
    color: ${BORDER_COLOR};
  ">연 세 교 육 공 학 회</div>
</div>`.trim();
}

/**
 * 수료증 이메일 HTML 본문.
 * - 발급 안내 + 첨부 안내 + 학회보 링크
 */
export function buildCertificateEmailHtml(cert: Certificate, opts?: { siteUrl?: string }): string {
  const siteUrl = opts?.siteUrl ?? "https://yonsei-edtech.vercel.app";
  const typeLabel =
    cert.type === "completion" ? "수료증" : cert.type === "appreciation" ? "감사장" : "임명장";
  const greeting =
    cert.type === "completion"
      ? "참석해주셔서 진심으로 감사드립니다."
      : cert.type === "appreciation"
      ? "헌신적인 기여에 진심으로 감사드립니다."
      : "임명을 진심으로 축하드립니다.";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(typeLabel)} 발급 안내</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#222;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.05);">
      <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:.2em;color:${BORDER_COLOR};font-weight:700;">YONSEI EDTECH</p>
      <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;">${escapeHtml(cert.recipientName || "")} 님, ${escapeHtml(typeLabel)}이 발급되었습니다.</h1>
      <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#555;">${escapeHtml(greeting)}</p>

      <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0;font-size:13px;">
        <tr>
          <td style="padding:8px 0;color:#888;width:90px;">증서 번호</td>
          <td style="padding:8px 0;font-weight:600;">${escapeHtml(cert.certificateNo || "—")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;">유형</td>
          <td style="padding:8px 0;">${escapeHtml(typeLabel)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;">행사</td>
          <td style="padding:8px 0;">${escapeHtml(cert.seminarTitle || "—")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;">발급일</td>
          <td style="padding:8px 0;">${escapeHtml(formatKoreanDate(cert.issuedAt))}</td>
        </tr>
      </table>

      <div style="background:#f0f4f9;border-left:3px solid ${BORDER_COLOR};padding:12px 16px;margin:0 0 24px 0;border-radius:4px;font-size:13px;color:#444;line-height:1.6;">
        본 메일에 PDF 파일이 첨부되어 있습니다. 인쇄해 보관하시거나 마이페이지의 수료증 메뉴에서 언제든 다시 다운로드하실 수 있습니다.
      </div>

      <div style="text-align:center;margin:0 0 8px 0;">
        <a href="${siteUrl}/mypage" style="display:inline-block;padding:12px 28px;background:${BORDER_COLOR};color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">마이페이지에서 확인</a>
      </div>
    </div>

    <p style="margin:16px 0 0 0;text-align:center;font-size:11px;color:#999;">
      연세교육공학회 · <a href="${siteUrl}" style="color:#999;">yonsei-edtech.vercel.app</a>
    </p>
  </div>
</body>
</html>`;
}

export function buildCertificateEmailSubject(cert: Certificate): string {
  const typeLabel =
    cert.type === "completion" ? "수료증" : cert.type === "appreciation" ? "감사장" : "임명장";
  return `[연세교육공학회] ${cert.recipientName || ""} 님 ${typeLabel} 발급 안내 (${cert.certificateNo || ""})`;
}
