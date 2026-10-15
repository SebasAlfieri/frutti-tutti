/**
 * Sonidos cortos sintetizados con la Web Audio API.
 *
 * No se usan archivos de audio ni dependencias: cada sonido son unas pocas
 * notas generadas al vuelo. El `AudioContext` se crea de forma perezosa, la
 * primera vez que hace falta, para respetar las políticas de autoplay.
 *
 * Safari exige crear o reanudar el `AudioContext` dentro de un gesto del
 * usuario. Como algunos sonidos se disparan desde Firestore (por ejemplo, el
 * inicio de ronda, sin gesto de por medio), conviene llamar a `unlockAudio()`
 * en el primer toque/tecla; de eso se encarga `SoundUnlocker`.
 */

type ToneOptions = {
  frequency: number;
  duration: number;
  /** Segundos a esperar antes de que suene esta nota. */
  startAt?: number;
  type?: OscillatorType;
  gain?: number;
};

export type SoundName = "fill" | "roundStart" | "tutti";

const MUTE_KEY = "tuti-sound-muted";

/** Notas de cada sonido. `gain` bajo para que sean un detalle, no un alarme. */
const SOUNDS: Record<SoundName, ToneOptions[]> = {
  // Dos notas ascendentes cortas: "categoría completada".
  fill: [
    { frequency: 660, duration: 0.12 },
    { frequency: 990, duration: 0.16, startAt: 0.075 }
  ],
  // Arpegio ascendente: "empieza la ronda".
  roundStart: [
    { frequency: 523.25, duration: 0.12, gain: 0.07 },
    { frequency: 659.25, duration: 0.12, startAt: 0.09, gain: 0.07 },
    { frequency: 783.99, duration: 0.22, startAt: 0.18, gain: 0.08 }
  ],
  // Fanfarria de tres notas y un acorde final: "¡Tutti Frutti!".
  tutti: [
    { frequency: 523.25, duration: 0.12, gain: 0.08 },
    { frequency: 659.25, duration: 0.12, startAt: 0.1, gain: 0.08 },
    { frequency: 783.99, duration: 0.14, startAt: 0.2, gain: 0.08 },
    { frequency: 1046.5, duration: 0.4, startAt: 0.32, gain: 0.09 },
    { frequency: 1318.51, duration: 0.4, startAt: 0.32, gain: 0.06 }
  ]
};

let audioContext: AudioContext | null = null;
let preferenceLoaded = false;
let muted = false;

function loadPreference(): void {
  if (preferenceLoaded || typeof window === "undefined") return;
  preferenceLoaded = true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // Si el almacenamiento no está disponible, se usa el valor por defecto.
    muted = false;
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;

  const legacy = window as Window & { webkitAudioContext?: typeof AudioContext };
  const ContextCtor = window.AudioContext ?? legacy.webkitAudioContext;
  if (!ContextCtor) return null;

  try {
    audioContext = new ContextCtor();
  } catch (error) {
    console.warn("[tuti:sound] no se pudo crear el AudioContext:", error);
    return null;
  }

  return audioContext;
}

/** ¿Están habilitados los sonidos? (preferencia guardada en el dispositivo). */
export function isSoundEnabled(): boolean {
  loadPreference();
  return !muted;
}

/** Activa o silencia los sonidos y recuerda la elección en el dispositivo. */
export function setSoundEnabled(enabled: boolean): void {
  loadPreference();
  muted = !enabled;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, enabled ? "0" : "1");
  } catch {
    // Si no se puede persistir, al menos se respeta durante la sesión.
  }
}

/**
 * Crea y reanuda el `AudioContext` dentro de un gesto del usuario. Llamalo en
 * el primer toque/tecla para que los sonidos que llegan desde Firestore (sin
 * gesto) puedan reproducirse, sobre todo en Safari.
 */
export function unlockAudio(): void {
  const context = ensureContext();
  if (!context || context.state !== "suspended") return;
  context.resume().catch((error) => {
    console.warn("[tuti:sound] no se pudo desbloquear el audio:", error);
  });
}

function playTone(context: AudioContext, options: ToneOptions): void {
  const { frequency, duration, startAt = 0, type = "triangle", gain = 0.08 } = options;

  const start = context.currentTime + startAt;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  // Ataque rápido y caída exponencial: una nota corta y suave.
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(envelope);
  envelope.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

/** Reproduce un sonido corto. Si está silenciado o falla, no hace nada. */
export function playSound(name: SoundName): void {
  loadPreference();
  if (muted) return;

  const context = ensureContext();
  if (!context) return;

  if (context.state === "suspended") {
    context.resume().catch((error) => {
      console.warn("[tuti:sound] no se pudo reanudar el audio:", error);
    });
  }

  for (const tone of SOUNDS[name]) {
    playTone(context, tone);
  }
}
