
export interface NoteEvent {
  note: string;
  time: string;
  duration: string;
  velocity: number;
}

export interface MelodyLayer {
  name: string;
  instrument: 'bell' | 'piano' | 'string' | 'bass' | 'lead';
  notes: NoteEvent[];
}

export interface Composition {
  id: string;
  vibe: string;
  key: string;
  bpm: number;
  layers: MelodyLayer[];
  createdAt: number;
}

export enum VibeType {
  ASYLUM = 'Haunted Asylum',
  RITUAL = 'Industrial Ritual',
  SLAUGHTER = 'Slaughter House',
  VOID = 'The Void',
  CYBERPUNK = 'Dark Cybernetic'
}

export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export interface AudioEngineState {
  isPlaying: boolean;
  bpm: number;
  volume: number;
}
