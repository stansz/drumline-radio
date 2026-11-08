import { crackleSamples, crushCurve, noteGain, softClipCurve } from './curves';
import type { StyleId } from '../music/roles';
import type { Song, Track } from '../music/song';
import { resolvePatch, STYLE_DEFS } from './styles';
import { buildTimeline, notesBetween } from '../music/timing';
import type { ScheduledNote, Timeline } from '../music/timing';
import { createVoiceKit, playDrum, playSynth } from './voices';
import type { Voice, VoiceKit } from './voices';

interface TrackChannel {
  track: Track;
  gain: GainNode;
  pan: StereoPannerNode;
  reverbSend: GainNode;
  delaySend: GainNode;
}

const TICK_MS = 25;
/** How far ahead notes are booked. Long enough to ride out the timer delays browsers add to windows
 * that aren't focused; changing style rebooks, so it never delays a switch. */
const LOOKAHEAD = 0.5;
/** A note missed by a late tick still plays if it is at most this late (inaudible in a song). Notes
 * missed by more, after a real freeze, are skipped, so they don't all start at once in a burst. */
const LATE_OK = 0.3;
const MAKEUP_GAIN = 1.4;
/** How long the vinyl bed fades when play starts or stops. */
const STOP_FADE = 0.03;
/** How long old track channels stay connected after a station change, so fading voices finish. */
const CHANNEL_GRACE_MS = 200;
/** How far ahead playback starts after play, a seek, or a station change. */
const START_LEAD = 0.05;
/** Extra time rendered after the song, so reverb and delay tails finish. */
const RENDER_TAIL = 3;
const RENDER_RATE = 44100;
/** How much of an offline render is booked at once, in seconds. */
const RENDER_CHUNK = 2;

export class Engine {
  private readonly ctx: BaseAudioContext;
  private readonly voiceKit: VoiceKit;
  private readonly mix: GainNode;
  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private readonly crush: WaveShaperNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly makeup: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private readonly clip: WaveShaperNode;
  private readonly volume: GainNode;
  private readonly splitter: ChannelSplitterNode;
  private readonly leftAnalyser: AnalyserNode;
  private readonly rightAnalyser: AnalyserNode;
  private readonly leftData: Float32Array<ArrayBuffer>;
  private readonly rightData: Float32Array<ArrayBuffer>;
  private readonly reverb: ConvolverNode;
  private readonly delay: DelayNode;
  private readonly delayFeedback: GainNode;
  private readonly crackleBuffer: AudioBuffer;
  private readonly crackleGain: GainNode;
  private readonly reverbImpulses = new Map<number, AudioBuffer>();

  private songValue: Song | null = null;
  private timelineValue: Timeline | null = null;
  private channels: TrackChannel[] = [];
  private styleValue: StyleId = 'synthwave';
  private playingValue = false;
  private positionValue = 0;
  private volumeValue = 1;
  private startCtx = 0;
  private startPos = 0;
  private scheduledUntil = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private crackleSource: AudioBufferSourceNode | null = null;
  private crackleFade: GainNode | null = null;
  /** Every sounding or booked voice, with the time it starts. */
  private readonly voices = new Map<Voice, number>();

  onEnded: (() => void) | null = null;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.voiceKit = createVoiceKit(ctx);

    const crackleLength = Math.round(4 * ctx.sampleRate);
    this.crackleBuffer = ctx.createBuffer(2, crackleLength, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      this.crackleBuffer
        .getChannelData(channel)
        .set(crackleSamples(crackleLength, ctx.sampleRate, Math.random));
    }

    this.mix = ctx.createGain();
    this.mix.gain.value = 1;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    // The wet level is applied after the crusher. Turning the signal down before it would leave
    // quiet music on only a few of its fixed steps, which buzzes.
    this.crush = ctx.createWaveShaper();
    this.crush.curve = crushCurve();

    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 18000;
    this.lowpass.Q.value = 0.7;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.25;

    // Makeup gain after the compressor brings songs up to normal music loudness.
    this.makeup = ctx.createGain();
    this.makeup.gain.value = MAKEUP_GAIN;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;

    this.clip = ctx.createWaveShaper();
    this.clip.curve = softClipCurve();
    this.clip.oversample = '4x';

    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0;
    this.crackleGain.connect(this.clip);

    this.volume = ctx.createGain();
    this.volume.gain.value = this.volumeValue;

    this.splitter = ctx.createChannelSplitter(2);
    this.leftAnalyser = ctx.createAnalyser();
    this.leftAnalyser.fftSize = 1024;
    this.rightAnalyser = ctx.createAnalyser();
    this.rightAnalyser.fftSize = 1024;
    this.leftData = new Float32Array(this.leftAnalyser.fftSize);
    this.rightData = new Float32Array(this.rightAnalyser.fftSize);

    this.mix.connect(this.dryGain);
    this.dryGain.connect(this.lowpass);
    this.mix.connect(this.crush);
    this.crush.connect(this.wetGain);
    this.wetGain.connect(this.lowpass);
    this.lowpass.connect(this.compressor);
    this.compressor.connect(this.makeup);
    this.makeup.connect(this.limiter);
    this.limiter.connect(this.clip);
    this.clip.connect(this.volume);
    this.volume.connect(ctx.destination);
    this.clip.connect(this.splitter);
    this.splitter.connect(this.leftAnalyser, 0);
    this.splitter.connect(this.rightAnalyser, 1);

    this.reverb = ctx.createConvolver();
    this.reverb.connect(this.mix);
    this.delay = ctx.createDelay(2);
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.35;
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(this.mix);

    this.applyStyleFx();
  }

  get song(): Song | null {
    return this.songValue;
  }

  get timeline(): Timeline | null {
    return this.timelineValue;
  }

  get style(): StyleId {
    return this.styleValue;
  }

  get playing(): boolean {
    return this.playingValue;
  }

  get position(): number {
    if (!this.playingValue) return this.positionValue;
    const elapsed = Math.max(0, this.ctx.currentTime - this.startCtx);
    return this.startPos + elapsed;
  }

  get duration(): number {
    return this.timelineValue?.duration ?? 0;
  }

  load(song: Song): void {
    this.stopAll();
    this.playingValue = false;
    this.positionValue = 0;
    this.startPos = 0;
    this.startCtx = this.ctx.currentTime;
    this.scheduledUntil = 0;

    this.songValue = song;
    this.timelineValue = buildTimeline(song);
    this.styleValue = song.meta.style;
    this.buildChannels(song);
    this.applyStyleFx();
  }

  setStyle(id: StyleId): void {
    this.styleValue = id;
    this.applyStyleFx();
    this.rebook();
  }

  /** Cancels the notes booked but not yet started and books them again, in the current style. */
  private rebook(): void {
    if (!this.playingValue || !this.timelineValue || this.timer === null) return;
    const now = this.ctx.currentTime;
    const from = this.position;
    for (const [voice, start] of this.voices) {
      if (start > now) {
        voice.stop(now);
        this.voices.delete(voice);
      }
    }
    for (const note of notesBetween(this.timelineValue, from, this.scheduledUntil)) {
      if (this.startCtx + (note.start - this.startPos) > now) this.scheduleNote(note);
    }
  }

  /** @internal Books the loaded song for an offline render; used by `renderSong`. */
  bookOffline(ctx: OfflineAudioContext, onProgress?: (fraction: number) => void): void {
    const timeline = this.timelineValue;
    if (!timeline) return;
    const duration = timeline.duration;
    this.startPos = 0;
    this.startCtx = 0;

    const crackle = ctx.createBufferSource();
    crackle.buffer = this.crackleBuffer;
    crackle.loop = true;
    crackle.connect(this.crackleGain);
    crackle.start(0);
    crackle.stop(ctx.length / ctx.sampleRate);

    const book = (from: number, to: number): void => {
      for (const note of notesBetween(timeline, from, to)) this.scheduleNote(note);
      // An offline render never stops voices early, so don't keep them: holding every voice of a
      // long song would keep all of its nodes in memory.
      this.voices.clear();
    };

    // Book the first windows now; then book one more each time the render reaches a chunk boundary,
    // so every note is booked at least RENDER_CHUNK ahead and a long song never holds every voice.
    book(0, RENDER_CHUNK);
    book(RENDER_CHUNK, RENDER_CHUNK * 2);

    if (typeof ctx.suspend !== 'function') {
      book(RENDER_CHUNK * 2, duration);
      return;
    }

    for (let k = 0; (k + 2) * RENDER_CHUNK < duration; k += 1) {
      const from = (k + 2) * RENDER_CHUNK;
      const to = (k + 3) * RENDER_CHUNK;
      void ctx.suspend(k * RENDER_CHUNK).then(() => {
        book(from, to);
        onProgress?.((k * RENDER_CHUNK) / duration);
        return ctx.resume();
      });
    }
  }

  play(): void {
    if (!this.songValue || this.playingValue) return;
    if (this.positionValue >= this.duration) this.positionValue = 0;
    this.playingValue = true;
    this.startPos = this.positionValue;
    this.startCtx = this.ctx.currentTime;
    this.scheduledUntil = this.positionValue;

    const begin = (): void => {
      if (!this.playingValue || this.timer !== null) return;
      // Start a moment ahead, so the first notes are booked in the future and get their full
      // attack instead of starting late, already at full level, with a click.
      this.startCtx = this.ctx.currentTime + START_LEAD;
      this.scheduledUntil = this.startPos;
      const crackle = this.ctx.createBufferSource();
      crackle.buffer = this.crackleBuffer;
      crackle.loop = true;
      // The vinyl bed fades in and out with play so starting and stopping it never clicks.
      const fade = this.ctx.createGain();
      const now = this.ctx.currentTime;
      fade.gain.setValueAtTime(0, now);
      fade.gain.linearRampToValueAtTime(1, now + STOP_FADE);
      crackle.connect(fade);
      fade.connect(this.crackleGain);
      crackle.onended = () => fade.disconnect();
      crackle.start();
      this.crackleSource = crackle;
      this.crackleFade = fade;
      this.timer = setInterval(() => this.tick(), TICK_MS);
      this.tick();
    };

    if (this.ctx.state === 'suspended') void (this.ctx as AudioContext).resume().then(begin);
    else begin();
  }

  pause(): void {
    if (!this.playingValue) return;
    this.positionValue = Math.min(this.position, this.duration);
    this.playingValue = false;
    this.scheduledUntil = this.positionValue;
    this.stopAll();
  }

  seek(seconds: number): void {
    const wasPlaying = this.playingValue;
    const clamped = Math.min(Math.max(seconds, 0), this.duration);
    this.positionValue = clamped;
    this.playingValue = false;
    this.scheduledUntil = clamped;
    this.stopAll();
    if (wasPlaying) this.play();
  }

  setVolume(value: number): void {
    this.volumeValue = Math.min(Math.max(value, 0), 1);
    this.volume.gain.setTargetAtTime(this.volumeValue, this.ctx.currentTime, 0.05);
  }

  levels(): [number, number] {
    return [this.rms(this.leftAnalyser, this.leftData), this.rms(this.rightAnalyser, this.rightData)];
  }

  private rms(analyser: AnalyserNode, data: Float32Array<ArrayBuffer>): number {
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
    return Math.min(1, Math.sqrt(sum / data.length));
  }

  private buildChannels(song: Song): void {
    // The old channels stay connected a moment, so voices still fading out of them finish their fade
    // instead of being cut off.
    const old = this.channels;
    setTimeout(() => {
      for (const channel of old) {
        channel.gain.disconnect();
        channel.pan.disconnect();
        channel.reverbSend.disconnect();
        channel.delaySend.disconnect();
      }
    }, CHANNEL_GRACE_MS);
    this.channels = [];

    for (const track of song.tracks) {
      const gain = this.ctx.createGain();
      gain.gain.value = track.vol;
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = track.pan;
      gain.connect(pan);
      pan.connect(this.mix);

      const reverbSend = this.ctx.createGain();
      reverbSend.gain.value = 0;
      gain.connect(reverbSend);
      reverbSend.connect(this.reverb);

      const delaySend = this.ctx.createGain();
      delaySend.gain.value = 0;
      gain.connect(delaySend);
      delaySend.connect(this.delay);

      this.channels.push({ track, gain, pan, reverbSend, delaySend });
    }
  }

  private applyStyleFx(): void {
    const def = STYLE_DEFS[this.styleValue];
    const fx = def.fx;
    const now = this.ctx.currentTime;
    const tempo = this.songValue?.meta.tempo ?? 120;

    this.reverb.buffer = this.reverbImpulse(fx.reverbSeconds);
    this.delay.delayTime.setTargetAtTime(
      Math.min(2, (fx.delayBeats * 60) / tempo),
      now,
      0.05,
    );
    this.delayFeedback.gain.setTargetAtTime(fx.delayFeedback, now, 0.05);
    this.dryGain.gain.setTargetAtTime(1 - fx.crush, now, 0.05);
    this.wetGain.gain.setTargetAtTime(fx.crush, now, 0.05);
    this.lowpass.frequency.setTargetAtTime(fx.lowpassHz, now, 0.05);
    this.crackleGain.gain.setTargetAtTime(fx.crackle, now, 0.05);

    for (const channel of this.channels) {
      const patch = resolvePatch(def, channel.track);
      channel.reverbSend.gain.setTargetAtTime(fx.reverbSend * patch.sends.reverb, now, 0.05);
      channel.delaySend.gain.setTargetAtTime(fx.delaySend * patch.sends.delay, now, 0.05);
    }
  }

  private reverbImpulse(seconds: number): AudioBuffer {
    const cached = this.reverbImpulses.get(seconds);
    if (cached) return cached;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) {
        const decayValue = Math.exp((-4 * i) / data.length);
        data[i] = (Math.random() * 2 - 1) * decayValue;
      }
    }
    this.reverbImpulses.set(seconds, impulse);
    return impulse;
  }

  private tick(): void {
    if (!this.playingValue || !this.timelineValue) return;
    const position = this.position;
    const now = this.ctx.currentTime;

    if (position + LOOKAHEAD > this.scheduledUntil) {
      const from = Math.max(this.scheduledUntil, position - LATE_OK);
      const notes = notesBetween(this.timelineValue, from, position + LOOKAHEAD);
      for (const note of notes) this.scheduleNote(note);
      this.scheduledUntil = position + LOOKAHEAD;
    }

    for (const voice of this.voices.keys()) {
      if (voice.end < now) this.voices.delete(voice);
    }

    if (position >= this.timelineValue.duration + 0.5) {
      this.positionValue = this.timelineValue.duration;
      this.playingValue = false;
      this.scheduledUntil = this.positionValue;
      // The same cleanup as pause, so the looping vinyl bed stops when nothing plays next.
      this.stopAll();
      const ended = this.onEnded;
      if (ended) ended();
    }
  }

  private scheduleNote(note: ScheduledNote): void {
    const song = this.songValue;
    const channel = this.channels[note.track];
    if (!song || !channel) return;
    const patch = resolvePatch(STYLE_DEFS[this.styleValue], channel.track);
    const gain = noteGain(patch.gain, note.velocity, note.pitches.length);
    const when = this.startCtx + (note.start - this.startPos);
    for (const pitch of note.pitches) {
      const voice =
        patch.kind === 'drums'
          ? playDrum(this.voiceKit, patch, pitch, when, gain, channel.gain)
          : playSynth(
              this.voiceKit,
              patch,
              pitch,
              when,
              note.duration,
              gain,
              channel.gain,
              note.bends ?? [],
            );
      this.voices.set(voice, when);
    }
  }

  private stopAll(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const now = this.ctx.currentTime;
    if (this.crackleSource !== null && this.crackleFade !== null) {
      this.crackleFade.gain.cancelScheduledValues(now);
      this.crackleFade.gain.setValueAtTime(this.crackleFade.gain.value, now);
      this.crackleFade.gain.linearRampToValueAtTime(0, now + STOP_FADE);
      this.crackleSource.stop(now + STOP_FADE + 0.02);
      this.crackleSource = null;
      this.crackleFade = null;
    }
    for (const voice of this.voices.keys()) voice.stop(now);
    this.voices.clear();
  }
}

/** Renders a whole song in a style, offline, with the same voices and mix as live play. */
export async function renderSong(
  song: Song,
  style: StyleId,
  onProgress?: (fraction: number) => void,
): Promise<AudioBuffer> {
  const duration = buildTimeline(song).duration;
  const ctx = new OfflineAudioContext(
    2,
    Math.ceil((duration + RENDER_TAIL) * RENDER_RATE),
    RENDER_RATE,
  );
  const engine = new Engine(ctx);
  engine.load(song);
  engine.setStyle(style);
  engine.bookOffline(ctx, onProgress);
  const buffer = await ctx.startRendering();
  onProgress?.(1);
  return buffer;
}
