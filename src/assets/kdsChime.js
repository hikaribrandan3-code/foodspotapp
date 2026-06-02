// KDS Chime — base64 encoded WAV
// Two-tone restaurant bell: A5 (880Hz) + C#6 (1108Hz)
// Generated inline — zero network dependency

export function generateChimeWav() {
  const sampleRate = 44100
  const duration = 0.55
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  // WAV header
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  // Generate two-tone chime
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const attack = Math.min(t / 0.01, 1)
    const decay1 = Math.exp(-t * 6)
    const decay2 = Math.exp(-(t - 0.12) * 6)

    // Tone 1: 880Hz A5 — starts at 0ms
    const tone1 = t < 0.35 ? Math.sin(2 * Math.PI * 880 * t) * attack * decay1 : 0

    // Tone 2: 1108Hz C#6 — starts at 120ms
    const tone2 = t >= 0.12 && t < 0.55
      ? Math.sin(2 * Math.PI * 1108 * (t - 0.12)) * Math.min((t - 0.12) / 0.01, 1) * decay2
      : 0

    const sample = Math.max(-1, Math.min(1, (tone1 + tone2) * 0.5))
    view.setInt16(44 + i * 2, sample * 0x7fff, true)
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(binary)
}
