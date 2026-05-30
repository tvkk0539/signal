import React, { useState } from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { Apple, ArrowLeft, Download, Settings2, Terminal, Disc3, PlayCircle, Radio, KeyRound } from 'lucide-react';
import { AppleMusicWrapperUI } from './AppleMusicWrapperUI';

export const AppleMusicApp: React.FC = () => {
  const { setActiveView } = useLayoutStore();
  const [activeTab, setActiveTab] = useState<'RIPPER' | 'WRAPPER'>('RIPPER');

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'alac' | 'flac' | 'atmos' | 'aac'>('alac');
  const [quality, setQuality] = useState<'192000' | '96000' | '48000'>('192000');

  // Toggles based on the Go app's config
  const [embedLrc, setEmbedLrc] = useState(true);
  const [animatedArt, setAnimatedArt] = useState(false);

  const [isRipping, setIsRipping] = useState(false);

  const handleRip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsRipping(true);
    // In a real implementation, this would emit a WebSocket event to the Relay to assign a worker
    setTimeout(() => {
        // Simulate rip completion after some time
        setIsRipping(false);
    }, 15000);
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] font-sans text-foreground flex flex-col relative overflow-hidden">

      {/* Apple Music Themed Background (Pure CSS Glassmorphism) */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#FA243C]/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#fa5e6e]/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('MUSIC_RIPS')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FA243C] to-[#fa5e6e] flex items-center justify-center shadow-lg shadow-[#FA243C]/20">
              <Apple size={18} className="text-white mb-0.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Apple Music Engine</h2>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {activeTab === 'RIPPER' ? 'Media Acquisition Phase' : 'DRM Negotiation Matrix'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('RIPPER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'RIPPER' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <Radio size={16} />
            Ripper Engine
          </button>
          <button
            onClick={() => setActiveTab('WRAPPER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'WRAPPER' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <KeyRound size={16} />
            Decryption Wrapper
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {activeTab === 'RIPPER' ? (
        <>
        {/* Left Side: Control Deck */}
        <div className="w-1/2 flex flex-col border-r border-white/10 bg-[#0a0a0a]/40 backdrop-blur-sm overflow-y-auto">

          <div className="p-8 space-y-8">
            {/* Input Section */}
            <form onSubmit={handleRip} className="space-y-4">
              <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Download size={16} className="text-[#FA243C]" />
                Target URL (Track, Album, Playlist)
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  placeholder="https://music.apple.com/us/album/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#FA243C]/50 transition-all font-mono text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={isRipping || !url}
                  className="px-6 py-3 bg-[#FA243C] hover:bg-[#fa5e6e] disabled:opacity-50 disabled:bg-[#FA243C] text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(250,36,60,0.3)] flex items-center gap-2"
                >
                  {isRipping ? (
                    <span className="flex items-center gap-2"><Disc3 size={18} className="animate-spin" /> Ripping...</span>
                  ) : (
                    'Initialize'
                  )}
                </button>
              </div>
            </form>

            {/* Config Matrix */}
            <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-6">
              <div className="flex items-center gap-2 text-white/90 font-semibold border-b border-white/10 pb-3">
                <Settings2 size={18} />
                Ingestion Configuration
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Codec / Format</label>
                  <div className="flex flex-col gap-2">
                    {(['alac', 'flac', 'atmos', 'aac'] as const).map(f => (
                      <label key={f} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="format"
                          checked={format === f}
                          onChange={() => setFormat(f)}
                          className="w-4 h-4 accent-[#FA243C] bg-black/50 border-white/20"
                        />
                        <span className={`text-sm font-medium transition-colors ${format === f ? 'text-white' : 'text-muted-foreground group-hover:text-white/80'}`}>
                          {f === 'alac' ? 'ALAC (Native Lossless)' : f === 'flac' ? 'FLAC (Converted)' : f === 'atmos' ? 'Dolby Atmos (EC3)' : 'AAC (256kbps)'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Max Quality Limit</label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-[#FA243C]/50 focus:border-[#FA243C]/50 outline-none"
                    >
                      <option value="192000">192 kHz (Hi-Res)</option>
                      <option value="96000">96 kHz (Hi-Res)</option>
                      <option value="48000">48 kHz (Standard Lossless)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Metadata Toggles</label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Embed LRC/TTML Lyrics</span>
                      <input type="checkbox" checked={embedLrc} onChange={(e) => setEmbedLrc(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Save Animated Artwork (MP4)</span>
                      <input type="checkbox" checked={animatedArt} onChange={(e) => setAnimatedArt(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Queue (Simulated) */}
            {isRipping && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <PlayCircle size={16} className="text-[#FA243C]" />
                  Active Rip Queue
                </h3>
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-md bg-gradient-to-br from-blue-900 to-purple-900 flex-shrink-0 animate-pulse border border-white/20" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate text-sm">Acquiring Track Metadata...</h4>
                    <p className="text-muted-foreground text-xs truncate">Resolving M3U8 stream via decryption proxy</p>
                    <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FA243C] w-[30%] animate-pulse rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Telemetry Terminal */}
        <div className="w-1/2 bg-[#050505] border-l border-white/5 flex flex-col relative font-mono">

          <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
            <Terminal size={14} />
            <span>Worker Node [tty0] - stdout</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto text-[11px] leading-relaxed text-green-500/80 space-y-1">
            <div className="text-white/40"># Swarm Worker Go Ripper Initialized</div>
            <div>[INFO] Loading config.yaml...</div>
            <div>[INFO] Wrapper decryption proxy detected at 127.0.0.1:10020</div>
            {isRipping && (
              <>
                <div className="animate-pulse text-yellow-500">[WARN] Parsing Apple Music URL...</div>
                <div>[INFO] Found 1 items in payload.</div>
                <div>[INFO] Requesting media-user-token authentication... OK.</div>
                <div>[INFO] Fetching M3U8 stream for audio-alac-stereo (192000Hz)...</div>
                <div className="text-blue-400">[HTTP] 200 OK - Stream acquired.</div>
                <div className="text-white/60">Downloading segments (0/42)...</div>
              </>
            )}
          </div>

          {/* Terminal Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20" />
        </div>
        </>
        ) : (
           <div className="w-full h-full overflow-y-auto">
              <AppleMusicWrapperUI />
           </div>
        )}

      </div>
    </div>
  );
};
