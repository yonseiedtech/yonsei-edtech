"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, AlertTriangle, RefreshCw } from "lucide-react";

const SCAN_COOLDOWN = 3000; // 3초 중복 방지

type CameraError =
  | "permission_denied"
  | "no_camera"
  | "in_use"
  | "insecure_context"
  | "unknown";

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
  const [error, setError] = useState<CameraError | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
      setError(null);

      if (typeof window !== "undefined" && !window.isSecureContext) {
        setError("insecure_context");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("no_camera");
        return;
      }

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
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") setError("permission_denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setError("no_camera");
        else if (name === "NotReadableError") setError("in_use");
        else setError("unknown");
      }
    }

    startCamera();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled, scanLoop, retryKey]);

  if (!enabled) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted">
        <CameraOff size={40} className="text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const messages: Record<CameraError, { title: string; help: string }> = {
      permission_denied: {
        title: "카메라 권한이 필요합니다",
        help: "브라우저 주소창의 자물쇠 아이콘에서 카메라를 '허용'으로 변경한 뒤 재시도하세요.",
      },
      no_camera: {
        title: "사용 가능한 카메라를 찾을 수 없습니다",
        help: "기기에 후면 카메라가 없거나 차단되어 있습니다. 셀프 체크인 탭을 사용하세요.",
      },
      in_use: {
        title: "카메라가 다른 앱에서 사용 중입니다",
        help: "카메라를 쓰는 다른 앱(영상통화·녹화 등)을 종료한 뒤 재시도하세요.",
      },
      insecure_context: {
        title: "보안 연결(HTTPS)이 필요합니다",
        help: "이 페이지는 HTTPS에서만 카메라를 열 수 있습니다.",
      },
      unknown: {
        title: "카메라를 시작할 수 없습니다",
        help: "잠시 후 재시도하거나 셀프 체크인 탭을 사용하세요.",
      },
    };
    const msg = messages[error];
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle size={36} className="text-amber-600" />
        <p className="text-sm font-medium text-amber-900">{msg.title}</p>
        <p className="text-xs text-amber-800">{msg.help}</p>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          <RefreshCw size={12} />
          재시도
        </button>
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
        <div className="h-48 w-48 rounded-2xl border-2 border-white/60" />
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
