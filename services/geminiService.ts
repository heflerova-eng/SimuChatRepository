import { GoogleGenAI, Chat } from "@google/genai";
import { ChatSettings } from "../types";

let chatSession: Chat | null = null;

const getSystemInstruction = (settings: ChatSettings): string => {
  return `
    Hraješ roli v simulaci chatu pro školní aktivitu.
    
    Tvoje identita:
    Jméno: "${settings.partner.name}"
    Role: "${settings.partner.role}"
    
    Identita tvého partnera (uživatele):
    Jméno: "${settings.user.name}"
    Role: "${settings.user.role}"
    
    Téma konverzace/Zadání aktivity: "${settings.topic}".
    
    Instrukce:
    1. Chovej se naprosto přirozeně jako člověk v chatovací aplikaci (Messenger/WhatsApp).
    2. PLNĚ PŘIJMI SVOU ROLI ("${settings.partner.role}"). Pokud je tvá role konfliktní, buď v konfliktu. Pokud je kooperativní, spolupracuj.
    3. Respektuj roli partnera ("${settings.user.role}").
    4. Používej hovorový jazyk (češtinu), emoji, občasné zkratky, pokud se to hodí k tvé roli a tématu.
    5. Nikdy nevystupuj z role. Nikdy neříkej, že jsi AI.
    6. Odpovídej stručně. Zprávy v chatu bývají krátké (1-3 věty).
    7. Posouvej konverzaci dál.
    8. Pokud uživatel pošle obrázek nebo hlasovou zprávu (uvidíš to jako text v závorce), reaguj na to přirozeně, jako bys to viděl/slyšel.
  `;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initializeChat = (settings: ChatSettings) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: getSystemInstruction(settings),
      temperature: 0.9, // Higher creativity for natural chat
      maxOutputTokens: 250,
    },
  });
};

export const sendMessageToAI = async (message: string): Promise<string> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized");
  }

  // Handling empty messages (e.g. only image sent) to avoid API errors
  const effectiveMessage = message.trim() === "" ? "[Uživatel poslal přílohu bez textu]" : message;
  
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await chatSession.sendMessage({ message: effectiveMessage });
      return response.text || "...";
    } catch (error: any) {
      // Check for rate limiting (429) or temporary server errors (503)
      const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
      const isServerError = error.status === 503;

      if ((isRateLimit || isServerError) && attempt < MAX_RETRIES) {
        attempt++;
        // Exponential backoff with Jitter: Wait 1s, 2s, 4s... plus random 0-500ms
        // This prevents all 20 students from retrying at the EXACT same millisecond
        const baseWaitTime = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        const totalWait = baseWaitTime + jitter;

        console.warn(`SimuChat: AI busy (Rate Limit), retrying in ${Math.round(totalWait)}ms... (Attempt ${attempt}/${MAX_RETRIES})`);
        await delay(totalWait);
        continue;
      }

      console.error("Error sending message to Gemini:", error);
      
      if (isRateLimit) {
         return "Teď toho na mě bylo moc (hodně studentů píše najednou). Zkus mi to poslat znovu za chvilku.";
      }
      return "Omlouvám se, mám problém s připojením. Zkus to prosím znovu.";
    }
  }
  
  return "Omlouvám se, nepodařilo se spojit se serverem.";
};