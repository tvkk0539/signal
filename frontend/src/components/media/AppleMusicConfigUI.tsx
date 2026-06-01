import React from 'react';
import { Settings2, Save } from 'lucide-react';
import { useAppleMusicStore } from '../../store/appleMusicStore';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import type { AppleMusicConfigSaveMessage } from '@swarm/shared';

export const AppleMusicConfigUI: React.FC = () => {
  const {
    mediaUserToken, setMediaUserToken,
    storefront, setStorefront,
    alacFix, setAlacFix,
    autoUpload, rcloneRemote,
    lrcFormat, setLrcFormat,
    lrcType, setLrcType,
    language, setLanguage,
    tagSortOrder, setTagSortOrder,
    saveLrcFile, setSaveLrcFile,
    saveArtistCover, setSaveArtistCover,
    useSongInfoForPlaylist, setUseSongInfoForPlaylist,
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
    convertAfterDownload, setConvertAfterDownload,
    convertFormat, setConvertFormat,
    convertKeepOriginal, setConvertKeepOriginal,
    convertSkipIfSourceMatches, setConvertSkipIfSourceMatches,
    convertWithMetadata, setConvertWithMetadata,
    convertWarnLossyToLossless, setConvertWarnLossyToLossless,
    convertSkipLossyToLossless, setConvertSkipLossyToLossless,
    convertCheckBadAlac, setConvertCheckBadAlac,
    convertDeleteBadAlac, setConvertDeleteBadAlac
  } = useAppleMusicStore();

  const handleSave = () => {
    const payload: AppleMusicConfigSaveMessage = {
      type: MessageType.APPLE_MUSIC_CONFIG_SAVE,
      timestamp: Date.now(),
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
    SocketManager.getInstance().emit(MessageType.APPLE_MUSIC_CONFIG_SAVE, payload);
    // Could add a toast notification here
  };

  return (
    <div className="w-full h-full flex flex-col items-center py-10 overflow-y-auto">
      <div className="w-full max-w-4xl px-6 space-y-6">

        <div className="flex items-center justify-between p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-blue-500/20 text-blue-500 shadow-blue-500/20">
                    <Settings2 size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Engine Configuration Matrix</h3>
                    <p className="text-sm text-muted-foreground">Advanced Go Ripper settings mapped to <code className="text-xs bg-white/10 px-1 rounded">config.yaml</code></p>
                </div>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-[#fa5e6e] text-white font-semibold rounded-xl shadow-[0_0_15px_rgba(250,36,60,0.3)] transition-all"
            >
                <Save size={18} /> Save Config
            </button>
        </div>

        <div className="p-8 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm space-y-6">
            <h4 className="text-sm uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2">Authentication Tokens</h4>
            <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Media User Token <span className="text-[#FA243C]">*</span></label>
                    <input
                      type="text"
                      value={mediaUserToken}
                      onChange={(e) => setMediaUserToken(e.target.value)}
                      placeholder="Extract from browser cookies (media-user-token)"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground ml-1">Required for high-resolution ALAC and real-time lyrics extraction.</p>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Authorization Token</label>
                    <input type="text" placeholder="Bearer ..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono opacity-50" disabled />
                    <p className="text-[10px] text-muted-foreground ml-1">Auto-generated by Swarm backend during initialization.</p>
                </div>
            </div>

            <h4 className="text-sm uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2 mt-8">Advanced Parameters</h4>

            {/* Split Advanced Parameters into Sections */}
            <div className="space-y-8 mt-4">

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Storefront ID</label>
                    <input
                      type="text"
                      value={storefront}
                      onChange={(e) => setStorefront(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Translation Language Code</label>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. ko-KR"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">LRC Format</label>
                    <select
                        value={lrcFormat}
                        onChange={(e) => setLrcFormat(e.target.value as 'lrc' | 'ttml')}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    >
                        <option value="lrc">Standard LRC</option>
                        <option value="ttml">TTML (Word-by-word)</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">LRC Type</label>
                    <select
                        value={lrcType}
                        onChange={(e) => setLrcType(e.target.value as 'lyrics' | 'syllable-lyrics')}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    >
                        <option value="lyrics">Standard (lyrics)</option>
                        <option value="syllable-lyrics">Syllable (syllable-lyrics)</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">AAC Type</label>
                    <select
                        value={aacType}
                        onChange={(e) => setAacType(e.target.value as any)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    >
                        <option value="aac-lc">AAC-LC</option>
                        <option value="aac">AAC</option>
                        <option value="aac-binaural">AAC Binaural</option>
                        <option value="aac-downmix">AAC Downmix</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">M3U8 Mode</label>
                    <select
                        value={getM3u8Mode}
                        onChange={(e) => setGetM3u8Mode(e.target.value as any)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    >
                        <option value="hires">Hi-Res Only</option>
                        <option value="all">All</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Music Video Audio Type</label>
                    <select
                        value={mvAudioType}
                        onChange={(e) => setMvAudioType(e.target.value as any)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                    >
                        <option value="atmos">Atmos</option>
                        <option value="ac3">AC3</option>
                        <option value="aac">AAC</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground ml-1">Music Video Max Height (px)</label>
                    <input
                      type="number"
                      value={mvMax}
                      onChange={(e) => setMvMax(parseInt(e.target.value) || 2160)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                </div>
              </div>

              {/* Tagging and Content Matching */}
              <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2 mt-4">Tagging & Content Matching</h5>
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1">Explicit Tag</label>
                      <input
                        type="text"
                        value={explicitChoice}
                        onChange={(e) => setExplicitChoice(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1">Clean Tag</label>
                      <input
                        type="text"
                        value={cleanChoice}
                        onChange={(e) => setCleanChoice(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1">Apple Master Tag</label>
                      <input
                        type="text"
                        value={appleMasterChoice}
                        onChange={(e) => setAppleMasterChoice(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
              </div>

              {/* Artwork Settings */}
              <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2 mt-4">Artwork Settings</h5>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-xs text-muted-foreground ml-1">Cover Size</label>
                      <input
                        type="text"
                        value={coverSize}
                        onChange={(e) => setCoverSize(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-muted-foreground ml-1">Cover Format</label>
                      <select
                          value={coverFormat}
                          onChange={(e) => setCoverFormat(e.target.value as any)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                      >
                          <option value="jpg">JPG</option>
                          <option value="png">PNG</option>
                          <option value="original">Original</option>
                      </select>
                  </div>
              </div>

              {/* Naming Templates */}
              <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2 mt-4">File & Folder Templates</h5>
              <div className="mb-4 p-4 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-inner">
                  <p className="text-xs text-white/80 mb-3 font-semibold uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Template Tokens (Click to Copy)
                  </p>
                  <div className="flex flex-wrap gap-2 font-mono text-[10px]">
                      {['{AlbumId}', '{AlbumName}', '{ArtistId}', '{ArtistName}', '{UrlArtistName}', '{ReleaseDate}', '{ReleaseYear}', '{UPC}', '{Copyright}', '{Quality}', '{Codec}', '{Tag}', '{RecordLabel}', '{PlaylistId}', '{PlaylistName}', '{SongId}', '{SongNumer}', '{SongName}', '{DiscNumber}', '{TrackNumber}'].map(token => (
                          <button
                              key={token}
                              type="button"
                              className="px-2 py-1 bg-white/5 border border-white/10 rounded hover:bg-[#FA243C]/20 hover:text-[#FA243C] hover:border-[#FA243C]/50 transition-colors cursor-pointer text-muted-foreground"
                              onClick={() => navigator.clipboard.writeText(token)}
                              title="Copy to clipboard"
                          >
                              {token}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1 flex justify-between">
                          <span>Album Folder Format</span>
                          <span className="text-white/30 italic">Ex: {"{ReleaseYear} - {AlbumName}"}</span>
                      </label>
                      <input
                        type="text"
                        value={albumFolderFormat}
                        onChange={(e) => setAlbumFolderFormat(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1 flex justify-between">
                          <span>Playlist Folder Format</span>
                          <span className="text-white/30 italic">Ex: {"{PlaylistName}"}</span>
                      </label>
                      <input
                        type="text"
                        value={playlistFolderFormat}
                        onChange={(e) => setPlaylistFolderFormat(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1 flex justify-between">
                          <span>Artist Folder Format</span>
                          <span className="text-white/30 italic">Ex: {"{UrlArtistName}"}</span>
                      </label>
                      <input
                        type="text"
                        value={artistFolderFormat}
                        onChange={(e) => setArtistFolderFormat(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1 flex justify-between">
                          <span>Song File Format</span>
                          <span className="text-white/30 italic">Ex: {"{SongNumer}. {SongName}"}</span>
                      </label>
                      <input
                        type="text"
                        value={songFileFormat}
                        onChange={(e) => setSongFileFormat(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
              </div>

            </div>

            {/* Post Processing & Conversion Block */}
            <div className="p-8 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm space-y-6">
              <h4 className="text-sm uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2">FFmpeg Post-Processing & Validation</h4>

              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                 <div>
                    <h4 className="text-sm text-white font-medium">Enable Post-Processing Conversion</h4>
                    <p className="text-xs text-muted-foreground mt-1">Convert downloaded audio into other formats via FFmpeg.</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={convertAfterDownload} onChange={(e) => setConvertAfterDownload(e.target.checked)} />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FA243C]"></div>
                 </label>
              </div>

              <div className={`grid grid-cols-2 gap-8 transition-opacity duration-300 ${!convertAfterDownload ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="space-y-2">
                      <label className="text-xs text-muted-foreground ml-1">Target Audio Conversion Format</label>
                      <select
                          value={convertFormat}
                          onChange={(e) => setConvertFormat(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                      >
                          <option value="flac">FLAC (Free Lossless)</option>
                          <option value="mp3">MP3 (MPEG Audio)</option>
                          <option value="opus">Opus (High Efficiency)</option>
                          <option value="wav">WAV (Uncompressed)</option>
                      </select>
                      <p className="text-[10px] text-white/40 ml-1 mt-2 leading-relaxed">Converts the output immediately after download using the ephemeral FFmpeg pipeline.</p>
                  </div>

                  <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group pt-1">
                          <input type="checkbox" checked={convertWithMetadata} onChange={(e) => setConvertWithMetadata(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Transfer Metadata Tags to converted files</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={convertKeepOriginal} onChange={(e) => setConvertKeepOriginal(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Keep original ALAC file after successful conversion</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={convertSkipIfSourceMatches} onChange={(e) => setConvertSkipIfSourceMatches(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Skip processing if source already matches target</span>
                      </label>
                  </div>
              </div>

              <div className={`border-t border-white/5 pt-6 grid grid-cols-2 gap-8 transition-opacity duration-300 ${!convertAfterDownload ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="space-y-4">
                      <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Quality Guards</h5>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={convertWarnLossyToLossless} onChange={(e) => setConvertWarnLossyToLossless(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Warn when converting lossy AAC to lossless FLAC/WAV</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={convertSkipLossyToLossless} onChange={(e) => setConvertSkipLossyToLossless(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Prevent lossy-to-lossless conversions entirely</span>
                      </label>
                  </div>
                  <div className="space-y-4">
                      <h5 className="text-[10px] uppercase tracking-wider text-yellow-500/80 font-bold mb-2">Corruption Auditing</h5>
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={convertCheckBadAlac} onChange={(e) => setConvertCheckBadAlac(e.target.checked)} className="accent-[#FA243C] w-4 h-4" />
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-white transition-colors">Audit ALAC streams for corruption post-rip</span>
                      </label>
                      <label className={`flex items-center gap-3 cursor-pointer group ${!convertCheckBadAlac ? 'opacity-30' : ''}`}>
                          <input type="checkbox" disabled={!convertCheckBadAlac} checked={convertDeleteBadAlac} onChange={(e) => setConvertDeleteBadAlac(e.target.checked)} className="accent-red-500 w-4 h-4" />
                          <span className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">Delete corrupted ALAC tracks automatically</span>
                      </label>
                  </div>
              </div>
            </div>

            <div className="p-8 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm space-y-6">

              {/* Toggles Matrix */}
              <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b border-white/10 pb-2 mt-4">Behavioral Toggles</h5>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Save LRC File</span>
                      <input
                        type="checkbox"
                        checked={saveLrcFile}
                        onChange={(e) => setSaveLrcFile(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>

                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Save Artist Cover</span>
                      <input
                        type="checkbox"
                        checked={saveArtistCover}
                        onChange={(e) => setSaveArtistCover(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>

                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Use SongInfo For Playlist</span>
                      <input
                        type="checkbox"
                        checked={useSongInfoForPlaylist}
                        onChange={(e) => setUseSongInfoForPlaylist(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>

                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Download Album Cover for Playlist</span>
                      <input
                        type="checkbox"
                        checked={dlAlbumcoverForPlaylist}
                        onChange={(e) => setDlAlbumcoverForPlaylist(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>

                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Emby Animated Artwork</span>
                      <input
                        type="checkbox"
                        checked={embyAnimatedArtwork}
                        onChange={(e) => setEmbyAnimatedArtwork(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>

                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Apply ALAC Fix Patch</span>
                      <input
                        type="checkbox"
                        checked={alacFix}
                        onChange={(e) => setAlacFix(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>
                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Force Tag Sort Order</span>
                      <input
                        type="checkbox"
                        checked={tagSortOrder}
                        onChange={(e) => setTagSortOrder(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>
                  <div className="space-y-1 flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                      <span className="text-sm text-white/90">Exit On Error</span>
                      <input
                        type="checkbox"
                        checked={exitOnError}
                        onChange={(e) => setExitOnError(e.target.checked)}
                        className="accent-primary w-4 h-4"
                      />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1">Max Memory Limit (MB)</label>
                      <input
                        type="number"
                        value={maxMemoryLimit}
                        onChange={(e) => setMaxMemoryLimit(parseInt(e.target.value) || 256)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground ml-1">Limit Max (String length)</label>
                      <input
                        type="number"
                        value={limitMax}
                        onChange={(e) => setLimitMax(parseInt(e.target.value) || 200)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none font-mono"
                      />
                  </div>
              </div>

            </div>
        </div>

      </div>
    </div>
  );
};
