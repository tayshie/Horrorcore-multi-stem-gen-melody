
import React, { useState, useEffect, useRef } from 'react';
import { VibeType, Composition, MUSICAL_KEYS, MelodyLayer } from './types';
import { generateHorrorMelody } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { downloadMidi } from './services/midiService';

const App: React.FC = () => {
  const [vibe, setVibe] = useState<VibeType>(VibeType.ASYLUM);
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [composition, setComposition] = useState<Composition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(-10);
  const [trackSettings, setTrackSettings] = useState<Record<string, { volume: number, muted: boolean }>>({
    bell: { volume: 0, muted: false },
    piano: { volume: 0, muted: false },
    string: { volume: 0, muted: false },
    bass: { volume: 0, muted: false },
    lead: { volume: 0, muted: false },
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const newComp = await generateHorrorMelody(vibe, selectedKey);
      setComposition(newComp);
      await audioEngine.setComposition(newComp);
      // Reset mixer for new composition if needed, or keep settings
    } catch (err) {
      console.error(err);
      alert("The darkness refused to manifest. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      await audioEngine.start();
      setIsPlaying(true);
    }
  };

  const handleTrackVolumeChange = (inst: string, val: number) => {
    setTrackSettings(prev => ({ ...prev, [inst]: { ...prev[inst], volume: val } }));
    audioEngine.setTrackVolume(inst, val);
  };

  const toggleTrackMute = (inst: string) => {
    const newMuted = !trackSettings[inst].muted;
    setTrackSettings(prev => ({ ...prev, [inst]: { ...prev[inst], muted: newMuted } }));
    audioEngine.setTrackMute(inst, newMuted);
  };

  const handleDownloadFull = () => {
    if (composition) downloadMidi(composition);
  };

  const handleDownloadTrack = (layer: MelodyLayer) => {
    if (composition) downloadMidi(composition, layer);
  };

  useEffect(() => {
    audioEngine.setVolume(masterVolume);
  }, [masterVolume]);

  // Visualizer Animation
  useEffect(() => {
    const analyzer = audioEngine.getAnalyzer();
    const bufferLength = analyzer.size;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      requestRef.current = requestAnimationFrame(draw);
      analyzer.getValue().forEach((v, i) => {
        dataArray[i] = (Number(v) + 140) * 2; 
      });

      ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff1a1a';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-start overflow-y-auto">
      <header className="mb-8 text-center">
        <h1 className="horror-font text-6xl md:text-8xl text-red-600 glow-red mb-2 uppercase">WICKED SHIT</h1>
        <p className="metal-font text-2xl text-gray-400 tracking-widest uppercase">Multi-Track Horrorcore Lab</p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="dark-panel p-5 rounded-lg border-red-900/30">
            <h2 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-widest">Environment</h2>
            <div className="flex flex-col gap-2">
              {Object.values(VibeType).map((v) => (
                <button
                  key={v}
                  onClick={() => setVibe(v)}
                  className={`p-3 text-left text-xs transition-all rounded border ${
                    vibe === v 
                      ? 'bg-red-900/40 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                      : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="dark-panel p-5 rounded-lg border-red-900/30">
            <h2 className="text-sm font-bold mb-4 text-red-500 uppercase tracking-widest">Spectral Root</h2>
            <div className="grid grid-cols-4 gap-1">
              {MUSICAL_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKey(k)}
                  className={`py-1 text-center text-[10px] font-bold transition-all rounded border ${
                    selectedKey === k 
                      ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]' 
                      : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className={`w-full py-6 text-xl horror-font tracking-widest rounded transition-all ${
              isLoading 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-red-700 hover:bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]'
            }`}
          >
            {isLoading ? 'SUMMONING...' : 'MANIFEST LOOP'}
          </button>
        </div>

        {/* Center/Right Column: Mixer & Display */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Visualizer and Master */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 dark-panel p-2 rounded-lg relative overflow-hidden h-48 border-red-900/50">
              <canvas ref={canvasRef} width={800} height={256} className="w-full h-full opacity-60" />
              {!composition && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <p className="horror-font text-xl text-red-900">Void is silent...</p>
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <i className="fas fa-skull text-3xl text-red-600 animate-bounce"></i>
                </div>
              )}
            </div>

            <div className="dark-panel p-5 rounded-lg border-red-900/30 flex flex-col justify-between">
              <div>
                <h3 className="text-xs uppercase text-red-500 mb-4 tracking-widest">Master Output</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    disabled={!composition}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      !composition ? 'bg-gray-800 text-gray-600' : isPlaying ? 'bg-white text-black' : 'bg-red-600 text-white'
                    }`}
                  >
                    <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'}`}></i>
                  </button>
                  {composition && (
                    <button onClick={handleDownloadFull} className="text-gray-500 hover:text-white transition-colors">
                      <i className="fas fa-file-export text-xl" title="Export Full Mix"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <input
                  type="range" min="-40" max="0" step="1"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
              </div>
            </div>
          </div>

          {/* Instrument Mixer */}
          <div className="dark-panel p-6 rounded-lg border-red-900/30">
            <h2 className="text-sm font-bold mb-6 text-red-500 uppercase tracking-widest border-b border-red-900/20 pb-2 flex justify-between">
              <span>Instrument Separation Rack</span>
              {composition && <span className="text-[10px] text-gray-500 lowercase">{composition.bpm} BPM // {composition.key}</span>}
            </h2>
            
            {!composition ? (
              <div className="h-48 flex items-center justify-center border border-dashed border-gray-800 rounded">
                <p className="text-gray-700 uppercase text-xs tracking-widest">No active stems</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {composition.layers.map((layer, idx) => {
                  const settings = trackSettings[layer.instrument] || { volume: 0, muted: false };
                  return (
                    <div key={idx} className={`p-4 rounded border transition-all ${settings.muted ? 'bg-black/80 border-gray-900 opacity-40' : 'bg-black/40 border-gray-800'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-red-600 uppercase font-bold tracking-tighter truncate">{layer.instrument}</p>
                          <p className="text-[8px] text-gray-500 truncate">{layer.name}</p>
                        </div>
                        <button 
                          onClick={() => handleDownloadTrack(layer)}
                          className="text-gray-600 hover:text-red-500 transition-colors"
                        >
                          <i className="fas fa-download text-[10px]"></i>
                        </button>
                      </div>

                      <div className="h-32 flex flex-col items-center gap-4">
                        <div className="relative h-24 w-1 bg-gray-900 rounded-full overflow-hidden flex items-end">
                           <input 
                              type="range" orient="vertical" min="-40" max="6" step="1"
                              value={settings.volume}
                              onChange={(e) => handleTrackVolumeChange(layer.instrument, Number(e.target.value))}
                              className="absolute inset-0 w-1 h-full opacity-0 cursor-pointer"
                              style={{ transform: 'rotate(0deg)', writingMode: 'bt-lr' } as any}
                           />
                           <div className="w-full bg-red-600" style={{ height: `${((settings.volume + 40) / 46) * 100}%` }}></div>
                        </div>
                        
                        <button
                          onClick={() => toggleTrackMute(layer.instrument)}
                          className={`w-full py-1 text-[9px] uppercase font-bold rounded border transition-all ${
                            settings.muted ? 'bg-red-900/20 border-red-600 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500'
                          }`}
                        >
                          {settings.muted ? 'Muted' : 'Mute'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 text-gray-700 text-[10px] text-center uppercase tracking-[0.3em]">
        Wicked Shit Industrial Engine // Multi-Stem Architecture // V2.5
      </footer>
    </div>
  );
};

export default App;