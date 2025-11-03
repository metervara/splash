/**
 * DoubleLoopingWavPlayer.ts
 * Two looped WAVs that crossfade by direction, with EWMA smoothing for speed & direction.
 *
 * Usage:
 *   import { DoubleLoopingWavPlayer } from "./DoubleLoopingWavPlayer";
 *   import leftUrl  from "./assets/accordion_push.wav";
 *   import rightUrl from "./assets/accordion_pull.wav";
 *
 *   const player = new DoubleLoopingWavPlayer({
 *     leftUrl,
 *     rightUrl,
 *     motionMin: 20,     // px/s -> 0
 *     motionMax: 600,    // px/s -> 1
 *     volMin: 0.0,       // base bed when still
 *     volMax: 1.0,       // cap
 *     ewmaTauSpeed: 0.25,// s, smoothing for speed
 *     ewmaTauDir: 0.15,  // s, smoothing for direction
 *     audioTau: 0.03,    // s, GainNode smoothing
 *     autoStart: false,  // start after user gesture
 *   });
 *
 *   await player.ready;   // buffers decoded, graph ready
 *   await player.resume(); // call inside a user gesture
 *   player.start();        // both loops running (vol=0)
 *
 *   // each frame/tick:
 *   // direction: -1..+1  (left..right); pass 0 when unknown/idle
 *   player.update(currentSpeedPxPerSec, currentDirection);
 *
 *   // when done:
 *   player.stop();
 *   player.dispose();
 */

export type DoubleLoopingConfig = {
  leftUrl: string;      // WAV for "left" (e.g., push)
  rightUrl: string;     // WAV for "right" (e.g., pull)

  // Motion → volume mapping
  motionMin?: number;   // speed that maps to 0
  motionMax?: number;   // speed that maps to 1

  // Output volume range
  volMin?: number;      // 0..1
  volMax?: number;      // 0..1

  // Smoothing
  ewmaTauSpeed?: number; // seconds, exponential smoothing for speed
  ewmaTauDir?: number;   // seconds, exponential smoothing for direction
  audioTau?: number;     // seconds, GainNode.setTargetAtTime time constant

  // Lifecycle
  audioContext?: AudioContext;
  autoStart?: boolean;
  initialVolume?: number; // initial gain (0..1) for both tracks
  fetchInit?: RequestInit; // fetch options (e.g., { mode: "cors" })
};

export class DoubleLoopingWavPlayer {
  public readonly ready: Promise<void>;

  private cfg: Required<
    Omit<
      DoubleLoopingConfig,
      "audioContext" | "autoStart" | "initialVolume" | "fetchInit" | "leftUrl" | "rightUrl"
    >
  > & { leftUrl: string; rightUrl: string };

  private externalCtx: boolean;
  private ctx: AudioContext;

  private gainL: GainNode | null = null;
  private gainR: GainNode | null = null;
  private bufL: AudioBuffer | null = null;
  private bufR: AudioBuffer | null = null;
  private srcL: AudioBufferSourceNode | null = null;
  private srcR: AudioBufferSourceNode | null = null;

  private running = false;

  // Smoothing state
  private smSpeed = 0;
  private smDir = 0; // -1..+1
  private lastUpdateTime: number | null = null; // seconds (performance.now()/1000)

  constructor(config: DoubleLoopingConfig) {
    if (!config?.leftUrl || !config?.rightUrl) {
      throw new Error("DoubleLoopingWavPlayer: leftUrl and rightUrl are required");
    }

    this.cfg = {
      leftUrl: config.leftUrl,
      rightUrl: config.rightUrl,
      motionMin: config.motionMin ?? 20,
      motionMax: Math.max((config.motionMin ?? 20) + 1, config.motionMax ?? 600),
      volMin: clamp01(config.volMin ?? 0),
      volMax: clamp01(config.volMax ?? 1),
      ewmaTauSpeed: Math.max(0.005, config.ewmaTauSpeed ?? 0.25),
      ewmaTauDir: Math.max(0.005, config.ewmaTauDir ?? 0.15),
      audioTau: Math.max(0, config.audioTau ?? 0.03),
    };

    this.externalCtx = !!config.audioContext;
    this.ctx =
      config.audioContext ?? new (window.AudioContext || (window as any).webkitAudioContext)();

    const initialVolume =
      typeof config.initialVolume === "number"
        ? clamp01(config.initialVolume)
        : this.cfg.volMin;

    this.ready = (async () => {
      const [bL, bR] = await Promise.all([
        this.fetchAndDecode(this.cfg.leftUrl, config.fetchInit),
        this.fetchAndDecode(this.cfg.rightUrl, config.fetchInit),
      ]);
      this.bufL = bL;
      this.bufR = bR;
      this.buildGraph(initialVolume);
      if (config.autoStart) this.start();
    })();
  }

  // Call inside a user gesture before starting audio
  async resume(): Promise<void> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  /**
   * Update with current motion speed and direction.
   * @param speedPxPerSec   motion magnitude (e.g., px/s). Pass 0 when idle.
   * @param direction01     -1..+1  (-1 = left / push,  +1 = right / pull)
   * @param nowSeconds      optional timestamp; defaults to performance.now()/1000
   */
  update(speedPxPerSec: number, direction01: number, nowSeconds?: number): void {
    const now = typeof nowSeconds === "number" ? nowSeconds : performance.now() / 1000;
    const prev = this.lastUpdateTime ?? now;
    const dt = Math.max(0.0001, now - prev);
    this.lastUpdateTime = now;

    // EWMA smoothing (frame-rate independent)
    // Speed ≥ 0
    const sIn = Math.max(0, speedPxPerSec || 0);
    const aS = 1 - Math.exp(-dt / this.cfg.ewmaTauSpeed);
    this.smSpeed += aS * (sIn - this.smSpeed);

    // Direction clamped to [-1..+1]
    const dIn = clamp(direction01 ?? 0, -1, 1);
    const aD = 1 - Math.exp(-dt / this.cfg.ewmaTauDir);
    this.smDir += aD * (dIn - this.smDir);
    this.smDir = clamp(this.smDir, -1, 1);

    // Base volume from smoothed speed
    const base01 = linMapClamped(this.smSpeed, this.cfg.motionMin, this.cfg.motionMax, 0, 1);
    const base = this.cfg.volMin + base01 * (this.cfg.volMax - this.cfg.volMin);

    // Direction weights from smoothed dir
    // right = (dir+1)/2 ; left = 1-right
    const wR = (this.smDir + 1) * 0.5;
    const wL = 1 - wR;

    // Final per-track volumes
    const vL = base * wL;
    const vR = base * wR;

    if (this.gainL && this.gainR) {
      const tau = this.cfg.audioTau;
      // tiny floor to kill whisper at near-zero
      const gL = vL < 0.001 ? 0 : vL;
      const gR = vR < 0.001 ? 0 : vR;
      this.gainL.gain.setTargetAtTime(gL, this.ctx.currentTime, tau);
      this.gainR.gain.setTargetAtTime(gR, this.ctx.currentTime, tau);
    }
  }

  start(): void {
    if (this.running) return;
    if (!this.bufL || !this.bufR) throw new Error("DoubleLoopingWavPlayer: not ready yet.");
    if (!this.gainL || !this.gainR) this.buildGraph(this.cfg.volMin);

    // BufferSourceNodes are one-shot; make fresh ones per start.
    if (!this.srcL) {
      this.srcL = this.ctx.createBufferSource();
      this.srcL.buffer = this.bufL;
      this.srcL.loop = true;
      this.srcL.connect(this.gainL!);
      this.srcL.start();
    }
    if (!this.srcR) {
      this.srcR = this.ctx.createBufferSource();
      this.srcR.buffer = this.bufR;
      this.srcR.loop = true;
      this.srcR.connect(this.gainR!);
      this.srcR.start();
    }
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    try { this.srcL?.stop(); } catch {}
    try { this.srcR?.stop(); } catch {}
    try { this.srcL?.disconnect(); } catch {}
    try { this.srcR?.disconnect(); } catch {}
    this.srcL = this.srcR = null;
    this.running = false;
  }

  dispose(): void {
    this.stop();
    try { this.gainL?.disconnect(); } catch {}
    try { this.gainR?.disconnect(); } catch {}
    this.gainL = this.gainR = null;
    if (!this.externalCtx) {
      try { this.ctx.close(); } catch {}
    }
  }

  setConfig(patch: Partial<DoubleLoopingConfig>): void {
    if (patch.motionMin !== undefined) this.cfg.motionMin = Math.max(0, patch.motionMin);
    if (patch.motionMax !== undefined)
      this.cfg.motionMax = Math.max(this.cfg.motionMin + 1, patch.motionMax);
    if (patch.volMin !== undefined) this.cfg.volMin = clamp01(patch.volMin);
    if (patch.volMax !== undefined) this.cfg.volMax = clamp01(patch.volMax);
    if (patch.ewmaTauSpeed !== undefined) this.cfg.ewmaTauSpeed = Math.max(0.005, patch.ewmaTauSpeed);
    if (patch.ewmaTauDir !== undefined) this.cfg.ewmaTauDir = Math.max(0.005, patch.ewmaTauDir);
    if (patch.audioTau !== undefined) this.cfg.audioTau = Math.max(0, patch.audioTau);
    // Note: swapping URLs at runtime would require re-loading buffers; provide a helper if you need that.
  }

  // ---------- internals ----------

  private async fetchAndDecode(url: string, init?: RequestInit): Promise<AudioBuffer> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    return await this.ctx.decodeAudioData(ab.slice(0));
  }

  private buildGraph(initialGain: number): void {
    this.gainL = this.ctx.createGain();
    this.gainR = this.ctx.createGain();
    const g = clamp01(initialGain);
    this.gainL.gain.value = g;
    this.gainR.gain.value = g;
    this.gainL.connect(this.ctx.destination);
    this.gainR.connect(this.ctx.destination);
  }
}

// -------- helpers --------

function clamp(x: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, x));
}
function clamp01(x: number): number {
  return clamp(x, 0, 1);
}
function linMapClamped(x: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  const t = clamp((x - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}
