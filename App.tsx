import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import ChatScreen from './components/ChatScreen';
import AdminDashboard from './components/AdminDashboard';
import { ChatSettings } from './types';
import { initializeChat } from './services/geminiService';

type AppState = 'login' | 'setup' | 'chat' | 'admin';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('login');
  
  // Student Identity State
  const [realStudentName, setRealStudentName] = useState('');
  const [realStudentEmail, setRealStudentEmail] = useState('');
  const [realStudentClass, setRealStudentClass] = useState('');

  const [currentSettings, setCurrentSettings] = useState<ChatSettings | null>(null);

  const handleLogin = (name: string, email: string, studentClass: string) => {
    setRealStudentName(name);
    setRealStudentEmail(email);
    setRealStudentClass(studentClass);
    setAppState('setup');
  };

  const startChat = (settings: ChatSettings) => {
    initializeChat(settings);
    setCurrentSettings(settings);
    setAppState('chat');
  };

  const exitChat = () => {
    if (confirm("Opravdu chceš ukončit konverzaci a vrátit se do menu?")) {
      setAppState('setup');
      setCurrentSettings(null);
    }
  };
  
  const handleLogout = () => {
      setRealStudentName('');
      setRealStudentEmail('');
      setRealStudentClass('');
      setAppState('login');
  }

  return (
    <>
      {appState === 'login' && (
        <LoginScreen 
            onLogin={handleLogin} 
            onAdminLogin={() => setAppState('admin')}
        />
      )}
      
      {appState === 'admin' && (
          <AdminDashboard onBack={() => setAppState('login')} />
      )}

      {appState === 'setup' && (
        <SetupScreen 
            realStudentName={realStudentName} 
            realStudentEmail={realStudentEmail}
            realStudentClass={realStudentClass}
            onStart={startChat} 
            onLogout={handleLogout}
        />
      )}
      
      {appState === 'chat' && currentSettings && (
        <ChatScreen settings={currentSettings} onExit={exitChat} />
      )}
    </>
  );
};

export default App;