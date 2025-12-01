import { ChatSession } from "../types";
import { GOOGLE_SCRIPT_URL } from "../constants";

const LOCAL_STORAGE_KEY = 'simuchat_sessions';

// ---------------- LOCAL STORAGE HELPERS ----------------

const getLocalSessions = (): ChatSession[] => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return parsed.map((session: any) => ({
        ...session,
        messages: session.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
        }))
    })).sort((a: ChatSession, b: ChatSession) => 
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );
  } catch (e) {
    return [];
  }
};

const saveLocalSession = (session: ChatSession) => {
  const sessions = getLocalSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
};

// ---------------- EXPORTED FUNCTIONS ----------------

export const isCloudActive = () => !!GOOGLE_SCRIPT_URL;

/**
 * Saves a session.
 * 1. Saves to Local Storage (immediate backup).
 * 2. If Script URL is present, sends POST request to Google Sheet.
 */
export const saveSession = async (session: ChatSession) => {
  // Always save locally first
  saveLocalSession(session);

  // Sync to Cloud (Google Sheet)
  if (GOOGLE_SCRIPT_URL) {
    try {
      // Using 'no-cors' mode is often required for Google Apps Script Web Apps
      // to avoid CORS errors when sending data from the browser.
      // The response will be opaque, but the data is sent.
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify(session)
      });
    } catch (e) {
      console.error("Failed to sync to Google Sheet:", e);
    }
  }
};

/**
 * Loads sessions from the Cloud (Google Sheet).
 * Used by AdminDashboard.
 */
export const fetchCloudSessions = async (): Promise<ChatSession[]> => {
    if (!GOOGLE_SCRIPT_URL) return getLocalSessions();

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        // Transform incoming JSON back to proper types (Dates)
        return data.map((session: any) => ({
            ...session,
            messages: (session.messages || []).map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp)
            }))
        })).sort((a: ChatSession, b: ChatSession) => 
             new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );
    } catch (e) {
        console.error("Error fetching from Google Sheet. Check CORS/Permissions.", e);
        return [];
    }
}

export const subscribeToSessions = (callback: (sessions: ChatSession[]) => void): (() => void) => {
  // Since Google Sheets isn't "Realtime" like Firebase, we pull data once 
  // and maybe poll every 15 seconds if cloud is active.
  
  const loadData = async () => {
      if (isCloudActive()) {
          const cloudData = await fetchCloudSessions();
          // If cloud fetch returns empty (error or empty), fall back to local if we have nothing?
          // For admin, we usually want to see what's in the cloud.
          callback(cloudData);
      } else {
          callback(getLocalSessions());
      }
  };

  loadData();
  
  // Poll every 10 seconds to simulate realtime
  const interval = setInterval(loadData, 10000);

  return () => clearInterval(interval);
};

export const deleteSession = async (sessionId: string) => {
  // Delete Local
  const sessions = getLocalSessions().filter(s => s.id !== sessionId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));

  // Delete Cloud (Send specific action to script)
  if (GOOGLE_SCRIPT_URL) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'DELETE', id: sessionId })
        });
      } catch(e) {
          console.error("Failed to delete from cloud", e);
      }
  }
};

export const clearAllSessions = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  // Not implementing clear all for Cloud to prevent accidental wipe of the sheet by one click
  alert("Lokální data smazána. Pro smazání historie cloudu vymažte řádky v Google Tabulce.");
};