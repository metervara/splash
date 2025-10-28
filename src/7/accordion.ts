// accordion.js
export function createAccordionVoice(audioCtx: AudioContext) {
  const out = audioCtx.createGain(); out.gain.value = 0.0;

  // --- Oscillators (two reeds, slightly detuned) ---
  const oscA = audioCtx.createOscillator(); oscA.type = "sawtooth";
  const oscB = audioCtx.createOscillator(); oscB.type = "sawtooth"; oscB.detune.value = +6; // cents

  // --- Subtle beating from tiny detune modulation (reed drift) ---
  const driftLFO = audioCtx.createOscillator(); driftLFO.frequency.value = 0.3;
  const driftGain = audioCtx.createGain(); driftGain.gain.value = 1.2; // cents
  driftLFO.connect(driftGain);
  driftGain.connect(oscB.detune); // adds +/- 1.2 cents

  // --- Filter block: bellows pressure opens tone (brighter when harder) ---
  const lp = audioCtx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.7;
  // Two gentle formant-ish peaks to hint at reed/box body
  const peak1 = audioCtx.createBiquadFilter(); peak1.type = "peaking"; peak1.frequency.value = 500; peak1.Q.value = 1.0; peak1.gain.value = 3;
  const peak2 = audioCtx.createBiquadFilter(); peak2.type = "peaking"; peak2.frequency.value = 1600; peak2.Q.value = 0.8; peak2.gain.value = 2;

  // --- Amp envelope and tremolo (optional) ---
  const amp = audioCtx.createGain(); amp.gain.value = 0;
  const tremLFO = audioCtx.createOscillator(); tremLFO.frequency.value = 5.5;
  const tremDepth = audioCtx.createGain(); tremDepth.gain.value = 0.0; // set >0 to enable tremolo
  tremLFO.connect(tremDepth);
  tremDepth.connect(amp.gain);

  // --- Attack noise (key/bellow chiff) ---
  const noise = makeNoiseSource(audioCtx);
  const noiseHP = audioCtx.createBiquadFilter(); noiseHP.type = "highpass"; noiseHP.frequency.value = 800;
  const noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0.0;

  // Wiring
  oscA.connect(lp);
  oscB.connect(lp);
  lp.connect(peak1);
  peak1.connect(peak2);
  peak2.connect(amp);
  noise.connect(noiseHP);
  noiseHP.connect(noiseGain);
  noiseGain.connect(amp);
  amp.connect(out);

  oscA.start(); oscB.start(); driftLFO.start(); tremLFO.start(); noise.start();

  const state = {
    pressure: 0,    // 0..1
    pitchHz: 220,
    on: false,
    attack: 0.01,
    decay: 0.15,
    sustainAtPressure: 0.6, // scales with pressure
    release: 0.12,
    tremolo: 0.0,   // 0..1 (depth)
  };

  function setPitch(hz: number) {
    state.pitchHz = hz;
    oscA.frequency.setValueAtTime(hz, audioCtx.currentTime);
    oscB.frequency.setValueAtTime(hz, audioCtx.currentTime);
  }

  function setPressure(p: number) {
    // clamp 0..1
    state.pressure = Math.max(0, Math.min(1, p));
    const t = audioCtx.currentTime;

    // Open the low-pass with pressure (roughly 800..3800 Hz)
    const cutoff = 800 + state.pressure * 3000;
    lp.frequency.setTargetAtTime(cutoff, t, 0.015);

    // Amp follows an ADSR toward a sustain that scales with pressure
    const sustain = 0.2 + state.pressure * state.sustainAtPressure; // 0.2..0.8
    // If currently playing, glide toward sustain; on attack we'll schedule separately.
    amp.gain.setTargetAtTime(sustain, t, 0.02);

    // Noise amount mostly at the start, but a touch with pressure
    noiseGain.gain.setTargetAtTime(0.02 + 0.06 * state.pressure, t, 0.03);
  }

  function start({ pitchHz = 220, speed = 0.8, pressure = 0.7 } = {}) {
    const t = audioCtx.currentTime;
    state.on = true;
    setPitch(pitchHz);
    setPressure(pressure);
    // Envelope attack/decay
    amp.gain.cancelScheduledValues(t);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(Math.min(1, 0.9 * speed + 0.1), t + state.attack);
    amp.gain.linearRampToValueAtTime(0.2 + pressure * state.sustainAtPressure, t + state.attack + state.decay);

    // Little noise pop at the start
    noiseGain.gain.cancelScheduledValues(t);
    noiseGain.gain.setValueAtTime(0.18 * speed, t);
    noiseGain.gain.linearRampToValueAtTime(0.02 + 0.06 * pressure, t + 0.06);
  }

  function stop() {
    const t = audioCtx.currentTime;
    state.on = false;
    amp.gain.cancelScheduledValues(t);
    amp.gain.setTargetAtTime(0, t, state.release);
    // clean noise too
    noiseGain.gain.setTargetAtTime(0, t, 0.05);
  }

  function setTremolo(depth01 = 0.0, rateHz = 5.5) {
    tremDepth.gain.setValueAtTime(depth01 * 0.4, audioCtx.currentTime); // scale to a sensible range
    tremLFO.frequency.setValueAtTime(rateHz, audioCtx.currentTime);
  }

  function connect(dest: AudioNode) { out.connect(dest); return dest; }
  function disconnect() { out.disconnect(); }

  return { output: out, start, stop, setPitch, setPressure, setTremolo, connect, disconnect };
}

// Helper: looping white noise buffer
function makeNoiseSource(audioCtx: AudioContext) {
  const len = audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  const src = audioCtx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

// bellows-mapper.js
export function createBellowsMapper(acc: ReturnType<typeof createAccordionVoice>, {
  vCap = 600,          // hard cap for |speed| (tune!)
  vDead = 5,           // dead-zone: ignore tiny movements
  pressureCurve = 0.6, // 0.4..0.8; lower = more responsive at low speeds
  edgeLoss = 0.15,     // how much efficiency drops near |stretch|=1 (0..0.3)
  bendCentsMax = 4,    // max absolute pitch bend from bellows direction
  smoothTau = 0.03,    // seconds; pressure smoothing
} = {}) {
  let smoothedPressure = 0;

  function map({ stretch, speed, basePitchHz }: { stretch?: number, speed?: number, basePitchHz?: number }) {
    // 1) Direction & magnitude
    const dir = Math.sign(speed || 0);            // -1 push, +1 pull, 0 idle
    let v = Math.abs(speed || 0);

    // 2) Dead-zone then cap (with soft knee)
    if (v <= vDead) v = 0;
    v = Math.min(v, vCap);

    // 3) Normalize and apply perceptual curve
    let p = (v / vCap) ** pressureCurve;            // 0..1-ish

    // 4) Bellows efficiency vs stretch position (optional)
    const efficiency = 1 - edgeLoss * Math.abs(stretch || 0); // 1..(1-edgeLoss)
    p *= efficiency;

    // 5) Smooth pressure (one-pole)
    // use AudioParam-like smoothing by calling setPressure frequently; here manual:
    const dt = 1 / 60; // assume ~60 Hz caller; okay if called in rAF
    const alpha = 1 - Math.exp(-dt / smoothTau);
    smoothedPressure = smoothedPressure + alpha * (p - smoothedPressure);

    // 6) Pitch bend in cents based on direction & stretch (subtle & musical)
    const bendCents = dir * Math.abs(stretch || 0) * bendCentsMax; // -bend..+bend
    const bendRatio = Math.pow(2, bendCents / 1200);
    const pitchHz = (basePitchHz || 220) * bendRatio;

    // 7) Apply to the synth
    acc.setPitch(pitchHz);
    acc.setPressure(smoothedPressure);

    // 8) Optional: brighten slightly on pull (dir>0), darken on push (dir<0)
    // If you expose tone params, nudge cutoff or peak gains here.

    return { pressure: smoothedPressure, pitchHz, bendCents, dir };
  }

  return { map };
}
