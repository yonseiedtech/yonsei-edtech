// 약관/개인정보 버전 관리
// 각 문서 개정 시 해당 버전을 올리면, 기존 사용자에게 재동의 모달이 강제 노출됩니다.

export const CURRENT_TERMS = {
  terms: "1.0.0",
  privacy: "1.0.0",
  collection: "1.0.0",
} as const;

export interface ConsentRecord {
  agreed: boolean;
  version: string;
  at: string; // ISO datetime
}

export interface UserConsents {
  terms?: ConsentRecord;
  privacy?: ConsentRecord;
  collection?: ConsentRecord;
  marketing?: ConsentRecord;
}

export type RequiredConsentKey = "terms" | "privacy" | "collection";
export type ConsentKey = RequiredConsentKey | "marketing";

export const REQUIRED_CONSENT_KEYS: RequiredConsentKey[] = ["terms", "privacy", "collection"];

export const CONSENT_LABELS: Record<ConsentKey, string> = {
  terms: "서비스 이용약관 동의",
  privacy: "개인정보처리방침 동의",
  collection: "개인정보 수집·이용 동의",
  marketing: "마케팅·이벤트 정보 수신 동의",
};

export const CONSENT_SUMMARIES: Record<ConsentKey, { oneLine: string; body: string }> = {
  terms: {
    oneLine: "연세교육공학회 서비스 이용에 관한 기본 규정을 안내합니다.",
    body:
      "본 약관은 연세교육공학회가 제공하는 웹사이트 및 부가 서비스의 이용조건과 절차, 회원과 학회의 권리·의무·책임 사항을 규정합니다. 회원은 학회의 공지사항 및 운영 방침을 준수해야 하며, 부정 이용 시 서비스 이용이 제한될 수 있습니다. 자세한 내용은 전문에서 확인해주세요.",
  },
  privacy: {
    oneLine: "개인정보의 처리 목적, 항목, 보유기간 및 이용자의 권리를 안내합니다.",
    body:
      "학회는 회원 관리, 세미나·활동 운영, 수료증 발급 등을 위해 필수 항목(이름, 이메일, 학번, 연락처 등)과 선택 항목을 수집·이용합니다. 개인정보는 회원 탈퇴 또는 관련 법령에 따른 보관기간 경과 시 지체없이 파기됩니다. 이용자는 언제든 열람·정정·삭제·처리정지를 요청할 수 있습니다.",
  },
  collection: {
    oneLine: "회원가입 및 서비스 제공을 위해 아래 개인정보를 수집·이용합니다.",
    body:
      "수집항목: 이름, 학번, 이메일, 연락처, 생년월일, 소속, 약관 동의 이력 등. 수집목적: 회원 식별 및 관리, 세미나/활동 참가, 수료증 및 증빙 발급, 공지 및 안내. 보유기간: 회원 탈퇴 시까지 또는 법령에 따른 기간. 동의를 거부할 권리가 있으나 필수항목 미동의 시 서비스 이용이 제한됩니다.",
  },
  marketing: {
    oneLine: "세미나·행사·뉴스레터 등 마케팅 정보 수신에 동의 여부를 선택하세요.",
    body:
      "동의 시 학회의 세미나·행사 안내, 뉴스레터, 각종 프로모션 정보를 이메일·문자로 발송해 드립니다. 본 항목은 선택사항이며 동의하지 않아도 서비스 이용에는 제한이 없습니다. 수신 동의는 언제든 마이페이지에서 철회할 수 있습니다.",
  },
};

export const CONSENT_LINKS: Record<ConsentKey, string> = {
  terms: "/terms",
  privacy: "/privacy",
  collection: "/consent",
  marketing: "/consent",
};

export function buildFreshConsents(opts: {
  terms: boolean;
  privacy: boolean;
  collection: boolean;
  marketing?: boolean;
}): UserConsents {
  const now = new Date().toISOString();
  return {
    terms: { agreed: opts.terms, version: CURRENT_TERMS.terms, at: now },
    privacy: { agreed: opts.privacy, version: CURRENT_TERMS.privacy, at: now },
    collection: { agreed: opts.collection, version: CURRENT_TERMS.collection, at: now },
    marketing: { agreed: !!opts.marketing, version: CURRENT_TERMS.collection, at: now },
  };
}

/** 필수 동의 항목 중 하나라도 현재 버전과 다르거나 미동의이면 true */
export function needsReConsent(consents: UserConsents | undefined | null): boolean {
  if (!consents) return true;
  for (const k of REQUIRED_CONSENT_KEYS) {
    const rec = consents[k];
    if (!rec || !rec.agreed) return true;
    if (rec.version !== CURRENT_TERMS[k]) return true;
  }
  return false;
}
