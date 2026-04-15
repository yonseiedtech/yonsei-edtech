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
