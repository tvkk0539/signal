import React, { useState, useEffect } from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { Apple, ArrowLeft, Download, Settings2, Terminal, Radio, KeyRound, Cog, Database } from 'lucide-react';
import { AppleMusicWrapperUI } from './AppleMusicWrapperUI';
import { AppleMusicConfigUI } from './AppleMusicConfigUI';
import { AppleMusicSettingsUI } from './AppleMusicSettingsUI';
import { AppleMusicQueueUI } from './AppleMusicQueueUI';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import type { AppleMusicRipRequestMessage, RipperTelemetryMessage, RipperProgressUpdateMessage, WrapperStatusUpdateMessage, Wrapper2FAChallengeMessage } from '@swarm/shared';
import { useAppleMusicStore } from '../../store/appleMusicStore';
import { useAppleMusicQueueStore } from '../../store/appleMusicQueueStore';
import { v4 as uuidv4 } from 'uuid';

export const AppleMusicApp: React.FC = () => {
  const { setActiveView } = useLayoutStore();
  const [activeTab, setActiveTab] = useState<'RIPPER' | 'QUEUE' | 'WRAPPER' | 'CONFIG' | 'SETTINGS'>('RIPPER');

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<'alac' | 'flac' | 'atmos' | 'aac'>('alac');
  const [quality, setQuality] = useState<'192000' | '96000' | '48000'>('192000');
  const [ripMode, setRipMode] = useState<'auto' | 'song' | 'album' | 'artist' | 'mv'>('auto');

  const [embedLrc, setEmbedLrc] = useState(true);
  const [animatedArt, setAnimatedArt] = useState(false);
  const [saveM3u8Playlist, setSaveM3u8Playlist] = useState(false);
  const [printJson, setPrintJson] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const { addJob, appendLog, updateJobStatus, updateJobProgress } = useAppleMusicQueueStore();

  const {
    mediaUserToken, storefront, setMediaUserToken, setStorefront, setAutoUpload, setRcloneRemote,
    alacFix, autoUpload, rcloneRemote, lrcFormat, lrcType, language, tagSortOrder, saveLrcFile, saveArtistCover, useSongInfoForPlaylist,
    setWrapperStatus, setWrapperNeeds2FA, setLrcFormat, setLrcType, setLanguage, setTagSortOrder, setSaveLrcFile, setSaveArtistCover, setUseSongInfoForPlaylist, setAlacFix,
    coverSize, setCoverSize,
    coverFormat, setCoverFormat,
    explicitChoice, setExplicitChoice,
    cleanChoice, setCleanChoice,
    appleMasterChoice, setAppleMasterChoice,
    albumFolderFormat, setAlbumFolderFormat,
    playlistFolderFormat, setPlaylistFolderFormat,
    songFileFormat, setSongFileFormat,
    artistFolderFormat, setArtistFolderFormat,
    maxMemoryLimit, setMaxMemoryLimit,
    exitOnError, setExitOnError,
    getM3u8Mode, setGetM3u8Mode,
    aacType, setAacType,
    mvAudioType, setMvAudioType,
    mvMax, setMvMax,
    limitMax, setLimitMax,
    dlAlbumcoverForPlaylist, setDlAlbumcoverForPlaylist,
    embyAnimatedArtwork, setEmbyAnimatedArtwork,
    convertAfterDownload, convertFormat, convertKeepOriginal, convertSkipIfSourceMatches,
    convertWithMetadata, convertWarnLossyToLossless, convertSkipLossyToLossless,
    convertCheckBadAlac, convertDeleteBadAlac
  } = useAppleMusicStore();

  React.useEffect(() => {
    const socketManager = SocketManager.getInstance();

    // Load config on mount
    socketManager.emit(MessageType.APPLE_MUSIC_CONFIG_LOAD, { type: MessageType.APPLE_MUSIC_CONFIG_LOAD, timestamp: Date.now() });

    const handleConfigData = (msg: any) => {
       if (msg.mediaUserToken) setMediaUserToken(msg.mediaUserToken);
       if (msg.storefront) setStorefront(msg.storefront);
       if (msg.autoUpload !== undefined) setAutoUpload(msg.autoUpload);
       if (msg.rcloneRemote) setRcloneRemote(msg.rcloneRemote);
         if (msg.alacFix !== undefined) setAlacFix(msg.alacFix);
         if (msg.lrcFormat) setLrcFormat(msg.lrcFormat as any);
         if (msg.lrcType) setLrcType(msg.lrcType as any);
         if (msg.language !== undefined) setLanguage(msg.language);
         if (msg.tagSortOrder !== undefined) setTagSortOrder(msg.tagSortOrder);
         if (msg.saveLrcFile !== undefined) setSaveLrcFile(msg.saveLrcFile);
         if (msg.saveArtistCover !== undefined) setSaveArtistCover(msg.saveArtistCover);
         if (msg.useSongInfoForPlaylist !== undefined) setUseSongInfoForPlaylist(msg.useSongInfoForPlaylist);
         if (msg.coverSize !== undefined) setCoverSize(msg.coverSize);
         if (msg.coverFormat !== undefined) setCoverFormat(msg.coverFormat as any);
         if (msg.explicitChoice !== undefined) setExplicitChoice(msg.explicitChoice);
         if (msg.cleanChoice !== undefined) setCleanChoice(msg.cleanChoice);
         if (msg.appleMasterChoice !== undefined) setAppleMasterChoice(msg.appleMasterChoice);
         if (msg.albumFolderFormat !== undefined) setAlbumFolderFormat(msg.albumFolderFormat);
         if (msg.playlistFolderFormat !== undefined) setPlaylistFolderFormat(msg.playlistFolderFormat);
         if (msg.songFileFormat !== undefined) setSongFileFormat(msg.songFileFormat);
         if (msg.artistFolderFormat !== undefined) setArtistFolderFormat(msg.artistFolderFormat);
         if (msg.maxMemoryLimit !== undefined) setMaxMemoryLimit(msg.maxMemoryLimit);
         if (msg.exitOnError !== undefined) setExitOnError(msg.exitOnError);
         if (msg.getM3u8Mode !== undefined) setGetM3u8Mode(msg.getM3u8Mode as any);
         if (msg.aacType !== undefined) setAacType(msg.aacType as any);
         if (msg.mvAudioType !== undefined) setMvAudioType(msg.mvAudioType as any);
         if (msg.mvMax !== undefined) setMvMax(msg.mvMax);
         if (msg.limitMax !== undefined) setLimitMax(msg.limitMax);
         if (msg.dlAlbumcoverForPlaylist !== undefined) setDlAlbumcoverForPlaylist(msg.dlAlbumcoverForPlaylist);
         if (msg.embyAnimatedArtwork !== undefined) setEmbyAnimatedArtwork(msg.embyAnimatedArtwork);
    };

    const handleTelemetry = (msg: RipperTelemetryMessage) => {
       if (msg.log && msg.jobId) {
          appendLog(msg.jobId, msg.log, msg.uploadPath);
          if (msg.log.includes('SUCCESS') || msg.log.includes('finished with status')) {
              updateJobStatus(msg.jobId, 'COMPLETED');
          } else if (msg.log.includes('FAILED') || msg.log.includes('ERROR') || msg.log.includes('exited with code')) {
              updateJobStatus(msg.jobId, 'FAILED');
          }
       }
    };

    const handleProgress = (msg: RipperProgressUpdateMessage) => {
        if (msg.jobId) {
            updateJobProgress(msg.jobId, msg.phase, msg.progressPercent, msg.dataMetrics, msg.speed);
            // Ensure status is RUNNING when progress arrives
            updateJobStatus(msg.jobId, 'RUNNING');
        }
    };

    const handleWrapperStatusUpdate = (msg: WrapperStatusUpdateMessage) => {
       setWrapperStatus(msg.installed, msg.running, msg.pid, msg.logs || []);
    };

    const handleWrapper2FAChallenge = (_msg: Wrapper2FAChallengeMessage) => {
       setWrapperNeeds2FA(true);
    };

    socketManager.on(MessageType.RIPPER_TELEMETRY, handleTelemetry);
    socketManager.on(MessageType.RIPPER_PROGRESS_UPDATE, handleProgress);
    socketManager.on(MessageType.APPLE_MUSIC_CONFIG_DATA, handleConfigData);
    socketManager.on(MessageType.WRAPPER_STATUS_UPDATE, handleWrapperStatusUpdate);
    socketManager.on(MessageType.WRAPPER_2FA_CHALLENGE, handleWrapper2FAChallenge);

    return () => {
       socketManager.off(MessageType.RIPPER_TELEMETRY, handleTelemetry);
       socketManager.off(MessageType.RIPPER_PROGRESS_UPDATE, handleProgress);
       socketManager.off(MessageType.APPLE_MUSIC_CONFIG_DATA, handleConfigData);
        socketManager.off(MessageType.WRAPPER_STATUS_UPDATE, handleWrapperStatusUpdate);
        socketManager.off(MessageType.WRAPPER_2FA_CHALLENGE, handleWrapper2FAChallenge);
    };
  }, [setWrapperStatus, setWrapperNeeds2FA, setMediaUserToken, setStorefront, setAutoUpload, setRcloneRemote]);

  // Hybrid Auto-Detector: Parse URL on the fly
  useEffect(() => {
    if (!url) {
      setRipMode('auto');
      return;
    }
    try {
      const urlObj = new URL(url);
      if (urlObj.searchParams.has('i')) {
        setRipMode('song');
      } else if (urlObj.pathname.includes('/music-video/')) {
        setRipMode('mv');
      } else if (urlObj.pathname.includes('/artist/')) {
        setRipMode('artist');
      } else if (urlObj.pathname.includes('/album/')) {
        setRipMode('album');
      } else if (urlObj.pathname.includes('/playlist/')) {
        setRipMode('album');
      } else {
        setRipMode('auto');
      }
    } catch {
      // Invalid URL while typing, ignore
    }
  }, [url]);

  const handleRip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const newJobId = uuidv4();

    // Create the immutable "Frozen Snapshot" of every single setting
    const frozenConfigSnapshot = {
       url,
       ripMode,
       format,
       qualityLimit: quality,
       embedLrc,
       animatedArt,
       saveM3u8Playlist,
       printJson,
       debugMode,
       storefront,
       alacFix,
       autoUpload,
       rcloneRemote,
       lrcFormat,
       lrcType,
       language,
       tagSortOrder,
       saveLrcFile,
       saveArtistCover,
       useSongInfoForPlaylist,
       coverSize,
       coverFormat,
       explicitChoice,
       cleanChoice,
       appleMasterChoice,
       albumFolderFormat,
       playlistFolderFormat,
       songFileFormat,
       artistFolderFormat,
       maxMemoryLimit,
       exitOnError,
       getM3u8Mode,
       aacType,
       mvAudioType,
       mvMax,
       limitMax,
       dlAlbumcoverForPlaylist,
       embyAnimatedArtwork,
       convertAfterDownload,
       convertFormat,
       convertKeepOriginal,
       convertSkipIfSourceMatches,
       convertWithMetadata,
       convertWarnLossyToLossless,
       convertSkipLossyToLossless,
       convertCheckBadAlac,
       convertDeleteBadAlac
    };

    addJob({
      jobId: newJobId,
      url,
      status: 'QUEUED',
      configSnapshot: frozenConfigSnapshot,
      logs: ["[SYSTEM] Job created and dispatched to Swarm Ledger..."]
    });

    const socketManager = SocketManager.getInstance();
    const payload: AppleMusicRipRequestMessage = {
       type: MessageType.APPLE_MUSIC_RIP_REQUEST,
       timestamp: Date.now(),
       workerId: 'target-worker-id',
       jobId: newJobId,
       url,
       ripMode,
       format,
       qualityLimit: quality,
       embedLrc,
       animatedArt,
       saveM3u8Playlist,
       printJson,
       debugMode,
       mediaUserToken,
       storefront,
       alacFix,
       autoUpload,
       rcloneRemote,
       lrcFormat,
       lrcType,
       language,
       tagSortOrder,
       saveLrcFile,
       saveArtistCover,
       useSongInfoForPlaylist,
       coverSize,
       coverFormat,
       explicitChoice,
       cleanChoice,
       appleMasterChoice,
       albumFolderFormat,
       playlistFolderFormat,
       songFileFormat,
       artistFolderFormat,
       maxMemoryLimit,
       exitOnError,
       getM3u8Mode,
       aacType,
       mvAudioType,
       mvMax,
       limitMax,
       dlAlbumcoverForPlaylist,
       embyAnimatedArtwork,
       convertAfterDownload,
       convertFormat,
       convertKeepOriginal,
       convertSkipIfSourceMatches,
       convertWithMetadata,
       convertWarnLossyToLossless,
       convertSkipLossyToLossless,
       convertCheckBadAlac,
       convertDeleteBadAlac
    };

    socketManager.emit(MessageType.APPLE_MUSIC_RIP_REQUEST, payload);
    setUrl(''); // Clear the input for the next job
    setActiveTab('QUEUE'); // Auto-switch to the ledger to watch it run
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] font-sans text-foreground flex flex-col relative overflow-hidden">

      {/* Apple Music Themed Background (Pure CSS Glassmorphism) */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#FA243C]/20 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#fa5e6e]/10 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col border-b border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl">

        {/* Top Row: Title & Back Button */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('MUSIC_RIPS')}
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
              title="Back to Hub"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FA243C] to-[#fa5e6e] flex items-center justify-center shadow-lg shadow-[#FA243C]/20">
                <Apple size={18} className="text-white mb-0.5" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Apple Music Engine</h2>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                    {activeTab === 'RIPPER' ? 'Media Acquisition Phase' :
                     activeTab === 'WRAPPER' ? 'DRM Negotiation Matrix' :
                     activeTab === 'CONFIG' ? 'Engine Configuration' : 'Swarm Settings'}
                  </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Tab Navigation */}
        <div className="px-6 pb-4">
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto w-fit shadow-md">
          <button
            onClick={() => setActiveTab('RIPPER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'RIPPER' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <Radio size={16} />
            Ripper Engine
          </button>
          <button
            onClick={() => setActiveTab('QUEUE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'QUEUE' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <Terminal size={16} />
            Queue & Ledger
          </button>
          <button
            onClick={() => setActiveTab('WRAPPER')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'WRAPPER' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <KeyRound size={16} />
            Decryption Wrapper
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'CONFIG' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <Cog size={16} />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'SETTINGS' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white/80'
            }`}
          >
            <Database size={16} />
            Storage & Settings
          </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex overflow-hidden">

        {activeTab === 'RIPPER' ? (
        <>
        {/* Full Width: Control Deck */}
        <div className="w-full flex flex-col bg-[#0a0a0a]/40 backdrop-blur-sm overflow-y-auto max-w-4xl mx-auto">

          <div className="p-8 space-y-8">
            {/* Input Section */}
            <form onSubmit={handleRip} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Download size={16} className="text-[#FA243C]" />
                  Target URL (Track, Album, Playlist)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mode:</span>
                  <select
                    value={ripMode}
                    onChange={(e) => setRipMode(e.target.value as any)}
                    className="bg-black/50 border border-white/10 text-white text-xs rounded-md px-2 py-1 focus:ring-[#FA243C]/50 outline-none"
                  >
                    <option value="auto">Auto-Detect</option>
                    <option value="song">Single Song</option>
                    <option value="album">Full Album</option>
                    <option value="artist">Entire Artist</option>
                    <option value="mv">Music Video</option>
                  </select>
                </div>
              </div>
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
                  disabled={!url}
                  className="px-6 py-3 bg-[#FA243C] hover:bg-[#fa5e6e] disabled:opacity-50 disabled:bg-[#FA243C] text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(250,36,60,0.3)] flex items-center gap-2"
                >
                  Dispatch
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
                    {(['alac', 'atmos', 'aac'] as const).map(f => (
                      <label key={f} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="radio"
                          name="format"
                          checked={format === f}
                          onChange={() => setFormat(f as any)}
                          className="w-4 h-4 accent-[#FA243C] bg-black/50 border-white/20"
                        />
                        <span className={`text-sm font-medium transition-colors ${format === f ? 'text-white' : 'text-muted-foreground group-hover:text-white/80'}`}>
                          {f === 'alac' ? 'ALAC (Native Lossless)' : f === 'atmos' ? 'Dolby Atmos (EC3)' : 'AAC (256kbps)'}
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

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold text-[#FA243C]">Music Video Settings</label>
                    <select
                      value={mvMax}
                      onChange={(e) => setMvMax(Number(e.target.value))}
                      className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-[#FA243C]/50 focus:border-[#FA243C]/50 outline-none mb-3"
                    >
                      <option value={2160}>4K (2160p)</option>
                      <option value={1080}>HD (1080p)</option>
                      <option value={720}>SD (720p)</option>
                      <option value={480}>Low (480p)</option>
                    </select>
                    <select
                      value={mvAudioType}
                      onChange={(e) => setMvAudioType(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-[#FA243C]/50 focus:border-[#FA243C]/50 outline-none"
                    >
                      <option value="atmos">Dolby Atmos Audio</option>
                      <option value="ac3">AC3 Surround Audio</option>
                      <option value="aac">AAC Stereo Audio</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Advanced Engine Flags</label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors" title="Saves the raw stream chunks map for debugging">Keep M3U8 Playlists</span>
                      <input type="checkbox" checked={saveM3u8Playlist} onChange={(e) => setSaveM3u8Playlist(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors" title="Outputs completion payload as machine-readable JSON">Print Final JSON Payload</span>
                      <input type="checkbox" checked={printJson} onChange={(e) => setPrintJson(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors" title="Displays deep audio quality and decryption diagnostics">Enable Telemetry Debug Mode</span>
                      <input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        </>
        ) : activeTab === 'QUEUE' ? (
           <div className="w-full h-full relative z-20 overflow-hidden pointer-events-auto">
              <AppleMusicQueueUI />
           </div>
        ) : activeTab === 'WRAPPER' ? (
           <div className="w-full h-full overflow-y-auto relative z-20 pointer-events-auto">
              <AppleMusicWrapperUI />
           </div>
        ) : activeTab === 'CONFIG' ? (
           <div className="w-full h-full overflow-y-auto relative z-20 pointer-events-auto">
              <AppleMusicConfigUI />
           </div>
        ) : (
           <div className="w-full h-full overflow-y-auto relative z-20 pointer-events-auto">
              <AppleMusicSettingsUI />
           </div>
        )}

      </div>
    </div>
  );
};
