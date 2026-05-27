import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { FileItem, FileListRequestMessage, FileListResponseMessage, RemoteItem, RemoteListRequestMessage, RemoteListResponseMessage } from '@swarm/shared';
import { MediaPlayerModal } from '../media/MediaPlayerModal';
import { useAuthStore } from '../../store/authStore';

interface FileExplorerProps {
  socket: Socket | null;
  isConnected: boolean;
  workerId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ socket, isConnected, workerId }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [remotes, setRemotes] = useState<RemoteItem[]>([]);
  const [selectedFs, setSelectedFs] = useState<string>('/');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Available Remotes when the worker changes
  useEffect(() => {
    if (!socket || !isConnected || !workerId) return;

    console.log(`[UI] Requesting remotes list from worker ${workerId}`);
    const payload: RemoteListRequestMessage = {
      type: MessageType.REMOTE_LIST_REQUEST,
      timestamp: Date.now(),
      workerId
    };
    socket.emit(MessageType.REMOTE_LIST_REQUEST, payload);
  }, [socket, isConnected, workerId]);

  const fetchDirectory = (fs: string, path: string) => {
    if (!socket || !isConnected || !workerId) return;

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
    socket.emit(MessageType.FILE_LIST_REQUEST, payload);
  };

  useEffect(() => {
    if (isConnected && workerId && selectedFs) {
      fetchDirectory(selectedFs, currentPath);
    }
  }, [isConnected, workerId, currentPath, selectedFs]);

  useEffect(() => {
    if (!socket) return;

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

    socket.on(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
    socket.on(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);

    return () => {
      socket.off(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
      socket.off(MessageType.REMOTE_LIST_RESPONSE, handleRemoteListResponse);
    };
  }, [socket, workerId, currentPath, selectedFs]);

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

  const [playingMedia, setPlayingMedia] = useState<{ fs: string; path: string } | null>(null);

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
           path: currentPath === '' ? item.Name : `${currentPath}/${item.Name}`
         });
      } else {
        alert(`File Details:\nName: ${item.Name}\nSize: ${formatBytes(item.Size)}\nModified: ${new Date(item.ModTime).toLocaleString()}`);
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

  return (
    <div style={{ padding: '20px', border: '1px solid #333', borderRadius: '8px', minWidth: '600px', backgroundColor: '#2d2d30', color: '#eee', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #444' }}>
        <h2 style={{ margin: 0 }}>File Explorer</h2>

        {/* Cloud Remote Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px', color: '#aaa' }}>Cloud Remote:</label>
          <select
            value={selectedFs}
            onChange={handleFsChange}
            style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#3c3c3c', color: 'white', border: '1px solid #555', cursor: 'pointer', outline: 'none' }}
          >
            {remotes.map(remote => (
              <option key={remote.name} value={remote.name}>
                {remote.name === '/' ? 'Local Machine (/)' : `${remote.name} (${remote.type})`}
              </option>
            ))}
            {remotes.length === 0 && <option value="/">Local Machine (/)</option>}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <button
          onClick={handleNavigateUp}
          disabled={currentPath === '' || currentPath === '/'}
          style={{ padding: '8px 15px', cursor: (currentPath === '' || currentPath === '/') ? 'not-allowed' : 'pointer', backgroundColor: '#0e639c', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          ⬆️ Up
        </button>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{ padding: '8px 15px', cursor: loading ? 'not-allowed' : 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
        >
          🔄 Refresh
        </button>
        <div style={{ flex: 1, padding: '8px 12px', backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ccc' }}>
          {selectedFs}{currentPath}
        </div>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic', color: '#666' }}>Loading directory contents...</div>}

      {error && <div style={{ padding: '20px', textAlign: 'center', color: 'red', border: '1px solid red', backgroundColor: '#fee' }}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#252526', color: '#ccc' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#333', zIndex: 1 }}>
              <tr style={{ borderBottom: '1px solid #555', textAlign: 'left' }}>
                <th style={{ padding: '12px 15px', width: '50px', textAlign: 'center' }}>Type</th>
                <th style={{ padding: '12px 15px' }}>Name</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Size</th>
                <th style={{ padding: '12px 15px', textAlign: 'right' }}>Modified</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>Empty directory</td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr
                    key={file.ID || file.Name}
                    onClick={() => handleRowClick(file)}
                    style={{ borderBottom: '1px solid #333', cursor: 'pointer', transition: 'background-color 0.1s' }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2a2d2e')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 15px', textAlign: 'center', fontSize: '18px' }}>{file.IsDir ? '📁' : '📄'}</td>
                    <td style={{ padding: '12px 15px', wordBreak: 'break-all' }}>{file.Name}</td>
                    <td style={{ padding: '12px 15px', textAlign: 'right', color: '#999' }}>{file.IsDir ? '--' : formatBytes(file.Size)}</td>
                    <td style={{ padding: '12px 15px', textAlign: 'right', color: '#999', fontSize: '14px' }}>{new Date(file.ModTime).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Phase 4: MediaPlayer Modal */}
      {playingMedia && (
        <MediaPlayerModal
           socket={socket}
           workerId={workerId}
           fs={playingMedia.fs}
           path={playingMedia.path}
           userId={useAuthStore.getState().user?.id || 'unknown'}
           onClose={() => setPlayingMedia(null)}
        />
      )}
    </div>
  );
};
