
import React, { useState, useEffect } from 'react';
import { AppTheme, ChatSettings, GameMode } from '../types';
import { THEMES, INITIAL_SETTINGS, LOGO_URL } from '../constants';
import AvatarUpload from './AvatarUpload';
import { initializeHost, joinSession, closeP2P, setP2PCallbacks } from '../services/p2pService';

interface SetupScreenProps {
  realStudentName: string;
  realStudentEmail: string;
  realStudentClass: string;
  onStart: (settings: ChatSettings) => void;
  onLogout: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ realStudentName, realStudentEmail, realStudentClass, onStart, onLogout }) => {
  const [settings, setSettings] = useState<ChatSettings>({
      ...INITIAL_SETTINGS,
      realStudentName: realStudentName,
      realStudentEmail: realStudentEmail,
      realStudentClass: realStudentClass
  });
  const [error, setError] = useState('');
  
  // Remote Mode State
  const [p2pStage, setP2PStage] = useState<'NONE' | 'HOSTING' | 'JOINING'>('NONE');
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    // Reset P2P when switching modes
    if (settings.mode !== GameMode.REMOTE) {
        setP2PStage('NONE');
        setGeneratedCode('');
        setConnectionStatus('');
        closeP2P();
    }
  }, [settings.mode]);

  const handleStart = () => {
    if (!settings.topic.trim()) {
      setError('Prosím zadej téma konverzace.');
      return;
    }
    if (!settings.user.name.trim()) {
      setError('Prosím vyplň své jméno.');
      return;
    }
    if (settings.mode !== GameMode.REMOTE && !settings.partner.name.trim()) {
      setError('Prosím vyplň jméno partnera.');
      return;
    }
    if (!settings.user.role.trim()) {
      setError('Prosím vyplň svou roli.');
      return;
    }

    // Ensure real identities are passed correctly
    onStart({ 
        ...settings, 
        realStudentName,
        realStudentEmail,
        realStudentClass,
        p2pCode: generatedCode || joinCode
    });
  };

  const handleCreateRoom = async () => {
      setIsWaiting(true);
      setConnectionStatus('Generuji kód místnosti...');
      try {
          const code = await initializeHost();
          setGeneratedCode(code);
          setP2PStage('HOSTING');
          setConnectionStatus('Čekám na připojení partnera...');
          
          // Set up listener for when partner connects
          setP2PCallbacks(() => {}, () => {
              // On Connect
              handleStart(); // Auto-start when connected
          });
          setIsWaiting(false);
      } catch (e) {
          setError('Nepodařilo se vytvořit místnost. Zkuste to znovu.');
          setIsWaiting(false);
      }
  };

  const handleJoinRoom = async () => {
      if (!joinCode || joinCode.length !== 4) {
          setError('Zadejte prosím 4-místný kód.');
          return;
      }
      setIsWaiting(true);
      setConnectionStatus('Připojuji se...');
      try {
          await joinSession(joinCode);
          handleStart(); // Auto-start when connected
      } catch (e) {
          setError('Nepodařilo se připojit. Zkontrolujte kód.');
          setIsWaiting(false);
      }
  };

  return (
    <div className="h-full w-full bg-gray-50 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-4">
        
        {/* User Info Header */}
        <div className="w-full max-w-lg flex justify-between items-center mb-2 px-1">
             <div className="text-sm text-gray-600 flex flex-col sm:flex-row sm:gap-2">
                 <span>Přihlášen: <span className="font-bold text-indigo-600">{realStudentName}</span></span>
                 <span className="hidden sm:inline text-gray-300">|</span>
                 <span className="text-gray-500 text-xs sm:text-sm pt-0.5">{realStudentClass}</span>
             </div>
             <button onClick={onLogout} className="text-xs text-red-500 hover:underline whitespace-nowrap ml-2">
                 Odhlásit se
             </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden mb-4">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center text-white">
            {LOGO_URL ? (
                <div className="flex flex-col items-center">
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/20 mb-1 shadow-sm">
                        <img src={LOGO_URL} alt="SimuChat" className="h-12 object-contain" />
                    </div>
                    <p className="text-blue-100 text-sm mt-1">Nastavení simulačního prostředí</p>
                </div>
            ) : (
                <>
                    <h1 className="text-3xl font-bold mb-2">SimuChat</h1>
                    <p className="text-blue-100 text-sm">Nastavení simulačního prostředí</p>
                </>
            )}
          </div>

          <div className="p-6 space-y-6">
            
            {/* Topic Section */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                <i className="fa-solid fa-comments mr-2 text-indigo-500"></i>
                Téma / Zadání aktivity
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-20 text-sm"
                placeholder="Např.: Reklamace rozbitého telefonu, Domluva rande, Pohovor do práce..."
                value={settings.topic}
                onChange={(e) => {
                  setSettings({ ...settings, topic: e.target.value });
                  setError('');
                }}
              />
            </div>

             {/* Mode Selection */}
             <div className="space-y-2">
               <label className="block text-sm font-bold text-gray-700">
                 <i className="fa-solid fa-gamepad mr-2 text-indigo-500"></i>
                 Typ aktivity (Režim)
               </label>
               <div className="flex bg-gray-100 p-1 rounded-xl">
                 <button
                   onClick={() => setSettings({...settings, mode: GameMode.AI})}
                   className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                     settings.mode === GameMode.AI 
                       ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                       : 'text-gray-500 hover:text-gray-700'
                   }`}
                 >
                   <i className="fa-solid fa-robot"></i>
                   Simulace AI
                 </button>
                 <button
                   onClick={() => setSettings({...settings, mode: GameMode.DUO})}
                   className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                     settings.mode === GameMode.DUO 
                       ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                       : 'text-gray-500 hover:text-gray-700'
                   }`}
                 >
                   <i className="fa-solid fa-user-group"></i>
                   Párová (Duo)
                 </button>
                 <button
                   onClick={() => setSettings({...settings, mode: GameMode.REMOTE})}
                   className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                     settings.mode === GameMode.REMOTE 
                       ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                       : 'text-gray-500 hover:text-gray-700'
                   }`}
                 >
                   <i className="fa-solid fa-wifi"></i>
                   Na dálku
                 </button>
               </div>
               <p className="text-[10px] text-gray-400 pl-1">
                 {settings.mode === GameMode.AI && "Chatuješ s automatickým robotem, který hraje zadanou roli."}
                 {settings.mode === GameMode.DUO && "U jednoho zařízení sedí dva žáci a střídají se v psaní."}
                 {settings.mode === GameMode.REMOTE && "Dva žáci na různých zařízeních (přes internet)."}
               </p>
             </div>

            <div className="h-px bg-gray-200"></div>

            {/* Profiles */}
            <div className="flex justify-between gap-4">
              {/* User Profile */}
              <div className={`flex flex-col gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100 ${settings.mode === GameMode.REMOTE ? 'w-full' : 'w-[48%]'}`}>
                <h3 className="text-xs font-bold text-blue-800 text-center uppercase mb-1">
                    Tvůj profil
                </h3>
                <div className={settings.mode === GameMode.REMOTE ? "flex gap-4 items-center" : ""}>
                    <AvatarUpload 
                      label=""
                      currentUrl={settings.user.avatarUrl}
                      onImageChange={(url) => setSettings(prev => ({ ...prev, user: { ...prev.user, avatarUrl: url } }))}
                    />
                    <div className="space-y-2 mt-1 w-full">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 ml-1">Jméno</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none"
                          placeholder="Jméno"
                          value={settings.user.name}
                          onChange={(e) => setSettings(prev => ({ ...prev, user: { ...prev.user, name: e.target.value } }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 ml-1">Role</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:border-blue-500 outline-none"
                          placeholder="Např. Zákazník"
                          value={settings.user.role}
                          onChange={(e) => setSettings(prev => ({ ...prev, user: { ...prev.user, role: e.target.value } }))}
                        />
                      </div>
                    </div>
                </div>
              </div>

              {/* Partner Profile (Hidden in Remote mode) */}
              {settings.mode !== GameMode.REMOTE && (
                  <div className="flex flex-col gap-2 w-[48%] bg-purple-50 p-3 rounded-xl border border-purple-100">
                    <h3 className="text-xs font-bold text-purple-800 text-center uppercase mb-1">
                        {settings.mode === GameMode.DUO ? "Žák 2" : "Profil partnera (AI)"}
                    </h3>
                    <AvatarUpload 
                      label=""
                      currentUrl={settings.partner.avatarUrl}
                      onImageChange={(url) => setSettings(prev => ({ ...prev, partner: { ...prev.partner, avatarUrl: url } }))}
                    />
                    <div className="space-y-2 mt-1">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 ml-1">Jméno</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:border-purple-500 outline-none"
                          placeholder="Jméno"
                          value={settings.partner.name}
                          onChange={(e) => setSettings(prev => ({ ...prev, partner: { ...prev.partner, name: e.target.value } }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500 ml-1">Role</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:border-purple-500 outline-none"
                          placeholder="Např. Prodavač"
                          value={settings.partner.role}
                          onChange={(e) => setSettings(prev => ({ ...prev, partner: { ...prev.partner, role: e.target.value } }))}
                        />
                      </div>
                    </div>
                  </div>
              )}
            </div>

            <div className="h-px bg-gray-200"></div>
            
            {/* REMOTE MODE LOBBY */}
            {settings.mode === GameMode.REMOTE && (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-4">
                    <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                        <i className="fa-solid fa-plug"></i>
                        Připojení k druhému zařízení
                    </h3>
                    
                    {p2pStage === 'NONE' && (
                        <div className="flex gap-3">
                            <button 
                                onClick={handleCreateRoom}
                                className="flex-1 bg-white border border-orange-200 text-orange-700 py-3 rounded-lg font-bold shadow-sm hover:bg-orange-100 transition-colors"
                            >
                                <i className="fa-solid fa-plus-circle block text-xl mb-1"></i>
                                Vytvořit místnost
                            </button>
                            <div className="flex items-center text-gray-400 font-bold text-xs">NEBO</div>
                            <button 
                                onClick={() => setP2PStage('JOINING')}
                                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-bold shadow-sm hover:bg-orange-700 transition-colors"
                            >
                                <i className="fa-solid fa-right-to-bracket block text-xl mb-1"></i>
                                Připojit se
                            </button>
                        </div>
                    )}

                    {p2pStage === 'HOSTING' && (
                        <div className="text-center">
                            <p className="text-xs text-orange-600 mb-2">Nadiktujte tento kód spolužákovi:</p>
                            <div className="text-4xl font-mono font-bold tracking-widest text-gray-800 bg-white border-2 border-orange-300 p-4 rounded-xl mb-2 select-all">
                                {generatedCode}
                            </div>
                            <div className="text-sm text-gray-500 animate-pulse">
                                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                {connectionStatus}
                            </div>
                            <button onClick={() => setP2PStage('NONE')} className="text-xs text-red-500 hover:underline mt-4">
                                Zrušit
                            </button>
                        </div>
                    )}

                    {p2pStage === 'JOINING' && (
                         <div className="text-center">
                             <p className="text-xs text-orange-600 mb-2">Zadejte kód od spolužáka:</p>
                             <div className="flex justify-center mb-4">
                                 <input 
                                    type="text" 
                                    maxLength={4}
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="0000"
                                    className="w-40 text-center text-3xl font-mono font-bold p-2 border-2 border-orange-300 rounded-lg outline-none focus:border-orange-500 uppercase"
                                 />
                             </div>
                             {isWaiting ? (
                                 <div className="text-sm text-gray-500 animate-pulse">
                                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                    {connectionStatus}
                                 </div>
                             ) : (
                                 <div className="flex gap-2">
                                     <button onClick={() => setP2PStage('NONE')} className="flex-1 py-2 text-gray-500 bg-white border border-gray-300 rounded-lg">
                                         Zpět
                                     </button>
                                     <button onClick={handleJoinRoom} className="flex-1 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700">
                                         Připojit
                                     </button>
                                 </div>
                             )}
                         </div>
                    )}
                </div>
            )}

            {/* Theme Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">Barva chatu</label>
              
              {/* Standard Presets */}
              <div className="flex flex-wrap justify-center gap-3">
                {Object.values(AppTheme)
                  .filter(themeName => themeName !== AppTheme.CUSTOM)
                  .map((themeName) => {
                    const color = THEMES[themeName];
                    const isSelected = settings.theme === themeName;
                    return (
                      <button
                        key={themeName}
                        onClick={() => setSettings({ ...settings, theme: themeName })}
                        className={`w-8 h-8 rounded-full ${color.primary} transition-transform shadow-sm ${isSelected ? 'ring-4 ring-offset-2 ring-gray-300 scale-110' : 'hover:scale-110'}`}
                        title={themeName}
                      />
                    );
                  })}
              </div>

              {/* Custom Palette Button */}
              <div className="flex justify-center mt-2">
                 <label className={`
                   relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-full cursor-pointer transition-all border shadow-sm w-full sm:w-auto
                   ${settings.theme === AppTheme.CUSTOM 
                     ? 'bg-white border-indigo-500 ring-2 ring-indigo-200 text-indigo-700' 
                     : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}
                 `}>
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
                      style={{ background: settings.theme === AppTheme.CUSTOM && settings.customColor ? settings.customColor : 'conic-gradient(red, orange, yellow, green, blue, indigo, violet)' }}
                    ></div>
                    <span className="text-sm font-semibold">Vybrat vlastní barvu</span>
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      value={settings.customColor || '#2563eb'}
                      onChange={(e) => setSettings({ ...settings, theme: AppTheme.CUSTOM, customColor: e.target.value })}
                    />
                 </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
              </div>
            )}

            {/* Start Button - Hidden in Remote mode until connected (logic handled in handleStart call) */}
            {settings.mode !== GameMode.REMOTE && (
                <button
                  onClick={handleStart}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Začít chatovat</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
