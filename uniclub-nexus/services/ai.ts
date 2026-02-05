import { GoogleGenAI, Type } from "@google/genai";

export const translateAnnouncement = async (title: string, content: string) => {
    // If no API key is present, return null (fallback to original text only)
    if (!process.env.API_KEY) {
        console.warn("No API_KEY found for translation.");
        return null;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Translate the following announcement title and content into English (en), French (fr), and Arabic (ar).
        
        Source Title: ${title}
        Source Content: ${content}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        en: { 
                            type: Type.OBJECT, 
                            properties: { 
                                title: {type: Type.STRING}, 
                                content: {type: Type.STRING} 
                            },
                            required: ['title', 'content']
                        },
                        fr: { 
                            type: Type.OBJECT, 
                            properties: { 
                                title: {type: Type.STRING}, 
                                content: {type: Type.STRING} 
                            },
                            required: ['title', 'content']
                        },
                        ar: { 
                            type: Type.OBJECT, 
                            properties: { 
                                title: {type: Type.STRING}, 
                                content: {type: Type.STRING} 
                            },
                            required: ['title', 'content']
                        }
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        return null;
    } catch (e) {
        console.error("Translation failed:", e);
        return null;
    }
};