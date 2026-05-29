import React, { useEffect, useRef, useState } from 'react';
import { MessageType } from '@swarm/shared';
import type { StreamRequestMessage, SdpAnswerMessage, IceCandidateMessage } from '@swarm/shared';
import { SocketManager } from '../../worker/SocketManager';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

interface MediaPlayerModalProps {
  workerId: string;
  fs: string;
  path: string;
  action: 'PLAY' | 'DOWNLOAD';
  onClose: () => void;
  userId: string;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({ workerId, fs, path, action, onClose, userId }) => {
  const socketManager = SocketManager.getInstance();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const downloadBufferRef = useRef<ArrayBuffer[]>([]);
  const bytesReceivedRef = useRef<number>(0);

  // Service Worker Bridge Refs
  const swChannelRef = useRef<MessageChannel | null>(null);
  const streamIdRef = useRef<string>(`stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const [status, setStatus] = useState<string>('Registering Service Worker Bridge...');
  const [isVideoSrcSet, setIsVideoSrcSet] = useState(false);

  // Use a ref to prevent double-initialization in React 18 Strict Mode
  const isInitializing = useRef(false);

  useEffect(() => {
    if (!workerId) return;

    // Prevent double execution in strict mode
    if (isInitializing.current) return;
    isInitializing.current = true;

    let pc: RTCPeerConnection;
    let channel: RTCDataChannel;

    let hasSentOffer = false;
    let pendingCandidates: RTCIceCandidateInit[] = [];

    const initWebRTC = () => {
      setStatus('Connecting to Swarm Worker...');
      pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // We create the data channel
      channel = pc.createDataChannel('mediaStream');
      dcRef.current = channel;

      // --- WebRTC Data Channel Handlers ---
      channel.onopen = () => {
        setStatus('P2P Pipe Opened. Requesting Stream...');

      const streamReq: StreamRequestMessage = {
        type: MessageType.STREAM_REQUEST,
        timestamp: Date.now(),
        workerId: workerId,
        fs: fs,
        path: path,
        action: action, // Pass action to backend (currently backend treats all as stream, but this is good for future proofing)
        startByte: 0 // Start from beginning
      };

      channel.send(JSON.stringify(streamReq));
    };

    // Explicitly ask for ArrayBuffer, otherwise browsers might default to Blob or String
    channel.binaryType = 'arraybuffer';

      channel.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === MessageType.STREAM_METADATA) {
               console.log(`[UI] Received Stream Metadata:`, msg);

               if (action === 'PLAY' && swChannelRef.current) {
                   // Initialize the Service Worker stream with the correct MIME type and file size
                   swChannelRef.current.port1.postMessage({
                     type: 'INIT_STREAM',
                     streamId: streamIdRef.current,
                     mimeType: msg.mimeType,
                     fileSize: msg.fileSize
                   });
                   setStatus('Metadata Received. Buffering stream...');
               } else if (action === 'DOWNLOAD') {
                   setStatus('Downloading in background...');
               }

            } else if (msg.type === 'STREAM_END') {
              if (action === 'PLAY' && swChannelRef.current) {
                  setStatus('Stream Complete');
                  swChannelRef.current.port1.postMessage({
                    type: 'END_STREAM',
                    streamId: streamIdRef.current
                  });
              } else if (action === 'DOWNLOAD') {
                  setStatus('Download Complete. Saving file...');
                  const blob = new Blob(downloadBufferRef.current);
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = path.split('/').pop() || 'download';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                  setTimeout(() => onClose(), 2000);
              }

            } else if (msg.type === 'STREAM_ERROR') {
              setStatus(`Stream Error: ${msg.error}`);
              if (action === 'PLAY' && swChannelRef.current) {
                 swChannelRef.current.port1.postMessage({
                    type: 'ERROR_STREAM',
                    streamId: streamIdRef.current,
                    error: msg.error
                 });
              }
            }
          } catch (e) {
            // ignore
          }
        } else {
          // Binary Chunk Received!
          const buffer = event.data as ArrayBuffer;

          if (action === 'PLAY') {
              if (!isVideoSrcSet) {
                 setIsVideoSrcSet(true);
              }
              setStatus('Streaming from Worker...');

              if (swChannelRef.current) {
                 // Push the chunk directly to the Service Worker!
                 swChannelRef.current.port1.postMessage({
                   type: 'CHUNK',
                   streamId: streamIdRef.current,
                   chunk: buffer
                 }, [buffer]); // Transfer the buffer to avoid memory duplication!
              }
          } else {
              downloadBufferRef.current.push(buffer);
              bytesReceivedRef.current += buffer.byteLength;

              const mbDownloaded = bytesReceivedRef.current / (1024 * 1024);
              if (mbDownloaded > 500) {
                 setStatus(`Downloading... (${mbDownloaded.toFixed(1)} MB) - WARNING: High RAM usage`);
              } else {
                 setStatus(`Downloading... (${mbDownloaded.toFixed(1)} MB received)`);
              }
          }
        }
      };

      // --- Signaling Handlers ---
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketManager.emit(MessageType.ICE_CANDIDATE, {
            type: MessageType.ICE_CANDIDATE,
            timestamp: Date.now(),
            senderId: userId,
            targetId: workerId,
            candidate: event.candidate.toJSON()
          });
        }
      };

      const handleSdpAnswer = async (msg: SdpAnswerMessage) => {
        if (msg.senderId === workerId && msg.targetId === userId) {
          // Check if we are actually expecting an answer
          if (pc.signalingState === 'have-local-offer') {
             try {
               await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
               // Flush pending ICE candidates now that remote description is set
               for (const candidate of pendingCandidates) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
               }
               pendingCandidates = [];
             } catch (e) {
               console.error('[UI] Error setting remote description:', e);
             }
          }
        }
      };

      const handleIceCandidate = async (msg: IceCandidateMessage) => {
         if (msg.senderId === workerId && msg.targetId === userId && msg.candidate) {
            if (pc.remoteDescription) {
               await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } else {
               // Buffer the candidate until the Answer is set
               pendingCandidates.push(msg.candidate);
            }
         }
      };

      socketManager.on(MessageType.SDP_ANSWER, handleSdpAnswer);
      socketManager.on(MessageType.ICE_CANDIDATE, handleIceCandidate);

      // Store these locally so we can remove the event listeners later
      (pc as any)._sdpAnswerListener = handleSdpAnswer;
      (pc as any)._iceCandidateListener = handleIceCandidate;

      // Initiate the connection by sending an Offer, ensuring we only do it ONCE per component mount
      if (!hasSentOffer) {
         hasSentOffer = true;
         pc.createOffer().then(offer => {
           pc.setLocalDescription(offer);
           socketManager.emit(MessageType.SDP_OFFER, {
             type: MessageType.SDP_OFFER,
             timestamp: Date.now(),
             senderId: userId,
             targetId: workerId,
             sdp: offer.sdp
           });
         });
      }
    };

    // Register Service Worker for Video Stream Interception
    if (action === 'PLAY' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('[UI] Service Worker registered for Media Streaming.');

        // Wait for it to be active
        let sw = registration.active || registration.waiting || registration.installing;
        if (!sw) return;

        const startStream = () => {
          swChannelRef.current = new MessageChannel();

          swChannelRef.current.port1.onmessage = (event) => {
             if (event.data.type === 'STREAM_INITIALIZED') {
                console.log('[UI] Service Worker ready. Setting video src...');
                if (videoRef.current) {
                   videoRef.current.src = `/sw-stream/${streamIdRef.current}`;
                }
             }
          };

          // Give the Service Worker the port so it can talk back
          sw.postMessage({ type: 'PORT_INITIALIZATION' }, [swChannelRef.current.port2]);

          initWebRTC();
        };

        if (sw.state === 'activated') {
           startStream();
        } else {
           sw.addEventListener('statechange', () => {
              if (sw.state === 'activated') {
                 startStream();
              }
           });
        }
      }).catch(err => {
        console.error('[UI] Service Worker registration failed:', err);
        setStatus('Error: Browser does not support Service Workers needed for streaming.');
      });
    } else {
      // Download mode doesn't need the Service Worker bridge for MVP
      initWebRTC();
    }

    return () => {
      isInitializing.current = false;

      if (pcRef.current) {
         if ((pcRef.current as any)._sdpAnswerListener) {
            socketManager.off(MessageType.SDP_ANSWER, (pcRef.current as any)._sdpAnswerListener);
         }
         if ((pcRef.current as any)._iceCandidateListener) {
            socketManager.off(MessageType.ICE_CANDIDATE, (pcRef.current as any)._iceCandidateListener);
         }
      }

      if (dcRef.current) dcRef.current.close();
      if (pcRef.current) pcRef.current.close();

      if (swChannelRef.current) {
         swChannelRef.current.port1.postMessage({
           type: 'END_STREAM',
           streamId: streamIdRef.current
         });
         swChannelRef.current.port1.close();
      }
    };
  }, [workerId, fs, path, userId, action]);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(46,204,113,0.6)] animate-pulse" />
             <h3 className="m-0 text-foreground font-semibold">
               {action === 'PLAY' ? 'Live Stream' : 'Secure P2P Download'}: <span className="text-primary font-mono ml-2">{path.split('/').pop()}</span>
             </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-destructive transition-colors">
            ✖
          </button>
        </div>

        {/* Content Area */}
        <div className="relative w-full bg-black flex items-center justify-center min-h-[300px]" style={{ aspectRatio: action === 'PLAY' ? '16/9' : 'auto' }}>

          {action === 'PLAY' && (
            <video
              ref={videoRef}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          )}

          {/* Status Overlay for both Play and Download */}
          {(!videoRef.current || status !== 'Streaming from Worker...') && status !== 'Stream Complete' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-foreground gap-4">
              {status.includes('Error') ? (
                 <div className="text-4xl">⚠️</div>
              ) : status.includes('Complete') ? (
                 <div className="text-4xl text-emerald-500">✅</div>
              ) : (
                 <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              <p className="font-mono text-sm tracking-wide">{status}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-secondary/30 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center font-mono">
           <span className="truncate max-w-[50%]">Source: {fs}</span>
           <span className="text-emerald-500 flex items-center gap-2">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
             Direct P2P Relay Bypass Active
           </span>
        </div>
      </div>
    </div>
  );
};
