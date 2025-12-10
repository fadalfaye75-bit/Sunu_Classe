import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to check if API key is available
export const isGeminiConfigured = (): boolean => {
  return !!process.env.API_KEY;
};

// --- ANNONCES ---
export const generateAnnouncementContent = async (topic: string, role: string): Promise<string> => {
  const systemInstruction = `
    Tu es le Directeur de la Communication d'un établissement scolaire d'excellence.
    Ta mission est de rédiger le CORPS d'une annonce pour l'application SunuClasse.

    CONTEXTE :
    - Auteur : ${role}
    - Cible : Étudiants et corps professoral.

    RÈGLES DE RÉDACTION :
    1. Structure Visuelle : Aéré, listes à puces si nécessaire.
    2. Mise en valeur : Utilise le Markdown (**gras**) pour les dates et lieux.
    3. Style : Professionnel, fluide, moderne.
    4. Emojis : Utilise des émojis pertinents (📍, 📅, ⚠️, 🎓) avec parcimonie.
    5. Sortie : Rédige uniquement le corps du message.
  `;

  try {
    // Utilisation de Gemini 3.0 Pro pour une meilleure qualité rédactionnelle
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Sujet de l'annonce : "${topic}"`,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erreur lors de la génération du contenu. Veuillez vérifier la clé API.";
  }
};

// --- CORRECTEUR PRO (Modes multiples) ---
export type CorrectionStyle = 'FIX' | 'PROFESSIONAL' | 'SIMPLE' | 'ACADEMIC' | 'CONCISE' | 'CASUAL' | 'PERSUASIVE';

export const correctTextAdvanced = async (text: string, style: CorrectionStyle = 'FIX'): Promise<string> => {
  if (!text || text.trim().length === 0) return text;

  let instruction = "";
  switch (style) {
    case 'FIX':
      instruction = "Corrige strictement l'orthographe, la grammaire, la conjugaison et la ponctuation. Ne change pas le style, garde le sens exact.";
      break;
    case 'PROFESSIONAL':
      instruction = "Transforme ce texte pour qu'il soit très professionnel, formel et adapté au monde de l'entreprise ou de l'administration. Vocabulaire précis, vouvoiement si applicable.";
      break;
    case 'ACADEMIC':
      instruction = "Adopte un ton académique, universitaire. Utilise des tournures de phrases complexes et un vocabulaire soutenu. Parfait pour des rapports ou des devoirs.";
      break;
    case 'SIMPLE':
      instruction = "Simplifie le texte au maximum. Utilise des phrases courtes, des mots simples. Idéal pour une compréhension rapide par tous (vulgarisation).";
      break;
    case 'CONCISE':
      instruction = "Rends le texte concis. Supprime le superflu, va droit au but sans perdre d'information clé. Résume si nécessaire.";
      break;
    case 'CASUAL':
      instruction = "Reformule ce texte sur un ton décontracté, amical et chaleureux. Utilise un langage courant, le tutoiement si approprié, et rends le message accessible et sympathique.";
      break;
    case 'PERSUASIVE':
      instruction = "Réécris ce texte pour le rendre persuasif, engageant et vendeur. Utilise des mots forts, mets en avant les bénéfices et incite à l'action ou à l'adhésion.";
      break;
  }

  const systemInstruction = `
    Tu es 'Correcteur Pro Class Connect', un expert linguistique.
    MISSION : ${instruction}
    RÈGLES DE SÉCURITÉ :
    - Si le texte contient des insultes graves ou des propos illégaux, refuse poliment de traiter en répondant : "[Contenu inapproprié détecté]".
    - Ne jamais inventer de faits.
    SORTIE ATTENDUE : Uniquement le texte traité. Rien d'autre.
  `;

  // Utilisation de Pro pour les tâches complexes, Flash pour les tâches simples
  const model = (style === 'ACADEMIC' || style === 'PROFESSIONAL' || style === 'PERSUASIVE') 
    ? 'gemini-3-pro-preview' 
    : 'gemini-2.5-flash';

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: text,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini Correction Error:", error);
    return text;
  }
};

// Garder l'ancienne fonction pour compatibilité, pointant vers le mode FIX
export const correctFrenchText = async (text: string): Promise<string> => {
  return correctTextAdvanced(text, 'FIX');
};

// --- SONDAGES ---
export const rephrasePollQuestion = async (question: string): Promise<string> => {
  const systemInstruction = `
    Tu es un expert en communication et engagement communautaire.
    Reformule la question de sondage suivante pour qu'elle soit :
    1. Plus claire et concise.
    2. Plus engageante pour encourager le vote.
    3. Neutre et impartiale.
    Sortie attendue : Uniquement la question reformulée, sans guillemets ni texte introductif.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text || question;
  } catch (error) {
    console.error("Gemini Rephrase Error:", error);
    return question;
  }
};

// --- CHATBOT ASSISTANT ---
export interface ChatMessage {
  role: 'user' | 'model'; 
  text: string;
}

export const chatWithAssistant = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  const systemInstruction = `
    Tu es 'Super Assistant Class Connect', une IA éducative bienveillante et experte.
    TES OBJECTIFS :
    1. Aider les étudiants à comprendre leurs cours (Maths, Français, Histoire, Code, etc.).
    2. Expliquer des concepts complexes simplement.
    3. Générer des quiz ou des résumés à la demande.
    4. Rester poli, motivant et professionnel (ton "Mentor").
    RÈGLES D'OR :
    - Ne jamais inventer d'informations fausses (hallucinations). Si tu ne sais pas, dis-le.
    - Réponses structurées : Utilise des titres, du gras (**mot**), et des listes.
    - Si l'utilisateur a fait une faute d'orthographe dans sa question, ignore-la et réponds correctement.
    - Refuse de traiter les demandes illégales, haineuses ou de triche manifeste.
  `;

  // Construction de l'historique conforme à l'API Gemini
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  try {
    // Gemini 3.0 Pro est meilleur pour le raisonnement et l'éducation
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });
    return response.text || "Désolé, une erreur est survenue.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Erreur de connexion à l'assistant Gemini.";
  }
};
