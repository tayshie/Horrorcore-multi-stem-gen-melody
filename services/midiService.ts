
import { Midi } from "@tonejs/midi";
import * as Tone from "tone";
import { Composition, MelodyLayer } from "../types";

const instrumentMap: Record<string, number> = {
  bell: 10,
  piano: 0,
  string: 48,
  bass: 38,
  lead: 81,
  pad: 89,
  brass: 62,
};

export const exportToMidi = (composition: Composition, singleLayer?: MelodyLayer): Blob => {
  const midi = new Midi();
  midi.header.name = singleLayer 
    ? `${composition.producer} - ${singleLayer.name}` 
    : `${composition.producer} - ${composition.vibe}`;
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
  const filename = `${composition.producer.replace(/\s+/g, "_")}${suffix}.mid`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
