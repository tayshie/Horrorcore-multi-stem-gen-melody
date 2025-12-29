
import React, { useState, useEffect, useRef } from 'react';
import { PRODUCER_GROUPS, VibeType, Composition, MUSICAL_KEYS, MelodyLayer, ProducerCategory } from './types';
import { generateProducerMelody } from './services/geminiService';
import { audioEngine } from './services/audioEngine';
import { downloadMidi } from './services/midiService';
import { downloadAudio } from './services/audioExportService';

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ProducerCategory>("Trap");
  const [selectedProducer, setSelectedProducer] = useState<string>("Metro Boomin");
  const [vibe, setVibe] = useState<VibeType>(VibeType.DARK);
  const [selectedKey, setSelectedKey] = useState<string>('C');
  const [targetBpm, setTargetBpm] = useState<number>(140);
  const [isAutoBpm, setIsAutoBpm] = useState<boolean>(true);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
      const newComp = await generateProducerMelody(
        selectedProducer, 
        activeCategory, 
        vibe, 
        selectedKey, 
        isAutoBpm ? undefined : targetBpm
      );
      setComposition(newComp);
      if (isAutoBpm) setTargetBpm(newComp.bpm);
      await audioEngine.setComposition(newComp);
    } catch (err) {
      console.error(err);
      alert("Neural sync failure. Retrying...");
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

  const handleDownloadFullMidi = () => {
    if (composition) downloadMidi(composition);
  };

  const handleDownloadFullAudio = async () => {
    if (composition) {
      setIsExporting(true);
      await downloadAudio(composition);
      setIsExporting(false);
    }
  };

  const handleDownloadTrackMidi = (layer: MelodyLayer) => {
    if (composition) downloadMidi(composition, layer);
  };

  const handleDownloadTrackAudio = async (layer: MelodyLayer) => {
    if (composition) {
      setIsExporting(true);
      await downloadAudio(composition, layer);
      setIsExporting(false);
    }
  };

  useEffect(() => {
    audioEngine.setVolume(masterVolume);
  }, [masterVolume]);

  useEffect(() => {
    const analyzer = audioEngine.getAnalyzer();
    const bufferLength = analyzer.size;
    
    const draw = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      requestRef.current = requestAnimationFrame(draw);
      
      const values = analyzer.getValue();

      // Background clearing with trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / (bufferLength / 2)) * 2.5;
      let barHeight;
      let x = 0;

      // Draw Symmetrical Frequency Bars
      for (let i = 0; i < bufferLength / 2; i++) {
        // Map decibel values (-140 to 0) to height
        const val = Number(values[i]);
        barHeight = Math.max(0, (val + 100) * (canvas.height / 100));

        // Central gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#450a0a'); // Deep dark red
        gradient.addColorStop(0.5, '#991b1b'); // Red-800
        gradient.addColorStop(1, '#ef4444'); // Red-500

        ctx.fillStyle = gradient;
        
        // Draw bars mirroring from center
        const centerY = canvas.height;
        ctx.fillRect(canvas.width / 2 + x, centerY - barHeight, barWidth - 1, barHeight);
        ctx.fillRect(canvas.width / 2 - x, centerY - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      // Draw Spectral Waveform Line (overlay)
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      let xWave = 0;
      const sliceWidth = canvas.width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const val = (Number(values[i]) + 100) * (canvas.height / 150);
        const y = canvas.height - val - 20;
        if (i === 0) ctx.moveTo(xWave, y);
        else ctx.lineTo(xWave, y);
        xWave += sliceWidth;
      }
      ctx.stroke();

      // Random "Glitch" spikes for atmospheric horror feel
      if (isPlaying && Math.random() > 0.95) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        const glitchX = Math.random() * canvas.width;
        ctx.beginPath();
        ctx.moveTo(glitchX, 0);
        ctx.lineTo(glitchX, canvas.height);
        ctx.stroke();
      }
    };
    
    draw();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] overflow-hidden text-gray-300">
      {/* Header Bar */}
      <header className="h-16 border-b border-red-900/30 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="horror-font text-3xl text-red-600 glow-red tracking-tighter uppercase">MOTHA FUCKIN MELODY</h1>
          <div className="h-4 w-[1px] bg-red-900/50"></div>
          <span className="metal-font text-xs tracking-widest text-gray-500 uppercase">Lab V4.3 // {selectedProducer}</span>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
             <span className="text-[10px] text-red-900 uppercase font-black tracking-widest">Master Feed</span>
             <input
                type="range" min="-40" max="0" step="1"
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-24 h-1 bg-gray-900 appearance-none accent-red-600 cursor-pointer"
              />
           </div>
           <button
              onClick={togglePlay}
              disabled={!composition || isExporting}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                !composition || isExporting ? 'bg-gray-800 text-gray-600' : isPlaying ? 'bg-white text-black shadow-lg shadow-white/20' : 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              }`}
            >
              <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play'} text-sm`}></i>
            </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Categories */}
        <aside className="w-48 border-r border-red-900/20 bg-black/40 flex flex-col p-4 gap-2 overflow-y-auto">
          <h2 className="text-[10px] font-black text-red-900 mb-2 uppercase tracking-[0.2em]">Categories</h2>
          {Object.keys(PRODUCER_GROUPS).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as ProducerCategory)}
              className={`p-3 text-left text-[11px] uppercase tracking-tighter rounded transition-all border ${
                activeCategory === cat ? 'bg-red-900/20 border-red-600 text-white' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
          
          <div className="mt-auto pt-6 border-t border-red-900/10">
             <h2 className="text-[10px] font-black text-red-900 mb-2 uppercase tracking-[0.2em]">Atmosphere</h2>
             <select 
               value={vibe} 
               onChange={(e) => setVibe(e.target.value as VibeType)}
               className="w-full bg-black border border-gray-800 text-[10px] p-2 rounded text-gray-400 outline-none mb-4"
             >
               {Object.values(VibeType).map(v => <option key={v} value={v}>{v}</option>)}
             </select>

             <h2 className="text-[10px] font-black text-red-900 mb-2 uppercase tracking-[0.2em]">Tempo Control</h2>
             <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] text-gray-500 uppercase">Auto BPM</span>
                  <input 
                    type="checkbox" 
                    checked={isAutoBpm} 
                    onChange={(e) => setIsAutoBpm(e.target.checked)}
                    className="accent-red-600 h-3 w-3"
                  />
                </div>
                {!isAutoBpm && (
                  <div className="flex flex-col gap-1">
                    <input 
                      type="range" min="60" max="200" step="1"
                      value={targetBpm}
                      onChange={(e) => setTargetBpm(Number(e.target.value))}
                      className="w-full h-1 bg-gray-900 appearance-none accent-red-600"
                    />
                    <span className="text-center text-[10px] text-red-600 font-bold">{targetBpm} BPM</span>
                  </div>
                )}
             </div>
          </div>
        </aside>

        {/* Main Interface */}
        <main className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto custom-scroll">
          
          {/* Top Row: Producers & Generation */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 dark-panel p-6 rounded-xl border-red-900/20 flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xs font-black text-red-600 uppercase tracking-widest">Select Producer Signature</h2>
                <span className="text-[9px] text-gray-600 uppercase tracking-widest">{PRODUCER_GROUPS[activeCategory].length} Signals Detected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRODUCER_GROUPS[activeCategory].map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProducer(p)}
                    className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all border ${
                      selectedProducer === p 
                        ? 'bg-red-600 border-red-400 text-white shadow-md' 
                        : 'bg-black/60 border-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="dark-panel p-6 rounded-xl border-red-900/20 flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4">Musical Key</h2>
                <div className="grid grid-cols-6 gap-1">
                  {MUSICAL_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setSelectedKey(k)}
                      className={`py-1 text-[9px] font-bold rounded border ${
                        selectedKey === k ? 'bg-red-600 text-white border-red-400 shadow-sm' : 'bg-black border-gray-800 text-gray-600'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading || isExporting}
                className={`w-full py-4 mt-6 text-sm font-black horror-font tracking-[0.3em] rounded-lg transition-all ${
                  isLoading || isExporting
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                    : 'bg-red-700 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/20'
                }`}
              >
                {isLoading ? 'SYNCING NEURALS...' : isExporting ? 'EXPORTING...' : `ARCHITECT ${selectedProducer.toUpperCase()}`}
              </button>
            </div>
          </section>

          {/* Visualization Row */}
          <section className="dark-panel p-2 rounded-xl border-red-900/40 relative overflow-hidden h-40 group">
             <canvas ref={canvasRef} width={1200} height={256} className="w-full h-full opacity-60 transition-all duration-1000" />
             <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none">
                <div className="flex flex-col">
                  <span className="text-[10px] text-red-900 font-black uppercase tracking-[0.5em]">{activeCategory} // {selectedKey} // {composition ? composition.vibe.toUpperCase() : 'SEARCHING'}</span>
                  <span className="text-2xl font-black text-white uppercase tracking-tighter">{composition ? composition.producer : 'Awaiting Manifest...'}</span>
                </div>
                {composition && (
                  <div className="flex gap-10 items-center">
                    <div className="text-center">
                       <p className="text-[10px] text-gray-600 uppercase tracking-widest">BPM</p>
                       <p className="text-xl font-black text-red-600">{composition.bpm}</p>
                    </div>
                    <div className="flex gap-2 pointer-events-auto">
                      <button 
                        onClick={handleDownloadFullMidi}
                        disabled={isExporting}
                        className="w-12 h-12 rounded-full border border-red-900/30 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-900/30 transition-all shadow-md"
                        title="Download MIDI"
                      >
                        <i className="fas fa-file-export text-lg"></i>
                      </button>
                      <button 
                        onClick={handleDownloadFullAudio}
                        disabled={isExporting}
                        className={`w-12 h-12 rounded-full border border-red-900/30 flex items-center justify-center transition-all shadow-md ${isExporting ? 'text-red-900 cursor-not-allowed' : 'text-gray-500 hover:text-white hover:bg-red-900/30'}`}
                        title="Download WAV"
                      >
                        <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-music'} text-lg`}></i>
                      </button>
                    </div>
                  </div>
                )}
             </div>
          </section>

          {/* Stem Mixer Rack */}
          <section className="flex-1 dark-panel p-6 rounded-xl border-red-900/20 flex flex-col gap-4">
             <div className="flex justify-between items-center border-b border-red-900/10 pb-4">
               <h2 className="text-xs font-black text-red-600 uppercase tracking-widest">Stem Isolation Rack</h2>
               <p className="text-[9px] text-gray-700 italic uppercase">Independent Node Export Active</p>
             </div>
             
             {!composition ? (
               <div className="flex-1 flex items-center justify-center">
                 <p className="horror-font text-3xl text-gray-900 uppercase tracking-widest opacity-20">Void State</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                 {composition.layers.map((layer, idx) => {
                   const settings = trackSettings[layer.instrument] || { volume: 0, muted: false };
                   return (
                     <div key={idx} className={`p-4 rounded-xl border transition-all ${settings.muted ? 'bg-black opacity-20 border-transparent' : 'bg-black/60 border-gray-800 hover:border-red-900/40 shadow-xl'}`}>
                        <div className="flex justify-between items-center mb-6">
                           <span className="text-[9px] font-black text-red-700 uppercase tracking-tighter">{layer.instrument}</span>
                           <div className="flex gap-2">
                             <button onClick={() => handleDownloadTrackMidi(layer)} className="text-[10px] text-gray-700 hover:text-white transition-colors" title="Track MIDI"><i className="fas fa-file-code"></i></button>
                             <button onClick={() => handleDownloadTrackAudio(layer)} className="text-[10px] text-gray-700 hover:text-white transition-colors" title="Track WAV"><i className="fas fa-wave-square"></i></button>
                           </div>
                        </div>

                        <div className="h-24 flex flex-col items-center gap-4">
                           <div className="relative h-16 w-1 bg-gray-900 rounded-full flex items-end">
                              <input 
                                 type="range" orient="vertical" min="-40" max="6" step="1"
                                 value={settings.volume}
                                 onChange={(e) => handleTrackVolumeChange(layer.instrument, Number(e.target.value))}
                                 className="absolute inset-0 w-1 h-full opacity-0 cursor-pointer"
                              />
                              <div className="w-full bg-red-600 rounded-full shadow-[0_0_8px_rgba(255,0,0,0.6)]" style={{ height: `${((settings.volume + 40) / 46) * 100}%` }}></div>
                           </div>
                           
                           <button
                             onClick={() => toggleTrackMute(layer.instrument)}
                             className={`w-full py-1.5 text-[8px] font-black uppercase rounded transition-all border ${
                               settings.muted ? 'bg-red-900/20 border-red-600 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500'
                             }`}
                           >
                             {settings.muted ? 'KILLED' : 'LIVE'}
                           </button>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </section>
        </main>
      </div>
      
      {/* Footer Status */}
      <footer className="h-10 border-t border-red-900/10 flex items-center justify-center px-6 bg-black text-[8px] text-gray-800 uppercase tracking-[0.8em]">
        End-to-End Synthetic Production Suite // Motha Fuckin Melody // WAV & MIDI Export V4.3 // Clean Sub Logic
      </footer>
    </div>
  );
};

export default App;
