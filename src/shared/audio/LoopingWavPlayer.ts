/**
 * LoopingWavPlayer.ts
 * Simple looping WAV player that maps motion speed -> volume with EWMA smoothing.
 *
 * Usage:
 *   const player = new LoopingWavPlayer({
 *     url: '/sounds/accordion_loop.wav',
 *     // optional overrides:
 *     motionMin: 20,
 *     motionMax: 600,
 *     invert: false,
 *     volMin: 0.0,
 *     volMax: 1.0,
 *     ewmaTau: 0.25,   // seconds (motion smoothing)
 *     audioTau: 0.03,  // seconds (gain smoothing)
 *     autoStart: true, // start playback immediately after load
 *   });
 *   await player.ready;            // wait for decode + graph build
 *   await player.resume();         // call from a user gesture in the browser
 *   // each frame:
 *   player.update(currentSpeedPxPerSec); // pass 0 when idle for decay
 *
 *   // when done:
 *   player.stop();
 *   player.dispose();
 */

export type LoopingWavPlayerConfig = {
  url: string;

  // Motion → volume mapping
  motionMin?: number; // px/s that maps to 0.0 (after smoothing)
  motionMax?: number; // px/s that maps to 1.0 (after smoothing)
  invert?: boolean;   // if true: faster = quieter

  // Output volume range
  volMin?: number;    // 0..1
  volMax?: number;    // 0..1

  // Smoothing
  ewmaTau?: number;   // seconds, exponential smoothing time constant (motion)
  audioTau?: number;  // seconds, GainNode.setTargetAtTime time constant

  // Lifecycle
  audioContext?: AudioContext; // optional externally-provided context
  autoStart?: boolean;         // start looping as soon as ready (after decode)
  initialVolume?: number;      // initial gain value 0..1 (default volMin)
  fetchInit?: RequestInit;     // optional fetch options (e.g., { mode: 'cors' })
};

export class LoopingWavPlayer {
  public readonly ready: Promise<void>;

  private cfg: Required<
    Omit<LoopingWavPlayerConfig, "audioContext" | "autoStart" | "initialVolume" | "fetchInit" | "url">
  > & { url: string };

  private externalCtx: boolean;
  private ctx: AudioContext;
  private gain: GainNode | null = null;
  private src: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;

  private running = false;

  // Motion smoothing state
  private smoothed = 0;
  private lastUpdateTime: number | null = null; // in seconds (performance.now()/1000)

  constructor(config: LoopingWavPlayerConfig) {
    if (!config?.url) throw new Error("LoopingWavPlayer: config.url is required");

    // Defaults
    this.cfg = {
      url: config.url,
      motionMin: config.motionMin ?? 20,
      motionMax: Math.max(
        (config.motionMin ?? 20) + 1,
        config.motionMax ?? 600
      ),
      invert: config.invert ?? false,
      volMin: clamp01(config.volMin ?? 0),
      volMax: clamp01(config.volMax ?? 1),
      ewmaTau: Math.max(0.005, config.ewmaTau ?? 0.25),
      audioTau: Math.max(0, config.audioTau ?? 0.03),
    };

    // Audio context
    this.externalCtx = !!config.audioContext;
    this.ctx =
      config.audioContext ?? new (window.AudioContext || (window as any).webkitAudioContext)();

    const initialVolume =
      typeof config.initialVolume === "number"
        ? clamp01(config.initialVolume)
        : this.cfg.volMin;

    // Begin loading immediately
    this.ready = (async () => {
      const buf = await this.fetchAndDecode(this.cfg.url, config.fetchInit);
      this.buffer = buf;
      this.buildGraph(initialVolume);
      if (config.autoStart) {
        this.start();
      }
    })();
  }

  /**
   * Call from a user gesture to ensure playback is allowed on the page.
   */
  async resume(): Promise<void> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  /**
   * Update the player with the current motion speed (px/s).
   * Call this regularly (each frame/tick). Pass 0 when idle.
   * @param speedPxPerSec current motion speed (>= 0 recommended)
   * @param nowSeconds optional timestamp; defaults to performance.now()/1000
   */
  update(speedPxPerSec: number, nowSeconds?: number): void {
    const now = typeof nowSeconds === "number" ? nowSeconds : performance.now() / 1000;

    // Compute dt for frame-rate independent EWMA
    const prev = this.lastUpdateTime ?? now;
    const dt = Math.max(0.0001, now - prev);
    this.lastUpdateTime = now;

    // EWMA smoothing on motion
    const tau = this.cfg.ewmaTau;
    const alpha = 1 - Math.exp(-dt / tau);
    const input = Math.max(0, speedPxPerSec || 0);
    this.smoothed += alpha * (input - this.smoothed);

    // Map smoothed speed -> volume [0..1]
    let vol01 = linMapClamped(this.smoothed, this.cfg.motionMin, this.cfg.motionMax, 0, 1);
    if (this.cfg.invert) vol01 = 1 - vol01;

    // Map to [volMin..volMax]
    const outVol = linMap(
      vol01,
      0,
      1,
      Math.min(this.cfg.volMin, this.cfg.volMax),
      Math.max(this.cfg.volMin, this.cfg.volMax)
    );

    // Apply to audio
    if (this.gain && this.ctx) {
      // Optional small floor to kill whisper at very low levels
      const v = outVol < 0.001 ? 0 : outVol;
      this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, this.cfg.audioTau);
    }
  }

  /**
   * Start looping (buildGraph already prepared source). Safe to call repeatedly.
   */
  start(): void {
    if (this.running) return;
    if (!this.buffer) throw new Error("LoopingWavPlayer: not ready yet.");
    if (!this.gain) this.buildGraph(this.cfg.volMin);

    // In Web Audio, BufferSourceNodes are one-shot, so construct a new one each start.
    if (!this.src) {
      this.src = this.ctx.createBufferSource();
      this.src.buffer = this.buffer;
      this.src.loop = true;
      this.src.connect(this.gain!);
      this.src.start();
    }

    this.running = true;
  }

  /**
   * Stop looping (keeps the graph; you can start() again and a new source node will be made).
   */
  stop(): void {
    if (!this.running) return;
    try {
      this.src?.stop();
    } catch {}
    try {
      this.src?.disconnect();
    } catch {}
    this.src = null;
    this.running = false;
  }

  /**
   * Update configuration at runtime. Only fields provided are changed.
   */
  setConfig(patch: Partial<LoopingWavPlayerConfig>): void {
    if (patch.motionMin !== undefined) this.cfg.motionMin = Math.max(0, patch.motionMin);
    if (patch.motionMax !== undefined)
      this.cfg.motionMax = Math.max(this.cfg.motionMin + 1, patch.motionMax);
    if (patch.invert !== undefined) this.cfg.invert = !!patch.invert;
    if (patch.volMin !== undefined) this.cfg.volMin = clamp01(patch.volMin);
    if (patch.volMax !== undefined) this.cfg.volMax = clamp01(patch.volMax);
    if (patch.ewmaTau !== undefined) this.cfg.ewmaTau = Math.max(0.005, patch.ewmaTau);
    if (patch.audioTau !== undefined) this.cfg.audioTau = Math.max(0, patch.audioTau);
  }

  /**
   * Dispose of audio nodes and (optionally) close the internal context.
   * If you passed your own AudioContext, it will NOT be closed.
   */
  dispose(): void {
    this.stop();
    try { this.gain?.disconnect(); } catch {}
    this.gain = null;
    if (!this.externalCtx) {
      try { this.ctx.close(); } catch {}
    }
  }

  // --------- internals ---------

  private async fetchAndDecode(url: string, init?: RequestInit): Promise<AudioBuffer> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    // slice() to detatch from underlying ArrayBuffer source in Safari
    return await this.ctx.decodeAudioData(ab.slice(0));
  }

  private buildGraph(initialGain: number): void {
    // Gain
    this.gain = this.ctx.createGain();
    this.gain.gain.value = clamp01(initialGain);

    // Connect to output; source is created in start()
    this.gain.connect(this.ctx.destination);
  }
}

// ---------- helpers ----------

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function linMap(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = (x - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function linMapClamped(
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  const t = Math.min(1, Math.max(0, (x - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}
