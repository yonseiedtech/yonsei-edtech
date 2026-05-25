# -*- coding: utf-8 -*-
"""
이론-구현 매트릭스 논문용 figure 자동 생성 스크립트.
- Figure 1: 10×9 이론-구현 매트릭스 heatmap (논문의 central figure)
- Figure 2: 9개 사이트 도메인 architecture overview
- Figure 3: 출판 트랙 분기 다이어그램 (워킹 vs 정식)
- Figure 4: 저자 동의 게이트 워크플로우

실행: python generate_figures.py
출력: docs/papers/figures/*.png (300 DPI, 학회지 게재 품질)
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib import font_manager
import numpy as np

# 한글 폰트 설정 — Windows 기본 맑은 고딕
for candidate in ["Malgun Gothic", "맑은 고딕", "NanumGothic", "Arial"]:
    if any(f.name == candidate for f in font_manager.fontManager.ttflist):
        matplotlib.rcParams["font.family"] = candidate
        break
matplotlib.rcParams["axes.unicode_minus"] = False

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "figures")
os.makedirs(OUT_DIR, exist_ok=True)


# ===========================================================
# Figure 1: 이론-구현 매트릭스 heatmap
# ===========================================================
def fig1_matrix():
    theories = [
        "SRL\n(자기조절학습)",
        "SDT\n(자기결정성)",
        "CLT\n(인지부하)",
        "CTML\n(다중매체)",
        "CoP\n(실천공동체)",
        "Cog.App.\n(인지도제)",
        "Dist.Cog.\n(분산인지)",
        "FA\n(형성평가)",
        "Self-Efficacy\n+Gamification",
        "Open Science\n+Procedural J.",
    ]
    domains = [
        "학습 잔디",
        "공동 작성",
        "출판 마법사",
        "검수 게이트",
        "저자 동의",
        "CoP 계보",
        "분석 매트릭스",
        "게임화",
        "데이터 공유",
    ]
    # 매핑 강도 0 (없음) 1 (잠재) 2 (부분) 3 (중요) 4 (핵심)
    M = np.array([
        # 잔디 공동 마법사 검수 동의 CoP  분석 게임 데이터
        [4,   1,   3,    0,   0,   0,   3,   2,   0],   # SRL
        [3,   1,   0,    1,   3,   2,   4,   3,   0],   # SDT
        [1,   3,   4,    2,   0,   0,   0,   0,   0],   # CLT
        [0,   2,   2,    0,   0,   3,   2,   0,   0],   # CTML
        [1,   3,   2,    2,   2,   4,   2,   0,   2],   # CoP
        [0,   3,   2,    4,   0,   3,   0,   0,   0],   # Cog.App.
        [0,   4,   2,    0,   0,   0,   3,   0,   0],   # Dist.Cog.
        [0,   2,   2,    4,   3,   0,   2,   0,   0],   # FA
        [3,   2,   3,    3,   2,   3,   3,   3,   0],   # Self-Eff.
        [0,   2,   3,    0,   4,   0,   3,   0,   4],   # Open Sci.
    ])
    fig, ax = plt.subplots(figsize=(11, 9))
    cmap = plt.cm.YlGnBu
    im = ax.imshow(M, cmap=cmap, vmin=0, vmax=4, aspect="auto")

    ax.set_xticks(range(len(domains)))
    ax.set_yticks(range(len(theories)))
    ax.set_xticklabels(domains, rotation=30, ha="right", fontsize=10)
    ax.set_yticklabels(theories, fontsize=10)

    # 각 셀에 강도 dot 표시
    symbols = {0: "", 1: "◐", 2: "●", 3: "●●", 4: "●●●"}
    for i in range(M.shape[0]):
        for j in range(M.shape[1]):
            v = M[i, j]
            if v == 0:
                continue
            color = "white" if v >= 3 else "black"
            ax.text(j, i, symbols[v], ha="center", va="center",
                    color=color, fontsize=11, fontweight="bold")

    cbar = plt.colorbar(im, ax=ax, shrink=0.7, pad=0.02)
    cbar.set_ticks([0, 1, 2, 3, 4])
    cbar.set_ticklabels(["없음", "◐ 잠재", "● 부분", "●● 중요", "●●● 핵심"])
    cbar.set_label("매핑 강도", fontsize=10)

    ax.set_title(
        "Figure 1. 교육공학 이론 × 사이트 도메인 구현 매트릭스",
        fontsize=13, fontweight="bold", pad=15,
    )
    ax.set_xlabel("사이트 도메인", fontsize=11, labelpad=10)
    ax.set_ylabel("교육공학 이론", fontsize=11, labelpad=10)

    plt.tight_layout()
    out = os.path.join(OUT_DIR, "figure1_matrix.png")
    plt.savefig(out, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"saved: {out}")


# ===========================================================
# Figure 2: 사이트 architecture overview (9 도메인)
# ===========================================================
def fig2_architecture():
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis("off")

    # 9 도메인 박스 (3x3 그리드)
    domains = [
        ("학회 운영\n(세미나·학술활동)", 1, 7, "#FFE4B5"),
        ("공동 연구\n(팀·초대·메타)", 4.5, 7, "#B0E0E6"),
        ("연구지 출판\n(워킹·정식·검수)", 8, 7, "#DDA0DD"),
        ("공동 작성\n(챕터·댓글·미팅)", 1, 4.5, "#B0E0E6"),
        ("학습 잔디\n(365일 streak)", 4.5, 4.5, "#90EE90"),
        ("CoP 계보\n(졸업생·멘토링)", 8, 4.5, "#FFE4B5"),
        ("기여도 매트릭스\n(CRediT × 활동)", 1, 2, "#FFD700"),
        ("학회보 (Card News)\n+ 아카이브", 4.5, 2, "#FFA07A"),
        ("알림 + 게임화\n(leaderboard)", 8, 2, "#90EE90"),
    ]
    for label, x, y, color in domains:
        box = FancyBboxPatch(
            (x - 1.4, y - 0.8), 2.8, 1.6,
            boxstyle="round,pad=0.05,rounding_size=0.15",
            linewidth=1.5, edgecolor="#333", facecolor=color, alpha=0.85,
        )
        ax.add_patch(box)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=10, fontweight="bold", wrap=True)

    # 중심: 사용자
    user_box = FancyBboxPatch(
        (4.5, 0.1), 3, 0.7,
        boxstyle="round,pad=0.05,rounding_size=0.1",
        linewidth=2, edgecolor="#1f77b4", facecolor="#cfe2ff",
    )
    ax.add_patch(user_box)
    ax.text(6, 0.45, "대학원생·운영진·졸업생 (회원)",
            ha="center", va="center", fontsize=11, fontweight="bold")

    ax.set_title(
        "Figure 2. yonsei-edtech 사이트의 9개 도메인 architecture overview",
        fontsize=13, fontweight="bold", pad=10,
    )
    plt.tight_layout()
    out = os.path.join(OUT_DIR, "figure2_architecture.png")
    plt.savefig(out, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"saved: {out}")


# ===========================================================
# Figure 3: 출판 트랙 분기 (워킹 vs 정식)
# ===========================================================
def fig3_publish_flow():
    fig, ax = plt.subplots(figsize=(12, 7))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 7)
    ax.axis("off")

    # 시작
    start = FancyBboxPatch(
        (5, 5.5), 2, 0.9, boxstyle="round,pad=0.05,rounding_size=0.15",
        linewidth=1.5, edgecolor="#333", facecolor="#E0E7FF",
    )
    ax.add_patch(start)
    ax.text(6, 5.95, "팀의 연구 결과", ha="center", va="center",
            fontsize=11, fontweight="bold")

    # 분기 — 워킹/정식
    working = FancyBboxPatch(
        (0.5, 3.5), 4, 1, boxstyle="round,pad=0.05,rounding_size=0.15",
        linewidth=1.5, edgecolor="#0d9488", facecolor="#A7F3D0",
    )
    ax.add_patch(working)
    ax.text(2.5, 4, "워킹 페이퍼 트랙\n(검수 없이 자율 publish)",
            ha="center", va="center", fontsize=10)

    journal = FancyBboxPatch(
        (7.5, 3.5), 4, 1, boxstyle="round,pad=0.05,rounding_size=0.15",
        linewidth=1.5, edgecolor="#7c3aed", facecolor="#E9D5FF",
    )
    ax.add_patch(journal)
    ax.text(9.5, 4, "정식 연구지 트랙\n(검수 워크플로우)",
            ha="center", va="center", fontsize=10)

    # 화살표
    ax.add_patch(FancyArrowPatch((5.5, 5.5), (2.5, 4.5), arrowstyle="->",
                                 mutation_scale=20, color="#0d9488", lw=1.5))
    ax.add_patch(FancyArrowPatch((6.5, 5.5), (9.5, 4.5), arrowstyle="->",
                                 mutation_scale=20, color="#7c3aed", lw=1.5))

    # 워킹 결과
    pub_w = FancyBboxPatch(
        (0.5, 1.5), 4, 0.8, boxstyle="round,pad=0.05,rounding_size=0.1",
        linewidth=1.5, edgecolor="#0d9488", facecolor="#D1FAE5",
    )
    ax.add_patch(pub_w)
    ax.text(2.5, 1.9, "society 또는 public 발간\n(낮은 진입 장벽)",
            ha="center", va="center", fontsize=9)
    ax.add_patch(FancyArrowPatch((2.5, 3.5), (2.5, 2.3), arrowstyle="->",
                                 mutation_scale=15, color="#0d9488"))

    # 정식 단계
    steps = ["저자 100% 동의 게이트", "submitted → under_review",
             "blocking 코멘트 0개", "accepted → 호수 배정", "published"]
    for i, step in enumerate(steps):
        y_pos = 3 - i * 0.5
        box = FancyBboxPatch(
            (7.7, y_pos - 0.18), 3.6, 0.36,
            boxstyle="round,pad=0.03,rounding_size=0.05",
            linewidth=1, edgecolor="#7c3aed", facecolor="#F3E8FF",
        )
        ax.add_patch(box)
        ax.text(9.5, y_pos, step, ha="center", va="center", fontsize=9)
        if i > 0:
            ax.add_patch(FancyArrowPatch(
                (9.5, y_pos + 0.5 - 0.18), (9.5, y_pos + 0.18),
                arrowstyle="->", mutation_scale=10, color="#7c3aed",
            ))

    ax.add_patch(FancyArrowPatch((9.5, 3.5), (9.5, 3.18), arrowstyle="->",
                                 mutation_scale=12, color="#7c3aed"))

    ax.set_title(
        "Figure 3. 학술 출판 트랙 분기 — 인지부하(CLT) ↔ 학술 정통성(CoP) 균형",
        fontsize=13, fontweight="bold", pad=10,
    )
    plt.tight_layout()
    out = os.path.join(OUT_DIR, "figure3_publish_flow.png")
    plt.savefig(out, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"saved: {out}")


# ===========================================================
# Figure 4: 저자 동의 게이트 워크플로우
# ===========================================================
def fig4_consent_gate():
    fig, ax = plt.subplots(figsize=(11, 6))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6)
    ax.axis("off")

    steps = [
        ("1.\n리더가 출판 마법사 진입\nCRediT·저자순서 입력",  1.5, 4),
        ("2.\n저자 동의 요청 발송\nrequestConsent(authors)", 4.5, 4),
        ("3.\n각 저자: 응답\n(agreed / rejected)",            7.5, 4),
        ("4.\n100% agreed?",                                  9.8, 4),
        ("5.\nsubmitted 전이\n(검수 큐 진입)",                9.8, 1.5),
        ("거부 또는 미응답 → \nsubmitted 차단\n(분쟁 사전 방지)", 4.5, 1.5),
    ]
    colors = ["#FEF3C7", "#FECACA", "#DBEAFE", "#FCE7F3", "#A7F3D0", "#FCA5A5"]
    for (label, x, y), color in zip(steps, colors):
        box = FancyBboxPatch(
            (x - 1.3, y - 0.6), 2.6, 1.2,
            boxstyle="round,pad=0.05,rounding_size=0.15",
            linewidth=1.5, edgecolor="#333", facecolor=color,
        )
        ax.add_patch(box)
        ax.text(x, y, label, ha="center", va="center", fontsize=9, wrap=True)

    # 화살표
    arrows = [
        ((2.8, 4), (3.2, 4)),
        ((5.8, 4), (6.2, 4)),
        ((8.8, 4), (9.1, 4)),
        ((9.8, 3.4), (9.8, 2.1)),       # YES → submitted
        ((8.5, 3.7), (5.8, 2.1)),       # NO → 차단
    ]
    labels = ["", "", "", "YES", "NO"]
    for (s, e), label in zip(arrows, labels):
        ax.add_patch(FancyArrowPatch(s, e, arrowstyle="->", mutation_scale=15,
                                     color="#333", lw=1.2))
        if label:
            ax.text((s[0] + e[0]) / 2 + 0.2, (s[1] + e[1]) / 2 + 0.1,
                    label, fontsize=10, fontweight="bold", color="#dc2626")

    # 이론 주석
    ax.text(5.5, 0.3,
            "절차적 정의(Tyler, 1988): voice + consistency 보장 → 저자권 분쟁 사전 차단",
            ha="center", va="center", fontsize=10, style="italic", color="#555")

    ax.set_title(
        "Figure 4. 저자 동의 게이트의 절차적 정의 구현",
        fontsize=13, fontweight="bold", pad=10,
    )
    plt.tight_layout()
    out = os.path.join(OUT_DIR, "figure4_consent_gate.png")
    plt.savefig(out, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"saved: {out}")


if __name__ == "__main__":
    fig1_matrix()
    fig2_architecture()
    fig3_publish_flow()
    fig4_consent_gate()
    print("\n4개 figure 생성 완료. docs/papers/figures/ 확인.")
