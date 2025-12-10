

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
      Tu es un expert en communication scolaire et pédagogique.
      Ton rôle : Rédiger une annonce professionnelle, claire et engageante pour une application de classe (SunuClasse).
      
      Contexte :
      - Auteur : ${role} (Enseignant, Responsable ou Délégué).
      - Cible : Les étudiants de la classe.
      - Sujet : "${topic}".

      Instructions :
      1. Adopte un ton professionnel mais bienveillant.
      2. Sois direct et concis (environ 40-60 mots).
      3. Structure le texte pour une lecture rapide sur mobile.
      4. N'inclus PAS de titre (il est géré à part), seulement le corps du message.
      5. Ne mets pas de signature générique type "Cordialement".
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Impossible de générer le contenu.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erreur lors de la génération. Veuillez vérifier la connexion ou la clé API.";
  }
};

export const correctFrenchText = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("Clé API manquante.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Tu es un éditeur senior expert en langue française.
      Ta mission est de rendre le texte suivant impeccable.

      Consignes strictes :
      1. Corrige toutes les fautes d'orthographe, de grammaire, de syntaxe et de ponctuation.
      2. Améliore légèrement la fluidité et le style pour que cela sonne naturel et professionnel, SANS changer le sens ni le ton de l'auteur.
      3. Si le texte est déjà parfait, renvoie-le tel quel.
      4. Renvoie UNIQUEMENT le texte corrigé, sans guillemets, sans introduction ("Voici le texte corrigé..."), ni explication.

      Texte à traiter :
      "${text}"
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Gemini Correction Error:", error);
    return text; // Retourne le texte original en cas d'erreur
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