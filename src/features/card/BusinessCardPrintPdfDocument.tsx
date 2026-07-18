// ── 인쇄소 제출용 명함 PDF (@react-pdf/renderer, 2026-07-19) ──
//
// 텍스트·도형은 전부 벡터(해상도 무관 = 300dpi 이상 충족), 한글은 Pretendard 임베드.
// QR·엠블럼은 고해상 PNG(data URL)로 임베드(불가피한 래스터). 색공간은 @react-pdf 특성상
// RGB — 다운로드 안내에서 "인쇄소 CMYK 변환 권장, 로고/QR 이미지는 RGB 포함"을 명시한다.
//
// 페이지 = 작업 사이즈 94×54mm(사방 2mm 재단여백). 배경은 페이지 전체(가장자리까지) 채움.
// 콘텐츠는 안전영역(작업 가장자리 4mm 안쪽 = 86×46mm)에 배치.

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import {
  MM_TO_PT,
  PRINT_SPEC,
  SOCIETY_NAME_EN,
  SOCIETY_NAME_KR,
  SOCIETY_TAGLINE,
  type PrintCardColors,
  type PrintCardLines,
} from "@/features/card/print-card";

// Pretendard 한글 폰트 등록 (jsDelivr CDN, OFL) — 증명서 PDF 와 동일 소스.
Font.register({
  family: "Pretendard",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Regular.otf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
      fontWeight: 700,
    },
  ],
});

const PAGE_W = PRINT_SPEC.bleedW * MM_TO_PT; // 94mm
const PAGE_H = PRINT_SPEC.bleedH * MM_TO_PT; // 54mm
const SAFE = PRINT_SPEC.safeInset * MM_TO_PT; // 4mm 안전여백

export interface BusinessCardPrintProps {
  fields: PrintCardLines & { name: string };
  colors: PrintCardColors;
  showEmail: boolean;
  showPhone: boolean;
  fieldTag?: string;
  /** 프로필 링크 (푸터/뒷면 캡션 표기용) */
  profileUrl: string;
  /** QR PNG data URL */
  qrDataUrl: string;
  /** 엠블럼 PNG data URL (없으면 텍스트 배지로 대체) */
  emblemDataUrl?: string;
  /** 뒷면 포함 여부 */
  includeBack: boolean;
}

export function BusinessCardPrintPdfDocument({
  fields,
  colors,
  showEmail,
  showPhone,
  fieldTag,
  profileUrl,
  qrDataUrl,
  emblemDataUrl,
  includeBack,
}: BusinessCardPrintProps) {
  const styles = StyleSheet.create({
    page: {
      backgroundColor: colors.bg,
      fontFamily: "Pretendard",
      color: colors.name,
    },
    // 안전영역 컨테이너
    frame: {
      position: "absolute",
      top: SAFE,
      left: SAFE,
      right: SAFE,
      bottom: SAFE,
      flexDirection: "row",
    },
    left: {
      flex: 1,
      justifyContent: "space-between",
      paddingRight: 8,
    },
    // ── 상단: 엠블럼 + 학회명 ──
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    emblemImg: {
      width: 20,
      height: 20,
    },
    emblemBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.emblemBadge,
      alignItems: "center",
      justifyContent: "center",
    },
    emblemFallback: {
      fontSize: 9,
      fontWeight: 700,
      color: colors.society,
    },
    societyKr: {
      fontSize: 9,
      fontWeight: 700,
      color: colors.society,
      letterSpacing: 0.5,
    },
    societyEn: {
      fontSize: 5.2,
      color: colors.sub,
      letterSpacing: 0.4,
      marginTop: 1,
    },
    // ── 중앙: 이름 + 직책/소속 ──
    nameBlock: {
      marginVertical: 4,
    },
    name: {
      fontSize: 21,
      fontWeight: 700,
      color: colors.name,
    },
    genLabel: {
      fontSize: 7,
      fontWeight: 400,
      color: colors.sub,
    },
    accentRule: {
      width: 30,
      height: 2,
      backgroundColor: colors.accent,
      marginTop: 5,
      marginBottom: 5,
    },
    position: {
      fontSize: 8.5,
      fontWeight: 700,
      color: colors.name,
    },
    affiliation: {
      fontSize: 7.5,
      color: colors.sub,
      marginTop: 1,
    },
    fieldTag: {
      fontSize: 6.5,
      color: colors.accent,
      marginTop: 2,
    },
    // ── 하단: 연락처 ──
    contactBlock: {
      gap: 1.5,
    },
    contactLine: {
      fontSize: 7.2,
      color: colors.sub,
    },
    // ── 우측: QR ──
    right: {
      width: 62,
      alignItems: "center",
      justifyContent: "center",
    },
    qrBox: {
      backgroundColor: colors.qrBox,
      padding: 3,
      borderRadius: 3,
    },
    qrImg: {
      width: 48,
      height: 48,
    },
    qrCaption: {
      fontSize: 5,
      color: colors.sub,
      marginTop: 3,
      textAlign: "center",
    },
    // ── 뒷면 ──
    backFrame: {
      position: "absolute",
      top: SAFE,
      left: SAFE,
      right: SAFE,
      bottom: SAFE,
      alignItems: "center",
      justifyContent: "center",
    },
    backEmblemBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.emblemBadge,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    backEmblemImg: {
      width: 34,
      height: 34,
    },
    backSocietyKr: {
      fontSize: 15,
      fontWeight: 700,
      color: colors.society,
      letterSpacing: 1,
    },
    backSocietyEn: {
      fontSize: 6.5,
      color: colors.sub,
      letterSpacing: 0.6,
      marginTop: 3,
    },
    backTagline: {
      fontSize: 7.5,
      color: colors.accent,
      marginTop: 8,
    },
    backUrl: {
      fontSize: 6,
      color: colors.sub,
      marginTop: 10,
    },
  });

  const contactLines: string[] = [];
  if (showEmail && fields.email) contactLines.push(fields.email);
  if (showPhone && fields.phone) contactLines.push(fields.phone);

  // 컴포넌트가 아닌 렌더 함수(직접 호출) — colors 의존 styles 를 클로저로 참조하되
  // react-hooks/static-components(렌더 중 컴포넌트 생성) 회피.
  const renderEmblem = (place: "front" | "back") => {
    const badge = place === "front" ? styles.emblemBadge : styles.backEmblemBadge;
    const img = place === "front" ? styles.emblemImg : styles.backEmblemImg;
    return (
      <View style={badge}>
        {emblemDataUrl ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={emblemDataUrl} style={img} />
        ) : (
          <Text style={styles.emblemFallback}>연</Text>
        )}
      </View>
    );
  };

  return (
    <Document
      title={`${SOCIETY_NAME_KR} 명함 — ${fields.name}`}
      author={SOCIETY_NAME_KR}
    >
      {/* ── 앞면 ── */}
      <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.left}>
            {/* 상단 브랜드 */}
            <View style={styles.brandRow}>
              {renderEmblem("front")}
              <View>
                <Text style={styles.societyKr}>{SOCIETY_NAME_KR}</Text>
                <Text style={styles.societyEn}>{SOCIETY_NAME_EN}</Text>
              </View>
            </View>

            {/* 이름 + 직책/소속 */}
            <View style={styles.nameBlock}>
              <Text style={styles.name}>
                {fields.name}
                {fields.generationLabel ? (
                  <Text style={styles.genLabel}>{`  ${fields.generationLabel}`}</Text>
                ) : null}
              </Text>
              <View style={styles.accentRule} />
              {fields.position ? <Text style={styles.position}>{fields.position}</Text> : null}
              {fields.affiliationLine ? (
                <Text style={styles.affiliation}>{fields.affiliationLine}</Text>
              ) : null}
              {fieldTag ? <Text style={styles.fieldTag}>#{fieldTag}</Text> : null}
            </View>

            {/* 하단 연락처 */}
            <View style={styles.contactBlock}>
              {contactLines.map((line, i) => (
                <Text key={i} style={styles.contactLine}>
                  {line}
                </Text>
              ))}
            </View>
          </View>

          {/* 우측 QR */}
          <View style={styles.right}>
            <View style={styles.qrBox}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrDataUrl} style={styles.qrImg} />
            </View>
            <Text style={styles.qrCaption}>QR · 프로필</Text>
          </View>
        </View>
      </Page>

      {/* ── 뒷면(선택) ── */}
      {includeBack && (
        <Page size={[PAGE_W, PAGE_H]} style={styles.page}>
          <View style={styles.backFrame}>
            {renderEmblem("back")}
            <Text style={styles.backSocietyKr}>{SOCIETY_NAME_KR}</Text>
            <Text style={styles.backSocietyEn}>{SOCIETY_NAME_EN}</Text>
            <Text style={styles.backTagline}>{SOCIETY_TAGLINE}</Text>
            <Text style={styles.backUrl}>{profileUrl}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
