
import { P2PMessage, UserProfile } from "../types";

// Declare PeerJS globally
declare const Peer: any;

let peer: any = null;
let conn: any = null;
let onDataCallback: ((data: P2PMessage) => void) | null = null;
let onConnectCallback: (() => void) | null = null;
let onCloseCallback: (() => void) | null = null;

const PREFIX = "SIMUCHAT-";

/**
 * Initializes PeerJS and creates a Host ID
 */
export const initializeHost = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Generate a simple 4-digit code
    const shortCode = Math.floor(1000 + Math.random() * 9000).toString();
    const peerId = `${PREFIX}${shortCode}`;

    if (peer) peer.destroy();

    peer = new Peer(peerId, {
      debug: 1,
      config: {
        'iceServers': [
          { url: 'stun:stun.l.google.com:19302' },
          { url: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id: string) => {
      console.log('My peer ID is: ' + id);
      resolve(shortCode);
    });

    peer.on('connection', (connection: any) => {
      console.log("Incoming connection...");
      setupConnection(connection);
    });

    peer.on('error', (err: any) => {
      console.error("PeerJS Error:", err);
      reject(err);
    });
  });
};

/**
 * Connects to a Host ID using the short code
 */
export const joinSession = async (shortCode: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const peerId = `${PREFIX}${shortCode}`;
    
    if (peer) peer.destroy();

    // Create a random ID for the joiner
    peer = new Peer(null, {
      debug: 1
    });

    peer.on('open', () => {
      const connection = peer.connect(peerId);
      
      connection.on('open', () => {
        console.log("Connected to host!");
        setupConnection(connection);
        resolve();
      });

      connection.on('error', (err: any) => {
        reject(err);
      });
      
      // Fallback if 'open' doesn't fire immediately but error does
      setTimeout(() => {
          if (!conn || !conn.open) reject(new Error("Connection timeout"));
      }, 5000);
    });

    peer.on('error', (err: any) => {
        reject(err);
    });
  });
};

const setupConnection = (connection: any) => {
  if (conn) conn.close();
  conn = connection;

  conn.on('data', (data: any) => {
    if (onDataCallback) onDataCallback(data);
  });

  conn.on('close', () => {
    console.log("Connection closed");
    if (onCloseCallback) onCloseCallback();
  });
  
  // Notify setup screen that connection is ready
  if (onConnectCallback) onConnectCallback();
};

export const sendMessageP2P = (type: 'CHAT' | 'HANDSHAKE' | 'TYPING', payload: any) => {
  if (conn && conn.open) {
    const msg: P2PMessage = { type, payload };
    conn.send(msg);
  } else {
      console.warn("Cannot send P2P message: Connection not open");
  }
};

export const setP2PCallbacks = (
    onData: (data: P2PMessage) => void, 
    onConnect?: () => void,
    onClose?: () => void
) => {
  onDataCallback = onData;
  if(onConnect) onConnectCallback = onConnect;
  if(onClose) onCloseCallback = onClose;
};

export const closeP2P = () => {
    if (conn) conn.close();
    if (peer) peer.destroy();
    peer = null;
    conn = null;
}
