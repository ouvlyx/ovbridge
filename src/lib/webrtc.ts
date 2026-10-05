/**
 * OvBridge WebRTC Local P2P Transfer Helper
 * Allows direct, high-speed peer-to-peer data channel transfer between local devices.
 */

export type P2PTransferStatus = 'idle' | 'connecting' | 'connected' | 'transferring' | 'completed' | 'failed';

export class P2PTransferSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private status: P2PTransferStatus = 'idle';

  private onStatusChangeCallbacks: ((status: P2PTransferStatus) => void)[] = [];
  private onMessageCallbacks: ((data: string | ArrayBuffer) => void)[] = [];

  constructor(private isInitiator: boolean) {
    this.initPeerConnection();
  }

  private initPeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      if (state === "connected" || state === "completed") {
        this.setStatus("connected");
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        this.setStatus("failed");
      }
    };

    if (this.isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel("ovbridge_p2p");
      this.setupDataChannel(this.dataChannel);
    } else {
      this.peerConnection.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      this.setStatus("connected");
    };

    channel.onclose = () => {
      this.setStatus("idle");
    };

    channel.onmessage = (e) => {
      this.onMessageCallbacks.forEach((cb) => cb(e.data));
    };
  }

  public onStatusChange(cb: (status: P2PTransferStatus) => void) {
    this.onStatusChangeCallbacks.push(cb);
  }

  public onMessage(cb: (data: string | ArrayBuffer) => void) {
    this.onMessageCallbacks.push(cb);
  }

  private setStatus(s: P2PTransferStatus) {
    this.status = s;
    this.onStatusChangeCallbacks.forEach((cb) => cb(s));
  }

  public getStatus(): P2PTransferStatus {
    return this.status;
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("PeerConnection non initialisé");
    this.setStatus("connecting");
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("PeerConnection non initialisé");
    this.setStatus("connecting");
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) throw new Error("PeerConnection non initialisé");
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public send(data: string | ArrayBuffer) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      throw new Error("Canal P2P non ouvert");
    }
    this.setStatus("transferring");
    this.dataChannel.send(data as any);
    this.setStatus("completed");
  }

  public close() {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.setStatus("idle");
  }
}
