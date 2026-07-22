"use client";

/**
 * useHackathonEvent — 해커톤 행사 설정 resolve 훅 (2026-07-22)
 *
 * site_settings key="internal_conferences" 에서 해커톤 행사 레코드를 찾아
 * 각 설정 필드를 [이벤트 레코드 값 → config 상수 폴백] 순으로 병합해 반환한다.
 *
 * 로딩 중에는 config 상수를 그대로 반환하므로 깜빡임 없이 즉시 렌더된다.
 * 이벤트 레코드에 hackathonSettings 가 없으면 100% 기존 config 상수와 동일하다.
 */

import { useMemo } from "react";
import { useInternalConferences } from "@/features/site-settings/useInternalConferences";
import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_EVENT,
  HACKATHON_TIMELINE,
  HACKATHON_SUBMISSION_DEADLINE,
  HACKATHON_AWARDS_ANNOUNCE_DATE,
  HACKATHON_PHASE_TIMELINE,
  HACKATHON_DEFAULT_EVENT_MODE,
  PROPOSAL_EVENT,
  type EventMode,
} from "./config";

export interface ResolvedHackathonEvent {
  title: string;
  tagline: string;
  date: string;
  dayLabel: string;
  timeLabel: string;
  place: string;
  intro: string;
  highlights: readonly string[];
  timeline: readonly { time: string; label: string }[];
  submissionDeadline: string;
  awardsAnnounceDate: string;
  phaseStartDates: {
    registration: string;
    submission: string;
    judging: string;
    awards: string;
  };
  /**
   * 행사 모드 — Firestore(hackathonSettings.eventMode) → HACKATHON_DEFAULT_EVENT_MODE 순으로 해상.
   * "proposal" 이면 팀 기능 숨김·3필드 프로포절 폼 활성.
   */
  eventMode: EventMode;
}

/**
 * config 상수 기준 불변 기본값 — 로딩 중 폴백으로 사용.
 * HACKATHON_DEFAULT_EVENT_MODE 가 "proposal" 이면 PROPOSAL_EVENT 값을 기본값으로 선택한다.
 */
const isProposalDefault = HACKATHON_DEFAULT_EVENT_MODE === "proposal";
const CONFIG_DEFAULTS: ResolvedHackathonEvent = {
  title: isProposalDefault ? PROPOSAL_EVENT.title : HACKATHON_EVENT.title,
  tagline: isProposalDefault ? PROPOSAL_EVENT.tagline : HACKATHON_EVENT.tagline,
  date: HACKATHON_EVENT.date,
  dayLabel: HACKATHON_EVENT.dayLabel,
  timeLabel: HACKATHON_EVENT.timeLabel,
  place: HACKATHON_EVENT.place,
  intro: isProposalDefault ? PROPOSAL_EVENT.intro : HACKATHON_EVENT.intro,
  highlights: isProposalDefault ? PROPOSAL_EVENT.highlights : HACKATHON_EVENT.highlights,
  timeline: isProposalDefault ? [...PROPOSAL_EVENT.timeline] : HACKATHON_TIMELINE,
  submissionDeadline: HACKATHON_SUBMISSION_DEADLINE,
  awardsAnnounceDate: HACKATHON_AWARDS_ANNOUNCE_DATE,
  phaseStartDates: {
    registration: HACKATHON_PHASE_TIMELINE[0].startDate,
    submission: HACKATHON_PHASE_TIMELINE[1].startDate,
    judging: HACKATHON_PHASE_TIMELINE[2].startDate,
    awards: HACKATHON_PHASE_TIMELINE[3].startDate,
  },
  eventMode: HACKATHON_DEFAULT_EVENT_MODE,
};

/**
 * 해커톤 행사 설정을 Firestore(internal_conferences) → config 상수 순으로 resolve 해 반환.
 * 이벤트 레코드에 설정이 없으면 현행과 100% 동일하게 동작한다.
 */
export function useHackathonEvent(): {
  event: ResolvedHackathonEvent;
  isLoading: boolean;
} {
  const { conferences, isLoading } = useInternalConferences();

  const event = useMemo<ResolvedHackathonEvent>(() => {
    const conf = conferences.find((c) => c.contextId === HACKATHON_CONTEXT_ID);
    if (!conf) return CONFIG_DEFAULTS;

    const s = conf.hackathonSettings;
    const pd = s?.phaseStartDates;
    const defaults = CONFIG_DEFAULTS;

    return {
      title: conf.title || defaults.title,
      tagline: conf.tagline || defaults.tagline,
      date: conf.date || defaults.date,
      dayLabel: conf.dayLabel ?? defaults.dayLabel,
      timeLabel: conf.timeLabel ?? defaults.timeLabel,
      place: conf.place ?? defaults.place,
      intro: s?.intro || defaults.intro,
      highlights: s?.highlights?.length ? s.highlights : defaults.highlights,
      timeline: s?.timeline?.length ? s.timeline : defaults.timeline,
      submissionDeadline: s?.submissionDeadline || defaults.submissionDeadline,
      awardsAnnounceDate:
        s?.awardsAnnounceDate || conf.awardsAnnounceDate || defaults.awardsAnnounceDate,
      phaseStartDates: {
        registration: pd?.registration ?? defaults.phaseStartDates.registration,
        submission: pd?.submission ?? defaults.phaseStartDates.submission,
        judging: pd?.judging ?? defaults.phaseStartDates.judging,
        awards: pd?.awards ?? defaults.phaseStartDates.awards,
      },
      // eventMode: Firestore 레코드 → config 상수 폴백 순으로 해상
      eventMode: s?.eventMode ?? defaults.eventMode,
    };
  }, [conferences]);

  return { event, isLoading };
}
