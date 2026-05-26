# -*- coding: utf-8 -*-
"""
yonsei-edtech 사이트의 공개 페이지 5개 자동 캡쳐.
로그인 필요 페이지(/mypage, /collab/*)는 placeholder 유지.

실행: python capture_screenshots.py
출력: docs/papers/figures/site/screenshot_*.png
"""

import os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "figures", "site")
os.makedirs(OUT_DIR, exist_ok=True)

BASE = "https://yonsei-edtech.vercel.app"

PAGES = [
    ("screenshot_journal_public.png",   "/journal",          "공개 연구지 목록"),
    ("screenshot_research_analytics.png","/research",        "연구 분석 (3 탭)"),
    ("screenshot_alumni_thesis.png",    "/alumni/thesis",    "졸업생 학위논문 DB"),
    ("screenshot_archive_concepts.png", "/archive",          "교육공학 아카이브"),
    ("screenshot_about_leadership.png", "/about/leadership", "운영진·계보"),
    ("screenshot_home.png",             "/",                 "홈 (사이트 진입)"),
    ("screenshot_seminars.png",         "/seminars",         "세미나 목록"),
]


def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
            locale="ko-KR",
        )
        page = context.new_page()
        for fname, path, desc in PAGES:
            url = f"{BASE}{path}"
            out = os.path.join(OUT_DIR, fname)
            print(f"capturing: {url} -> {fname}")
            try:
                # networkidle 은 yonsei-edtech 의 polling/Firebase 활성 연결 때문에 도달 불가.
                # domcontentloaded 후 hydrate 시간만 충분히 대기.
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(5000)  # hydrate + font + image load
                page.screenshot(path=out, full_page=False)
                print(f"  saved: {out} ({desc})")
            except Exception as e:
                print(f"  ERROR: {e}")
        browser.close()


if __name__ == "__main__":
    capture()
