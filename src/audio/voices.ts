import { attackTime, audibleOsc, bendGlide, driveCurve, fmIndex, pulseCoefficients } from './curves';
import { midiToFreq } from '../music/pitch';
import type { DrumKit, Osc, SynthPatch, Wave } from './styles';
import { pluckSamples } from './strings';

export interface Voice {
  end: number;
  stop(at: number): void;
}

export interface VoiceKit {
  ctx: BaseAudioContext;
  noise: { white: AudioBuffer; chip: AudioBuffer; metal: AudioBuffer };
  pulse12: PeriodicWave;
  pulse25: PeriodicWave;
  /** Drive curves built per amount, so a patch's curve is only made once. */
  driveCurves: Map<number, Float32Array<ArrayBuffer>>;
  /** Rendered plucked-string buffers, keyed by sample rate, pitch, and string spec. */
  strings: Map<string, AudioBuffer>;
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

export function createVoiceKit(ctx: BaseAudioContext): VoiceKit {
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
    driveCurves: new Map(),
    strings: new Map(),
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

/** How long a voice cut short (by a seek, pause or station change) takes to fade out. */
const STOP_FADE = 0.03;

// Starts every source at `at`, stops them at `end`, and disconnects the whole voice once the last
// source has ended. `env` is the gain the voice fades through when it is stopped early.
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
      // A voice booked ahead that hasn't started yet just never sounds.
      if (at >= stopAt) {
        for (const source of collected.sources) source.node.stop(at);
        return;
      }
      // A sounding voice fades from wherever its envelope is: hold the envelope's current value
      // (reading gain.value would give the value from before the automation) and ramp to zero.
      if (env) {
        const gain = env.gain;
        if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(stopAt);
        else {
          gain.cancelScheduledValues(stopAt);
          gain.setValueAtTime(gain.value, stopAt);
        }
        gain.linearRampToValueAtTime(0, stopAt + STOP_FADE);
      }
      for (const source of collected.sources) source.node.stop(stopAt + STOP_FADE + 0.02);
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
  bends: { time: number; pitch: number }[] = [],
  velocity = 127,
): Voice {
  const { ctx } = kit;
  const freq = midiToFreq(midi);
  const collected = part();

  // Glide the detune from one bend point to the next; the vibrato LFO adds on top.
  const scheduleBends = (param: AudioParam, baseDetune: number): void => {
    param.setValueAtTime(baseDetune, time);
    let previous = baseDetune;
    for (let index = 0; index < bends.length; index += 1) {
      const bend = bends[index];
      const next = bends[index + 1];
      const segment = (next ? next.time : duration) - bend.time;
      const glide = bendGlide(segment);
      const cents = (bend.pitch - midi) * 100;
      param.setValueAtTime(previous, time + bend.time);
      param.linearRampToValueAtTime(cents + baseDetune, time + bend.time + glide);
      previous = cents + baseDetune;
    }
  };

  const env = ctx.createGain();
  const { decay, sustain, release } = patch.env;
  const attack = attackTime(patch.env.attack, freq);
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(gain, time + attack);
  env.gain.setTargetAtTime(gain * sustain, time + attack, Math.max(0.001, decay / 3));
  const relStart = time + Math.max(duration, attack);
  // A time constant of release/4 and a stop at 2 × release leave the voice at about 0.03% of its
  // level when it is cut, so notes end without a click.
  env.gain.setTargetAtTime(0, relStart, Math.max(0.001, release / 4));
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

  let oscTarget: AudioNode = destination;
  const drive = patch.drive ?? 0;
  if (drive > 0) {
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '2x';
    let curve = kit.driveCurves.get(drive);
    if (!curve) {
      curve = driveCurve(drive);
      kit.driveCurves.set(drive, curve);
    }
    shaper.curve = curve;
    shaper.connect(destination);
    collected.nodes.push(shaper);
    oscTarget = shaper;
  }

  const oscillators: OscillatorNode[] = [];
  // One entry per patch oscillator, in order, so `fm.targets` can name them; undefined when the
  // oscillator was skipped as inaudible.
  const oscBySpec: (OscillatorNode | undefined)[] = [];
  for (const spec of patch.oscs) {
    if (!audibleOsc(freq, spec.octave)) {
      oscBySpec.push(undefined);
      continue;
    }
    const osc = ctx.createOscillator();
    setWave(kit, osc, spec.wave);
    osc.frequency.value = freq * 2 ** spec.octave;
    if (bends.length > 0) scheduleBends(osc.detune, spec.detune);
    else osc.detune.value = spec.detune;
    const level = ctx.createGain();
    level.gain.value = spec.level;
    osc.connect(level);
    level.connect(oscTarget);
    collected.nodes.push(osc, level);
    collected.sources.push({ node: osc });
    oscillators.push(osc);
    oscBySpec.push(osc);
  }

  // The plucked string is voiced with the oscillators: it goes through the same drive, filter, and
  // envelope, and its detune takes the same bends and vibrato.
  const detuneTargets: AudioParam[] = [];
  const string = patch.string;
  if (string && audibleOsc(freq, string.octave)) {
    const stringFreq = freq * 2 ** string.octave;
    const key = `${ctx.sampleRate}:${stringFreq.toFixed(3)}:${string.decay}:${string.brightness}:${string.pick}`;
    let buffer = kit.strings.get(key);
    if (!buffer) {
      const samples = pluckSamples(ctx.sampleRate, stringFreq, string);
      buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.copyToChannel(samples, 0);
      kit.strings.set(key, buffer);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const level = ctx.createGain();
    level.gain.value = string.level;
    source.connect(level);
    level.connect(oscTarget);
    if (bends.length > 0) scheduleBends(source.detune, 0);
    collected.nodes.push(source, level);
    collected.sources.push({ node: source });
    detuneTargets.push(source.detune);
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
    for (const target of detuneTargets) depth.connect(target);
    collected.nodes.push(lfo, depth);
    collected.sources.push({ node: lfo });
  }

  if (patch.fm) {
    const { peak, floor } = fmIndex(patch.fm, velocity);
    const attack = patch.fm.attack ?? 0;
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.value = freq * patch.fm.ratio;
    if (bends.length > 0) scheduleBends(modulator.detune, 0);
    const depth = ctx.createGain();
    if (attack > 0) {
      depth.gain.setValueAtTime(freq * floor, time);
      depth.gain.linearRampToValueAtTime(freq * peak, time + attack);
      depth.gain.setTargetAtTime(freq * floor, time + attack, Math.max(0.001, patch.fm.decay / 3));
    } else {
      depth.gain.setValueAtTime(freq * peak, time);
      depth.gain.setTargetAtTime(freq * floor, time, Math.max(0.001, patch.fm.decay / 3));
    }
    modulator.connect(depth);
    const targets = patch.fm.targets;
    if (targets === undefined) {
      for (const osc of oscillators) depth.connect(osc.frequency);
    } else {
      for (const index of targets) {
        const osc = oscBySpec[index];
        if (osc) depth.connect(osc.frequency);
      }
    }
    collected.nodes.push(modulator, depth);
    collected.sources.push({ node: modulator });
  }

  const end = relStart + release * 2 + 0.05;
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
  dest: AudioNode,
): Voice {
  const { ctx } = kit;
  const level = clampLevel(gain);
  const collected = part();
  // Every drum voice goes through its own gain, so a hit cut short can fade instead of snapping off.
  const out = ctx.createGain();
  out.connect(dest);
  collected.nodes.push(out);

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
      return makeVoice(time + longest + 0.05, out, collected, time);
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
      return makeVoice(time + longest + 0.05, out, collected, time);
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
      return makeVoice(time + decay + 0.05, out, collected, time);
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
      return makeVoice(time + drums.crashDecay + 0.05, out, collected, time);
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
      return makeVoice(time + 0.65, out, collected, time);
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
      return makeVoice(time + 0.4, out, collected, time);
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
      return makeVoice(time + 0.23, out, collected, time);
    }
    case 37: {
      // A rimshot: a short, narrow burst of noise for the stick on the rim, plus a quick low knock
      // for the drum shell. A pure tone here sounds like a cowbell.
      const noise = noiseSpec(kit, 'white');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500;
      filter.Q.value = 3;
      const body = ctx.createGain();
      body.gain.setValueAtTime(clampLevel(level * 0.9), time);
      body.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
      noise.node.connect(filter);
      filter.connect(body);
      body.connect(out);
      const knock = ctx.createOscillator();
      knock.type = 'triangle';
      knock.frequency.value = 450;
      const knockGain = ctx.createGain();
      knockGain.gain.setValueAtTime(clampLevel(level * 0.35), time);
      knockGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
      knock.connect(knockGain);
      knockGain.connect(out);
      collected.nodes.push(filter, body, knock, knockGain);
      collected.sources.push(noise, { node: knock });
      return makeVoice(time + 0.08, out, collected, time);
    }
    default:
      out.disconnect();
      return silentVoice(time);
  }
}
