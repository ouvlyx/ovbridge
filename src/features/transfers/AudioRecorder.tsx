import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";

interface AudioRecorderProps {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecorded, disabled = false }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const voiceFile = new File([audioBlob], `vocal_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        onRecorded(voiceFile);
        setRecording(false);
        setDuration(0);
        clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      toast.error(
        "Accès au microphone refusé. Autorisez le micro pour envoyer des messages vocaux."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <div className="flex items-center gap-2 bg-ov-danger/10 border border-ov-danger/30 px-3 py-1.5 rounded-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-ov-danger animate-ping" />
          <span className="text-xs font-mono font-bold text-ov-danger">
            {formatSecs(duration)}
          </span>
          <Button
            size="icon"
            variant="danger"
            onClick={stopRecording}
            className="w-7 h-7 rounded-lg text-xs ml-1"
            title="Arrêter et envoyer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={startRecording}
          title="Maintenir ou appuyer pour enregistrer un vocal"
          className="text-ov-muted hover:text-ov-primary hover:bg-ov-primary/10"
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}
