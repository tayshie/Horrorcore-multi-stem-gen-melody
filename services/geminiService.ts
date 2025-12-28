
import { GoogleGenAI, Type } from "@google/genai";
import { Composition, VibeType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const COMPOSITION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bpm: { type: Type.NUMBER, description: "BPM appropriate for the producer's typical style." },
    layers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          instrument: { type: Type.STRING, enum: ['bell', 'piano', 'string', 'bass', 'lead', 'pad', 'brass'] },
          notes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                note: { type: Type.STRING, description: "Scientific pitch notation" },
                time: { type: Type.STRING, description: "Tone.js time format 'bar:beat:sixteenth'" },
                duration: { type: Type.STRING, description: "Duration like '4n', '8n', '16n', '32n', '8t'" },
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

export const generateProducerMelody = async (producer: string, category: string, vibe: VibeType, key: string): Promise<Composition> => {
  const prompt = `
    Generate a 4-bar rap melody loop in the SPECIFIC style of legendary producer: ${producer} (${category}).
    Vibe Context: ${vibe}.
    Musical Key: ${key}.

    Style Archetypes to follow:
    - Young Chop: Simplistic, hard-hitting, signature bell melodies, usually 130-140 BPM.
    - Zaytoven: Complex, fast piano runs, organ swells, soulful but trap-tempo (140+ BPM).
    - Metro Boomin: Dark, cinematic, moody pads and eerie melodies, heavy 808-focused sub-melodies.
    - Lex Luger/Southside: Orchestral brass hits, high-energy aggressive synth-strings.
    - 808Melo/AXL: Sliding drill bass patterns, dark piano riffs with syncopation.
    - DJ Paul/Juicy J: Eerie Memphis horror loops, cowbells, dark chants.
    - RZA/Prince Paul: Gritty, dusty, experimental horror vibes, minor-key keys.
    - J Dilla/Madlib: Soulful jazz chords, "drunk" rhythmic placement (slight swing), minor 7ths.
    - The Neptunes/Timbaland: Futuristic, minimalist, strange percussion-like leads, unconventional intervals.
    - Scott Storch: High-class synth leads, Middle Eastern melodic scales, piano virtuosity.
    - Necro/Esham: Maximum dissonance, industrial-horror crossover, very aggressive.

    Instructions:
    1. Ensure the melody captures the ESSENCE of ${producer}.
    2. Length: Exactly 4 Bars.
    3. Scale: Adhere to ${key} (use minor/harmonic scales for dark vibes).
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
      producer,
      category,
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
