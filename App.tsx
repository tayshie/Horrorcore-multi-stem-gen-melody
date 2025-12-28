
import React, { useState, useEffect, useRef } from 'react';
import { PRODUCER_GROUPS, VibeType, Composition, MUSICAL_KEYS, MelodyLayer } from './types';
import { generateProducerMelody } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { downloadMidi } from './services/midiService';

const App: React.FC = () => {
  const [selectedProducer, setSelectedProducer] = useState<string>("Metro Boomin");
  const [selectedCategory, setSelectedCategory] = useState<string>("Trap");
  const [vibe, setVibe] = useState<VibeType>(VibeType.DARK);
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
    pad: { volume: 0, muted: false },
    brass: { volume: 0, muted: false },
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const newComp = await generateProducerMelody(selectedProducer, selectedCategory, vibe, selectedKey);
      setComposition(newComp);
      await audioEngine.setComposition(newComp);
    } catch (err) {
      console.error(err);
      alert("The session crashed. Re-architecting...");
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
        <h1 className="horror-font text-6xl md:text-8xl text-red-600 glow-red mb-2 uppercase tracking-tighter">WICKED SHIT</h1>
        <p className="metal-font text-2xl text-gray-500 tracking-[0.2em] uppercase">Executive Producer Simulation</p>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Multi-Category Producer Selector */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto max-h-[80vh] pr-2 custom-scroll">
          {Object.entries(PRODUCER_GROUPS).map(([cat, producers]) => (
            <div key={cat} className="dark-panel p-3 rounded-lg border-red-900/20">
              <h2 className="text-[10px] font-black mb-2 text-red-800 uppercase tracking-widest">{cat}</h2>
              <div className="flex flex-wrap gap-1">
                {producers.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setSelectedProducer(p); setSelectedCategory(cat); }}
                    className={`px-2 py-1 text-[9px] transition-all rounded border ${
                      selectedProducer === p 
                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' 
                        : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="dark-panel p-4 rounded-lg border-red-900/30 mt-2">
             <h2 className="text-[10px] font-black mb-2 text-red-500 uppercase tracking-widest">Atmospheric Scale</h2>
             <div className="grid grid-cols-6 gap-1 mb-4">
                {MUSICAL_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedKey(k)}
                    className={`py-1 text-[8px] font-bold transition-all rounded border ${
                      selectedKey === k ? 'bg-red-600 text-white border-red-400' : 'bg-black border-gray-800 text-gray-600'
                    }`}
                  >
                    {k}
                  </button>
                ))}
             </div>
             <button
              onClick={handleGenerate}
              disabled={isLoading}
              className={`w-full py-4 text-sm horror-font tracking-[0.2em] rounded transition-all ${
                isLoading 
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-red-700 hover:bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]'
              }`}
            >
              {isLoading ? 'SAMPLING...' : `LOAD ${selectedProducer.toUpperCase()}`}
            </button>
          </div>
        </div>

        {/* Right Column: Console & Controls */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 dark-panel p-2 rounded-lg relative overflow-hidden h-48 border-red-900/50">
              <canvas ref={canvasRef} width={800} height={256} className="w-full h-full opacity-40 grayscale" />
              {!composition && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <p className="horror-font text-lg text-red-900 uppercase tracking-widest">Awaiting Command...</p>
                </div>
              )}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                   <div className="flex flex-col items-center">
                    <i className="fas fa-ghost text-2xl text-red-600 animate-bounce mb-2"></i>
                    <p className="metal-font text-[10px] text-red-500 tracking-[0.3em] uppercase">Architecting {selectedProducer} Session</p>
                   </div>
                </div>
              )}
            </div>

            <div className="dark-panel p-5 rounded-lg border-red-900/30 flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase text-red-500 mb-4 tracking-[0.2em]">Master Rack</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    disabled={!composition}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
                      !composition ? 'bg-gray-800 text-gray-600' : isPlaying ? 'bg-white text-black shadow-white/40' : 'bg-red-600 text-white shadow-red-600/40'
                    }`}
                  >
                    <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'}`}></i>
                  </button>
                  {composition && (
                    <button onClick={handleDownloadFull} className="w-10 h-10 rounded-full border border-red-900/50 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-900/30">
                      <i className="fas fa-save" title="Export Project"></i>
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

          <div className="dark-panel p-6 rounded-lg border-red-900/30">
            <h2 className="text-[10px] font-black mb-6 text-red-500 uppercase tracking-[0.3em] border-b border-red-900/20 pb-2 flex justify-between">
              <span>Channel Strips</span>
              {composition && <span className="text-gray-600 lowercase">{composition.producer} // {composition.bpm} BPM</span>}
            </h2>
            
            {!composition ? (
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-800 rounded-lg">
                <p className="text-gray-800 uppercase text-[9px] tracking-[0.5em]">Session Offline</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {composition.layers.map((layer, idx) => {
                  const settings = trackSettings[layer.instrument] || { volume: 0, muted: false };
                  return (
                    <div key={idx} className={`p-3 rounded-lg border transition-all ${settings.muted ? 'bg-black opacity-30 border-transparent' : 'bg-black/60 border-gray-900'}`}>
                      <div className="flex flex-col gap-1 mb-4 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <p className="text-[8px] text-red-700 uppercase font-black truncate">{layer.instrument}</p>
                          <button onClick={() => handleDownloadTrack(layer)} className="text-[8px] text-gray-700 hover:text-white"><i className="fas fa-download"></i></button>
                        </div>
                      </div>

                      <div className="h-24 flex flex-col items-center gap-3">
                        <div className="relative h-16 w-1 bg-gray-900 rounded-full flex items-end">
                           <input 
                              type="range" orient="vertical" min="-40" max="6" step="1"
                              value={settings.volume}
                              onChange={(e) => handleTrackVolumeChange(layer.instrument, Number(e.target.value))}
                              className="absolute inset-0 w-1 h-full opacity-0 cursor-pointer"
                           />
                           <div className="w-full bg-red-800 rounded-full" style={{ height: `${((settings.volume + 40) / 46) * 100}%` }}></div>
                        </div>
                        
                        <button
                          onClick={() => toggleTrackMute(layer.instrument)}
                          className={`w-full py-1 text-[7px] uppercase font-bold rounded border transition-all ${
                            settings.muted ? 'bg-red-900/20 border-red-600 text-red-600' : 'bg-gray-900 border-gray-800 text-gray-700'
                          }`}
                        >
                          {settings.muted ? 'Kill' : 'Live'}
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

      <footer className="mt-8 text-gray-800 text-[8px] text-center uppercase tracking-[0.6em] pb-4">
        Synthetic Soul Architecture // Global Production Lab // V4.0
      </footer>
    </div>
  );
};

export default App;
