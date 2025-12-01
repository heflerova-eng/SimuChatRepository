
import React, { useState, useRef, useEffect } from 'react';
import { ChatSettings, Message, AppTheme, AttachmentType, ChatSession, GameMode, P2PMessage, UserProfile } from '../types';
import { THEMES } from '../constants';
import { sendMessageToAI } from '../services/geminiService';
import { saveSession } from '../services/storageService';
import { sendMessageP2P, setP2PCallbacks, closeP2P } from '../services/p2pService';

interface ChatScreenProps {
  settings: ChatSettings;
  onExit: () => void;
}

const COMMON_EMOJIS = [
  "😀", "😂", "🥰", "😎", "🤔", "😅", "😭", "🙄", "😴", "👍",
  "👎", "👏", "🙌", "❤️", "💔", "🔥", "✨", "🎉", "📅", "✅",
  "❌", "❓", "❗", "📷", "📱", "🍔", "☕", "⚽", "🎵", "👋"
];

const ChatScreen: React.FC<ChatScreenProps> = ({ settings, onExit }) => {
  const [sessionId] = useState(() => Date.now().toString());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Duo Mode State
  const [activeSender, setActiveSender] = useState<'user' | 'partner'>('user');
  
  // Remote Mode State
  const [partnerProfile, setPartnerProfile] = useState<UserProfile>(settings.partner);
  const [isConnected, setIsConnected] = useState(settings.mode !== GameMode.REMOTE);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const themeColors = THEMES[settings.theme];

  // Dynamic Styles for Custom Theme
  const isCustom = settings.theme === AppTheme.CUSTOM;
  const customStyle = isCustom && settings.customColor ? { backgroundColor: settings.customColor } : {};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, selectedImage]);

  // Persist session on message change
  useEffect(() => {
    if (messages.length > 0) {
        const session: ChatSession = {
            id: sessionId,
            studentName: settings.realStudentName,
            studentEmail: settings.realStudentEmail,
            studentClass: settings.realStudentClass,
            topic: settings.topic,
            mode: settings.mode,
            roleUser: settings.user.role,
            rolePartner: partnerProfile.role, // Use dynamic partner profile
            startTime: new Date(parseInt(sessionId)).toISOString(),
            lastActive: new Date().toISOString(),
            messages: messages
        };
        saveSession(session);
    }
  }, [messages, sessionId, settings, partnerProfile]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      messages.forEach(msg => {
        if (msg.attachmentUrl) URL.revokeObjectURL(msg.attachmentUrl);
      });
    };
  }, []);

  // REMOTE MODE: Handshake and Message Listeners
  useEffect(() => {
      if (settings.mode === GameMode.REMOTE) {
          // Send my profile to partner immediately
          sendMessageP2P('HANDSHAKE', { userProfile: settings.user });

          setP2PCallbacks((data: P2PMessage) => {
              if (data.type === 'CHAT') {
                  // Received a message from remote partner
                  const incomingMsg: Message = {
                      ...data.payload,
                      isUser: false, // It's from them
                      timestamp: new Date()
                  };
                  setMessages(prev => [...prev, incomingMsg]);
                  setIsTyping(false);
              }
              else if (data.type === 'HANDSHAKE') {
                  // Received partner's profile
                  setPartnerProfile(data.payload.userProfile);
                  setIsConnected(true);
              }
              else if (data.type === 'TYPING') {
                  setIsTyping(data.payload.isTyping);
              }
          }, undefined, () => {
              // On Close
              alert("Spojení s partnerem bylo přerušeno.");
              setIsConnected(false);
          });
      }

      return () => {
          if (settings.mode === GameMode.REMOTE) {
              // Cleanup is handled by SetupScreen usually, but good practice
          }
      };
  }, [settings.mode, settings.user]);

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const currentText = inputText;
    const currentImage = selectedImage;

    // Determine who is sending the message
    // In AI/Remote mode, it's always the user. In DUO mode, it depends on activeSender.
    const isUserSender = settings.mode === GameMode.DUO ? activeSender === 'user' : true;

    // Reset inputs immediately
    setInputText('');
    setSelectedImage(null);
    setShowEmojiPicker(false);

    const newMsg: Message = {
      id: Date.now().toString(),
      text: currentText,
      isUser: isUserSender,
      timestamp: new Date(),
      attachmentUrl: currentImage || undefined,
      attachmentType: currentImage ? 'image' : undefined
    };

    setMessages((prev) => [...prev, newMsg]);

    // --- HANDLERS BY MODE ---

    // 1. REMOTE MODE
    if (settings.mode === GameMode.REMOTE) {
        // Send to partner via P2P
        // We send the 'payload' which will be reconstructed as a Message on the other side
        sendMessageP2P('CHAT', {
            id: newMsg.id,
            text: newMsg.text,
            attachmentUrl: newMsg.attachmentUrl, // Note: Sending blob URLs p2p is complex, usually need base64. For this demo we assume same machine or text only mostly.
            attachmentType: newMsg.attachmentType
        });
    }

    // 2. AI MODE
    else if (settings.mode === GameMode.AI && isUserSender) {
        setIsTyping(true);
        try {
          let promptToSend = currentText;
          if (currentImage) {
            promptToSend = currentText 
              ? `${currentText} [Uživatel poslal obrázek]` 
              : `[Uživatel poslal obrázek]`;
          }

          const aiResponseText = await sendMessageToAI(promptToSend);
          
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: aiResponseText,
            isUser: false,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
          console.error("Failed to get response", error);
        } finally {
          setIsTyping(false);
        }
    }
    
    // 3. DUO MODE
    else if (settings.mode === GameMode.DUO) {
        // Just switch local sender
        setActiveSender(prev => prev === 'user' ? 'partner' : 'user');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        sendVoiceMessage(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Pro nahrávání hlasových zpráv povolte prosím přístup k mikrofonu.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendVoiceMessage = async (audioUrl: string) => {
    const isUserSender = settings.mode === GameMode.DUO ? activeSender === 'user' : true;

    const newMsg: Message = {
      id: Date.now().toString(),
      text: "Hlasová zpráva",
      isUser: isUserSender,
      timestamp: new Date(),
      attachmentUrl: audioUrl,
      attachmentType: 'audio'
    };

    setMessages(prev => [...prev, newMsg]);

    if (settings.mode === GameMode.REMOTE) {
         // Sending audio blobs over PeerJS simple conn is tricky (data limit). 
         // For now we send text placeholder to avoid crash.
         sendMessageP2P('CHAT', {
            id: newMsg.id,
            text: "[Poslal hlasovou zprávu - Přehrání dostupné jen na zařízení odesílatele]",
            attachmentType: undefined
        });
    }
    else if (settings.mode === GameMode.AI && isUserSender) {
        setIsTyping(true);
        try {
          const aiResponseText = await sendMessageToAI("[Uživatel poslal hlasovou zprávu]");
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: aiResponseText,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
          console.error(error);
        } finally {
          setIsTyping(false);
        }
    } else if (settings.mode === GameMode.DUO) {
        setActiveSender(prev => prev === 'user' ? 'partner' : 'user');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Remote Typing Indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      if (settings.mode === GameMode.REMOTE) {
          sendMessageP2P('TYPING', { isTyping: true });
          // Debounce stop typing? For now just simple
          setTimeout(() => sendMessageP2P('TYPING', { isTyping: false }), 2000);
      }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex justify-center h-screen bg-gray-200">
      <div className="w-full max-w-md bg-white flex flex-col h-full shadow-2xl relative overflow-hidden sm:border-x sm:border-gray-300">
        
        {/* Header */}
        <div 
          className={`p-3 flex items-center justify-between shadow-sm z-10 text-white ${!isCustom ? themeColors.primary : ''}`}
          style={customStyle}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <button 
                  onClick={() => {
                      if(settings.mode === GameMode.REMOTE) closeP2P();
                      onExit();
                  }} 
                  className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
                  title="Ukončit chat"
                >
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <div className="relative flex-shrink-0">
                    <img 
                      src={partnerProfile.avatarUrl} 
                      alt="Partner" 
                      className="w-10 h-10 rounded-full object-cover border border-white/30"
                    />
                    {settings.mode === GameMode.AI && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                    {settings.mode === GameMode.REMOTE && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`}></div>
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm leading-tight truncate">
                        {settings.mode === GameMode.REMOTE && !isConnected ? 'Čekání na spojení...' : partnerProfile.name}
                    </span>
                    <span className="text-xs opacity-80 truncate">{partnerProfile.role || 'Online'}</span>
                </div>
            </div>
            <div className="flex gap-4 pr-2 flex-shrink-0">
                <i className="fa-solid fa-phone cursor-pointer opacity-80 hover:opacity-100"></i>
                <i className="fa-solid fa-video cursor-pointer opacity-80 hover:opacity-100"></i>
                <i className="fa-solid fa-circle-info cursor-pointer opacity-80 hover:opacity-100"></i>
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-4" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            {/* Topic Info Bubble */}
            <div className="flex justify-center mb-6">
                <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full shadow-sm border border-yellow-200 max-w-[90%] text-center">
                    <i className="fa-solid fa-lightbulb mr-1"></i>
                    <strong>Téma:</strong> {settings.topic}
                    {settings.mode === GameMode.REMOTE && (
                        <div className="mt-1 font-mono text-[10px] opacity-75">
                            Kód místnosti: {settings.p2pCode}
                        </div>
                    )}
                </div>
            </div>

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <i className="fa-regular fa-hand-spock text-2xl"></i>
                </div>
                <p>Napiš první zprávu...</p>
                <p className="text-xs text-gray-300 mt-1">Role: {settings.user.role}</p>
                {settings.mode === GameMode.REMOTE && !isConnected && (
                    <p className="text-xs text-orange-500 mt-2 font-bold animate-pulse">Čekám na připojení partnera...</p>
                )}
              </div>
            )}

            {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex w-full ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                   {!msg.isUser && (
                     <img src={partnerProfile.avatarUrl} className="w-8 h-8 rounded-full self-end mr-2 mb-1 shadow-sm object-cover" alt="partner" />
                   )}
                   
                   <div className={`max-w-[75%] flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`rounded-2xl shadow-sm text-sm overflow-hidden ${
                            msg.isUser 
                            ? `${!isCustom ? themeColors.bubbleUser : ''} ${themeColors.textUser} rounded-br-none` 
                            : `${themeColors.bubblePartner} ${themeColors.textPartner} border border-gray-100 rounded-bl-none`
                        }`}
                        style={msg.isUser ? customStyle : {}}
                      >
                          {msg.attachmentType === 'image' && msg.attachmentUrl && (
                             <img src={msg.attachmentUrl} alt="Attachment" className="w-full h-auto max-h-64 object-cover" />
                          )}
                          {msg.attachmentType === 'audio' && msg.attachmentUrl && (
                            <div className="p-2 flex items-center gap-2 min-w-[150px]">
                                <i className="fa-solid fa-microphone text-lg opacity-80"></i>
                                {msg.attachmentUrl.startsWith('blob:') ? (
                                    <audio controls src={msg.attachmentUrl} className="h-8 w-40" />
                                ) : (
                                    <span className="text-xs italic">{msg.text}</span>
                                )}
                            </div>
                          )}
                          {msg.text && (msg.attachmentType !== 'audio' || !msg.attachmentUrl) && (
                            <div className="px-4 py-2 break-words">{msg.text}</div>
                          )}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1 mx-1">
                          {formatTime(msg.timestamp)}
                      </span>
                   </div>

                   {msg.isUser && (
                     <img src={settings.user.avatarUrl} className="w-8 h-8 rounded-full self-end ml-2 mb-1 shadow-sm object-cover" alt="me" />
                   )}
                </div>
            ))}

            {isTyping && (
                <div className="flex justify-start w-full">
                    <img src={partnerProfile.avatarUrl} className="w-8 h-8 rounded-full self-end mr-2 mb-1 object-cover" alt="partner" />
                    <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center h-10">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-100 relative">
            
            {/* Image Preview */}
            {selectedImage && (
              <div className="absolute bottom-full left-0 w-full bg-white/90 backdrop-blur-sm p-3 border-t border-gray-200 flex items-center gap-3 animate-slide-up">
                 <div className="relative">
                    <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-300" />
                    <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">
                      <i className="fa-solid fa-times"></i>
                    </button>
                 </div>
                 <span className="text-xs text-gray-500">Obrázek připraven k odeslání</span>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2 grid grid-cols-6 gap-1 z-20 h-48 overflow-y-auto">
                {COMMON_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => handleEmojiClick(emoji)} className="hover:bg-gray-100 p-1 rounded text-xl">
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* DUO MODE: SENDER SWITCHER */}
            {settings.mode === GameMode.DUO && !isRecording && (
                <div className="flex bg-gray-100 p-1 mx-3 mt-2 rounded-lg">
                    <button
                        onClick={() => setActiveSender('partner')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            activeSender === 'partner' 
                            ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <img src={partnerProfile.avatarUrl} className="w-4 h-4 rounded-full" />
                        {partnerProfile.name}
                    </button>
                    <button
                        onClick={() => setActiveSender('user')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                            activeSender === 'user' 
                            ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        {settings.user.name}
                        <img src={settings.user.avatarUrl} className="w-4 h-4 rounded-full" />
                    </button>
                </div>
            )}

            {/* Main Input Controls */}
            <div className="p-3">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

                {isRecording ? (
                   <div className="flex items-center gap-3 w-full bg-red-50 rounded-full px-4 py-2 border border-red-100">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="flex-1 text-red-600 font-medium text-sm">Nahrávání... {formatDuration(recordingTime)}</span>
                      <button onClick={stopRecording} className="text-red-500 hover:text-red-700 p-2"><i className="fa-solid fa-paper-plane text-lg"></i></button>
                      <button onClick={() => { stopRecording(); setIsRecording(false); }} className="text-gray-400 hover:text-gray-600 p-2"><i className="fa-solid fa-trash"></i></button>
                   </div>
                ) : (
                  <div className="flex items-center gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-gray-600 p-2 transition-colors">
                          <i className="fa-solid fa-plus-circle text-xl"></i>
                      </button>
                      
                      <div className="flex-1 relative">
                          <input 
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={settings.mode === GameMode.REMOTE && !isConnected}
                            placeholder={selectedImage ? "Přidat popisek..." : (settings.mode === GameMode.DUO ? `Píšeš jako: ${activeSender === 'user' ? settings.user.name : partnerProfile.name}...` : "Napište zprávu...")}
                            className="w-full bg-gray-100 text-gray-800 rounded-full py-2.5 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-gray-300 text-sm disabled:opacity-50"
                          />
                          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400'} hover:text-gray-600`}>
                            <i className="fa-regular fa-face-smile"></i>
                          </button>
                      </div>

                      {inputText.trim() || selectedImage ? (
                        <button 
                          onClick={handleSendMessage}
                          className={`${!isCustom ? themeColors.primary : ''} text-white p-2.5 rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity shadow-md transform active:scale-95`}
                          style={customStyle}
                        >
                            <i className="fa-solid fa-paper-plane text-xs"></i>
                        </button>
                      ) : (
                        <button onClick={startRecording} className="text-gray-400 hover:text-red-500 p-2 transition-colors active:scale-90">
                            <i className="fa-solid fa-microphone text-lg"></i>
                        </button>
                      )}
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
