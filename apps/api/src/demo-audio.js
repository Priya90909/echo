import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function createDemoAudio() {
  const rate = 22050, seconds = 15, samples = rate * seconds;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
  const notes = [261.63, 329.63, 392, 523.25, 392, 329.63];
  for (let index = 0; index < samples; index++) {
    const t = index / rate, beat = t % .5, note = notes[Math.floor(t * 2) % notes.length];
    const envelope = Math.min(beat * 20, 1) * Math.max(0, 1 - beat * 2) * Math.min((seconds - t) * 2, 1);
    wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * note * t) * envelope * 4500), 44 + index * 2);
  }
  await mkdir(resolve("work/audio"), { recursive: true });
  await writeFile(resolve("work/audio/echo-demo.wav"), wav);
  return "echo-demo.wav";
}
