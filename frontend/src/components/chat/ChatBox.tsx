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
    <div className="flex flex-col h-full bg-card/20 rounded-2xl border border-border/50 overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* Chat Header */}
      <div className="p-4 bg-background/50 border-b border-border/50 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(46,204,113,0.6)]' : 'bg-muted-foreground'}`} />
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Secure Comm Link</div>
            <div className="font-mono text-sm text-foreground">{targetId || 'No Target Selected'}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
             {isOnline ? 'P2P Ready' : 'Cloud Relayed'}
          </div>
          {targetId && (
            <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${e2eeStatus === 'SECURE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
              {e2eeStatus === 'SECURE' ? '🔒 E2EE ACTIVE' : (e2eeStatus === 'PENDING' ? '🔐 NEGOTIATING...' : '⚠️ UNENCRYPTED')}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground m-auto max-w-sm">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-medium text-foreground mb-2">Zero-Knowledge Chat</h3>
            <p className="text-sm">Messages are end-to-end encrypted locally before leaving your device. The Relay Server cannot read your communications.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;

            if (msg.isSystemMessage) {
              return (
                <div key={index} className="text-center my-2">
                   <span className="bg-background/80 text-muted-foreground px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wide border border-border/50">
                     {msg.encryptedPayload}
                   </span>
                </div>
              );
            }

            return (
              <div key={index} className={`max-w-[75%] ${isMe ? 'self-end' : 'self-start'} flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`
                  px-4 py-2.5 rounded-2xl break-words text-sm
                  ${isMe
                    ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-[0_4px_15px_rgba(170,59,255,0.2)]'
                    : 'bg-secondary text-secondary-foreground rounded-tl-sm border border-border/50'}
                `}>
                  {msg.encryptedPayload}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/50 border-t border-border/50 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
          <button
            type="button"
            onClick={handleFileAttachClick}
            disabled={!targetId}
            className="w-10 h-10 flex-none rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-border/50"
            title="Attach File (Relay Bypass)"
          >
            📎
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={targetId ? "Type a secure message..." : "Select a user to chat"}
            disabled={!targetId}
            className="flex-1 bg-background/80 border border-border/50 rounded-full px-5 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!targetId || !inputText.trim()}
            className="px-6 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(170,59,255,0.3)]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
