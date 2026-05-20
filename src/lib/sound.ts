/**
 * Reproduce un "ding ding" de notificación usando Web Audio API.
 * No requiere archivo de audio.
 *
 * Nota: el browser puede bloquear autoplay hasta que el usuario interactúe
 * con la página. Llama a `unlockAudio()` desde un click handler la primera vez.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx!;
}

export async function unlockAudio() {
  try {
    const c = getCtx();
    if (c.state === 'suspended') await c.resume();
  } catch {}
}

export function playNotification() {
  try {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();

    // 2 tonos rápidos: 880 Hz y 1320 Hz
    [
      { freq: 880, start: 0 },
      { freq: 1320, start: 0.18 },
    ].forEach(({ freq, start }) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(c.destination);

      const t0 = c.currentTime + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);

      osc.start(t0);
      osc.stop(t0 + 0.32);
    });
  } catch (e) {
    console.warn('[sound] no se pudo reproducir:', e);
  }
}
