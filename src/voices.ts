import { pulseCoefficients } from './curves';
import { midiToFreq } from './pitch';
import type { DrumKit, Osc, SynthPatch, Wave } from './styles';

export interface Voice {
  end: number;
  stop(at: number): void;
}

export interface VoiceKit {
  ctx: AudioContext;
  noise: { white: AudioBuffer; chip: AudioBuffer; metal: AudioBuffer };
  pulse12: PeriodicWave;
  pulse25: PeriodicWave;
}

const CHIP_NOISE_HOLD = 14;
const METAL_HZ = [80, 120, 166.4, 217.2, 271.6, 328.4];

// Fixed seed, so the generated buffers never consume Math.random.
function seededNoise(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function createVoiceKit(ctx: AudioContext): VoiceKit {
  const length = Math.max(1, Math.floor(ctx.sampleRate));

  const white = ctx.createBuffer(1, length, ctx.sampleRate);
  const whiteData = white.getChannelData(0);
  for (let i = 0; i < whiteData.length; i += 1) whiteData[i] = Math.random() * 2 - 1;

  const chipRandom = seededNoise(7);
  const chip = ctx.createBuffer(1, length, ctx.sampleRate);
  const chipData = chip.getChannelData(0);
  let held = 0;
  for (let i = 0; i < chipData.length; i += 1) {
    if (i % CHIP_NOISE_HOLD === 0) held = chipRandom() * 2 - 1;
    chipData[i] = held;
  }

  const metal = ctx.createBuffer(1, length, ctx.sampleRate);
  const metalData = metal.getChannelData(0);
  for (let i = 0; i < metalData.length; i += 1) {
    let sum = 0;
    for (const hz of METAL_HZ) {
      sum += Math.sign(Math.sin((2 * Math.PI * hz * 16 * i) / ctx.sampleRate));
    }
    metalData[i] = sum / METAL_HZ.length;
  }

  const first = pulseCoefficients(0.125, 32);
  const second = pulseCoefficients(0.25, 32);

  return {
    ctx,
    noise: { white, chip, metal },
    pulse12: ctx.createPeriodicWave(first.real, first.imag),
    pulse25: ctx.createPeriodicWave(second.real, second.imag),
  };
}

function setWave(kit: VoiceKit, osc: OscillatorNode, wave: Wave): void {
  if (wave === 'pulse12') osc.setPeriodicWave(kit.pulse12);
  else if (wave === 'pulse25') osc.setPeriodicWave(kit.pulse25);
  else osc.type = wave;
}

interface SourceSpec {
  node: AudioScheduledSourceNode;
  offset?: number;
}

interface Part {
  nodes: AudioNode[];
  sources: SourceSpec[];
}

function part(): Part {
  return { nodes: [], sources: [] };
}

// Starts every source at `at`, stops them at `end`, and disconnects the whole voice once the last
// source has ended.
function makeVoice(
  end: number,
  env: GainNode | null,
  collected: Part,
  at: number,
): Voice {
  let remaining = collected.sources.length;
  const cleanup = () => {
    for (const node of collected.nodes) node.disconnect();
  };
  for (const source of collected.sources) {
    source.node.onended = () => {
      remaining -= 1;
      if (remaining <= 0) cleanup();
    };
    if (source.offset !== undefined) (source.node as AudioBufferSourceNode).start(at, source.offset);
    else source.node.start(at);
    source.node.stop(end);
  }
  return {
    end,
    stop(stopAt: number): void {
      if (env) {
        env.gain.cancelScheduledValues(stopAt);
        env.gain.setValueAtTime(env.gain.value, stopAt);
        env.gain.linearRampToValueAtTime(0, stopAt + 0.03);
      }
      for (const source of collected.sources) source.node.stop(stopAt + 0.05);
    },
  };
}

function noiseSpec(kit: VoiceKit, kind: 'white' | 'chip' | 'metal', offsetMax = 0.5): SourceSpec {
  const node = kit.ctx.createBufferSource();
  node.buffer = kit.noise[kind];
  return { node, offset: Math.random() * offsetMax };
}

function clampLevel(value: number): number {
  return Math.max(0.0001, value);
}

export function playSynth(
  kit: VoiceKit,
  patch: SynthPatch,
  midi: number,
  time: number,
  duration: number,
  gain: number,
  out: AudioNode,
): Voice {
  const { ctx } = kit;
  const freq = midiToFreq(midi);
  const collected = part();

  const env = ctx.createGain();
  const { attack, decay, sustain, release } = patch.env;
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(gain, time + attack);
  env.gain.setTargetAtTime(gain * sustain, time + attack, Math.max(0.001, decay / 3));
  const relStart = time + Math.max(duration, attack);
  env.gain.setTargetAtTime(0, relStart, Math.max(0.001, release / 3));
  env.connect(out);
  collected.nodes.push(env);

  let destination: AudioNode = env;
  if (patch.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = patch.filter.type;
    filter.Q.value = patch.filter.q;
    filter.frequency.setValueAtTime(Math.min(patch.filter.hz * patch.filter.envAmount, 18000), time);
    filter.frequency.setTargetAtTime(patch.filter.hz, time, Math.max(0.001, patch.filter.envDecay / 3));
    filter.connect(env);
    collected.nodes.push(filter);
    destination = filter;
  }

  const oscillators: OscillatorNode[] = [];
  for (const spec of patch.oscs) {
    const osc = ctx.createOscillator();
    setWave(kit, osc, spec.wave);
    osc.frequency.value = freq * 2 ** spec.octave;
    osc.detune.value = spec.detune;
    const level = ctx.createGain();
    level.gain.value = spec.level;
    osc.connect(level);
    level.connect(destination);
    collected.nodes.push(osc, level);
    collected.sources.push({ node: osc });
    oscillators.push(osc);
  }

  if (patch.vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = patch.vibrato.rate;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.setValueAtTime(0, time + patch.vibrato.delay);
    depth.gain.linearRampToValueAtTime(patch.vibrato.cents, time + patch.vibrato.delay + 0.2);
    lfo.connect(depth);
    for (const osc of oscillators) depth.connect(osc.detune);
    collected.nodes.push(lfo, depth);
    collected.sources.push({ node: lfo });
  }

  if (patch.fm) {
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.value = freq * patch.fm.ratio;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(freq * patch.fm.index, time);
    depth.gain.setTargetAtTime(freq * patch.fm.index * 0.05, time, Math.max(0.001, patch.fm.decay / 3));
    modulator.connect(depth);
    for (const osc of oscillators) depth.connect(osc.frequency);
    collected.nodes.push(modulator, depth);
    collected.sources.push({ node: modulator });
  }

  const end = relStart + release + 0.1;
  return makeVoice(end, env, collected, time);
}

function silentVoice(time: number): Voice {
  return { end: time, stop(): void {} };
}

export function playDrum(
  kit: VoiceKit,
  drums: DrumKit,
  gm: number,
  time: number,
  gain: number,
  out: AudioNode,
): Voice {
  const { ctx } = kit;
  const level = clampLevel(gain);
  const collected = part();

  switch (gm) {
    case 36: {
      const { kick } = drums;
      const osc = ctx.createOscillator();
      osc.type = kick.wave;
      osc.frequency.setValueAtTime(kick.hz * kick.sweep, time);
      osc.frequency.exponentialRampToValueAtTime(kick.hz, time + kick.sweepTime);
      const body = ctx.createGain();
      body.gain.setValueAtTime(level, time);
      body.gain.exponentialRampToValueAtTime(0.001, time + kick.decay);
      osc.connect(body);
      body.connect(out);
      collected.nodes.push(osc, body);
      collected.sources.push({ node: osc });
      let longest = kick.decay;

      if (kick.click > 0) {
        const noise = noiseSpec(kit, 'white');
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 2500;
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(clampLevel(level * kick.click), time);
        clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.005);
        noise.node.connect(highpass);
        highpass.connect(clickGain);
        clickGain.connect(out);
        collected.nodes.push(highpass, clickGain);
        collected.sources.push(noise);
        longest = Math.max(longest, 0.005);
      }
      return makeVoice(time + longest + 0.05, null, collected, time);
    }
    case 38: {
      const { snare } = drums;
      const noise = noiseSpec(kit, snare.noise);
      const filter = ctx.createBiquadFilter();
      filter.type = snare.filter;
      filter.frequency.value = snare.hz;
      filter.Q.value = 0.8;
      const body = ctx.createGain();
      body.gain.setValueAtTime(clampLevel(level * 0.8), time);
      body.gain.exponentialRampToValueAtTime(0.001, time + snare.decay);
      noise.node.connect(filter);
      filter.connect(body);
      body.connect(out);
      collected.nodes.push(filter, body);
      collected.sources.push(noise);
      let longest = snare.decay;

      if (snare.toneHz > 0) {
        const tone = ctx.createOscillator();
        tone.type = 'triangle';
        tone.frequency.value = snare.toneHz;
        const toneGain = ctx.createGain();
        toneGain.gain.setValueAtTime(clampLevel(level * 0.5), time);
        toneGain.gain.exponentialRampToValueAtTime(0.001, time + snare.decay * 0.5);
        tone.connect(toneGain);
        toneGain.connect(out);
        collected.nodes.push(tone, toneGain);
        collected.sources.push({ node: tone });
        longest = Math.max(longest, snare.decay * 0.5);
      }
      return makeVoice(time + longest + 0.05, null, collected, time);
    }
    case 42:
    case 46: {
      const { hat } = drums;
      const decay = gm === 46 ? hat.decay * 6 : hat.decay;
      const noise = noiseSpec(kit, hat.noise);
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = hat.hz;
      const body = ctx.createGain();
      body.gain.setValueAtTime(clampLevel(level * 0.45), time);
      body.gain.exponentialRampToValueAtTime(0.001, time + decay);
      noise.node.connect(highpass);
      highpass.connect(body);
      body.connect(out);
      collected.nodes.push(highpass, body);
      collected.sources.push(noise);
      return makeVoice(time + decay + 0.05, null, collected, time);
    }
    case 49: {
      const white = noiseSpec(kit, 'white');
      const metal = noiseSpec(kit, 'metal');
      const whiteGain = ctx.createGain();
      whiteGain.gain.value = 0.5;
      const metalGain = ctx.createGain();
      metalGain.gain.value = 0.5;
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 5000;
      const body = ctx.createGain();
      body.gain.setValueAtTime(clampLevel(level * 0.5), time);
      body.gain.exponentialRampToValueAtTime(0.001, time + drums.crashDecay);
      white.node.connect(whiteGain);
      metal.node.connect(metalGain);
      whiteGain.connect(highpass);
      metalGain.connect(highpass);
      highpass.connect(body);
      body.connect(out);
      collected.nodes.push(whiteGain, metalGain, highpass, body);
      collected.sources.push(white, metal);
      return makeVoice(time + drums.crashDecay + 0.05, null, collected, time);
    }
    case 51: {
      const metal = noiseSpec(kit, 'metal');
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 7000;
      bandpass.Q.value = 1;
      const body = ctx.createGain();
      body.gain.setValueAtTime(clampLevel(level * 0.3), time);
      body.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
      metal.node.connect(bandpass);
      bandpass.connect(body);
      body.connect(out);
      collected.nodes.push(bandpass, body);
      collected.sources.push(metal);
      return makeVoice(time + 0.65, null, collected, time);
    }
    case 41:
    case 45:
    case 50: {
      const hz = gm === 41 ? 90 : gm === 45 ? 130 : 180;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz * 1.6, time);
      osc.frequency.exponentialRampToValueAtTime(hz, time + 0.06);
      const body = ctx.createGain();
      body.gain.setValueAtTime(level, time);
      body.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
      osc.connect(body);
      body.connect(out);
      collected.nodes.push(osc, body);
      collected.sources.push({ node: osc });
      return makeVoice(time + 0.4, null, collected, time);
    }
    case 39: {
      const noise = noiseSpec(kit, 'white');
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1100;
      bandpass.Q.value = 1.2;
      const body = ctx.createGain();
      const peak = clampLevel(level);
      body.gain.setValueAtTime(peak * 0.7, time);
      body.gain.exponentialRampToValueAtTime(peak * 0.07, time + 0.008);
      body.gain.setValueAtTime(peak * 0.7, time + 0.01);
      body.gain.exponentialRampToValueAtTime(peak * 0.07, time + 0.018);
      body.gain.setValueAtTime(peak * 0.7, time + 0.02);
      body.gain.exponentialRampToValueAtTime(peak * 0.07, time + 0.028);
      body.gain.setValueAtTime(peak * 0.7, time + 0.03);
      body.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      noise.node.connect(bandpass);
      bandpass.connect(body);
      body.connect(out);
      collected.nodes.push(bandpass, body);
      collected.sources.push(noise);
      return makeVoice(time + 0.23, null, collected, time);
    }
    case 37: {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1800;
      const body = ctx.createGain();
      body.gain.setValueAtTime(clampLevel(level * 0.4), time);
      body.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.connect(body);
      body.connect(out);
      collected.nodes.push(osc, body);
      collected.sources.push({ node: osc });
      return makeVoice(time + 0.08, null, collected, time);
    }
    default:
      return silentVoice(time);
  }
}
