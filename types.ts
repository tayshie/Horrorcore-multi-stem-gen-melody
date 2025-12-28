
export interface NoteEvent {
  note: string;
  time: string;
  duration: string;
  velocity: number;
}

export interface MelodyLayer {
  name: string;
  instrument: 'bell' | 'piano' | 'string' | 'bass' | 'lead' | 'pad' | 'brass';
  notes: NoteEvent[];
}

export interface Composition {
  id: string;
  producer: string;
  category: string;
  vibe: VibeType;
  key: string;
  bpm: number;
  layers: MelodyLayer[];
  createdAt: number;
}

export const PRODUCER_GROUPS = {
  "Drill": ["Young Chop", "808Melo", "AXL Beats", "Carns Hill"],
  "Trap": ["Metro Boomin", "Shawty Redd", "Zaytoven", "Lex Luger", "Southside", "TM88", "Murda Beatz", "Tay Keith"],
  "Horrorcore": ["Prince Paul", "RZA", "Esham", "Mike E. Clark", "DJ Paul", "Juicy J", "Necro"],
  "Crunk": ["Lil Jon", "DJ Paul", "Juicy J"],
  "Alternative": ["J Dilla", "Madlib", "The Alchemist", "El-P", "Dan the Automator"],
  "Shiny Suit": ["The Neptunes", "Timbaland", "Swizz Beatz", "Just Blaze", "Scott Storch"],
  "Dirty South": ["Organized Noize", "Mannie Fresh", "DJ Screw", "DJ Paul", "Juicy J", "Lil Jon"]
} as const;

export type ProducerCategory = keyof typeof PRODUCER_GROUPS;

export enum VibeType {
  DARK = 'Dark/Evil',
  AGGRESSIVE = 'Aggressive',
  MELANCHOLIC = 'Melancholic',
  HYPE = 'High Energy',
  TRIPPY = 'Hallucinogenic',
  GRITTY = 'Gritty/Lo-fi'
}

export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];
