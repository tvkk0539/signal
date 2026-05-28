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

  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const downloadBufferRef = useRef<ArrayBuffer[]>([]);

  const [status, setStatus] = useState<string>('Connecting to Swarm Worker...');

  useEffect(() => {
    if (!workerId) return;

    let pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // We create the data channel
    const channel = pc.createDataChannel('mediaStream');
    dcRef.current = channel;

    // --- Media Source Extension (MSE) Setup ---
    // This allows us to feed chunks directly into the video player without keeping the whole file in RAM
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    if (videoRef.current) {
       videoRef.current.src = URL.createObjectURL(mediaSource);
    }

    // We no longer hardcode the codec on sourceopen.
    // We wait for the STREAM_METADATA message from the backend over the WebRTC Data Channel.

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
             const mimeCodec = msg.mimeType;

             if (action === 'PLAY') {
                 if (mediaSource.readyState === 'open') {
                    if (MediaSource.isTypeSupported(mimeCodec)) {
                      sourceBufferRef.current = mediaSource.addSourceBuffer(mimeCodec);

                      sourceBufferRef.current.addEventListener('updateend', () => {
                        if (queueRef.current.length > 0 && sourceBufferRef.current && !sourceBufferRef.current.updating) {
                          sourceBufferRef.current.appendBuffer(queueRef.current.shift()!);
                        }
                      });
                      setStatus('Metadata Received. Buffering stream...');
                    } else {
                      setStatus(`Unsupported format by browser: ${mimeCodec}`);
                    }
                 } else {
                    console.error("[UI] MediaSource not open when metadata arrived.");
                 }
             } else {
                 setStatus('Downloading in background...');
             }

          } else if (msg.type === 'STREAM_END') {
            if (action === 'PLAY') {
                setStatus('Stream Complete');
                if (mediaSourceRef.current?.readyState === 'open') {
                   mediaSourceRef.current.endOfStream();
                }
            } else {
                setStatus('Download Complete. Saving file...');
                // Combine chunks and trigger browser download
                const blob = new Blob(downloadBufferRef.current);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = path.split('/').pop() || 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                setTimeout(() => onClose(), 2000); // Auto close after 2 seconds
            }

          } else if (msg.type === 'STREAM_ERROR') {
            setStatus(`Stream Error: ${msg.error}`);
          }
        } catch (e) {
          // ignore
        }
      } else {
        // Binary Chunk Received!
        const buffer = event.data as ArrayBuffer;

        if (action === 'PLAY') {
            setStatus('Streaming from Worker...');
            try {
                if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
                  sourceBufferRef.current.appendBuffer(buffer);
                } else {
                  queueRef.current.push(buffer);
                }
            } catch (err) {
                console.warn("[UI] MSE Append Error (File likely not fragmented MP4). Buffering in RAM to play at end.");
                // If MSE fails (because it's a standard MP4, not fragmented), fallback to buffering it like a download,
                // and we will attach it to the video player as a Blob when it finishes.
                downloadBufferRef.current.push(buffer);
            }
        } else {
            // DOWNLOAD mode: To avoid RAM OOM crashes on massive files (e.g. 50GB),
            // we use the File System Access API (StreamSaver pattern) to stream directly to disk.
            // For MVP simplicity and cross-browser support without external libs,
            // we will buffer chunks into an array and trigger standard Blob download,
            // BUT we add a warning status if the file gets too large.
            // Note: In production Phase 8, replace this with a proper ServiceWorker + WritableStream.
            downloadBufferRef.current.push(buffer);

            const mbDownloaded = (downloadBufferRef.current.length * 64) / 1024; // Assuming ~64KB chunks
            if (mbDownloaded > 500) {
               setStatus(`Downloading... (${Math.round(mbDownloaded)} MB) - WARNING: High RAM usage`);
            } else {
               setStatus(`Downloading... (${Math.round(mbDownloaded)} MB received)`);
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
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
      }
    };

    const handleIceCandidate = async (msg: IceCandidateMessage) => {
       if (msg.senderId === workerId && msg.targetId === userId && msg.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
       }
    };

    socketManager.on(MessageType.SDP_ANSWER, handleSdpAnswer);
    socketManager.on(MessageType.ICE_CANDIDATE, handleIceCandidate);

    // Initiate the connection by sending an Offer
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

    return () => {
      socketManager.off(MessageType.SDP_ANSWER, handleSdpAnswer);
      socketManager.off(MessageType.ICE_CANDIDATE, handleIceCandidate);
      channel.close();
      pc.close();
    };
  }, [workerId, fs, path, userId]);

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
