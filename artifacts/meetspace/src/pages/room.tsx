import { useEffect, useRef, useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { io, Socket } from "socket.io-client";
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp,
  MonitorX, PhoneOff, MessageSquare, Send, Users, X, Link2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PeerState {
  pc: RTCPeerConnection;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  screenPc?: RTCPeerConnection;
}

interface ChatMsg { sender: string; text: string; time: string; }
interface Participant { name: string; isScreenSharing?: boolean; isHandRaised?: boolean; }
interface HandNotification { id: number; userId: string; name: string; raised: boolean; }

const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function RemoteVideo({ stream, name, cover = true }: { stream: MediaStream; name: string; cover?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative bg-zinc-900 rounded-xl overflow-hidden border border-white/10 shadow-xl w-full h-full">
      <video ref={ref} autoPlay playsInline className={`w-full h-full ${cover ? "object-cover" : "object-contain bg-black"}`} />
      <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded-md text-xs font-medium text-white backdrop-blur-sm">
        {name}
      </div>
    </div>
  );
}

function SpotlightVideo({ stream, label, videoRef }: { stream: MediaStream | null; label: string; videoRef?: React.RefObject<HTMLVideoElement | null> }) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream, ref]);
  return (
    <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-contain" />
      <div className="absolute top-4 left-4 bg-blue-600/90 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-sm flex items-center gap-2">
        <MonitorUp className="w-4 h-4" />
        {label}
      </div>
    </div>
  );
}

function HandBadge() {
  return (
    <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-yellow-400/90 flex items-center justify-center shadow-lg animate-bounce z-10">
      <span className="text-base leading-none">✋</span>
    </div>
  );
}

export default function Room() {
  const [, params] = useRoute("/room/:roomCode");
  const roomCode = params?.roomCode;
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [handNotifications, setHandNotifications] = useState<HandNotification[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const notifCounterRef = useRef(0);

  const copyMeetingLink = useCallback(() => {
    const url = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, [roomCode]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, PeerState>>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep ref in sync
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // Who is currently spotlighted for screen share
  const screenSharingUserId = Object.entries(participants).find(([, p]) => p.isScreenSharing)?.[0];
  const activeSpotlight = screenSharingUserId
    ? (screenSharingUserId === "local" ? null : screenSharingUserId)
    : null;

  const createCameraPeer = useCallback((targetId: string, stream: MediaStream, initiator: boolean) => {
    const socket = socketRef.current;
    if (!socket) return;

    const pc = new RTCPeerConnection(STUN);
    if (!peersRef.current[targetId]) {
      peersRef.current[targetId] = { pc, cameraStream: null, screenStream: null };
    } else {
      peersRef.current[targetId].pc = pc;
    }

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({ ...prev, [targetId]: e.streams[0] }));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { targetId, candidate: e.candidate, type: "camera" });
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit("offer", { targetId, offer, type: "camera" });
      });
    }

    return pc;
  }, []);

  const createScreenPeer = useCallback((targetId: string, stream: MediaStream, initiator: boolean) => {
    const socket = socketRef.current;
    if (!socket) return;

    const pc = new RTCPeerConnection(STUN);
    if (!peersRef.current[targetId]) {
      peersRef.current[targetId] = { pc: new RTCPeerConnection(STUN), cameraStream: null, screenStream: null, screenPc: pc };
    } else {
      peersRef.current[targetId].screenPc = pc;
    }

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      setRemoteScreenStreams(prev => ({ ...prev, [targetId]: e.streams[0] }));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { targetId, candidate: e.candidate, type: "screen" });
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit("offer", { targetId, offer, type: "screen" });
      });
    }

    return pc;
  }, []);

  useEffect(() => {
    if (!roomCode || !user) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const socket = io();
      socketRef.current = socket;
      socket.emit("join-room", { roomCode, userId: user.id, userName: user.name });

      socket.on("user-joined", ({ userId, userName }: { userId: string; userName: string }) => {
        setParticipants(prev => ({ ...prev, [userId]: { name: userName } }));
        createCameraPeer(userId, stream, true);
      });

      socket.on("user-left", ({ userId }: { userId: string }) => {
        peersRef.current[userId]?.pc.close();
        peersRef.current[userId]?.screenPc?.close();
        delete peersRef.current[userId];
        setRemoteStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
        setRemoteScreenStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
        setParticipants(prev => { const n = { ...prev }; delete n[userId]; return n; });
      });

      socket.on("offer", async ({ senderId, offer, type }: { senderId: string; offer: RTCSessionDescriptionInit; type: "camera" | "screen" }) => {
        if (type === "screen") {
          const pc = new RTCPeerConnection(STUN);
          if (!peersRef.current[senderId]) {
            peersRef.current[senderId] = { pc: new RTCPeerConnection(STUN), cameraStream: null, screenStream: null, screenPc: pc };
          } else {
            peersRef.current[senderId].screenPc = pc;
          }
          pc.ontrack = (e) => setRemoteScreenStreams(prev => ({ ...prev, [senderId]: e.streams[0] }));
          pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit("ice-candidate", { targetId: senderId, candidate: e.candidate, type: "screen" });
          };
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { targetId: senderId, answer, type: "screen" });
        } else {
          const pc = createCameraPeer(senderId, stream, false)!;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { targetId: senderId, answer, type: "camera" });
        }
      });

      socket.on("answer", async ({ senderId, answer, type }: { senderId: string; answer: RTCSessionDescriptionInit; type: "camera" | "screen" }) => {
        const peer = peersRef.current[senderId];
        if (!peer) return;
        const pc = type === "screen" ? peer.screenPc : peer.pc;
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("ice-candidate", async ({ senderId, candidate, type }: { senderId: string; candidate: RTCIceCandidateInit; type: "camera" | "screen" }) => {
        const peer = peersRef.current[senderId];
        if (!peer) return;
        const pc = type === "screen" ? peer.screenPc : peer.pc;
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("screen-share-started", ({ userId, userName }: { userId: string; userName: string }) => {
        setParticipants(prev => ({
          ...prev,
          [userId]: { ...(prev[userId] || { name: userName }), isScreenSharing: true }
        }));
      });

      socket.on("screen-share-stopped", ({ userId }: { userId: string }) => {
        setParticipants(prev => ({
          ...prev,
          [userId]: { ...(prev[userId] || { name: "" }), isScreenSharing: false }
        }));
        setRemoteScreenStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
      });

      socket.on("chat-message", (msg: ChatMsg) => {
        setMessages(prev => [...prev, msg]);
      });

      socket.on("raise-hand", ({ userId, userName }: { userId: string; userName: string }) => {
        setParticipants(prev => ({
          ...prev,
          [userId]: { ...(prev[userId] || { name: userName }), isHandRaised: true }
        }));
        notifCounterRef.current += 1;
        const id = notifCounterRef.current;
        setHandNotifications(prev => [...prev, { id, userId, name: userName, raised: true }]);
        setTimeout(() => setHandNotifications(prev => prev.filter(n => n.id !== id)), 4000);
      });

      socket.on("lower-hand", ({ userId, userName }: { userId: string; userName?: string }) => {
        let resolvedName = userName || "Someone";
        setParticipants(prev => {
          resolvedName = prev[userId]?.name || resolvedName;
          return { ...prev, [userId]: { ...(prev[userId] || { name: resolvedName }), isHandRaised: false } };
        });
        notifCounterRef.current += 1;
        const id = notifCounterRef.current;
        const name = resolvedName;
        setHandNotifications(prev => [...prev, { id, userId, name, raised: false }]);
        setTimeout(() => setHandNotifications(prev => prev.filter(n => n.id !== id)), 3000);
      });
    }).catch(err => console.error("Failed to get media", err));

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      Object.values(peersRef.current).forEach(p => { p.pc.close(); p.screenPc?.close(); });
      socketRef.current?.disconnect();
    };
  }, [roomCode, user, createCameraPeer]);

  const toggleMute = () => {
    if (localStream) {
      const enabled = !isMuted;
      localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
      setIsMuted(!enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const enabled = !isVideoOff;
      localStream.getVideoTracks().forEach(t => { t.enabled = enabled; });
      setIsVideoOff(!enabled);
    }
  };

  const stopScreenShare = useCallback(async () => {
    screenStream?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
    socketRef.current?.emit("screen-share-stopped", { roomCode, userId: user?.id });
    // Close screen peer connections
    Object.values(peersRef.current).forEach(p => {
      p.screenPc?.close();
      p.screenPc = undefined;
    });
  }, [screenStream, roomCode, user?.id]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });

      setScreenStream(display);
      setIsScreenSharing(true);

      if (localScreenRef.current) localScreenRef.current.srcObject = display;

      socketRef.current?.emit("screen-share-started", { roomCode, userId: user?.id, userName: user?.name });

      // Send screen stream to all current peers
      Object.keys(peersRef.current).forEach(targetId => {
        createScreenPeer(targetId, display, true);
      });

      // Stop when user clicks browser's native "Stop sharing"
      display.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "NotAllowedError") {
        console.error("Screen share error:", err);
      }
    }
  };

  const leaveMeeting = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    Object.values(peersRef.current).forEach(p => { p.pc.close(); p.screenPc?.close(); });
    socketRef.current?.disconnect();
    setLocation("/");
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketRef.current) return;
    const msg: ChatMsg = {
      sender: user?.name || "Anonymous",
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    socketRef.current.emit("chat-message", { ...msg, roomCode });
    setMessages(prev => [...prev, msg]);
    setChatMessage("");
  };

  const toggleHandRaise = () => {
    if (!socketRef.current || !user) return;
    if (isHandRaised) {
      socketRef.current.emit("lower-hand", { roomCode, userId: user.id });
      setIsHandRaised(false);
    } else {
      socketRef.current.emit("raise-hand", { roomCode, userId: user.id, userName: user.name });
      setIsHandRaised(true);
      // Auto-lower after 60 seconds
      setTimeout(() => {
        setIsHandRaised(prev => {
          if (prev) socketRef.current?.emit("lower-hand", { roomCode, userId: user.id });
          return false;
        });
      }, 60000);
    }
  };

  // Layout: spotlight (screen share) vs grid
  const spotlightStream = isScreenSharing
    ? screenStream
    : activeSpotlight
    ? remoteScreenStreams[activeSpotlight]
    : null;

  const spotlightLabel = isScreenSharing
    ? `You (Screen)`
    : activeSpotlight
    ? `${participants[activeSpotlight]?.name || "Guest"} (Screen)`
    : "";

  const participantCount = Object.keys(participants).length + 1;
  const sidebarParticipants = Object.entries(remoteStreams);
  const raisedHandCount = Object.values(participants).filter(p => p.isHandRaised).length + (isHandRaised ? 1 : 0);

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-white flex overflow-hidden select-none">
      {/* Hand-raise toast notifications — top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {handNotifications.map(n => (
          <div
            key={n.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl backdrop-blur-md border animate-in slide-in-from-top-2 fade-in duration-300 ${
              n.raised
                ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-200"
                : "bg-zinc-800/80 border-white/10 text-zinc-400"
            }`}
          >
            <span className={`text-base ${n.raised ? "animate-bounce" : ""}`}>✋</span>
            <span>{n.raised ? `${n.name} raised their hand` : `${n.name} lowered their hand`}</span>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Video stage */}
        <div className="flex-1 overflow-hidden relative">
          {spotlightStream ? (
            /* ── SPOTLIGHT MODE ── */
            <div className="h-full flex gap-3 p-4">
              {/* Large screen share */}
              {isScreenSharing ? (
                <SpotlightVideo stream={screenStream} label={spotlightLabel} videoRef={localScreenRef} />
              ) : activeSpotlight ? (
                <SpotlightVideo stream={remoteScreenStreams[activeSpotlight] ?? null} label={spotlightLabel} />
              ) : null}

              {/* Sidebar: camera feeds */}
              <div className="w-48 flex flex-col gap-3 overflow-y-auto">
                {/* Local camera PiP */}
                <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-blue-500/60 shadow-lg flex-shrink-0">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[11px] font-medium">You</div>
                  {isHandRaised && <HandBadge />}
                </div>
                {/* Remote cameras */}
                {sidebarParticipants.map(([id, stream]) => (
                  <div key={id} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 shadow flex-shrink-0">
                    <RemoteVideo stream={stream} name={participants[id]?.name || "Guest"} />
                    {participants[id]?.isHandRaised && <HandBadge />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── GRID MODE ── */
            <div className={`h-full p-4 grid gap-4 content-center ${
              participantCount === 1 ? "grid-cols-1" :
              participantCount === 2 ? "grid-cols-2" :
              participantCount <= 4 ? "grid-cols-2" :
              "grid-cols-3"
            }`}>
              {/* Local tile */}
              <div className="relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-xl aspect-video">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold">
                      {user?.name?.[0]?.toUpperCase() || "Y"}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                  You
                </div>
                {isMuted && (
                  <div className="absolute top-3 right-3 bg-red-500/90 rounded-full p-1.5">
                    <MicOff className="w-3 h-3" />
                  </div>
                )}
                {isHandRaised && <HandBadge />}
              </div>

              {/* Remote tiles */}
              {sidebarParticipants.map(([id, stream]) => (
                <div key={id} className="relative aspect-video">
                  <RemoteVideo stream={stream} name={participants[id]?.name || "Guest"} />
                  {participants[id]?.isHandRaised && <HandBadge />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Screen share notification banner */}
        {activeSpotlight && !spotlightStream && (
          <div className="mx-4 mb-2 bg-blue-600/20 border border-blue-500/30 rounded-xl px-4 py-2.5 text-sm text-blue-300 flex items-center gap-2">
            <MonitorUp className="w-4 h-4" />
            <span>{participants[activeSpotlight]?.name} is sharing their screen</span>
          </div>
        )}

        {/* Controls bar */}
        <div className="h-20 bg-zinc-900/95 border-t border-white/10 backdrop-blur-lg flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300">{roomCode}</span>
            <button
              onClick={copyMeetingLink}
              title="Copy meeting link"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                linkCopied
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {linkCopied ? (
                <><Check className="w-3.5 h-3.5" /> Copied!</>
              ) : (
                <><Link2 className="w-3.5 h-3.5" /> Share link</>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <ControlBtn active={!isMuted} activeClass="bg-white/10" inactiveClass="bg-red-500/20 text-red-400" onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </ControlBtn>
            <ControlBtn active={!isVideoOff} activeClass="bg-white/10" inactiveClass="bg-red-500/20 text-red-400" onClick={toggleVideo} title={isVideoOff ? "Start video" : "Stop video"}>
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </ControlBtn>
            <div className="w-px h-8 bg-white/10" />
            <ControlBtn
              active={isScreenSharing}
              activeClass="bg-blue-600/30 text-blue-400 ring-1 ring-blue-500/50"
              inactiveClass="bg-white/10"
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              {isScreenSharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            </ControlBtn>
            <ControlBtn
              active={isHandRaised}
              activeClass="bg-yellow-500/25 text-yellow-300 ring-1 ring-yellow-400/50"
              inactiveClass="bg-white/10"
              onClick={toggleHandRaise}
              title={isHandRaised ? "Lower hand" : "Raise hand"}
            >
              <span className={`text-lg leading-none ${isHandRaised ? "animate-bounce" : ""}`}>✋</span>
            </ControlBtn>
            <div className="w-px h-8 bg-white/10" />
            <ControlBtn active={showParticipants} activeClass="bg-blue-600/30 text-blue-400" inactiveClass="bg-white/10" onClick={() => { setShowParticipants(v => !v); setShowChat(false); }} title="Participants">
              <Users className="w-5 h-5" />
              <span className="text-xs ml-1">{participantCount}</span>
              {raisedHandCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-yellow-500 text-black text-[10px] font-bold flex items-center justify-center">{raisedHandCount}</span>
              )}
            </ControlBtn>
            <ControlBtn active={showChat} activeClass="bg-blue-600/30 text-blue-400" inactiveClass="bg-white/10" onClick={() => { setShowChat(v => !v); setShowParticipants(false); }} title="Chat">
              <MessageSquare className="w-5 h-5" />
            </ControlBtn>
          </div>

          <Button
            variant="destructive"
            className="rounded-full px-6 font-semibold h-11 shadow-lg shadow-red-900/30 text-sm"
            onClick={leaveMeeting}
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>

      {/* Side Panel */}
      {(showChat || showParticipants) && (
        <div className="w-80 bg-zinc-950 border-l border-white/10 flex flex-col">
          {showParticipants ? (
            <>
              <div className="p-4 border-b border-white/10 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-blue-400" />
                  Participants ({participantCount})
                  {raisedHandCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-[11px] font-semibold">
                      ✋ {raisedHandCount}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowParticipants(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  <div className={`flex items-center gap-3 p-2.5 rounded-lg ${isHandRaised ? "bg-yellow-500/10 border border-yellow-400/20" : "bg-zinc-900"}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {user?.name} <span className="text-zinc-500 text-xs">(You)</span>
                        {isHandRaised && <span className="text-base animate-bounce">✋</span>}
                      </div>
                      {isScreenSharing && <div className="text-xs text-blue-400 flex items-center gap-1 mt-0.5"><MonitorUp className="w-3 h-3" /> Sharing screen</div>}
                    </div>
                  </div>
                  {Object.entries(participants).map(([id, p]) => (
                    <div key={id} className={`flex items-center gap-3 p-2.5 rounded-lg ${p.isHandRaised ? "bg-yellow-500/10 border border-yellow-400/20" : "bg-zinc-900"}`}>
                      <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold shrink-0">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {p.name}
                          {p.isHandRaised && <span className="text-base animate-bounce">✋</span>}
                        </div>
                        {p.isScreenSharing && <div className="text-xs text-blue-400 flex items-center gap-1 mt-0.5"><MonitorUp className="w-3 h-3" /> Sharing screen</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-white/10 font-medium flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Meeting Chat
                </div>
                <button onClick={() => setShowChat(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-600 text-sm mt-8">No messages yet</div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, i) => (
                      <div key={i}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-xs text-zinc-300">{msg.sender}</span>
                          <span className="text-[11px] text-zinc-600">{msg.time}</span>
                        </div>
                        <div className="bg-zinc-900 rounded-xl p-3 text-sm text-zinc-200 leading-relaxed">
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <form onSubmit={sendChatMessage} className="p-3 border-t border-white/10 flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={e => setChatMessage(e.target.value)}
                  placeholder="Message..."
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-blue-500 text-sm"
                />
                <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  children, onClick, title, active, activeClass, inactiveClass
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active: boolean;
  activeClass: string;
  inactiveClass: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-11 h-11 rounded-full text-white transition-all ${active ? activeClass : inactiveClass} hover:opacity-80`}
    >
      {children}
    </button>
  );
}
