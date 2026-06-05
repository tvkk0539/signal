import React, { useState, useEffect, useRef } from 'react';
import { MessageType } from '@swarm/shared';
import type { FileItem, FileListRequestMessage, FileListResponseMessage, RemoteItem, RemoteListRequestMessage, RemoteListResponseMessage, FileDeleteRequestMessage, FileRenameRequestMessage, FileActionResponseMessage } from '@swarm/shared';
import { MediaPlayerModal } from '../media/MediaPlayerModal';
import { useAuthStore } from '../../store/authStore';
import { SocketManager } from '../../worker/SocketManager';
import { useProgressStore } from '../../store/progressStore';
import { useExplorerStore } from '../../store/explorerStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Folder, File, HardDrive, RefreshCw, ArrowUp, LayoutGrid, List as ListIcon, MoreVertical, Trash2, Copy, ArrowRight, Edit2, Play, Download, X, FolderPlus } from 'lucide-react';
import { MiniBrowser } from './MiniBrowser';

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

  // VFS Operations State
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [mediaPrompt, setMediaPrompt] = useState<FileItem | null>(null);
  const [renamePrompt, setRenamePrompt] = useState<FileItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [mkdirPrompt, setMkdirPrompt] = useState(false);
  const [mkdirValue, setMkdirValue] = useState('');
  const [targetPrompt, setTargetPrompt] = useState<{ type: 'MOVE' | 'COPY', paths: string[] } | null>(null);
  const [targetFs, setTargetFs] = useState<string>('/');
  const [targetPath, setTargetPath] = useState<string>('');

  // Advanced Transfer Options
  const [showAdvancedTransfer, setShowAdvancedTransfer] = useState(false);
  const [transferConfig, setTransferConfig] = useState({
     transfers: 4,
     checkers: 8,
     driveChunkSize: '64M',
     tpslimit: 10,
     serverSideAcrossConfigs: false
  });

  const socketManager = SocketManager.getInstance();
  const { pendingTargetFs, pendingTargetPath, clearExplorerTarget } = useExplorerStore();

  // Handle external navigation (e.g. from Apple Music Queue)
  useEffect(() => {
    if (pendingTargetFs && pendingTargetPath !== undefined) {
      setSelectedFs(pendingTargetFs);
      setCurrentPath(pendingTargetPath);
      clearExplorerTarget();
    }
  }, [pendingTargetFs, pendingTargetPath, clearExplorerTarget]);

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
    setSelectedFiles(new Set()); // clear selection on navigate

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

    const handleFileActionResponse = (msg: FileActionResponseMessage) => {
       if (msg.success) {
          fetchDirectory(selectedFs, currentPath); // Auto refresh
       } else {
          setError(`Action Failed: ${msg.error || msg.message}`);
       }
    };

    socketManager.on(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
    socketManager.on(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);
    socketManager.on(MessageType.FILE_ACTION_RESPONSE, handleFileActionResponse);

    return () => {
      socketManager.off(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
      socketManager.off(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);
      socketManager.off(MessageType.FILE_ACTION_RESPONSE, handleFileActionResponse);
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

  const handleSelectToggle = (e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>, path: string) => {
     e.stopPropagation();
     const next = new Set(selectedFiles);
     if (next.has(path)) next.delete(path);
     else next.add(path);
     setSelectedFiles(next);
  };

  const handleSelectAll = () => {
     if (selectedFiles.size === files.length) {
        setSelectedFiles(new Set());
     } else {
        setSelectedFiles(new Set(files.map(f => currentPath ? `${currentPath}/${f.Name}` : f.Name)));
     }
  };

  const handleRowClick = (item: FileItem) => {
    if (item.IsDir) {
      const newPath = currentPath === '' ? item.Name : `${currentPath}/${item.Name}`;
      setCurrentPath(newPath);
    } else {
      const isMedia = item.Name.endsWith('.mp4') || item.Name.endsWith('.webm') || item.Name.endsWith('.mkv');
      if (isMedia) {
         setMediaPrompt(item);
      } else {
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

  const handleBulkDelete = () => {
     if (!window.confirm(`Are you sure you want to permanently delete ${selectedFiles.size} items?`)) return;
     const payload: FileDeleteRequestMessage = {
        type: MessageType.FILE_DELETE_REQUEST,
        timestamp: Date.now(),
        workerId,
        fs: selectedFs,
        paths: Array.from(selectedFiles)
     };
     socketManager.emit(MessageType.FILE_DELETE_REQUEST, payload);
     setSelectedFiles(new Set());
  };

  const submitRename = () => {
     if (!renamePrompt || !renameValue) return;
     const oldPath = currentPath ? `${currentPath}/${renamePrompt.Name}` : renamePrompt.Name;
     const newPath = currentPath ? `${currentPath}/${renameValue}` : renameValue;

     const payload: FileRenameRequestMessage = {
        type: MessageType.FILE_RENAME_REQUEST,
        timestamp: Date.now(),
        workerId,
        fs: selectedFs,
        srcPath: oldPath,
        dstPath: newPath
     };
     socketManager.emit(MessageType.FILE_RENAME_REQUEST, payload);
     setRenamePrompt(null);
     setRenameValue('');
     setSelectedFiles(new Set());
  };

  const submitMkdir = () => {
     if (!mkdirValue) return;
     const newPath = currentPath ? `${currentPath}/${mkdirValue}` : mkdirValue;

     socketManager.emit(MessageType.FILE_MKDIR_REQUEST as any, {
        type: MessageType.FILE_MKDIR_REQUEST,
        timestamp: Date.now(),
        workerId,
        fs: selectedFs,
        path: newPath
     });
     setMkdirPrompt(false);
     setMkdirValue('');
  };

  const submitTargetAction = () => {
     if (!targetPrompt) return;
     const jobId = `vfs-${Date.now()}`;
     const payload = {
        type: targetPrompt.type === 'MOVE' ? MessageType.FILE_MOVE_REQUEST : MessageType.FILE_COPY_REQUEST,
        timestamp: Date.now(),
        workerId,
        jobId,
        srcFs: selectedFs,
        dstFs: targetFs,
        paths: targetPrompt.paths.map(p => ({
           src: p,
           dst: targetPath ? `${targetPath}/${p.split('/').pop()}` : (p.split('/').pop() || '')
        })),
        advancedConfig: {
           ...transferConfig
        }
     };

     // Optimistically show the task in the store so the user sees it immediately
     useProgressStore.getState().updateTaskProgress(jobId, workerId, 0, `Initializing ${targetPrompt.type.toLowerCase()}...`);

     socketManager.emit(payload.type, payload);
     setTargetPrompt(null);
     setSelectedFiles(new Set());
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
            <button
              onClick={() => setMkdirPrompt(true)}
              className="p-2 bg-secondary/80 hover:bg-background border border-border/50 rounded-lg text-muted-foreground hover:text-primary transition-colors"
              title="New Folder"
            >
              <FolderPlus size={18} />
            </button>
          </div>

          <div className="flex-1 bg-secondary/30 border border-border/50 rounded-lg px-4 py-2 font-mono text-sm text-muted-foreground flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <span className="text-primary font-bold">{selectedFs}</span>
            <span className="text-foreground truncate">{currentPath || '/'}</span>
          </div>

          {/* Action Toolbar */}
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${selectedFiles.size > 0 ? 'opacity-100 max-w-[500px]' : 'opacity-0 max-w-0'}`}>
            <div className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap">
               {selectedFiles.size} Selected
               <button onClick={() => setSelectedFiles(new Set())} className="hover:text-white transition-colors ml-1"><X size={14} /></button>
            </div>

            <div className="flex gap-1 bg-secondary/80 p-1 rounded-lg border border-border/50 backdrop-blur-md">
               <button onClick={handleBulkDelete} className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive transition-colors" title="Delete">
                 <Trash2 size={16} />
               </button>
               <button onClick={() => setTargetPrompt({ type: 'MOVE', paths: Array.from(selectedFiles) })} className="p-1.5 rounded-md hover:bg-background/80 text-blue-400 transition-colors" title="Move">
                 <ArrowRight size={16} />
               </button>
               <button onClick={() => setTargetPrompt({ type: 'COPY', paths: Array.from(selectedFiles) })} className="p-1.5 rounded-md hover:bg-background/80 text-green-400 transition-colors" title="Copy">
                 <Copy size={16} />
               </button>
               {selectedFiles.size === 1 && (
                  <button
                     onClick={() => {
                        const filePath = Array.from(selectedFiles)[0];
                        const fileName = filePath.split('/').pop() || '';
                        const item = files.find(f => f.Name === fileName);
                        if (item) {
                           setRenamePrompt(item);
                           setRenameValue(item.Name);
                        }
                     }}
                     className="p-1.5 rounded-md hover:bg-background/80 text-yellow-400 transition-colors" title="Rename"
                  >
                    <Edit2 size={16} />
                  </button>
               )}
            </div>
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
            <div className="flex flex-col h-full w-full">
               {/* List Header extracted from relative virtualizer to fix spacing overlap */}
               <div className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4 border-b border-border/50 pb-2 sticky top-0 z-10 bg-background/90 backdrop-blur-sm pt-2">
                 <div className="w-10 flex items-center justify-center">
                    <input
                       type="checkbox"
                       checked={selectedFiles.size === files.length && files.length > 0}
                       onChange={handleSelectAll}
                       className="cursor-pointer accent-primary"
                    />
                 </div>
                 <div className="w-10"></div>
                 <div className="flex-1">Name</div>
                 <div className="w-24 text-right">Size</div>
                 <div className="w-40 text-right">Modified</div>
                 <div className="w-10"></div>
               </div>

               <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                 {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                   const file = files[virtualItem.index];
                   const filePath = currentPath ? `${currentPath}/${file.Name}` : file.Name;
                   const isSelected = selectedFiles.has(filePath);

                   return (
                     <div
                       key={virtualItem.key}
                       onClick={() => handleRowClick(file)}
                       className={`absolute top-0 left-0 w-full flex items-center px-4 py-2 border-b border-border/30 cursor-pointer transition-colors group ${isSelected ? 'bg-primary/10' : 'hover:bg-white/5'}`}
                       style={{
                         height: `${virtualItem.size}px`,
                         transform: `translateY(${virtualItem.start}px)`,
                       }}
                     >
                     <div className="w-10 flex items-center justify-center">
                        <input
                           type="checkbox"
                           checked={isSelected}
                           onChange={(e) => handleSelectToggle(e, filePath)}
                           onClick={(e) => e.stopPropagation()}
                           className="cursor-pointer accent-primary w-4 h-4"
                        />
                     </div>
                     <div className="w-10 text-muted-foreground flex justify-center group-hover:text-primary transition-colors">
                        {file.IsDir ? <Folder size={18} /> : <File size={18} />}
                     </div>
                     <div className={`flex-1 truncate text-sm pr-4 ${isSelected ? 'text-primary font-medium' : 'text-foreground'}`}>
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
            </div>
          )}

          {viewMode === 'GRID' && files.length > 0 && (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {files.map(file => {
                   const filePath = currentPath ? `${currentPath}/${file.Name}` : file.Name;
                   const isSelected = selectedFiles.has(filePath);

                   return (
                     <div
                       key={file.ID || file.Name}
                       onClick={() => handleRowClick(file)}
                       className={`relative bg-card border hover:border-primary/50 hover:bg-secondary/30 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(170,59,255,0.15)] group ${isSelected ? 'border-primary ring-1 ring-primary shadow-[0_0_15px_rgba(170,59,255,0.2)]' : 'border-border'}`}
                     >
                       <div className="absolute top-2 left-2 z-10">
                          <input
                             type="checkbox"
                             checked={isSelected}
                             onChange={(e) => handleSelectToggle(e, filePath)}
                             onClick={(e) => e.stopPropagation()}
                             className="cursor-pointer accent-primary w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                             style={{ opacity: isSelected ? 1 : undefined }}
                          />
                       </div>
                       <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300">
                          {file.IsDir ? <Folder size={32} /> : <File size={32} />}
                       </div>
                       <div className="text-center w-full">
                          <div className={`text-sm truncate w-full font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`} title={file.Name}>
                             {file.Name}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                             {file.IsDir ? 'Directory' : formatBytes(file.Size)}
                          </div>
                       </div>
                     </div>
                   );
                })}
             </div>
          )}

        </div>
      </div>

      {/* Target Directory Prompt (Move/Copy) */}
      {targetPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-card border border-border/50 rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-foreground mb-4">
                 {targetPrompt.type === 'MOVE' ? 'Move' : 'Copy'} {targetPrompt.paths.length} item(s)
              </h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Target Remote</label>
                    <select
                      value={targetFs}
                      onChange={e => setTargetFs(e.target.value)}
                      className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded-lg p-2 outline-none"
                    >
                      {remotes.map(remote => (
                        <option key={remote.name} value={remote.name}>
                          {remote.name === '/' ? 'Local Machine (/)' : `${remote.name} (${remote.type})`}
                        </option>
                      ))}
                      {remotes.length === 0 && <option value="/">Local Machine (/)</option>}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Target Destination Path</label>
                    <MiniBrowser
                      workerId={workerId}
                      targetFs={targetFs}
                      onPathSelect={setTargetPath}
                    />
                    <div className="mt-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">Selected:</span>
                      <span className="truncate font-mono bg-black/20 px-2 py-0.5 rounded border border-border/30 w-full">
                         {targetFs}{targetFs === '/' ? '' : ':'}{targetPath || '/'}
                      </span>
                    </div>
                 </div>
              </div>

              {/* Advanced Transfer Settings Panel */}
              <div className="mt-4 border-t border-border/50 pt-4">
                 <button
                   onClick={() => setShowAdvancedTransfer(!showAdvancedTransfer)}
                   className="flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
                 >
                   {showAdvancedTransfer ? 'Hide Advanced Options' : 'Show Advanced Transfer Options (Swarm Parallelism)'}
                 </button>

                 <div className={`overflow-hidden transition-all duration-300 ${showAdvancedTransfer ? 'max-h-[300px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Parallel Transfers</label>
                          <input
                            type="number" min="1" max="64"
                            value={transferConfig.transfers}
                            onChange={(e) => setTransferConfig({...transferConfig, transfers: parseInt(e.target.value) || 4})}
                            className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded p-1.5 outline-none"
                          />
                       </div>
                       <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Parallel Checkers</label>
                          <input
                            type="number" min="1" max="64"
                            value={transferConfig.checkers}
                            onChange={(e) => setTransferConfig({...transferConfig, checkers: parseInt(e.target.value) || 8})}
                            className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded p-1.5 outline-none"
                          />
                       </div>
                       <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Drive Chunk Size</label>
                          <input
                            type="text"
                            value={transferConfig.driveChunkSize}
                            onChange={(e) => setTransferConfig({...transferConfig, driveChunkSize: e.target.value})}
                            className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded p-1.5 outline-none"
                          />
                       </div>
                       <div>
                          <label className="text-xs text-muted-foreground mb-1 block">TPS Limit</label>
                          <input
                            type="number" min="1" max="100"
                            value={transferConfig.tpslimit}
                            onChange={(e) => setTransferConfig({...transferConfig, tpslimit: parseInt(e.target.value) || 10})}
                            className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded p-1.5 outline-none"
                          />
                       </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between bg-secondary/50 p-2 rounded border border-border/50">
                       <div>
                          <span className="text-sm font-semibold text-foreground block">Server-Side Cloud Copy</span>
                          <span className="text-[10px] text-muted-foreground">Attempts zero-bandwidth transfer. Requires identical cloud providers.</span>
                       </div>
                       <input
                          type="checkbox"
                          checked={transferConfig.serverSideAcrossConfigs}
                          onChange={(e) => setTransferConfig({...transferConfig, serverSideAcrossConfigs: e.target.checked})}
                          className="w-4 h-4 accent-primary cursor-pointer"
                       />
                    </div>
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setTargetPrompt(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                 <button onClick={submitTargetAction} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-lg transition-colors shadow-[0_0_10px_rgba(170,59,255,0.3)]">Confirm Action</button>
              </div>
           </div>
        </div>
      )}

      {/* Mkdir Prompt */}
      {mkdirPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-card border border-border/50 rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-foreground mb-4">Create New Folder</h3>
              <div>
                 <input
                    type="text"
                    value={mkdirValue}
                    onChange={e => setMkdirValue(e.target.value)}
                    placeholder="Folder Name"
                    autoFocus
                    className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded-lg p-2 outline-none"
                 />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setMkdirPrompt(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                 <button onClick={submitMkdir} disabled={!mkdirValue} className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50">Create</button>
              </div>
           </div>
        </div>
      )}

      {/* Rename Prompt */}
      {renamePrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-card border border-border/50 rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-foreground mb-4">Rename Item</h3>
              <div>
                 <input
                    type="text"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    autoFocus
                    className="w-full bg-secondary text-sm text-foreground border border-border/50 rounded-lg p-2 outline-none"
                 />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button onClick={() => setRenamePrompt(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                 <button onClick={submitRename} disabled={!renameValue || renameValue === renamePrompt.Name} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg transition-colors disabled:opacity-50">Rename</button>
              </div>
           </div>
        </div>
      )}

      {/* Media Action Prompt */}
      {mediaPrompt && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-card border border-border/50 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-foreground truncate pr-4">{mediaPrompt.Name}</h3>
                 <button onClick={() => setMediaPrompt(null)} className="text-muted-foreground hover:text-destructive"><X size={20}/></button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">How would you like to handle this media file?</p>

              <div className="flex flex-col gap-3">
                 <button
                    onClick={() => {
                       setPlayingMedia({
                         fs: selectedFs,
                         path: currentPath === '' ? mediaPrompt.Name : `${currentPath}/${mediaPrompt.Name}`,
                         action: 'PLAY'
                       });
                       setMediaPrompt(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(170,59,255,0.2)]"
                 >
                    <Play size={18} fill="currentColor" /> Stream Now (Zero-Disk)
                 </button>

                 <button
                    onClick={() => {
                       setPlayingMedia({
                         fs: selectedFs,
                         path: currentPath === '' ? mediaPrompt.Name : `${currentPath}/${mediaPrompt.Name}`,
                         action: 'DOWNLOAD'
                       });
                       setMediaPrompt(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-secondary hover:bg-secondary/80 text-foreground border border-border/50 rounded-xl font-bold transition-all"
                 >
                    <Download size={18} /> Download P2P Bypass
                 </button>
              </div>
           </div>
        </div>
      )}

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
