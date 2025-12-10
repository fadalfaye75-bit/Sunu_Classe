

import { GoogleGenAI } from "@google/genai";

// Helper to safely access env vars in Vite environment
const getApiKey = () => {
  try {
    // @ts-ignore - Vite replaces this at build time
    return process.env.API_KEY;
  } catch (e) {
    return undefined;
  }
};

// Helper to check if API key is available
export const isGeminiConfigured = (): boolean => {
  return !!getApiKey();
};

export const generateAnnouncementContent = async (topic: string, role: string): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing.");
    return "Génération IA indisponible : Clé API manquante ou mal configurée.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Tu es un assistant pour une application de gestion de classe scolaire.
      L'utilisateur est un ${role} (Enseignant/Délégué).
      Rédige une annonce concise, claire et professionnelle pour les élèves au sujet de : "${topic}".
      Le texte doit être en français.
      Garde le texte sous les 50 mots. N'inclus pas de salutations formelles ni de signature.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "Impossible de générer le contenu.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erreur lors de la génération. Veuillez vérifier la connexion ou la clé API.";
  }
};

export const editImageWithGemini = async (imageBase64: string, prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("Clé API manquante ou mal configurée.");
  }

  // Extract base64 data and mime type
  const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Format d'image invalide.");
  }
  const mimeType = match[1];
  const data = match[2];

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    // Use gemini-2.5-flash-image for image editing tasks
    const model = 'gemini-2.5-flash-image';
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("L'IA n'a pas retourné d'image.");
  } catch (error: any) {
    console.error("Gemini Image Edit Error:", error);
    throw new Error(error.message || "Erreur lors de la génération de l'image.");
  }
};
