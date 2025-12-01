
import { AppTheme, ThemeColors, GameMode } from './types';

export const DEFAULT_AVATAR_USER = "https://picsum.photos/200/200?random=1";
export const DEFAULT_AVATAR_PARTNER = "https://picsum.photos/200/200?random=2";

// Opravený odkaz na přímý obrázek (i.imgur.com a koncovka .png), aby se logo zobrazilo
export const LOGO_URL = "https://i.imgur.com/Dgz2IIE.png";

// ------------------------------------------------------------------
// DŮLEŽITÉ: Zde vložte URL adresu vašeho Google Apps Scriptu
// 1. Vytvořte Google Sheet -> Rozšíření -> Apps Script
// 2. Vložte kód (poskytnutý v chatu)
// 3. Nasadit -> Nové nasazení -> Webová aplikace -> Kdokoli (Anyone)
// 4. Zkopírujte URL adresu (končí na /exec) a vložte ji níže do uvozovek.
// ------------------------------------------------------------------
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz45K5qblI8JZIb2zFi4mBXraTZssLYZ7RlDvTmOATTTG9darSdm-VMI-vyRBtqr559/exec"; 

export const THEMES: Record<AppTheme, ThemeColors> = {
  [AppTheme.BLUE]: {
    primary: 'bg-blue-600',
    secondary: 'bg-blue-100',
    bubbleUser: 'bg-blue-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.GREEN]: {
    primary: 'bg-green-600',
    secondary: 'bg-green-100',
    bubbleUser: 'bg-green-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.PURPLE]: {
    primary: 'bg-purple-600',
    secondary: 'bg-purple-100',
    bubbleUser: 'bg-purple-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.PINK]: {
    primary: 'bg-pink-500',
    secondary: 'bg-pink-100',
    bubbleUser: 'bg-pink-500',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.TEAL]: {
    primary: 'bg-teal-600',
    secondary: 'bg-teal-100',
    bubbleUser: 'bg-teal-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.ORANGE]: {
    primary: 'bg-orange-500',
    secondary: 'bg-orange-100',
    bubbleUser: 'bg-orange-500',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.RED]: {
    primary: 'bg-red-600',
    secondary: 'bg-red-100',
    bubbleUser: 'bg-red-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.INDIGO]: {
    primary: 'bg-indigo-600',
    secondary: 'bg-indigo-100',
    bubbleUser: 'bg-indigo-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.GRAY]: {
    primary: 'bg-gray-600',
    secondary: 'bg-gray-200',
    bubbleUser: 'bg-gray-600',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.BLACK]: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-200',
    bubbleUser: 'bg-gray-900',
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
  [AppTheme.CUSTOM]: {
    primary: '', // Will be handled dynamically via style prop
    secondary: 'bg-gray-100',
    bubbleUser: '', // Will be handled dynamically via style prop
    bubblePartner: 'bg-white',
    textUser: 'text-white',
    textPartner: 'text-gray-900',
  },
};

export const INITIAL_SETTINGS = {
  topic: '',
  mode: GameMode.AI,
  user: { name: 'Já', role: 'Student', avatarUrl: DEFAULT_AVATAR_USER },
  partner: { name: 'Karel', role: 'Kamarád', avatarUrl: DEFAULT_AVATAR_PARTNER },
  theme: AppTheme.BLUE
};
