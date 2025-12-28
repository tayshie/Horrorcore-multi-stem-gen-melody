
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Composition, MelodyLayer } from "../types";

const instrumentMap: Record<string, number> = {
  bell: 10,    // Music Box / Glockenspiel
  piano: 0,   // Acoustic Grand Piano
  string: 48, // String Ensemble 1
  bass: 38,   // Slap Bass 2 / Synth Bass
  lead: 81,   // Lead 2 (sawtooth)
};

export const exportToMidi = (composition: Composition, singleLayer?: MelodyLayer): Blob => {
  const midi = new Midi();
  midi.header.name = singleLayer 
    ? `${composition.vibe} - ${singleLayer.name}` 
    : `${composition.vibe} - Devereaux Style`;
  midi.header.setTempo(composition.bpm);

  const layersToExport = singleLayer ? [singleLayer] : composition.layers;

  layersToExport.forEach((layer) => {
    const track = midi.addTrack();
    track.name = layer.name;
    track.instrument.number = instrumentMap[layer.instrument] || 0;

    layer.notes.forEach((noteEvent) => {
      try {
        const timeInSeconds = Tone.Time(noteEvent.time).toSeconds();
        const durationInSeconds = Tone.Time(noteEvent.duration).toSeconds();
        const midiNote = Tone.Frequency(noteEvent.note).toMidi();

        track.addNote({
          midi: midiNote,
          time: timeInSeconds,
          duration: durationInSeconds,
          velocity: noteEvent.velocity,
        });
      } catch (e) {
        console.warn(`Could not parse note: ${noteEvent.note}`, e);
      }
    });
  });

  return new Blob([midi.toArray()], { type: "audio/midi" });
};

export const downloadMidi = (composition: Composition, layer?: MelodyLayer) => {
  const blob = exportToMidi(composition, layer);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const suffix = layer ? `_${layer.instrument}` : "";
  const filename = `${composition.vibe.replace(/\s+/g, "_")}${suffix}_Horrorcore.mid`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
