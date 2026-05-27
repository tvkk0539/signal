import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { ChatMessage, OfflineFileUploadRequestMessage } from '@swarm/shared';
import { useAuthStore } from '../../store/authStore';
import { WebRTCManager } from './WebRTCManager';

interface ChatBoxProps {
  socket: Socket | null;
  targetId: string; // Could be another UI user or a worker
  isOnline: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ socket, targetId, isOnline }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize WebRTC Manager when component mounts
  const rtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    if (socket && user) {
      rtcManager.current = new WebRTCManager(socket, user.id);
    }
    return () => {
      if (rtcManager.current) {
        rtcManager.current.close();
      }
    };
  }, [socket, user]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (msg: ChatMessage) => {
      // Only accept messages meant for this user, or sent from this user to the target
      if (msg.targetId === user?.id || (msg.senderId === user?.id && msg.targetId === targetId)) {
         setMessages(prev => [...prev, msg]);
      }
    };

    socket.on(MessageType.CHAT_MESSAGE, handleIncomingMessage);

    return () => {
      socket.off(MessageType.CHAT_MESSAGE, handleIncomingMessage);
    };
  }, [socket, targetId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !user) return;

    const payload: ChatMessage = {
      type: MessageType.CHAT_MESSAGE,
      timestamp: Date.now(),
      senderId: user.id,
      targetId: targetId,
      encryptedPayload: inputText, // Simplified for MVP. Needs actual E2EE wrapper.
      hasAttachment: false
    };

    socket.emit(MessageType.CHAT_MESSAGE, payload);
    setMessages(prev => [...prev, payload]);
    setInputText('');
  };

  const handleFileAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !user) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    const systemMsg: ChatMessage = {
      type: MessageType.CHAT_MESSAGE,
      timestamp: Date.now(),
      senderId: user.id,
      targetId: targetId,
      encryptedPayload: `Preparing to send file: ${file.name} (${formatBytes(file.size)})...`,
      hasAttachment: false,
      isSystemMessage: true
    };
    setMessages(prev => [...prev, systemMsg]);

    if (isOnline && rtcManager.current) {
      // Phase 3: WebRTC P2P (Relay Bypass)
      console.log(`[Chat] Target is online. Initiating WebRTC Relay Bypass...`);
      rtcManager.current.initiateFileTransfer(targetId, file);
    } else {
      // Phase 3: Cloud Worker Handoff
      console.log(`[Chat] Target is offline. Initiating Cloud Worker Handoff...`);

      // For MVP, we read as DataURL to easily base64 transport.
      // In prod, this must be chunked or streamed to avoid UI lockups.
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;

        const payload: OfflineFileUploadRequestMessage = {
           type: MessageType.OFFLINE_FILE_UPLOAD_REQUEST,
           timestamp: Date.now(),
           senderId: user.id,
           targetId: targetId,
           fileName: file.name,
           fileSize: file.size,
           fileBuffer: base64Data
        };

        socket.emit(MessageType.OFFLINE_FILE_UPLOAD_REQUEST, payload);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #444', overflow: 'hidden' }}>
      {/* Chat Header */}
      <div style={{ padding: '15px', backgroundColor: '#252526', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: 'white' }}>Chatting with: </strong>
          <span style={{ fontFamily: 'monospace', color: '#4a90e2' }}>{targetId || 'Select a user'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
           <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isOnline ? '#2ecc71' : '#e74c3c' }} />
           <span style={{ color: '#aaa', fontSize: '12px' }}>{isOnline ? 'Online (P2P Ready)' : 'Offline (Cloud Handoff)'}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', marginTop: 'auto', marginBottom: 'auto' }}>
            No messages yet. Send a message to start the secure conversation.
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;

            if (msg.isSystemMessage) {
              return (
                <div key={index} style={{ textAlign: 'center', margin: '10px 0' }}>
                   <span style={{ backgroundColor: '#333', color: '#aaa', padding: '4px 12px', borderRadius: '12px', fontSize: '12px' }}>
                     {msg.encryptedPayload}
                   </span>
                </div>
              );
            }

            return (
              <div key={index} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                <div style={{
                  backgroundColor: isMe ? '#0078d4' : '#3c3c3c',
                  color: 'white',
                  padding: '10px 15px',
                  borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0',
                  wordBreak: 'break-word'
                }}>
                  {msg.encryptedPayload}
                </div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '15px', backgroundColor: '#252526', borderTop: '1px solid #444' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleFileAttachClick}
            disabled={!targetId}
            style={{ padding: '0 15px', backgroundColor: '#3c3c3c', color: 'white', border: '1px solid #555', borderRadius: '20px', cursor: targetId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Attach File (Relay Bypass)"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={targetId ? "Type a secure message..." : "Select a user to chat"}
            disabled={!targetId}
            style={{ flex: 1, padding: '12px 15px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #555', borderRadius: '20px', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={!targetId || !inputText.trim()}
            style={{ padding: '0 20px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '20px', cursor: (targetId && inputText.trim()) ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
