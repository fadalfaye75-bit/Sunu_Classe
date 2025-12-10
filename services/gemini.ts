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
      Tu es le Directeur de la Communication d'un établissement scolaire d'excellence.
      Ta mission est de rédiger le CORPS d'une annonce pour l'application SunuClasse.

      CONTEXTE :
      - Auteur : ${role}
      - Sujet brut : "${topic}"
      - Cible : Étudiants et corps professoral.

      RÈGLES DE RÉDACTION "HYPER-PERFORMANCE" :
      1. **Structure Visuelle** : Le texte doit être aéré. Utilise des listes à puces si nécessaire.
      2. **Mise en valeur** : Utilise le format Markdown (**gras**) pour mettre en évidence les dates, les heures, les lieux et les actions requises.
      3. **Style** : Professionnel, fluide, moderne et bienveillant. Évite le langage administratif robotique.
      4. **Emojis** : Utilise des émojis pertinents (📍, 📅, ⚠️, 🎓, ✨) avec parcimonie pour guider l'œil (début de paragraphe ou mise en avant).
      5. **Call to Action** : Termine par une phrase claire indiquant ce que l'élève doit faire (si applicable).
      6. **Format** : Ne mets PAS de titre (il est géré par l'interface). Rédige uniquement le corps du message.

      Exemple de structure attendue :
      "Bonjour à tous 👋,
      
      Concernant [Sujet], voici les points importants :
      • Point 1
      • Point 2
      
      📅 **Date clé** : [Date]
      
      Merci de votre attention."
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
      Tu es un Éditeur Senior expert en langue française et en communication institutionnelle.
      Ta mission est de transformer le texte brut ci-dessous en une version "Premium".

      INSTRUCTIONS STRICTES :
      1. **Correction Absolue** : Élimine toute faute d'orthographe, de grammaire et de syntaxe.
      2. **Amélioration du Style** :
         - Reformule les phrases lourdes ou maladroites.
         - Utilise un vocabulaire précis et professionnel.
         - Supprime les répétitions inutiles.
      3. **Structure** :
         - Si le texte est un bloc compact, ajoute des sauts de ligne logiques.
         - Ajoute des majuscules et la ponctuation manquante.
      4. **Respect du Sens** : Le message doit rester fidèle à l'intention de l'auteur, ne change pas les faits (dates, noms).
      5. **Sortie** : Renvoie UNIQUEMENT le texte amélioré, sans guillemets, sans intro ni conclusion de ta part.

      TEXTE À SUBLIMER :
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