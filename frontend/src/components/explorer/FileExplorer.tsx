import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { FileItem, FileListRequestMessage, FileListResponseMessage } from '@swarm/shared';

interface FileExplorerProps {
  socket: Socket | null;
  isConnected: boolean;
  workerId: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ socket, isConnected, workerId }) => {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = (path: string) => {
    if (!socket || !isConnected || !workerId) return;

    setLoading(true);
    setError(null);
    setFiles([]); // clear current files

    const payload: FileListRequestMessage = {
      type: MessageType.FILE_LIST_REQUEST,
      timestamp: Date.now(),
      workerId,
      directory: path
    };

    console.log(`[UI] Requesting directory: ${path} from worker ${workerId}`);
    socket.emit(MessageType.FILE_LIST_REQUEST, payload);
  };

  useEffect(() => {
    if (isConnected && workerId) {
      fetchDirectory(currentPath);
    }
  }, [isConnected, workerId, currentPath]);

  useEffect(() => {
    if (!socket) return;

    const handleFileListResponse = (msg: FileListResponseMessage) => {
      // Only process the response if it matches the current worker and requested path
      if (msg.workerId === workerId && msg.directory === currentPath) {
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

    socket.on(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);

    return () => {
      socket.off(MessageType.FILE_LIST_RESPONSE, handleFileListResponse);
    };
  }, [socket, workerId, currentPath]);

  const handleNavigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop(); // remove last segment
    const newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    setCurrentPath(newPath);
  };

  const handleRefresh = () => {
    fetchDirectory(currentPath);
  };

  const handleRowClick = (item: FileItem) => {
    if (item.IsDir) {
      const newPath = currentPath === '/' ? `/${item.Name}` : `${currentPath}/${item.Name}`;
      setCurrentPath(newPath);
    } else {
      alert(`File Details:\nName: ${item.Name}\nSize: ${formatBytes(item.Size)}\nModified: ${new Date(item.ModTime).toLocaleString()}`);
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
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', minWidth: '600px', backgroundColor: '#f9f9f9', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>File Explorer</h2>
        <div style={{ fontSize: '14px', color: '#666' }}>Worker: <span style={{ fontFamily: 'monospace' }}>{workerId}</span></div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <button onClick={handleNavigateUp} disabled={currentPath === '/'} style={{ padding: '8px 12px', cursor: currentPath === '/' ? 'not-allowed' : 'pointer' }}>
          ⬆️ Up
        </button>
        <button onClick={handleRefresh} disabled={loading} style={{ padding: '8px 12px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          🔄 Refresh
        </button>
        <div style={{ flex: 1, padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentPath}
        </div>
      </div>

      {loading && <div style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic', color: '#666' }}>Loading directory contents...</div>}

      {error && <div style={{ padding: '20px', textAlign: 'center', color: 'red', border: '1px solid red', backgroundColor: '#fee' }}>Error: {error}</div>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left', backgroundColor: '#eee' }}>
              <th style={{ padding: '12px 8px', width: '50px', textAlign: 'center' }}>Type</th>
              <th style={{ padding: '12px 8px' }}>Name</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Size</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Modified</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Empty directory</td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.ID || file.Name} onClick={() => handleRowClick(file)} style={{ borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')} onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '18px' }}>{file.IsDir ? '📁' : '📄'}</td>
                  <td style={{ padding: '12px 8px', wordBreak: 'break-all' }}>{file.Name}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#666' }}>{file.IsDir ? '--' : formatBytes(file.Size)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#666', fontSize: '14px' }}>{new Date(file.ModTime).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
