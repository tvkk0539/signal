import React from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { Apple, Music2, ServerCrash } from 'lucide-react';

export const MusicRipsHub: React.FC = () => {
  const { setActiveView } = useLayoutStore();

  return (
    <div className="w-full min-h-full bg-[#0a0a0a] p-10 font-sans text-foreground">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Music2 size={32} className="text-primary" />
            Media Ingestion Hub
          </h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
            Select a dedicated ingestion engine. Each engine is a highly specialized micro-frontend
            architected to interface directly with specific streaming platforms via the Swarm network.
          </p>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Apple Music Engine Card */}
          <button
            onClick={() => setActiveView('APPLE_MUSIC')}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#111111]/80 backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(250,36,60,0.5)] text-left flex flex-col h-[280px]"
          >
            {/* Apple Music Brand Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FA243C]/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 flex flex-col h-full justify-between z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#fa5e6e] flex items-center justify-center shadow-lg shadow-[#FA243C]/20">
                  <Apple size={32} className="text-white mb-1" />
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold uppercase tracking-wider">
                  Active
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-[#FA243C] transition-colors">Apple Music Engine</h2>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  Dedicated ALAC/Atmos ingestion. Features zero-loss stream decryption, inline metadata embedding, and real-time TTML lyrics extraction.
                </p>
              </div>
            </div>
          </button>

          {/* Tidal Engine Card (Coming Soon) */}
          <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#111111]/40 backdrop-blur-md opacity-60 cursor-not-allowed flex flex-col h-[280px]">
            <div className="absolute inset-0 bg-gradient-to-br from-black to-transparent opacity-50" />
            <div className="relative p-8 flex flex-col h-full justify-between z-10">
              <div className="flex items-center justify-between filter grayscale">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#000000] to-[#333333] flex items-center justify-center shadow-lg border border-white/10">
                  {/* Pseudo Tidal Logo */}
                  <div className="flex gap-1 rotate-45">
                     <div className="w-2 h-2 bg-white rounded-sm" />
                     <div className="w-2 h-2 bg-white rounded-sm" />
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-semibold uppercase tracking-wider">
                  In Development
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Tidal Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Master Quality Authenticated (MQA) and HiRes FLAC ingestion architecture.
                </p>
              </div>
            </div>
          </div>

          {/* Qobuz Engine Card (Coming Soon) */}
          <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#111111]/40 backdrop-blur-md opacity-60 cursor-not-allowed flex flex-col h-[280px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#000000] to-[#0055ff]/10 opacity-50" />
            <div className="relative p-8 flex flex-col h-full justify-between z-10">
              <div className="flex items-center justify-between filter grayscale">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#000000] to-[#1a1a1a] flex items-center justify-center shadow-lg border border-white/10">
                  <ServerCrash size={28} className="text-white" />
                </div>
                <div className="px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Planned
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Qobuz Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Studio-quality 24-bit/192kHz native FLAC acquisition and metadata parsing.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
