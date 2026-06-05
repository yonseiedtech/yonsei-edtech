# -*- coding: utf-8 -*-
"""신청 흐름 콘솔 에러 캡쳐 진단. 실행: python debug_apply.py"""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from playwright.sync_api import sync_playwright

URL = "https://yonsei-edtech.vercel.app/activities/external/YwXgCiV0zKugZCYOgwDj"

def main():
    errors = []
    console_errs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="ko-KR")
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: console_errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)

        print("1) load...")
        page.goto(URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(5000)
        print("   pageerror after load:", len(errors))

        print("2) click apply button...")
        try:
            btn = page.locator("button", has_text="참가 신청")
            cnt = btn.count()
            print("   button count:", cnt)
            if cnt > 0:
                btn.first.click(timeout=8000)
                page.wait_for_timeout(5000)
                print("   clicked + waited")
        except Exception as ex:
            print("   click exception:", repr(str(ex))[:200])

        print("3) RESULTS")
        print("   total pageerror:", len(errors))
        for e in errors:
            print("   >>> PAGEERROR:", repr(e)[:600])
        print("   console errors (firebase env warning excluded):")
        for c in console_errs:
            if "firebase" in c.lower():
                continue
            print("   >>>", repr(c)[:400])

        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figures", "site", "debug_apply_dialog.png")
        try:
            page.screenshot(path=out)
            print("   screenshot saved")
        except Exception:
            pass
        browser.close()

if __name__ == "__main__":
    main()
