
import { GoogleGenAI, Type } from "@google/genai";
import { Composition, VibeType, MelodyLayer } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const COMPOSITION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bpm: { type: Type.NUMBER, description: "BPM of the track, typically 130-170 for modern horrorcore." },
    layers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          instrument: { type: Type.STRING, enum: ['bell', 'piano', 'string', 'bass', 'lead'] },
          notes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                note: { type: Type.STRING, description: "Scientific pitch notation, e.g., 'C4', 'Eb3', 'G#5'" },
                time: { type: Type.STRING, description: "Tone.js time format 'bar:beat:sixteenth', e.g., '0:0:0', '3:3:2'" },
                duration: { type: Type.STRING, description: "Duration like '4n', '8n', '16n', '32n', '8t' (triplet)" },
                velocity: { type: Type.NUMBER, description: "Velocity from 0 to 1" }
              },
              required: ["note", "time", "duration", "velocity"]
            }
          }
        },
        required: ["name", "instrument", "notes"]
      }
    }
  },
  required: ["bpm", "layers"]
};

export const generateHorrorMelody = async (vibe: VibeType, key: string): Promise<Composition> => {
  const prompt = `
    Generate a complex 4-bar horrorcore melody sequence in the style of Devereaux (gritty, eerie, aggressive, complex industrial trap).
    Vibe: ${vibe}.
    Musical Key: ${key}.
    
    Guidelines for Complexity:
    1. Duration: 4 FULL BARS (0:0:0 to 4:0:0).
    2. Rhythm: Use syncopation, off-beat hits, and occasional 32nd note stutters or triplets ('8t', '16t'). Avoid simple repetitive 4-on-the-floor patterns.
    3. Melody: The composition MUST be in ${key} but use dark intervals: Tritones, Minor 2nds, Major 7ths. Use chromatic passing notes for a "slipping" or "detuned" feel.
    4. Call and Response: Create interaction between layers. For example, the 'bell' asks a question in Bar 1, and the 'piano' or 'lead' answers in Bar 2.
    5. Layering Requirements (at least 4 layers):
       - 'bell': High-pitched, disjointed, music-box-from-hell style.
       - 'piano': Low-register, heavy, percussive chords or dark runs.
       - 'string': Atmospheric swells or high-frequency tension screeches.
       - 'bass': Aggressive, syncopated industrial sub-patterns that drive the energy.
       - 'lead': A piercing, erratic synth line that appears in bars 3 and 4 for climax.
    6. Progression: Bars 1-2 set the tension; Bars 3-4 increase the complexity or add a melodic variation.
    7. Ensure notes are dark, haunting, and strictly follow the requested root ${key}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: COMPOSITION_SCHEMA,
      },
    });

    const data = JSON.parse(response.text);
    return {
      id: Math.random().toString(36).substr(2, 9),
      vibe,
      key,
      bpm: data.bpm,
      layers: data.layers,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error("Error generating melody:", error);
    throw error;
  }
};
