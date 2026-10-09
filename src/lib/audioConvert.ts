import lamejs from "@breezystack/lamejs";

const MP3_SAMPLE_RATE = 16000;
const MP3_KBPS = 64;

/** Convertit un Blob audio (webm/ogg/m4a) en MP3. */
export async function blobToMp3(blob: Blob): Promise<Blob> {
  // 1. Décode l'audio via AudioContext (universel)
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  // 2. Récupère les samples (mono)
  const input = audioBuffer.getChannelData(0);

  // 3. Rééchantillonne en 16 kHz si nécessaire
  const resampled =
    audioBuffer.sampleRate !== MP3_SAMPLE_RATE
      ? resample(input, audioBuffer.sampleRate, MP3_SAMPLE_RATE)
      : input;

  // 4. Convertit en Int16
  const pcm = new Int16Array(resampled.length);
  for (let i = 0; i < resampled.length; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // 5. Encode en MP3
  const encoder = new lamejs.Mp3Encoder(1, MP3_SAMPLE_RATE, MP3_KBPS);
  const blockSize = 1152;
  const mp3Data: Uint8Array[] = [];

  for (let i = 0; i < pcm.length; i += blockSize) {
    const chunk = pcm.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(new Uint8Array(end));

  return new Blob(mp3Data as BlobPart[], { type: "audio/mpeg" });
}

/** Rééchantillonne linéairement. */
function resample(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  const ratio = inputRate / outputRate;
  const newLength = Math.round(input.length / ratio);
  const output = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    output[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}