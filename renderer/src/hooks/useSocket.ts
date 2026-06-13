import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';
import { useAuthStore } from '../store/auth';

type EventHandler = (data: unknown) => void;

interface SocketEvents {
  qr?: EventHandler;
  session_status?: EventHandler;
  message?: EventHandler;
}

export function useSocket(events: SocketEvents) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    if (events.qr) socket.on('qr', events.qr);
    if (events.session_status) socket.on('session_status', events.session_status);
    if (events.message) socket.on('message', events.message);

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return socketRef;
}
