import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';
import { useAuthStore } from '../store/auth';

type EventHandler = (data: unknown) => void;

interface SocketEvents {
  qr?: EventHandler;
  session_status?: EventHandler;
  message?: EventHandler;
}

let _socket: Socket | null = null;
let _socketToken: string | null = null;

function getOrCreateSocket(token: string): Socket {
  if (_socket && _socketToken === token && (_socket.connected || _socket.active)) {
    return _socket;
  }
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  _socketToken = token;
  _socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return _socket;
}

export function useSocket(events: SocketEvents) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const socket = getOrCreateSocket(token);

    if (events.qr) socket.on('qr', events.qr);
    if (events.session_status) socket.on('session_status', events.session_status);
    if (events.message) socket.on('message', events.message);

    return () => {
      if (events.qr) socket.off('qr', events.qr);
      if (events.session_status) socket.off('session_status', events.session_status);
      if (events.message) socket.off('message', events.message);
    };
  }, [token]);
}
