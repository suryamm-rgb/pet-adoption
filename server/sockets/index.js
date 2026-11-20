import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { Booking } from "../models/index.js";
import { attachIo } from "../services/notify.js";

function cookieValue(header = "", name) {
  return header.split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1];
}

export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientUrls, credentials: true } });
  attachIo(io);

  io.use((socket, next) => {
    try {
      const token = cookieValue(socket.handshake.headers.cookie, "token") ?? socket.handshake.auth?.token;
      socket.userId = jwt.verify(token, env.jwtSecret).sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.on("booking:join", async (bookingId, ack) => {
      const b = await Booking.findById(bookingId).select("ownerId caretakerId");
      const ok = b && [String(b.ownerId), String(b.caretakerId)].includes(socket.userId);
      if (ok) socket.join(`booking:${bookingId}`);
      ack?.({ ok: Boolean(ok) });
    });
    socket.on("typing", ({ bookingId }) => socket.to(`booking:${bookingId}`).emit("typing", { userId: socket.userId }));
  });
  return io;
}
