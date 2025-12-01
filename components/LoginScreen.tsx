
import React, { useState, useEffect } from 'react';
import { LOGO_URL } from '../constants';

interface LoginScreenProps {
  onLogin: (realName: string, email: string, studentClass: string) => void;
  onAdminLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onAdminLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrUrlInput, setQrUrlInput] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Initialize QR URL with current window location
  useEffect(() => {
    // Vždy načteme aktuální adresu prohlížeče
    // Pokud aplikace běží na veřejné doméně, bude to ta správná adresa
    const currentUrl = window.location.href;
    setQrUrlInput(currentUrl);
  }, [showQR]); // Aktualizovat i při otevření modalu

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Prosím zadej své jméno.');
      return;
    }
    if (!email.trim()) {
      setError('Prosím zadej e-mailovou adresu.');
      return;
    }
    if (!studentClass.trim()) {
      setError('Prosím zadej třídu.');
      return;
    }
    onLogin(name, email, studentClass);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrUrlInput);
      setCopySuccess('Odkaz zkopírován!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess('Chyba kopírování');
    }
  };

  const isBlobUrl = qrUrlInput.startsWith('blob:');
  const qrCodeImage = qrUrlInput 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(qrUrlInput)}`
    : '';

  return (
    <div className="min-h-screen w-full bg-gray-50 relative overflow-y-auto custom-scrollbar">
      
      {/* Admin Button - Fixed Top Left */}
      <button 
        onClick={onAdminLogin}
        className="fixed top-4 left-4 z-50 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 py-2 px-3 rounded-full bg-white/80 hover:bg-white shadow-sm border border-gray-200 backdrop-blur-sm"
      >
         <i className="fa-solid fa-lock text-[10px]"></i>
         <span className="hidden sm:inline">Vstup pro učitele</span>
         <span className="sm:hidden">Admin</span>
      </button>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden opacity-10 pointer-events-none">
          <i className="fa-regular fa-comment-dots absolute top-[10%] left-[10%] text-6xl text-indigo-500 transform -rotate-12"></i>
          <i className="fa-solid fa-user-group absolute top-[20%] right-[15%] text-5xl text-purple-500 transform rotate-12"></i>
          <i className="fa-regular fa-paper-plane absolute bottom-[15%] left-[20%] text-7xl text-blue-500 transform -rotate-6"></i>
          <i className="fa-solid fa-quote-right absolute bottom-[25%] right-[10%] text-6xl text-indigo-300"></i>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-10 border border-white/50 relative">
          
          {/* Share Button */}
          <button 
              onClick={() => setShowQR(!showQR)}
              className="absolute top-4 right-4 text-gray-600 hover:text-indigo-600 transition-colors z-20 bg-white/90 p-2 rounded-full hover:bg-white shadow-md border border-gray-100 group"
              title="Sdílet aplikaci / Zobrazit QR"
          >
              <i className="fa-solid fa-qrcode text-lg group-hover:scale-110 transition-transform"></i>
          </button>

          {/* Header Image Banner */}
          <div className="relative w-full bg-gray-100 min-h-[160px] flex items-center justify-center">
              {LOGO_URL ? (
                  <img 
                    src={LOGO_URL} 
                    alt="SimuChat Logo" 
                    className="w-full h-full object-cover" 
                  />
              ) : (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 w-full p-8 text-center">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-inner border border-white/20">
                        <i className="fa-solid fa-comments text-4xl text-white drop-shadow-md"></i>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">SimuChat</h1>
                    <p className="text-slate-300 font-light text-sm">Školní komunikační trénink</p>
                  </div>
              )}
          </div>

          <div className="p-8 relative">
            
            {/* QR Overlay Modal */}
            {showQR && (
                <div className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center p-6 animate-fade-in text-center overflow-y-auto">
                    <div className="w-full flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-gray-800">Připojení k hodině</h3>
                        <button onClick={() => setShowQR(false)} className="text-gray-400 hover:text-gray-600 p-2">
                            <i className="fa-solid fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    {/* Warning for Blob URL */}
                    {isBlobUrl && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 text-left w-full rounded-r text-sm">
                            <p className="font-bold text-yellow-700">⚠️ Náhledový režim</p>
                            <p className="text-yellow-800 mt-1 text-xs">
                                Toto je pouze náhled. Pro sdílení žákům prosím vložte veřejnou adresu aplikace (publikovanou URL).
                            </p>
                        </div>
                    )}

                    {/* QR Code Display */}
                    <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm mb-4 flex justify-center">
                        {isBlobUrl ? (
                            <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded text-gray-400 text-xs px-4 text-center">
                                Zadejte veřejnou URL adresu
                            </div>
                        ) : (
                            <img src={qrCodeImage} alt="QR Code" className="w-56 h-56 object-contain" />
                        )}
                    </div>

                    <p className="text-sm font-medium text-gray-500 mb-2">Odkaz na aplikaci:</p>
                    
                    {/* URL Input & Copy */}
                    <div className="w-full flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={qrUrlInput}
                            onChange={(e) => setQrUrlInput(e.target.value)}
                            className="flex-1 text-sm p-2 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 text-gray-600 bg-gray-50"
                            placeholder="https://..."
                        />
                        <button 
                            onClick={copyToClipboard}
                            className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 rounded-lg transition-colors flex items-center justify-center"
                            title="Kopírovat do schránky"
                        >
                            <i className="fa-regular fa-copy"></i>
                        </button>
                    </div>

                    {copySuccess && (
                        <div className="absolute bottom-20 bg-gray-800 text-white text-xs py-1 px-3 rounded-full animate-fade-in-up">
                            {copySuccess}
                        </div>
                    )}
                    
                    <button 
                      onClick={() => setShowQR(false)}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                    >
                        Zavřít
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">
                  Jméno a příjmení
                </label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-400"
                      placeholder="Např. Jan Novák"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">
                  E-mailová adresa
                </label>
                <div className="relative">
                  <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-400"
                      placeholder="jan.novak@skola.cz"
                  />
                </div>
              </div>

              {/* Class Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1 uppercase">
                  Třída
                </label>
                <div className="relative">
                  <i className="fa-solid fa-users absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                      type="text"
                      value={studentClass}
                      onChange={(e) => {
                        setStudentClass(e.target.value);
                        setError('');
                      }}
                      className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-slate-200 focus:border-slate-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-800 placeholder-gray-400"
                      placeholder="Např. 8.A"
                  />
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-pulse justify-center">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 group mt-4"
              >
                <span>Vstoupit do aplikace</span>
                <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </button>
            </form>
          </div>
        </div>
        
        <div className="mt-8 text-center text-gray-400 text-xs">
            <p>© 2025 SimuChat pro školy</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
