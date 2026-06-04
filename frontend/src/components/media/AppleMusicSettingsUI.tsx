import React, { useState, useEffect } from 'react';
import { Database, CloudUpload, HardDrive, ShieldCheck, Loader2, Check } from 'lucide-react';
import { useAppleMusicStore } from '../../store/appleMusicStore';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import type { AppleMusicConfigSaveMessage, RemoteListRequestMessage } from '@swarm/shared';
import { MiniBrowser } from '../explorer/MiniBrowser';
import { useFleetStore } from '../../store/fleetStore';

export const AppleMusicSettingsUI: React.FC = () => {
  const {
    mediaUserToken, storefront, alacFix, autoUpload, setAutoUpload, rcloneRemote, setRcloneRemote,
    lrcFormat, lrcType, language, tagSortOrder, saveLrcFile, saveArtistCover, useSongInfoForPlaylist
  } = useAppleMusicStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const { workers } = useFleetStore();
  const [remotes, setRemotes] = useState<any[]>([]);
  // We parse the current global string to split into remote vs path for the UI components
  const currentRemoteMatch = rcloneRemote ? rcloneRemote.split(':')[0] + ':' : 'remote:';
  const currentPathMatch = rcloneRemote ? rcloneRemote.substring(currentRemoteMatch.length) || '/' : '/';

  const [selectedFs, setSelectedFs] = useState(currentRemoteMatch);
  const [selectedPath, setSelectedPath] = useState(currentPathMatch);

  // Fetch remotes whenever a worker is available
  useEffect(() => {
     if (workers.length === 0) return;
     const socketManager = SocketManager.getInstance();

     const handleRemoteListResponse = (msg: any) => {
        setRemotes(msg.remotes || []);
     };

     socketManager.on(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);

     const payload: RemoteListRequestMessage = {
        type: MessageType.REMOTE_LIST_REQUEST,
        timestamp: Date.now(),
        workerId: workers[0]
     };
     socketManager.emit(MessageType.REMOTE_LIST_REQUEST, payload);

     return () => {
        socketManager.off(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);
     };
  }, [workers]);

  // Sync internal state to the global store string
  useEffect(() => {
     if (selectedFs && selectedPath !== undefined) {
         setRcloneRemote(`${selectedFs}${selectedPath.startsWith('/') ? selectedPath.substring(1) : selectedPath}`);
     }
  }, [selectedFs, selectedPath, setRcloneRemote]);

  const handleSync = () => {
    setIsSyncing(true);
    setSyncSuccess(false);

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
      useSongInfoForPlaylist
    };
    SocketManager.getInstance().emit(MessageType.APPLE_MUSIC_CONFIG_SAVE, payload);

    // Simulate network delay for UX feedback
    setTimeout(() => {
        setIsSyncing(false);
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 2000);
    }, 500);
  };

  return (
    <div className="w-full h-full flex flex-col items-center py-10 overflow-y-auto">
      <div className="w-full max-w-4xl px-6 space-y-6">

        <div className="flex items-center justify-between p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-purple-500/20 text-purple-500 shadow-purple-500/20">
                    <Database size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Storage & Swarm Settings</h3>
                    <p className="text-sm text-muted-foreground">Manage ephemeral disk behavior and cloud handoff routing.</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cloud Handoff Card */}
            <div className="p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <CloudUpload className="text-blue-400" size={20} />
                    <h4 className="text-white font-semibold">Zero-Disk Cloud Handoff</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                    When enabled, backend workers will automatically push massive ALAC files to configured Rclone remotes and instantly delete the local ephemeral copy.
                </p>
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5 mt-4">
                    <span className="text-sm text-white font-medium">Enable Auto-Upload</span>
                    <input
                        type="checkbox"
                        checked={autoUpload}
                        onChange={(e) => setAutoUpload(e.target.checked)}
                        className="accent-primary w-4 h-4"
                    />
                </div>
                <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
                    <div>
                        <label className="text-xs text-muted-foreground ml-1 mb-1 block">Target Rclone Remote</label>
                        <select
                            value={selectedFs}
                            onChange={(e) => setSelectedFs(e.target.value)}
                            disabled={!autoUpload}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                        >
                            <option value="remote:">Default Remote (remote:)</option>
                            {remotes.map(remote => (
                                <option key={remote.name} value={remote.name}>
                                    {remote.name === '/' ? 'Local Machine (/)' : `${remote.name} (${remote.type})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={!autoUpload ? 'opacity-50 pointer-events-none' : ''}>
                        <label className="text-xs text-muted-foreground ml-1 mb-1 block">Target Directory Path</label>
                        <div className="bg-black/20 border border-white/5 rounded-lg">
                           <MiniBrowser
                             workerId={workers[0] || ''}
                             targetFs={selectedFs}
                             onPathSelect={setSelectedPath}
                           />
                        </div>
                        <div className="mt-2 flex items-center gap-2 px-1 text-[10px] text-muted-foreground font-mono">
                            <span className="text-[#FA243C]">Final Path:</span>
                            <span className="bg-black/40 px-2 py-0.5 rounded border border-white/10 truncate">
                               {rcloneRemote}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ephemeral Disk Limits */}
            <div className="p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <HardDrive className="text-orange-400" size={20} />
                    <h4 className="text-white font-semibold">Ephemeral Disk Limits</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                    Configure thresholds to prevent worker VMs (e.g., GitHub Actions) from running out of disk space during massive batch playlist rips.
                </p>
                <div className="space-y-1 mt-4">
                    <label className="text-xs text-muted-foreground ml-1">Max Concurrent Rips per Worker</label>
                    <input type="number" defaultValue={2} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-1 mt-2">
                    <label className="text-xs text-muted-foreground ml-1">Abort threshold (Disk Free %)</label>
                    <input type="number" defaultValue={15} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none" />
                </div>
            </div>

            {/* Security */}
            <div className="p-6 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm space-y-4 md:col-span-2">
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                    <ShieldCheck className="text-green-400" size={20} />
                    <h4 className="text-white font-semibold">Credential Vault</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                    Store tokens and proxy credentials in the dedicated Relay Database Domain.
                </p>
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-lg border border-white/5 mt-4">
                    <div>
                        <span className="block text-sm text-white font-medium">Sync Configuration to Database</span>
                        <span className="block text-xs text-muted-foreground">Requires the Relay Server DatabaseManager to be online.</span>
                    </div>
                    <button
                      onClick={handleSync}
                      disabled={isSyncing || syncSuccess}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 disabled:opacity-80 disabled:cursor-not-allowed
                        ${syncSuccess
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-transparent'
                        }`}
                    >
                        {isSyncing ? (
                            <><Loader2 size={16} className="animate-spin" /> Syncing...</>
                        ) : syncSuccess ? (
                            <><Check size={16} /> Synced!</>
                        ) : (
                            'Sync Now'
                        )}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
