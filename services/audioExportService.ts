
import * as Tone from 'tone';
import { Composition, MelodyLayer } from '../types';
import { createSynthForInstrument, InstrumentType } from './audioEngine';

/**
 * Encodes an AudioBuffer into a WAV blob.
 */
function bufferToWav(abuffer: AudioBuffer): Blob {
  let numOfChan = abuffer.numberOfChannels,
    length = abuffer.length * numOfChan * 2 + 44,
    buffer = new ArrayBuffer(length),
    view = new DataView(buffer),
    channels = [],
    i,
    sample,
    offset = 0,
    pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const exportAudio = async (composition: Composition, singleLayer?: MelodyLayer): Promise<Blob> => {
  // 4 bars at the composition's BPM
  const durationInSeconds = (60 / composition.bpm) * 4 * 4;

  const buffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = composition.bpm;
    
    // Main FX chain
    const master = new Tone.Volume(0).toDestination();
    const reverb = new Tone.Reverb({ decay: 5, wet: 0.3 }).connect(master);
    const distortion = new Tone.Distortion(0.15).connect(reverb);
    const delay = new Tone.FeedbackDelay("8n.", 0.4).connect(distortion);

    const layersToExport = singleLayer ? [singleLayer] : composition.layers;

    layersToExport.forEach(layer => {
      const destination = layer.instrument === 'bass' ? master : 
                         (layer.instrument === 'string' || layer.instrument === 'pad') ? reverb : 
                         delay;
      
      const synth = createSynthForInstrument(layer.instrument as InstrumentType, destination);
      
      layer.notes.forEach(noteEvent => {
        synth.triggerAttackRelease(
          noteEvent.note,
          noteEvent.duration,
          noteEvent.time,
          noteEvent.velocity
        );
      });
    });

  }, durationInSeconds);

  return bufferToWav(buffer);
};

export const downloadAudio = async (composition: Composition, layer?: MelodyLayer) => {
  const blob = await exportAudio(composition, layer);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffix = layer ? `_${layer.instrument}` : "";
  const filename = `${composition.producer.replace(/\s+/g, "_")}${suffix}.wav`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
