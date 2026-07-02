import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { logger } from "./logger";

interface RoomUser {
  socketId: string;
  userId: string;
  userName: string;
}

const rooms = new Map<string, RoomUser[]>();

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    // ── Room management ──────────────────────────────────────────────
    socket.on("join-room", ({ roomCode, userId, userName }: { roomCode: string; userId: string; userName: string }) => {
      socket.join(roomCode);

      if (!rooms.has(roomCode)) rooms.set(roomCode, []);
      const roomUsers = rooms.get(roomCode)!;
      const existing = roomUsers.find(u => u.userId === userId);
      if (!existing) {
        roomUsers.push({ socketId: socket.id, userId, userName });
      } else {
        existing.socketId = socket.id;
      }

      socket.to(roomCode).emit("user-joined", { userId, userName });
      const others = roomUsers.filter(u => u.userId !== userId);
      socket.emit("existing-users", others);
      logger.info({ roomCode, userId, userName }, "User joined room");
    });

    socket.on("leave-room", ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      handleLeave(socket, io, roomCode, userId);
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
      for (const [roomCode, users] of rooms.entries()) {
        const user = users.find(u => u.socketId === socket.id);
        if (user) handleLeave(socket, io, roomCode, user.userId);
      }
    });

    // ── WebRTC signaling ─────────────────────────────────────────────
    // Frontend sends: { targetId, offer, type: "camera"|"screen" }
    socket.on("offer", ({ targetId, offer, type }: { targetId: string; offer: object; type: string }) => {
      const targetSocket = findSocketId(targetId);
      if (targetSocket) {
        io.to(targetSocket).emit("offer", { senderId: getUserIdForSocket(socket.id), offer, type });
      }
    });

    socket.on("answer", ({ targetId, answer, type }: { targetId: string; answer: object; type: string }) => {
      const targetSocket = findSocketId(targetId);
      if (targetSocket) {
        io.to(targetSocket).emit("answer", { senderId: getUserIdForSocket(socket.id), answer, type });
      }
    });

    socket.on("ice-candidate", ({ targetId, candidate, type }: { targetId: string; candidate: object; type: string }) => {
      const targetSocket = findSocketId(targetId);
      if (targetSocket) {
        io.to(targetSocket).emit("ice-candidate", { senderId: getUserIdForSocket(socket.id), candidate, type });
      }
    });

    // ── Chat ─────────────────────────────────────────────────────────
    socket.on("chat-message", (msg: { roomCode: string; sender: string; text: string; time: string }) => {
      // Broadcast to others in the room (sender already adds it locally)
      socket.to(msg.roomCode).emit("chat-message", { sender: msg.sender, text: msg.text, time: msg.time });
    });

    // ── Screen sharing ────────────────────────────────────────────────
    socket.on("screen-share-started", ({ roomCode, userId, userName }: { roomCode: string; userId: string; userName: string }) => {
      socket.to(roomCode).emit("screen-share-started", { userId, userName });
      logger.info({ roomCode, userId }, "Screen share started");
    });

    socket.on("screen-share-stopped", ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      socket.to(roomCode).emit("screen-share-stopped", { userId });
      logger.info({ roomCode, userId }, "Screen share stopped");
    });

    // ── Hand raise ───────────────────────────────────────────────────
    socket.on("raise-hand", ({ roomCode, userId, userName }: { roomCode: string; userId: string; userName: string }) => {
      socket.to(roomCode).emit("raise-hand", { userId, userName });
      logger.info({ roomCode, userId }, "Hand raised");
    });

    socket.on("lower-hand", ({ roomCode, userId }: { roomCode: string; userId: string }) => {
      socket.to(roomCode).emit("lower-hand", { userId });
      logger.info({ roomCode, userId }, "Hand lowered");
    });

    // ── Media state ──────────────────────────────────────────────────
    socket.on("media-state", ({ roomCode, userId, audio, video }: { roomCode: string; userId: string; audio: boolean; video: boolean }) => {
      socket.to(roomCode).emit("media-state", { userId, audio, video });
    });
  });

  return io;
}

function findSocketId(userId: string): string | null {
  for (const users of rooms.values()) {
    const u = users.find(u => u.userId === userId);
    if (u) return u.socketId;
  }
  return null;
}

function getUserIdForSocket(socketId: string): string {
  for (const users of rooms.values()) {
    const u = users.find(u => u.socketId === socketId);
    if (u) return u.userId;
  }
  return socketId;
}

function handleLeave(socket: Socket, io: SocketServer, roomCode: string, userId: string): void {
  socket.leave(roomCode);
  const roomUsers = rooms.get(roomCode);
  if (roomUsers) {
    const idx = roomUsers.findIndex(u => u.userId === userId);
    if (idx !== -1) roomUsers.splice(idx, 1);
    if (roomUsers.length === 0) rooms.delete(roomCode);
  }
  socket.to(roomCode).emit("user-left", { userId });
  logger.info({ roomCode, userId }, "User left room");
}
