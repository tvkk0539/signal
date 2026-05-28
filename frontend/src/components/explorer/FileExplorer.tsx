import React, { useState, useEffect, useRef } from 'react';
import { MessageType } from '@swarm/shared';
import type { FileItem, FileListRequestMessage, FileListResponseMessage, RemoteItem, RemoteListRequestMessage, RemoteListResponseMessage } from '@swarm/shared';
import { MediaPlayerModal } from '../media/MediaPlayerModal';
import { useAuthStore } from '../../store/authStore';
import { SocketManager } from '../../worker/SocketManager';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Folder, File, HardDrive, RefreshCw, ArrowUp, LayoutGrid, List as ListIcon, MoreVertical } from 'lucide-react';

interface FileExplorerProps {
  isConnected: boolean;
  workerId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ isConnected, workerId }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [remotes, setRemotes] = useState<RemoteItem[]>([]);
  const [selectedFs, setSelectedFs] = useState<string>('/');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const socketManager = SocketManager.getInstance();

  // Fetch Available Remotes when the worker changes
  useEffect(() => {
    if (!isConnected || !workerId) return;

    console.log(`[UI] Requesting remotes list from worker ${workerId}`);
    const payload: RemoteListRequestMessage = {
      type: MessageType.REMOTE_LIST_REQUEST,
      timestamp: Date.now(),
      workerId
    };
    socketManager.emit(MessageType.REMOTE_LIST_REQUEST, payload);
  }, [isConnected, workerId]);

  const fetchDirectory = (fs: string, path: string) => {
    if (!isConnected || !workerId) return;

    setLoading(true);
    setError(null);
    setFiles([]); // clear current files

    const payload: FileListRequestMessage = {
      type: MessageType.FILE_LIST_REQUEST,
      timestamp: Date.now(),
      workerId,
      directory: path,
      fs: fs
    };

    console.log(`[UI] Requesting directory: ${path} on fs: ${fs} from worker ${workerId}`);
    socketManager.emit(MessageType.FILE_LIST_REQUEST, payload);
  };

  useEffect(() => {
    if (isConnected && workerId && selectedFs) {
      fetchDirectory(selectedFs, currentPath);
    }
  }, [isConnected, workerId, currentPath, selectedFs]);

  useEffect(() => {
    const handleFileListResponse = (msg: FileListResponseMessage) => {
      // Only process the response if it matches the current worker and requested path and fs
      if (msg.workerId === workerId && msg.directory === currentPath && msg.fs === selectedFs) {
        setLoading(false);
        if (msg.error) {
          setError(msg.error);
          setFiles([]);
        } else {
          setError(null);
          setFiles(msg.files || []);
        }
      }
    };

    const handleRemoteListResponse = (msg: RemoteListResponseMessage) => {
      if (msg.workerId === workerId) {
        if (msg.error) {
          console.error(`[UI] Error fetching remotes: ${msg.error}`);
        } else {
          setRemotes(msg.remotes || []);
          // If the currently selected FS isn't in the list, default back to local '/'
          if (!msg.remotes.find(r => r.name === selectedFs)) {
            setSelectedFs('/');
            setCurrentPath('');
          }
        }
      }
    };

    socketManager.on(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
    socketManager.on(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);

    return () => {
      socketManager.off(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
      socketManager.off(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);
    };
  }, [workerId, currentPath, selectedFs]);

  const handleNavigateUp = () => {
    if (currentPath === '' || currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop(); // remove last segment
    const newPath = parts.join('/');
    setCurrentPath(newPath);
  };

  const handleRefresh = () => {
    fetchDirectory(selectedFs, currentPath);
  };

  const handleFsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFs(e.target.value);
    setCurrentPath(''); // Reset path to root when changing file systems
  };

  const [playingMedia, setPlayingMedia] = useState<{ fs: string; path: string; action: 'PLAY' | 'DOWNLOAD' } | null>(null);

  const handleRowClick = (item: FileItem) => {
    if (item.IsDir) {
      const newPath = currentPath === '' ? item.Name : `${currentPath}/${item.Name}`;
      setCurrentPath(newPath);
    } else {
      // If it's a media file (basic check for MVP), open the Phase 4 Media Player
      const isMedia = item.Name.endsWith('.mp4') || item.Name.endsWith('.webm') || item.Name.endsWith('.mkv');
      if (isMedia) {
         setPlayingMedia({
           fs: selectedFs,
           path: currentPath === '' ? item.Name : `${currentPath}/${item.Name}`,
           action: 'PLAY'
         });
      } else {
         // Initiate a P2P download instead of just showing an alert
         if (window.confirm(`Do you want to download ${item.Name} (${formatBytes(item.Size)}) via P2P Relay Bypass?`)) {
            setPlayingMedia({
               fs: selectedFs,
               path: currentPath === '' ? item.Name : `${currentPath}/${item.Name}`,
               action: 'DOWNLOAD'
            });
         }
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === -1) return '--';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Height of list row
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full bg-card/20 rounded-2xl border border-border/50 shadow-2xl overflow-hidden backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="p-4 bg-background/50 border-b border-border/50 flex flex-col gap-4 backdrop-blur-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(170,59,255,0.2)]">
               <HardDrive size={20} />
             </div>
             <div>
               <h2 className="text-lg font-semibold text-foreground m-0 leading-tight">Virtual File System</h2>
               <div className="text-xs text-muted-foreground flex items-center gap-2">
                 Worker: <span className="font-mono text-primary">{workerId.substring(0,8)}...</span>
               </div>
             </div>
          </div>

          {/* Cloud Remote Selector */}
          <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-lg border border-border/50">
            <select
              value={selectedFs}
              onChange={handleFsChange}
              className="bg-transparent text-sm text-foreground outline-none cursor-pointer px-2"
            >
              {remotes.map(remote => (
                <option key={remote.name} value={remote.name} className="bg-background">
                  {remote.name === '/' ? 'Local Machine (/)' : `${remote.name} (${remote.type})`}
                </option>
              ))}
              {remotes.length === 0 && <option value="/">Local Machine (/)</option>}
            </select>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
            <button
              onClick={handleNavigateUp}
              disabled={currentPath === '' || currentPath === '/'}
              className="p-1.5 rounded-md hover:bg-background/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-muted-foreground hover:text-foreground"
              title="Navigate Up"
            >
              <ArrowUp size={18} />
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-1.5 rounded-md hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground ${loading ? 'animate-spin text-primary' : ''}`}
              title="Refresh Directory"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="flex-1 bg-secondary/30 border border-border/50 rounded-lg px-4 py-2 font-mono text-sm text-muted-foreground flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="text-primary font-bold">{selectedFs}</span>
            <span className="text-foreground truncate">{currentPath || '/'}</span>
          </div>

          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
             <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
             >
                <ListIcon size={18} />
             </button>
             <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'GRID' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
             >
                <LayoutGrid size={18} />
             </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* File Area */}
      <div className="flex-1 overflow-hidden relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">

        {loading && files.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <RefreshCw size={32} className="animate-spin text-primary mb-4" />
            <div className="text-muted-foreground font-mono text-sm tracking-widest uppercase">Scanning Virtual File System...</div>
          </div>
        )}

        <div ref={parentRef} className="h-full w-full overflow-auto p-4 custom-scrollbar">

          {files.length === 0 && !loading && !error && (
             <div className="h-full flex items-center justify-center text-muted-foreground italic border-2 border-dashed border-border/30 rounded-xl p-8">
                This directory is empty.
             </div>
          )}

          {viewMode === 'LIST' && files.length > 0 && (
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
               {/* List Header (Sticky logic can be complex with virtualizers, we'll keep it simple for now) */}
               <div className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4 border-b border-border/50 pb-2">
                 <div className="w-10"></div>
                 <div className="flex-1">Name</div>
                 <div className="w-24 text-right">Size</div>
                 <div className="w-40 text-right">Modified</div>
                 <div className="w-10"></div>
               </div>

               {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                 const file = files[virtualItem.index];
                 return (
                   <div
                     key={virtualItem.key}
                     onClick={() => handleRowClick(file)}
                     className="absolute top-0 left-0 w-full flex items-center px-4 py-2 border-b border-border/30 hover:bg-white/5 cursor-pointer transition-colors group"
                     style={{
                       height: `${virtualItem.size}px`,
                       transform: `translateY(${virtualItem.start}px)`,
                     }}
                   >
                     <div className="w-10 text-muted-foreground flex justify-center group-hover:text-primary transition-colors">
                        {file.IsDir ? <Folder size={18} /> : <File size={18} />}
                     </div>
                     <div className="flex-1 truncate text-sm text-foreground pr-4">
                        {file.Name}
                     </div>
                     <div className="w-24 text-right text-xs text-muted-foreground font-mono">
                        {file.IsDir ? '--' : formatBytes(file.Size)}
                     </div>
                     <div className="w-40 text-right text-xs text-muted-foreground">
                        {new Date(file.ModTime).toLocaleDateString()} {new Date(file.ModTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </div>
                     <div className="w-10 flex justify-end">
                        <button className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all">
                           <MoreVertical size={16} />
                        </button>
                     </div>
                   </div>
                 );
               })}
            </div>
          )}

          {viewMode === 'GRID' && files.length > 0 && (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {files.map(file => (
                   <div
                     key={file.ID || file.Name}
                     onClick={() => handleRowClick(file)}
                     className="bg-card border border-border hover:border-primary/50 hover:bg-secondary/30 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(170,59,255,0.15)] group"
                   >
                     <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300">
                        {file.IsDir ? <Folder size={32} /> : <File size={32} />}
                     </div>
                     <div className="text-center w-full">
                        <div className="text-sm text-foreground truncate w-full font-medium" title={file.Name}>
                           {file.Name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                           {file.IsDir ? 'Directory' : formatBytes(file.Size)}
                        </div>
                     </div>
                   </div>
                ))}
             </div>
          )}

        </div>
      </div>

      {/* Phase 4: MediaPlayer/Downloader Modal */}
      {playingMedia && (
        <MediaPlayerModal
           workerId={workerId}
           fs={playingMedia.fs}
           path={playingMedia.path}
           action={playingMedia.action}
           userId={useAuthStore.getState().user?.id || 'unknown'}
           onClose={() => setPlayingMedia(null)}
        />
      )}
    </div>
  );
};
