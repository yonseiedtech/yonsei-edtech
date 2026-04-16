"use client";

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const ChatPanel = lazy(() => import("./ChatPanel"));

const STORAGE_KEY = "chat-widget-pos";
const BTN_SIZE = 56;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function loadPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const moved = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = loadPosition();
    if (saved) {
      setPos({
        x: clamp(saved.x, 0, window.innerWidth - BTN_SIZE),
        y: clamp(saved.y, 0, window.innerHeight - BTN_SIZE),
      });
    }
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragStart.current = { x: e.clientX, y: e.clientY, px: rect.left, py: rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
    const nx = clamp(dragStart.current.px + dx, 0, window.innerWidth - BTN_SIZE);
    const ny = clamp(dragStart.current.py + dy, 0, window.innerHeight - BTN_SIZE);
    setPos({ x: nx, y: ny });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    if (moved.current && pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
    }
  }, [pos]);

  const handleClick = useCallback(() => {
    if (!moved.current) setOpen(true);
  }, []);

  const defaultStyle = pos
    ? { left: pos.x, top: pos.y, right: "auto" as const, bottom: "auto" as const }
    : { right: 24, bottom: 24 };

  return (
    <>
      {open && (
        <div className="fixed bottom-6 right-6 z-50" style={pos ? { left: clamp(pos.x - 340, 8, window.innerWidth - 400), top: clamp(pos.y - 420, 8, window.innerHeight - 460) } : undefined}>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Suspense
                fallback={
                  <div className="flex h-[400px] w-96 items-center justify-center rounded-2xl border bg-background shadow-2xl">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <ChatPanel onClose={() => setOpen(false)} />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {!open && (
        <motion.button
          ref={btnRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleClick}
          className="fixed z-50 flex h-14 w-14 touch-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl"
          style={defaultStyle}
          whileHover={{ scale: 1.05 }}
          aria-label="연교공 챗봇 열기"
        >
          <MessageCircle className="h-6 w-6" />
        </motion.button>
      )}
    </>
  );
}
