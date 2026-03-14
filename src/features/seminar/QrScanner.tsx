"use client";

import { useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";

const SCAN_COOLDOWN = 3000; // 3초 중복 방지

interface Props {
  onScan: (token: string) => void;
  enabled?: boolean;
}

export default function QrScanner({ onScan, enabled = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTokenRef = useRef("");
  const lastTimeRef = useRef(0);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !enabled) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (code && code.data) {
      const now = Date.now();
      if (
        code.data !== lastTokenRef.current ||
        now - lastTimeRef.current >= SCAN_COOLDOWN
      ) {
        lastTokenRef.current = code.data;
        lastTimeRef.current = now;
        // 진동 피드백
        if (navigator.vibrate) navigator.vibrate(200);
        onScan(code.data);
      }
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [enabled, onScan]);

  useEffect(() => {
    if (!enabled) return;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            scanLoop();
          };
        }
      } catch {
        // 카메라 접근 실패 — UI에서 안내
      }
    }

    startCamera();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled, scanLoop]);

  if (!enabled) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted">
        <CameraOff size={40} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* 스캔 가이드 오버레이 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-48 rounded-xl border-2 border-white/60" />
      </div>
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white">
          <Camera size={12} />
          QR 코드를 카메라에 비추세요
        </div>
      </div>
    </div>
  );
}
