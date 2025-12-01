
import React, { useState, useEffect } from 'react';
import { subscribeToSessions, deleteSession, clearAllSessions, isCloudActive } from '../services/storageService';
import { ChatSession, GameMode } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple hardcoded password for simulation purposes
  const ADMIN_PASSWORD = "admin"; 

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    if (isAuthenticated) {
      setLoading(true);
      // Connect to storage (Google Sheets polling or Local)
      unsubscribe = subscribeToSessions((data) => {
        setSessions(data);
        setLoading(false);
        
        // Update selected session if it changes
        if (selectedSession) {
            const updated = data.find(s => s.id === selectedSession.id);
            if (updated) setSelectedSession(updated);
        }
      });
    }

    return () => {
        unsubscribe();
    };
  }, [isAuthenticated, selectedSession?.id]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert("Nesprávné heslo. (Nápověda: admin)");
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Opravdu smazat tento záznam?")) {
      deleteSession(id);
      if (selectedSession?.id === id) setSelectedSession(null);
    }
  };
  
  const handleClearAll = () => {
      if(confirm("POZOR: Opravdu chcete smazat lokální historii? (Data v Google Tabulce zůstanou)")) {
          clearAllSessions();
          setSelectedSession(null);
          // Refresh list manually if needed, though subscription should catch local clear
          setSessions([]);
      }
  }

  const handleDownload = () => {
    if (!selectedSession) return;

    const isDuo = selectedSession.mode === GameMode.DUO;
    const modeLabel = isDuo ? "PÁROVÁ VÝUKA (Dva žáci)" : "SIMULACE S AI";

    const lines = [
      `SIMUCHAT - ZÁZNAM KONVERZACE`,
      `----------------------------------------`,
      `Režim: ${modeLabel}`,
      `Žák 1 (Přihlášen): ${selectedSession.studentName}`,
      `E-mail: ${selectedSession.studentEmail || 'Neuveden'}`,
      `Třída: ${selectedSession.studentClass || 'Neuvedena'}`,
      `Téma: ${selectedSession.topic}`,
      `Role: ${selectedSession.roleUser} (Žák 1) vs ${selectedSession.rolePartner} (${isDuo ? 'Žák 2' : 'AI'})`,
      `Datum: ${new Date(selectedSession.lastActive).toLocaleString()}`,
      `----------------------------------------`,
      `\nPRŮBĚH CHATU:\n`
    ];

    selectedSession.messages.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      // If it's duo mode, partner message is Student 2, otherwise AI
      const sender = msg.isUser 
        ? selectedSession.studentName 
        : (isDuo ? selectedSession.rolePartner : `AI (${selectedSession.rolePartner})`);
      
      let content = msg.text;
      
      if (msg.attachmentType === 'image') content = "[Obrázek]";
      if (msg.attachmentType === 'audio') content = "[Hlasová zpráva]";

      lines.push(`[${time}] ${sender}: ${content}`);
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simuchat_${selectedSession.studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-gray-800"><i className="fa-solid fa-lock mr-2"></i>Admin zóna</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Heslo (admin)"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-700">Přihlásit</button>
              <button type="button" onClick={onBack} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">Zpět</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const cloudActive = isCloudActive();

  return (
    <div className="h-full bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar List */}
      <div className={`w-full md:w-1/3 bg-white border-r border-gray-200 flex flex-col h-full ${selectedSession ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-gray-800 text-white flex flex-col gap-2 shadow-md z-10">
          <div className="flex justify-between items-center">
             <h2 className="font-bold">Konverzace žáků</h2>
             <div className="flex gap-2">
                <button onClick={handleClearAll} className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded" title="Smazat lokální data">
                    <i className="fa-solid fa-trash"></i>
                </button>
                <button onClick={onBack} className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded">
                   Odhlásit
                </button>
             </div>
          </div>
          {/* Status Indicator */}
          <div className={`text-[10px] py-1 px-2 rounded flex items-center gap-2 ${cloudActive ? 'bg-green-600 text-white' : 'bg-yellow-600 text-yellow-100'}`}>
              <div className={`w-2 h-2 rounded-full ${cloudActive ? 'bg-green-300 animate-pulse' : 'bg-yellow-300'}`}></div>
              {cloudActive 
                ? 'CLOUD AKTIVNÍ: Data se ukládají do Google Tabulky' 
                : 'LOKÁLNÍ REŽIM: Data jsou pouze v tomto prohlížeči'}
          </div>
          {cloudActive && (
              <a 
                href={isCloudActive() ? "https://docs.google.com/spreadsheets" : "#"} 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] text-gray-300 hover:text-white underline"
              >
                  Otevřít Google Tabulku
              </a>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="p-8 text-center text-gray-500">
                 <i className="fa-solid fa-spinner animate-spin mr-2"></i> Načítám data...
             </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Žádné uložené konverzace.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessions.map((session) => (
                <li 
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSession?.id === session.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-800">{session.studentName}</span>
                    <span className="text-[10px] text-gray-400">
                        {new Date(session.lastActive).toLocaleDateString()} {new Date(session.lastActive).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500 mb-1">
                      <span>{session.studentClass}</span>
                      {session.mode === GameMode.DUO && (
                          <span className="bg-purple-100 text-purple-700 px-1.5 rounded font-bold">DUO</span>
                      )}
                  </div>
                  <p className="text-xs text-indigo-600 font-medium truncate mb-1">
                    <i className="fa-solid fa-tag mr-1"></i>{session.topic}
                  </p>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-gray-500 truncate max-w-[120px]">Role: {session.roleUser}</span>
                     <button 
                        onClick={(e) => handleDelete(e, session.id)}
                        className="text-gray-300 hover:text-red-500 p-1"
                        title="Smazat záznam"
                     >
                        <i className="fa-solid fa-trash-can"></i>
                     </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className={`w-full md:w-2/3 bg-gray-50 flex flex-col h-full ${!selectedSession ? 'hidden md:flex' : 'flex'}`}>
        {selectedSession ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedSession(null)}
                    className="md:hidden p-2 text-gray-600"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{selectedSession.studentName}</h3>
                        {selectedSession.mode === GameMode.DUO && (
                             <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-200">
                                 PÁROVÁ VÝUKA
                             </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 flex gap-2">
                       <span><i className="fa-solid fa-users mr-1"></i>{selectedSession.studentClass || 'N/A'}</span>
                       <span>|</span>
                       <span><i className="fa-solid fa-envelope mr-1"></i>{selectedSession.studentEmail || 'N/A'}</span>
                    </p>
                  </div>
              </div>
              <button 
                onClick={handleDownload}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Stáhnout záznam konverzace"
              >
                  <i className="fa-solid fa-download"></i>
                  <span className="hidden sm:inline">Stáhnout zápis</span>
              </button>
            </div>

            <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-b border-gray-200 flex justify-between">
                <span><strong>Téma:</strong> {selectedSession.topic}</span>
                <span><strong>Role:</strong> {selectedSession.roleUser} vs {selectedSession.rolePartner}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedSession.messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                   <div className="flex items-end gap-2 max-w-[80%]">
                      {!msg.isUser && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              selectedSession.mode === GameMode.DUO 
                              ? 'bg-orange-100 text-orange-600' 
                              : 'bg-purple-100 text-purple-600'
                          }`}>
                              {selectedSession.mode === GameMode.DUO ? 'Ž2' : 'AI'}
                          </div>
                      )}
                      <div className={`p-3 rounded-lg text-sm ${
                          msg.isUser 
                          ? 'bg-blue-100 text-blue-900 rounded-br-none' 
                          : 'bg-white border border-gray-200 rounded-bl-none'
                      }`}>
                        {msg.attachmentType === 'image' && (
                            <div className="mb-1 text-xs text-gray-500 italic">[Obrázek]</div>
                        )}
                        {msg.attachmentType === 'audio' && (
                            <div className="mb-1 text-xs text-gray-500 italic">[Hlasová zpráva]</div>
                        )}
                        {msg.text}
                      </div>
                      {msg.isUser && (
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                              Ž1
                          </div>
                      )}
                   </div>
                   <span className="text-[10px] text-gray-400 mt-1 px-9">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                   </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <i className="fa-solid fa-clipboard-list text-4xl mb-2"></i>
            <p>Vyberte konverzaci ze seznamu</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
