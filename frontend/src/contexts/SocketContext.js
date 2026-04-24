import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const callbacksRef = useRef({
    queue_update: [],
    patient_status_update: [],
    display_update: [],
    patient_referral: []
  });

  useEffect(() => {
    // Connect to Socket.IO server
    // Use environment variable or auto-detect based on hostname
    const runtimeUrl = typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined;
    const envUrl = process.env.REACT_APP_API_URL || process.env.APP_BACKEND_URL || process.env.VITE_BACKEND_URL;
    const defaultUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://backend-python-production-7d12.up.railway.app'  // Render backend URL (update with your actual service name)
      : 'http://localhost:8000';
    
    const SOCKET_URL = (runtimeUrl || envUrl || defaultUrl).replace(/\/$/, '');
    console.log('Socket.IO connecting to:', SOCKET_URL);
    
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      setConnected(false);
    });

    // Set up event listeners
    socketInstance.on('queue_update', (data) => {
      console.log('📢 Queue update received:', data);
      callbacksRef.current.queue_update.forEach(callback => callback(data));
    });

    socketInstance.on('patient_status_update', (data) => {
      console.log('📢 Patient status update received:', data);
      callbacksRef.current.patient_status_update.forEach(callback => callback(data));
    });

    socketInstance.on('display_update', (data) => {
      console.log('📢 Display update received:', data);
      callbacksRef.current.display_update.forEach(callback => callback(data));
    });

    socketInstance.on('patient_referral', (data) => {
      console.log('📢 Patient referral received:', data);
      callbacksRef.current.patient_referral.forEach(callback => callback(data));
    });

    setSocket(socketInstance);

    return () => {
      console.log('🔌 Disconnecting Socket.IO');
      socketInstance.disconnect();
    };
  }, []);

  const joinOPD = (opdType) => {
    if (socket && connected) {
      socket.emit('join_opd', { opd_type: opdType });
      console.log(`✅ Joined OPD: ${opdType}`);
    } else {
      console.warn('❌ Cannot join OPD - socket not connected');
    }
  };

  const leaveOPD = (opdType) => {
    if (socket && connected) {
      socket.emit('leave_opd', { opd_type: opdType });
      console.log(`👋 Left OPD: ${opdType}`);
    }
  };

  const joinDisplay = () => {
    if (socket && connected) {
      socket.emit('join_display', {});
      console.log('✅ Joined display room');
    } else {
      console.warn('❌ Cannot join display - socket not connected');
    }
  };

  const leaveDisplay = () => {
    if (socket && connected) {
      socket.emit('leave_display', {});
      console.log('👋 Left display room');
    }
  };

  const onQueueUpdate = (callback) => {
    if (!callbacksRef.current.queue_update.includes(callback)) {
      callbacksRef.current.queue_update.push(callback);
    }
  };

  const onPatientStatusUpdate = (callback) => {
    if (!callbacksRef.current.patient_status_update.includes(callback)) {
      callbacksRef.current.patient_status_update.push(callback);
    }
  };

  const onDisplayUpdate = (callback) => {
    if (!callbacksRef.current.display_update.includes(callback)) {
      callbacksRef.current.display_update.push(callback);
    }
  };

  const onPatientReferral = (callback) => {
    if (!callbacksRef.current.patient_referral.includes(callback)) {
      callbacksRef.current.patient_referral.push(callback);
    }
  };

  const removeAllListeners = () => {
    callbacksRef.current = {
      queue_update: [],
      patient_status_update: [],
      display_update: [],
      patient_referral: []
    };
  };

  const value = {
    socket,
    connected,
    joinOPD,
    leaveOPD,
    joinDisplay,
    leaveDisplay,
    onQueueUpdate,
    onPatientStatusUpdate,
    onDisplayUpdate,
    onPatientReferral,
    removeAllListeners,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

