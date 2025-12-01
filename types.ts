
export enum AppTheme {
  BLUE = 'blue',
  GREEN = 'green',
  PURPLE = 'purple',
  PINK = 'pink',
  TEAL = 'teal',
  ORANGE = 'orange',
  RED = 'red',
  INDIGO = 'indigo',
  GRAY = 'gray',
  BLACK = 'black',
  CUSTOM = 'custom'
}

export enum GameMode {
  AI = 'ai',
  DUO = 'duo',
  REMOTE = 'remote'
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
}

export interface ChatSettings {
  realStudentName: string; // The real identity of the student
  realStudentEmail: string;
  realStudentClass: string;
  topic: string;
  mode: GameMode;
  user: UserProfile; // The Persona
  partner: UserProfile; // The AI Persona or 2nd Student
  theme: AppTheme;
  customColor?: string;
  p2pCode?: string; // Room code for remote chat
}

export type AttachmentType = 'image' | 'audio';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  attachmentUrl?: string;
  attachmentType?: AttachmentType;
}

export interface ChatSession {
  id: string;
  studentName: string;
  studentEmail: string;
  studentClass: string;
  topic: string;
  mode?: GameMode;
  roleUser: string;
  rolePartner: string;
  startTime: string; // ISO string
  lastActive: string; // ISO string
  messages: Message[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  bubbleUser: string;
  bubblePartner: string;
  textUser: string;
  textPartner: string;
}

// P2P Data Types
export interface P2PMessage {
  type: 'CHAT' | 'HANDSHAKE' | 'TYPING';
  payload: any;
}

export interface P2PHandshake {
  userProfile: UserProfile;
}
