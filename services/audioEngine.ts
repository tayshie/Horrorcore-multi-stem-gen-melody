
import * as Tone from 'tone';
import { Composition } from '../types';

class AudioEngine {
  private synths: Map<string, Tone.PolySynth<any>> = new Map();
  private channelStrips: Map<string, Tone.Channel> = new Map();
  private parts: Tone.Part[] = [];
  private mainVolume: Tone.Volume;
  private reverb: Tone.Reverb;
  private delay: Tone.FeedbackDelay;
  private analyzer: Tone.Analyser;
  private distortion: Tone.Distortion;
  private chorus: Tone.Chorus;
  private bitcrusher: Tone.BitCrusher;

  constructor() {
    this.mainVolume = new Tone.Volume(-10).toDestination();
    this.reverb = new Tone.Reverb({ decay: 5, wet: 0.5 }).connect(this.mainVolume);
    this.distortion = new Tone.Distortion(0.5).connect(this.reverb);
    this.bitcrusher = new Tone.BitCrusher(4).connect(this.distortion);
    this.chorus = new Tone.Chorus(4, 2.5, 0.5).connect(this.bitcrusher).start();
    this.delay = new Tone.FeedbackDelay("8n.", 0.4).connect(this.chorus);
    this.analyzer = new Tone.Analyser("fft", 1024);
    this.mainVolume.connect(this.analyzer);
    
    this.initSynths();
  }

  private initSynths() {
    const instruments: ('bell' | 'piano' | 'string' | 'bass' | 'lead' | 'pad' | 'brass')[] = 
      ['bell', 'piano', 'string', 'bass', 'lead', 'pad', 'brass'];
    
    instruments.forEach(inst => {
      const channel = new Tone.Channel().connect(
        inst === 'bass' ? this.distortion : 
        (inst === 'string' || inst === 'pad') ? this.reverb : 
        this.delay
      );
      this.channelStrips.set(inst, channel);
    });

    // 1. FM Metallic Bell
    const bell = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 2.5 }
    }).connect(this.channelStrips.get('bell')!);
    this.synths.set('bell', bell);

    // 2. Multi-genre Piano/Rhodes
    const piano = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 1.2, sustain: 0.1, release: 1.5 }
    }).connect(this.channelStrips.get('piano')!);
    this.synths.set('piano', piano);

    // 3. Cinematic Strings
    const strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 1.5, decay: 1, sustain: 0.8, release: 3 }
    }).connect(this.channelStrips.get('string')!);
    this.synths.set('string', strings);

    // 4. Heavy 808-Style FM Bass
    const bass = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 0.5,
      modulationIndex: 15,
      oscillator: { type: 'sine' },
      modulation: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.9, release: 1.2 }
    }).connect(this.channelStrips.get('bass')!);
    this.synths.set('bass', bass);

    // 5. Piercing Lead
    const lead = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: { type: 'pulse', width: 0.2 },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 1 }
    }).connect(this.channelStrips.get('lead')!);
    this.synths.set('lead', lead);

    // 6. Lush Pad
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 3, decay: 1, sustain: 1, release: 5 }
    }).connect(this.channelStrips.get('pad')!);
    this.synths.set('pad', pad);

    // 7. Aggressive Synth Brass
    const brass = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.5, release: 0.8 }
    }).connect(this.channelStrips.get('brass')!);
    this.synths.set('brass', brass);
  }

  public async setComposition(composition: Composition) {
    this.stop();
    this.clearParts();
    Tone.getTransport().bpm.value = composition.bpm;

    composition.layers.forEach(layer => {
      const synth = this.synths.get(layer.instrument);
      if (synth) {
        const part = new Tone.Part((time, event) => {
          synth.triggerAttackRelease(event.note, event.duration, time, event.velocity);
        }, layer.notes).start(0);
        part.loop = true;
        part.loopEnd = "4:0:0";
        this.parts.push(part);
      }
    });
  }

  public setTrackVolume(instrument: string, volume: number) {
    const channel = this.channelStrips.get(instrument);
    if (channel) channel.volume.rampTo(volume, 0.1);
  }

  public setTrackMute(instrument: string, mute: boolean) {
    const channel = this.channelStrips.get(instrument);
    if (channel) channel.mute = mute;
  }

  private clearParts() {
    this.parts.forEach(p => p.dispose());
    this.parts = [];
  }

  public async start() {
    await Tone.start();
    Tone.getTransport().start();
  }

  public stop() {
    Tone.getTransport().stop();
  }

  public setVolume(val: number) {
    this.mainVolume.volume.rampTo(val, 0.1);
  }

  public getAnalyzer() {
    return this.analyzer;
  }
}

export const audioEngine = new AudioEngine();
