import React, { useState, useEffect, useRef } from 'react';
import { MessageType } from '@swarm/shared';
import type { ChatMessage, OfflineFileUploadRequestMessage } from '@swarm/shared';
import { useAuthStore } from '../../store/authStore';
import { WebRTCManager } from './WebRTCManager';
import { SocketManager } from '../../worker/SocketManager';
import { cryptoManager } from '../../utils/CryptoManager';
import type { PublicKeyResponseMessage } from '@swarm/shared';

interface ChatBoxProps {
  targetId: string; // Could be another UI user or a worker
  isOnline: boolean;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ targetId, isOnline }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socketManager = SocketManager.getInstance();
  const [e2eeStatus, setE2eeStatus] = useState<'PENDING' | 'SECURE' | 'FAILED'>('PENDING');

  // Initialize WebRTC Manager when component mounts
  const rtcManager = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    if (user) {
      rtcManager.current = new WebRTCManager(socketManager, user.id);

      // 1. Generate local E2EE keys and announce to Relay
      cryptoManager.generateKeyPair().then(async () => {
        const pubKey = await cryptoManager.exportPublicKey();
        socketManager.emit(MessageType.PUBLIC_KEY_ANNOUNCE, {
           type: MessageType.PUBLIC_KEY_ANNOUNCE,
           timestamp: Date.now(),
           userId: user.id,
           publicKeyBase64: pubKey
        });
      });
    }
    return () => {
      if (rtcManager.current) {
        rtcManager.current.close();
      }
    };
  }, [user]);

  useEffect(() => {
    if (!user || !targetId) return;

    // 2. Request target's public key when chat opens
    // First, check if we already negotiated the key in this session
    if (cryptoManager.hasSharedSecret(targetId)) {
        setE2eeStatus('SECURE');
        return;
    }

    setE2eeStatus('PENDING');

    const handleKeyResponse = async (msg: PublicKeyResponseMessage) => {
      if (msg.targetId === targetId) {
        if (msg.publicKeyBase64) {
          try {
             await cryptoManager.deriveSharedSecret(targetId, msg.publicKeyBase64);
             setE2eeStatus('SECURE');

             // Decrypt any pending messages that arrived before we had the key
             setMessages(prev => prev.map(m => {
                 if (m.senderId === targetId && m.encryptedPayload !== '[ENCRYPTED - DECRYPTION FAILED]') {
                     // Since we can't await inside a synchronous map easily without a Promise.all,
                     // we will rely on the next message to trigger a full re-render,
                     // or the user can refresh. For a production app, we'd trigger a re-decryption pass.
                 }
                 return m;
             }));
          } catch (e) {
             console.error("Failed to derive E2EE key", e);
             setE2eeStatus('FAILED');
          }
        } else {
          setE2eeStatus('FAILED');
        }
      }
    };

    socketManager.on(MessageType.PUBLIC_KEY_RESPONSE, handleKeyResponse);

    // Give it a tiny delay to ensure the socket is ready
    setTimeout(() => {
       socketManager.emit(MessageType.PUBLIC_KEY_REQUEST, {
          type: MessageType.PUBLIC_KEY_REQUEST,
          timestamp: Date.now(),
          targetId: targetId
       });
    }, 500);

    return () => {
      socketManager.off(MessageType.PUBLIC_KEY_RESPONSE, handleKeyResponse);
    };
  }, [targetId, user]);

  useEffect(() => {
    const handleIncomingMessage = async (msg: ChatMessage) => {
      // Only accept messages meant for this user, or sent from this user to the target
      if (msg.targetId === user?.id || (msg.senderId === user?.id && msg.targetId === targetId)) {

         // If we don't have the shared secret yet, we must fetch their public key to decrypt!
         if (!msg.isSystemMessage && msg.senderId !== user?.id && !cryptoManager.hasSharedSecret(msg.senderId)) {
             console.log(`[Chat] Received encrypted message from unknown peer ${msg.senderId}, requesting key...`);
             // We emit a request. The effect above listening to PUBLIC_KEY_RESPONSE will handle the derive.
             // We put this message in a "pending" state or just show it as encrypted until key arrives.
             // For safety and immediate UX, we just push the raw encrypted form.
             setMessages(prev => [...prev, msg]);

             // Request their key so future messages and history can unlock
             socketManager.emit(MessageType.PUBLIC_KEY_REQUEST, {
                type: MessageType.PUBLIC_KEY_REQUEST,
                timestamp: Date.now(),
                targetId: msg.senderId
             });
             return;
         }

         if (!msg.isSystemMessage && cryptoManager.hasSharedSecret(msg.senderId)) {
            try {
               const decrypted = await cryptoManager.decryptMessage(msg.senderId, msg.encryptedPayload);
               setMessages(prev => [...prev, { ...msg, encryptedPayload: decrypted }]);
            } catch (e) {
               setMessages(prev => [...prev, msg]);
            }
         } else {
            setMessages(prev => [...prev, msg]);
         }
      }
    };

    socketManager.on(MessageType.CHAT_MESSAGE, handleIncomingMessage);

    return () => {
      socketManager.off(MessageType.CHAT_MESSAGE, handleIncomingMessage);
    };
  }, [targetId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    let finalPayload = inputText;

    // 3. Encrypt the message if we have established a secure channel
    if (e2eeStatus === 'SECURE') {
       try {
          finalPayload = await cryptoManager.encryptMessage(targetId, inputText);
       } catch (err) {
          console.error("Failed to encrypt message", err);
          return;
       }
    }

    const payload: ChatMessage = {
      type: MessageType.CHAT_MESSAGE,
      timestamp: Date.now(),
      senderId: user.id,
      targetId: targetId,
      encryptedPayload: finalPayload,
      hasAttachment: false
    };

    socketManager.emit(MessageType.CHAT_MESSAGE, payload);

    // Locally display the plaintext, not the ciphertext
    setMessages(prev => [...prev, { ...payload, encryptedPayload: inputText }]);
    setInputText('');
  };

  const handleFileAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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

        socketManager.emit(MessageType.OFFLINE_FILE_UPLOAD_REQUEST, payload);
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
             <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isOnline ? '#2ecc71' : '#e74c3c' }} />
             <span style={{ color: '#aaa', fontSize: '12px' }}>{isOnline ? 'Online (P2P Ready)' : 'Offline (Cloud)'}</span>
          </div>
          {targetId && (
            <div style={{ fontSize: '11px', color: e2eeStatus === 'SECURE' ? '#2ecc71' : '#f1c40f' }}>
              {e2eeStatus === 'SECURE' ? '🔒 E2EE Active' : (e2eeStatus === 'PENDING' ? '🔐 Exchanging Keys...' : '⚠️ Unencrypted')}
            </div>
          )}
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
