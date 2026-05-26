import { Socket } from 'socket.io-client';
import { MessageType } from '@swarm/shared';
import type { SdpOfferMessage, SdpAnswerMessage, IceCandidateMessage } from '@swarm/shared';

// WebRTC Configuration using public STUN servers for hole punching
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

export class WebRTCManager {
  private socket: Socket;
  private localUserId: string;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  constructor(socket: Socket, localUserId: string) {
    this.socket = socket;
    this.localUserId = localUserId;

    // Register signaling listeners
    this.socket.on(MessageType.SDP_OFFER, this.handleSdpOffer.bind(this));
    this.socket.on(MessageType.SDP_ANSWER, this.handleSdpAnswer.bind(this));
    this.socket.on(MessageType.ICE_CANDIDATE, this.handleIceCandidate.bind(this));

    console.log(`[WebRTC] Manager initialized for user ${this.localUserId}`);
  }

  private createPeerConnection(targetId: string): RTCPeerConnection {
    console.log(`[WebRTC] Creating RTCPeerConnection for ${targetId}`);
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const payload: IceCandidateMessage = {
          type: MessageType.ICE_CANDIDATE,
          timestamp: Date.now(),
          senderId: this.localUserId,
          targetId: targetId,
          candidate: event.candidate.toJSON()
        };
        this.socket.emit(MessageType.ICE_CANDIDATE, payload);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] PeerConnection state for ${targetId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanup(targetId);
      }
    };

    // When the remote peer creates a data channel, we receive it here
    pc.ondatachannel = (event) => {
      console.log(`[WebRTC] Received RTCDataChannel from ${targetId}`);
      this.setupDataChannel(targetId, event.channel);
    };

    this.peerConnections.set(targetId, pc);
    return pc;
  }

  private setupDataChannel(targetId: string, channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log(`[WebRTC] DataChannel opened with ${targetId}`);
    };

    channel.onmessage = (event) => {
      console.log(`[WebRTC] Received message on DataChannel from ${targetId}`);

      // In a full implementation, if event.data is ArrayBuffer, we assemble the file here.
      if (typeof event.data === 'string') {
        try {
          const meta = JSON.parse(event.data);
          if (meta.type === 'FILE_METADATA') {
             console.log(`[WebRTC] Incoming file: ${meta.fileName} (${meta.fileSize} bytes)`);
             // alert(`Incoming P2P File: ${meta.fileName}`); // Optional UI notification
          }
        } catch (e) {
          // Plain string message
        }
      } else {
        // We received binary chunk data
        console.log(`[WebRTC] Received binary chunk of size ${event.data.byteLength}`);
        // Here we would push to a Blob array and download once complete
      }
    };

    channel.onclose = () => {
      console.log(`[WebRTC] DataChannel closed with ${targetId}`);
    };

    this.dataChannels.set(targetId, channel);
  }

  // Called when user A clicks "Attach File" and target is online
  public async initiateFileTransfer(targetId: string, file: File) {
    console.log(`[WebRTC] Initiating File Transfer to ${targetId} for ${file.name}`);
    let pc = this.peerConnections.get(targetId);

    if (!pc) {
      pc = this.createPeerConnection(targetId);
    }

    // Create the DataChannel BEFORE creating the offer
    const channel = pc.createDataChannel('fileTransfer');
    this.setupDataChannel(targetId, channel);

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const payload: SdpOfferMessage = {
      type: MessageType.SDP_OFFER,
      timestamp: Date.now(),
      senderId: this.localUserId,
      targetId: targetId,
      sdp: offer.sdp || ''
    };

    console.log(`[WebRTC] Sending SDP_OFFER to ${targetId}`);
    this.socket.emit(MessageType.SDP_OFFER, payload);

    // Wait for channel to open before sending data
    channel.addEventListener('open', () => {
       console.log(`[WebRTC] Sending metadata...`);
       channel.send(JSON.stringify({ type: 'FILE_METADATA', fileName: file.name, fileSize: file.size }));

       console.log(`[WebRTC] Sending binary file data directly over P2P...`);
       // MVP: Send the whole file as an ArrayBuffer.
       // In prod with 50GB files, we must read the File object in 64KB chunks using FileReader.
       file.arrayBuffer().then(buffer => {
         // Sending large buffers directly can crash the channel, so we ideally chunk it.
         // For Phase 3 MVP, if the file is small enough, this works.
         try {
           channel.send(buffer);
         } catch (e) {
           console.error("[WebRTC] File too large for unchunked MVP transfer", e);
         }
       });
    });
  }

  // --- Signaling Handlers ---

  private async handleSdpOffer(msg: SdpOfferMessage) {
    if (msg.targetId !== this.localUserId) return; // Prevent echoing
    console.log(`[WebRTC] Received SDP_OFFER from ${msg.senderId}`);

    let pc = this.peerConnections.get(msg.senderId);
    if (!pc) {
      pc = this.createPeerConnection(msg.senderId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const payload: SdpAnswerMessage = {
      type: MessageType.SDP_ANSWER,
      timestamp: Date.now(),
      senderId: this.localUserId,
      targetId: msg.senderId, // Route back to the offerer
      sdp: answer.sdp || ''
    };

    console.log(`[WebRTC] Sending SDP_ANSWER back to ${msg.senderId}`);
    this.socket.emit(MessageType.SDP_ANSWER, payload);
  }

  private async handleSdpAnswer(msg: SdpAnswerMessage) {
    if (msg.targetId !== this.localUserId) return;
    console.log(`[WebRTC] Received SDP_ANSWER from ${msg.senderId}`);

    const pc = this.peerConnections.get(msg.senderId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
    }
  }

  private async handleIceCandidate(msg: IceCandidateMessage) {
    if (msg.targetId !== this.localUserId) return;
    const pc = this.peerConnections.get(msg.senderId);
    if (pc && msg.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch (e) {
        console.error(`[WebRTC] Error adding ICE candidate`, e);
      }
    }
  }

  private cleanup(targetId: string) {
    const pc = this.peerConnections.get(targetId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(targetId);
    }
    const channel = this.dataChannels.get(targetId);
    if (channel) {
      channel.close();
      this.dataChannels.delete(targetId);
    }
  }

  public close() {
    this.socket.off(MessageType.SDP_OFFER);
    this.socket.off(MessageType.SDP_ANSWER);
    this.socket.off(MessageType.ICE_CANDIDATE);

    this.peerConnections.forEach((_, id) => this.cleanup(id));
    console.log(`[WebRTC] Manager closed and connections cleaned up.`);
  }
}
