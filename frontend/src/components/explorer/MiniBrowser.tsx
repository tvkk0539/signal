import React, { useState, useEffect } from 'react';
import { ChevronRight, Folder, RefreshCw, ChevronLeft } from 'lucide-react';
import { SocketManager } from '../../worker/SocketManager';
import { MessageType } from '@swarm/shared';
import type { FileListRequestMessage } from '@swarm/shared';

interface MiniBrowserProps {
  workerId: string;
  targetFs: string;
  onPathSelect: (path: string) => void;
}

export const MiniBrowser: React.FC<MiniBrowserProps> = ({ workerId, targetFs, onPathSelect }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketManager = SocketManager.getInstance();

  const fetchContents = (path: string) => {
    setLoading(true);
    setError(null);
    const payload: FileListRequestMessage = {
      type: MessageType.FILE_LIST_REQUEST,
      timestamp: Date.now(),
      workerId,
      fs: targetFs,
      directory: path
    };
    socketManager.emit(MessageType.FILE_LIST_REQUEST, payload);
  };

  useEffect(() => {
    // Reset path when filesystem changes
    setCurrentPath('');
    fetchContents('');
  }, [targetFs]);

  useEffect(() => {
    const handleResponse = (data: any) => {
      // Ensure this response is for our mini browser request by checking fs
      if (data.fs === targetFs) {
        setLoading(false);
        if (data.error) {
           setError(data.error);
        } else {
           // We only care about directories in the mini browser
           const dirs = (data.files || []).filter((f: any) => f.IsDir);
           setItems(dirs);
        }
      }
    };

    socketManager.on(MessageType.FILE_LIST_RESPONSE, handleResponse);
    return () => {
      socketManager.off(MessageType.FILE_LIST_RESPONSE, handleResponse);
    };
  }, [targetFs, currentPath, onPathSelect]);

  const handleNavigate = (folderName: string) => {
    const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    setCurrentPath(newPath);
    fetchContents(newPath);
  };

  const handleGoUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/');
    setCurrentPath(newPath);
    fetchContents(newPath);
  };

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div className="flex flex-col border border-border/50 rounded-lg overflow-hidden bg-background/50 h-64">
      {/* Mini Browser Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-secondary/30 border-b border-border/50 text-xs text-muted-foreground">
        <button
          onClick={handleGoUp}
          disabled={!currentPath}
          className="p-1 hover:bg-white/10 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => fetchContents(currentPath)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>

        <div className="flex-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide px-1">
          <span className="cursor-pointer hover:text-foreground transition-colors font-medium" onClick={() => { setCurrentPath(''); fetchContents(''); }}>
            {targetFs === '/' ? 'Root' : targetFs}
          </span>
          {breadcrumbs.map((crumb, idx) => {
             const pathToHere = breadcrumbs.slice(0, idx + 1).join('/');
             return (
               <React.Fragment key={pathToHere}>
                 <ChevronRight size={12} className="opacity-50 flex-shrink-0" />
                 <span
                   className="cursor-pointer hover:text-foreground transition-colors truncate max-w-[100px]"
                   title={crumb}
                   onClick={() => { setCurrentPath(pathToHere); fetchContents(pathToHere); }}
                 >
                   {crumb}
                 </span>
               </React.Fragment>
             );
          })}
        </div>
      </div>

      {/* Selection Toolbar */}
      <div className="p-2 border-b border-border/50 bg-black/20 flex justify-between items-center">
         <div className="text-xs text-muted-foreground truncate flex-1 mr-2">
            Selected: <span className="text-white font-mono">{currentPath || '/'}</span>
         </div>
         <button
           onClick={() => onPathSelect(currentPath)}
           className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 transition-colors"
         >
           Select This Folder
         </button>
      </div>

      {/* Directory List */}
      <div className="flex-1 overflow-y-auto p-1">
        {loading && items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-xs text-destructive text-center p-4">{error}</div>
        ) : items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic opacity-50">Empty Folder</div>
        ) : (
          <div className="space-y-0.5">
            {items.map(dir => (
              <div
                key={dir.Path}
                onClick={() => handleNavigate(dir.Name)}
                className="flex items-center gap-2 p-2 text-xs text-foreground hover:bg-primary/20 cursor-pointer rounded transition-colors"
              >
                <Folder size={14} className="text-primary" />
                <span className="truncate">{dir.Name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
