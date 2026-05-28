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
  onClose: () => void;
  userId: string;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({ workerId, fs, path, onClose, userId }) => {
  const socketManager = SocketManager.getInstance();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);

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
        action: 'PLAY',
        startByte: 0 // Start from beginning
      };

      channel.send(JSON.stringify(streamReq));
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === MessageType.STREAM_METADATA) {
             console.log(`[UI] Received Stream Metadata:`, msg);
             const mimeCodec = msg.mimeType;

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
          } else if (msg.type === 'STREAM_END') {
            setStatus('Stream Complete');
            if (mediaSourceRef.current?.readyState === 'open') {
               mediaSourceRef.current.endOfStream();
            }
          } else if (msg.type === 'STREAM_ERROR') {
            setStatus(`Stream Error: ${msg.error}`);
          }
        } catch (e) {
          // ignore
        }
      } else {
        // Binary Chunk Received!
        // Feed it directly into the MSE buffer to play instantly, bypassing RAM limits
        setStatus('Streaming from Worker...');
        const buffer = event.data as ArrayBuffer;
        if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
          sourceBufferRef.current.appendBuffer(buffer);
        } else {
          queueRef.current.push(buffer);
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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{ width: '80%', maxWidth: '1000px', backgroundColor: '#222', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #444' }}>
          <h3 style={{ margin: 0, color: 'white' }}>Now Playing: {path.split('/').pop()}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ff4757', fontSize: '20px', cursor: 'pointer' }}>✖</button>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', backgroundColor: 'black' }}>
          <video
            ref={videoRef}
            controls
            autoPlay
            style={{ width: '100%', height: '100%' }}
          />

          {status !== 'Streaming from Worker...' && status !== 'Stream Complete' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white' }}>
              <p>{status}</p>
            </div>
          )}
        </div>

        <div style={{ padding: '10px 20px', backgroundColor: '#111', color: '#aaa', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
           <span>Source: {fs}</span>
           <span>Provider: {workerId} (Relay Bypass Active)</span>
        </div>
      </div>
    </div>
  );
};
