import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

/** One shared connection; the httpOnly cookie authenticates the handshake. */
export function getSocket(): Socket {
  socket ??= io(API_URL.replace(/\/api$/, ""), { withCredentials: true, autoConnect: true });
  return socket;
}
export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
