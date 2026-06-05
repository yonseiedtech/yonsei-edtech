# -*- coding: utf-8 -*-
"""
학습 잔디(LearningStreak) anonymized exemplar PNG 생성기.

본 스크립트는 로그인 필요 페이지(/mypage)의 학습 잔디 컴포넌트를
실제 회원 데이터 노출 없이 재현하기 위한 **익명 예시 도식**을 생성한다.
LearningStreak.tsx 의 시각 구조(53주 × 7일, 12px 셀, 5단계 emerald 색상,
월 라벨, 통계 헤더, 색 범례, 가중치 footer, 마일스톤 배지)를 그대로 따른다.

출력: figures/site/screenshot1_streak.png

실행:
    python generate_streak_exemplar.py
"""

import os
import random
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "figures", "site")
OUT_PATH = os.path.join(OUT_DIR, "screenshot1_streak.png")
os.makedirs(OUT_DIR, exist_ok=True)

# ─── 시각 파라미터 (LearningStreak.tsx 와 정확히 일치) ───────────────────
WEEKS = 53
DAYS = 7

CELL = 18      # 셀 한 변(px). 컴포넌트 원본은 12px이나 PNG 해상도용 1.5배
GAP = 3        # 셀 간격
RADIUS = 4     # 둥근 모서리

# Tailwind emerald 색상 hex
COLOR_EMPTY    = (243, 244, 246)   # gray-100 ≈ bg-muted/40
COLOR_LV1      = (167, 243, 208)   # emerald-200
COLOR_LV2      = (52, 211, 153)    # emerald-400
COLOR_LV3      = (16, 185, 129)    # emerald-500
COLOR_LV4      = (4, 120, 87)      # emerald-700
COLOR_BORDER   = (229, 231, 235)   # gray-200
COLOR_BG       = (255, 255, 255)
COLOR_TEXT     = (17, 24, 39)      # gray-900
COLOR_MUTED    = (107, 114, 128)   # gray-500
COLOR_ACCENT   = (5, 150, 105)     # emerald-600 (header sprout)
COLOR_FLAME    = (244, 63, 94)     # rose-500
COLOR_AMBER_BG = (254, 243, 199)   # amber-50
COLOR_AMBER_FG = (180, 83, 9)      # amber-700
COLOR_AMBER_BR = (252, 211, 77)    # amber-300


def intensity_color(score: int) -> tuple:
    """LearningStreak.intensityClass() 와 일치."""
    if score <= 0:
        return COLOR_EMPTY
    if score < 6:
        return COLOR_LV1
    if score < 11:
        return COLOR_LV2
    if score < 21:
        return COLOR_LV3
    return COLOR_LV4


def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Windows 한글 친화 폰트 우선 검색."""
    candidates = (
        ["malgunbd.ttf", "C:/Windows/Fonts/malgunbd.ttf"] if bold
        else ["malgun.ttf", "C:/Windows/Fonts/malgun.ttf"]
    )
    for p in candidates:
        try:
            return ImageFont.truetype(p, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def make_exemplar_scores() -> list:
    """53주 × 7일의 점수 패턴 생성 — anonymized exemplar.

    설계 원칙:
      - 학기 초반(왼쪽)은 활동이 적고, 학기 중반 이후 활동 증가
      - 주말(0=일/6=토) 활동 빈도가 약간 낮음
      - 일부 '집중 활동 주' (마일스톤 직전) 가 진하게 보이도록
      - 마지막 ~5주는 '현재 시점' 직전 — 가장 빈번
    """
    rng = random.Random(20260601)  # 재현 가능
    cells = [[0] * WEEKS for _ in range(DAYS)]
    for w in range(WEEKS):
        # 활동 강도 ramp — 학기 초 0.2 → 후반 0.85
        ramp = 0.20 + 0.65 * (w / max(1, WEEKS - 1))
        # 일부 '집중 주' 부스트
        if w in (12, 22, 33, 44, 49):
            ramp = min(0.95, ramp + 0.25)
        for d in range(DAYS):
            # 주말 약간 줄임
            weekend_dip = 0.20 if d in (0, 6) else 0.0
            p_active = max(0.05, ramp - weekend_dip)
            if rng.random() < p_active:
                # 점수 분포 — 활동 가중치 합산 시뮬레이션
                r = rng.random()
                if r < 0.45:
                    score = rng.randint(1, 5)       # 댓글·짧은 활동
                elif r < 0.78:
                    score = rng.randint(6, 10)      # 후기·게시글
                elif r < 0.95:
                    score = rng.randint(11, 20)     # 출석 + 활동
                else:
                    score = rng.randint(21, 35)     # 다중 활동 합산
                cells[d][w] = score
    return cells


def main():
    cells = make_exemplar_scores()

    total_score = sum(cells[d][w] for d in range(DAYS) for w in range(WEEKS))
    active_days = sum(1 for d in range(DAYS) for w in range(WEEKS) if cells[d][w] > 0)
    # 주 단위 streak (마지막 주부터 연속)
    weekly_active = [any(cells[d][w] > 0 for d in range(DAYS)) for w in range(WEEKS)]
    week_streak = 0
    for w in range(WEEKS - 1, -1, -1):
        if weekly_active[w]:
            week_streak += 1
        else:
            break

    # 캔버스 크기
    grid_w = WEEKS * (CELL + GAP) - GAP
    grid_h = DAYS * (CELL + GAP) - GAP
    pad_x = 32
    header_h = 72
    month_label_h = 22
    legend_h = 28
    badges_h = 40
    footer_h = 26
    H = header_h + month_label_h + grid_h + legend_h + badges_h + footer_h + 48
    W = pad_x * 2 + grid_w + 20

    img = Image.new("RGB", (W, H), COLOR_BG)
    draw = ImageDraw.Draw(img)

    # 외곽 카드 (rounded rect)
    draw.rounded_rectangle(
        [(pad_x - 16, 16), (W - pad_x + 16, H - 16)],
        radius=16,
        outline=COLOR_BORDER,
        width=1,
        fill=(255, 255, 255),
    )

    # ─── Header: 학습 잔디 + 통계 ───────────────────────────────────────
    f_hdr  = find_font(22, bold=True)
    f_stat = find_font(15)
    f_strong = find_font(15, bold=True)
    f_lbl  = find_font(13)
    f_foot = find_font(12)
    f_mon  = find_font(12)

    y = 32
    # 새싹 아이콘 자리 (작은 emerald 원)
    icon_cx = pad_x + 10
    icon_cy = y + 11
    draw.ellipse([icon_cx - 9, icon_cy - 9, icon_cx + 9, icon_cy + 9], fill=COLOR_ACCENT)
    draw.text((pad_x + 24, y - 2), "학습 잔디", font=f_hdr, fill=COLOR_TEXT)

    # 우측 통계
    right_x = W - pad_x
    stat_y = y + 4
    # 순위 버튼 mock
    btn_w = 92
    draw.rounded_rectangle(
        [(right_x - btn_w, stat_y - 4), (right_x, stat_y + 20)],
        radius=12, outline=COLOR_AMBER_BR, width=1, fill=COLOR_AMBER_BG,
    )
    draw.text((right_x - btn_w + 14, stat_y + 1), "🏆 순위 보기", font=f_lbl, fill=COLOR_AMBER_FG)

    # streak·누적·활동
    txt = f"{week_streak}"
    s_x = right_x - btn_w - 14
    # streak
    draw.text((s_x - 24, stat_y + 1), "주 streak", font=f_lbl, fill=COLOR_MUTED)
    draw.text((s_x - 24 - 18, stat_y + 1), txt, font=f_strong, fill=COLOR_TEXT)
    s_x -= 24 + 18 + 8 + draw.textlength("주 streak", font=f_lbl)
    # 화염 아이콘
    fl_x = s_x - 12
    draw.text((fl_x, stat_y + 1), "🔥", font=f_lbl, fill=COLOR_FLAME)

    s_x = fl_x - 20
    # 누적 N점
    t1 = "누적"
    t2 = f"{total_score}"
    t3 = "점"
    tw = draw.textlength(t1 + " " + t2 + " " + t3, font=f_lbl)
    draw.text((s_x - tw, stat_y + 1), t1, font=f_lbl, fill=COLOR_MUTED)
    draw.text((s_x - tw + draw.textlength(t1 + " ", font=f_lbl), stat_y + 1), t2, font=f_strong, fill=COLOR_TEXT)
    draw.text((s_x - tw + draw.textlength(t1 + " " + t2 + " ", font=f_lbl), stat_y + 1), t3, font=f_lbl, fill=COLOR_MUTED)

    s_x -= tw + 16
    # 활동 N일
    t1 = "활동"
    t2 = f"{active_days}"
    t3 = "일"
    tw = draw.textlength(t1 + " " + t2 + " " + t3, font=f_lbl)
    draw.text((s_x - tw, stat_y + 1), t1, font=f_lbl, fill=COLOR_MUTED)
    draw.text((s_x - tw + draw.textlength(t1 + " ", font=f_lbl), stat_y + 1), t2, font=f_strong, fill=COLOR_TEXT)
    draw.text((s_x - tw + draw.textlength(t1 + " " + t2 + " ", font=f_lbl), stat_y + 1), t3, font=f_lbl, fill=COLOR_MUTED)

    # 학기 라벨 (배경 chip)
    sem_y = y + 30
    sem_txt = "2026년 전기 (3월~)"
    sw = draw.textlength(sem_txt, font=f_strong) + 16
    sem_cx = (pad_x + W - pad_x) // 2
    draw.rounded_rectangle(
        [(sem_cx - sw / 2, sem_y), (sem_cx + sw / 2, sem_y + 22)],
        radius=12, outline=COLOR_BORDER, width=1, fill=(249, 250, 251),
    )
    draw.text((sem_cx - sw / 2 + 8, sem_y + 3), sem_txt, font=f_strong, fill=COLOR_TEXT)
    # "현재" 배지
    badge_x = sem_cx + sw / 2 + 6
    draw.rounded_rectangle(
        [(badge_x, sem_y + 4), (badge_x + 36, sem_y + 18)],
        radius=8, fill=(209, 250, 229),
    )
    draw.text((badge_x + 7, sem_y + 5), "현재", font=f_foot, fill=(4, 120, 87))

    # ─── 월 라벨 ────────────────────────────────────────────────────────
    grid_x = pad_x
    grid_y = header_h + month_label_h + 32

    # 월 라벨 (학기 초 = 3월, 53주 약 12개월. 단순화: 시작 월 3월부터 53주분 → 약 13개월 cover)
    months_kr = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
    start_month = 3  # 학기 전기 시작
    label_y = grid_y - month_label_h
    last_m = -1
    for w in range(WEEKS):
        # 첫 주에 표시할 월 (대략 4-5주마다)
        m_idx = (start_month + w // 4 - 1) % 12
        if w % 4 == 0 and m_idx != last_m:
            x = grid_x + w * (CELL + GAP)
            draw.text((x, label_y), months_kr[m_idx], font=f_mon, fill=COLOR_MUTED)
            last_m = m_idx

    # ─── 그리드 셀 ──────────────────────────────────────────────────────
    for w in range(WEEKS):
        for d in range(DAYS):
            x0 = grid_x + w * (CELL + GAP)
            y0 = grid_y + d * (CELL + GAP)
            color = intensity_color(cells[d][w])
            draw.rounded_rectangle(
                [(x0, y0), (x0 + CELL, y0 + CELL)],
                radius=RADIUS, fill=color,
            )

    # ─── 색 범례 ────────────────────────────────────────────────────────
    leg_y = grid_y + grid_h + 22
    leg_x = grid_x
    draw.text((leg_x, leg_y), "적음", font=f_foot, fill=COLOR_MUTED)
    leg_x += draw.textlength("적음", font=f_foot) + 6
    for col in (COLOR_EMPTY, COLOR_LV1, COLOR_LV2, COLOR_LV3, COLOR_LV4):
        draw.rounded_rectangle(
            [(leg_x, leg_y - 1), (leg_x + 14, leg_y + 13)],
            radius=3, fill=col,
        )
        leg_x += 18
    draw.text((leg_x, leg_y), "많음", font=f_foot, fill=COLOR_MUTED)

    # ─── 마일스톤 배지 (예시) ─────────────────────────────────────────────
    badge_y = leg_y + 30
    badges = [
        "🌱 첫 활동 🎉",
        "🏆 이번 달 10일 활동",
        "🔥 5주 연속",
        "🏆 누적 100점",
    ]
    bx = grid_x
    for b in badges:
        tw = draw.textlength(b, font=f_foot) + 16
        draw.rounded_rectangle(
            [(bx, badge_y), (bx + tw, badge_y + 22)],
            radius=11, fill=(236, 253, 245), outline=(167, 243, 208), width=1,
        )
        draw.text((bx + 8, badge_y + 4), b, font=f_foot, fill=(6, 95, 70))
        bx += tw + 8

    # ─── footer 가중치 ──────────────────────────────────────────────────
    foot_y = badge_y + 38
    foot_txt = "가중치: 세미나 출석 +10 · 강의 후기 +5 · 글 작성 +5 · 타이머 30분 +3 · 댓글 +1"
    draw.text((grid_x, foot_y), foot_txt, font=f_foot, fill=COLOR_MUTED)

    # ─── anonymized exemplar 워터마크 ───────────────────────────────────
    wm = "anonymized exemplar — 본 도식은 LearningStreak 컴포넌트의 시각 구조를 따른 모의 데이터로, 실제 회원 활동을 노출하지 않는다."
    wm_y = foot_y + 22
    draw.text((grid_x, wm_y), wm, font=f_foot, fill=(156, 163, 175))

    img.save(OUT_PATH, "PNG", optimize=True)
    print(f"saved: {OUT_PATH}")
    print(f"  size: {W}×{H} px")
    print(f"  exemplar stats: active={active_days}d, total={total_score}pt, week_streak={week_streak}w")


if __name__ == "__main__":
    main()
