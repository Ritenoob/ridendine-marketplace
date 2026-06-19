/**
 * Web Audio API helpers for chef-admin alerts.
 * All functions are best-effort: they never throw to the caller.
 */

// Lazily created, shared context (avoids Chrome's "too many AudioContexts" limit).
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor = (window as unknown as { AudioContext?: new () => AudioContext }).AudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a short two-tone chime for new-order alerts.
 * Requires a prior user gesture (browser autoplay policy) to produce sound.
 * Best-effort: silently no-ops when AudioContext is unavailable or blocked.
 */
export function playNewOrderChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const resume =
      ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();

    resume
      .then(() => {
        const now = ctx.currentTime;
        // Two tones: A5 (880 Hz) followed by E5 (659 Hz), 150 ms apart
        const tones = [880, 659];
        tones.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.4, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.25);
        });
      })
      .catch(() => {
        // autoplay blocked - no-op
      });
  } catch {
    // AudioContext unavailable or already closed
  }
}
