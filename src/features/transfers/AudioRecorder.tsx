import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Send, Trash2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { blobToMp3 } from "@/lib/audioConvert";

interface AudioRecorderProps {
  onRecorded: (file: File) => void;
  disabled?: boolean;
  maxDurationSec?: number;
}

export function AudioRecorder({
  onRecorded,
  disabled = false,
  maxDurationSec = 300,
}: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [cancelZone, setCancelZone] = useState(false);
  const [locked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const startXRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ---------- choisir le meilleur format supporté ---------- */
  function getBestMimeType(): string {
    const candidates = [
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
    ];
    for (const mime of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(mime)
      ) {
        return mime;
      }
    }
    return "";
  }

  const startRecording = async () => {
    if (recording || disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mime = getBestMimeType();
      const mediaRecorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      cancelledRef.current = false;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (!cancelledRef.current) {
          const actualMime = mediaRecorder.mimeType || mime || "audio/webm";
          const rawBlob = new Blob(chunksRef.current, { type: actualMime });

          // Essai de conversion MP3
          try {
            const mp3Blob = await blobToMp3(rawBlob);
            const voiceFile = new File(
              [mp3Blob],
              `vocal_${Date.now()}.mp3`,
              { type: "audio/mpeg" }
            );
            onRecorded(voiceFile);
          } catch (e) {
            // Fallback : envoie le format brut si la conversion échoue
            console.warn(
              "[AudioRecorder] MP3 conversion failed, using raw format",
              e
            );
            const ext = actualMime.includes("mp4")
              ? "m4a"
              : actualMime.includes("ogg")
              ? "ogg"
              : "webm";
            const voiceFile = new File(
              [rawBlob],
              `vocal_${Date.now()}.${ext}`,
              { type: actualMime }
            );
            toast.warning(
              "Conversion MP3 impossible, envoi en format natif."
            );
            onRecorded(voiceFile);
          }
        }

        setRecording(false);
        setPaused(false);
        setDuration(0);
        setCancelZone(false);
        setCountdown(null);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start(250); // ← chunk toutes les 250ms
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1;
          if (next >= maxDurationSec - 10) setCountdown(maxDurationSec - next);
          if (next >= maxDurationSec) setTimeout(() => stopAndSend(), 0);
          return next;
        });
      }, 1000);
    } catch {
      toast.error(
        "Accès au microphone refusé. Autorisez le micro pour envoyer des messages vocaux."
      );
    }
  };

  const stopAndSend = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      cancelledRef.current = false;
      // Force la récupération des derniers chunks avant stop
      try {
        mr.requestData();
      } catch {
        /* pas supporté partout */
      }
      mr.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      cancelledRef.current = true;
      mr.stop();
      toast.info("Enregistrement annulé");
    }
  }, []);

  const togglePause = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    if (paused) {
      mr.resume();
      setPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1;
          if (next >= maxDurationSec - 10) setCountdown(maxDurationSec - next);
          if (next >= maxDurationSec) setTimeout(() => stopAndSend(), 0);
          return next;
        });
      }, 1000);
    } else {
      mr.pause();
      setPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (locked) return;
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (locked || !recording) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    setCancelZone(deltaX < -80);
  };

  const handleTouchEnd = () => {
    if (locked || !recording) return;
    if (cancelZone) cancelRecording();
    setCancelZone(false);
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (recording) {
    return (
      <div
        className={cn(
          "flex-1 flex items-center gap-3 rounded-2xl px-4 py-2.5 min-h-[44px]",
          "transition-colors duration-150 select-none",
          cancelZone
            ? "bg-ov-danger/20 border border-ov-danger/50"
            : "bg-ov-danger/10 border border-ov-danger/30"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {paused ? (
          <span className="w-3 h-3 rounded-full bg-ov-warning shrink-0" />
        ) : (
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ov-danger opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-ov-danger" />
          </span>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-sm font-mono font-bold",
              countdown !== null && countdown <= 5
                ? "text-ov-danger animate-pulse"
                : "text-ov-danger"
            )}
          >
            {formatSecs(duration)}
          </span>
          {countdown !== null && countdown <= 10 && countdown > 0 && (
            <span className="text-[10px] font-medium text-ov-danger">
              -{countdown}s
            </span>
          )}
        </div>

        {!paused ? (
          <div className="flex-1 flex items-center justify-center gap-[3px] h-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="w-[3px] bg-ov-danger/70 rounded-full animate-pulse"
                style={{
                  height: `${8 + Math.random() * 16}px`,
                  animationDelay: `${i * 50}ms`,
                  animationDuration: "0.8s",
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 text-center text-xs font-medium text-ov-warning">
            En pause
          </div>
        )}

        {cancelZone && !locked && (
          <span className="text-xs font-medium text-ov-danger shrink-0 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Annuler
          </span>
        )}

        {!cancelZone && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={togglePause}
              aria-label={paused ? "Reprendre" : "Pause"}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              {paused ? (
                <Play className="w-3.5 h-3.5 text-ov-warning" />
              ) : (
                <Pause className="w-3.5 h-3.5 text-ov-danger" />
              )}
            </button>

            <button
              onClick={cancelRecording}
              aria-label="Annuler"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-ov-danger/30 flex items-center justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 text-ov-danger" />
            </button>

            <button
              onClick={stopAndSend}
              aria-label="Envoyer"
              className="w-9 h-9 rounded-full bg-ov-danger hover:bg-ov-danger/90 flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={startRecording}
        aria-label="Enregistrer un message vocal"
        className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center",
          "transition-all active:scale-95",
          "text-ov-muted hover:text-ov-primary hover:bg-ov-primary/10",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
}