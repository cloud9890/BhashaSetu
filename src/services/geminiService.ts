import { GoogleGenAI, Type, Modality } from "@google/genai";

const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const availableKeys = keysString.split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

let ai = new GoogleGenAI({ apiKey: availableKeys[0] || "" });

function rotateKey() {
  if (availableKeys.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % availableKeys.length;
  ai = new GoogleGenAI({ apiKey: availableKeys[currentKeyIndex] });
  console.log(`Rotated to API Key at index: ${currentKeyIndex}`);
  return true;
}

const requestCache = new Map<string, any>();

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "as", name: "Assamese" },
  { code: "bn", name: "Bengali" },
  { code: "brx", name: "Bodo" },
  { code: "doi", name: "Dogri" },
  { code: "gu", name: "Gujarati" },
  { code: "hi", name: "Hindi" },
  { code: "kn", name: "Kannada" },
  { code: "ks", name: "Kashmiri" },
  { code: "kok", name: "Konkani" },
  { code: "mai", name: "Maithili" },
  { code: "ml", name: "Malayalam" },
  { code: "mni", name: "Manipuri" },
  { code: "mr", name: "Marathi" },
  { code: "ne", name: "Nepali" },
  { code: "or", name: "Odia" },
  { code: "pa", name: "Punjabi" },
  { code: "sa", name: "Sanskrit" },
  { code: "sat", name: "Santali" },
  { code: "sd", name: "Sindhi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ur", name: "Urdu" },
  { code: "bho", name: "Bhojpuri" },
  { code: "awa", name: "Awadhi" },
  { code: "mag", name: "Magahi" },
  { code: "raj", name: "Rajasthani" },
  { code: "mwr", name: "Marwari" },
  { code: "bgc", name: "Haryanvi" },
  { code: "hne", name: "Chhattisgarhi" },
  { code: "bhb", name: "Bhili" },
  { code: "gon", name: "Gondi" },
  { code: "tcy", name: "Tulu" },
  { code: "kha", name: "Khasi" },
  { code: "lus", name: "Mizo" },
  { code: "grt", name: "Garo" },
  { code: "trp", name: "Kokborok" }
];

export class NLPError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "NLPError";
  }
}

async function safeGenerate(params: any, retries = availableKeys.length): Promise<any> {
  const cacheKey = JSON.stringify(params);
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  try {
    const response = await ai.models.generateContent(params);
    if (!response.text && !params.config?.responseModalities?.includes(Modality.AUDIO)) {
      throw new NLPError("The AI model returned an empty response. Please try a different input.");
    }
    
    // Cache a simplified response object to save tokens
    const mockResponse = { text: response.text };
    requestCache.set(cacheKey, mockResponse);

    return response;
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests")) {
      if (rotateKey() && retries > 1) {
        console.warn("API limit reached, retrying with next key...");
        return safeGenerate(params, retries - 1);
      }
      throw new NLPError("API quota exceeded for all available keys. Please try again later.");
    }
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new NLPError("Invalid API Key. Please check your configuration.");
    }
    throw new NLPError(error.message || "An unexpected error occurred during processing.");
  }
}

export async function detectLanguage(text: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following text and detect its language. Focus on Indian regional languages. Return a JSON object with "languageCode" (ISO 639-1) and "languageName".\n\nText: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          languageCode: { type: Type.STRING },
          languageName: { type: Type.STRING },
        },
        required: ["languageCode", "languageName"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function translateText(text: string, targetLang: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Translate to ${targetLang}. Provide JSON with:
    1. "translation"
    2. "transliteration" (English letters)
    3. "culturalContext" (English explanation of idioms/nuances).
    Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translation: { type: Type.STRING },
          transliteration: { type: Type.STRING },
          culturalContext: { type: Type.STRING },
        },
        required: ["translation", "transliteration", "culturalContext"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function normalizeCodeSwitching(text: string, targetLang: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `The following text is "Code-Switched" (a mix of multiple languages, likely an Indian language and English). 
    Normalize this into a formal, high-quality version in ${targetLang}. 
    Return a JSON object with "normalizedText" and "detectedMix" (describing the languages mixed).
    
    Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          normalizedText: { type: Type.STRING },
          detectedMix: { type: Type.STRING },
        },
        required: ["normalizedText", "detectedMix"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function exploreIdioms(text: string, targetLang: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following phrase or idiom: "${text}".
    1. If it's an English idiom, find the closest CULTURAL equivalent in ${targetLang} (not a literal translation, but a proverb or phrase with the same soul/meaning).
    2. If it's a plain phrase, translate it into a colorful, idiomatic version in ${targetLang}.
    3. Explain the origin or cultural context of the ${targetLang} equivalent.
    
    Return a JSON object with:
    - "originalMeaning": The meaning of the input text.
    - "idiomaticEquivalent": The culturally equivalent idiom in ${targetLang}.
    - "literalTranslation": A literal translation of the input into ${targetLang}.
    - "culturalOrigin": Explanation of the cultural context or origin.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalMeaning: { type: Type.STRING },
          idiomaticEquivalent: { type: Type.STRING },
          literalTranslation: { type: Type.STRING },
          culturalOrigin: { type: Type.STRING },
        },
        required: ["originalMeaning", "idiomaticEquivalent", "literalTranslation", "culturalOrigin"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function simplifyComplexText(text: string, targetLang: string, domain: 'legal' | 'medical') {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `You are an expert in ${domain} communication. Simplify the following complex ${domain} text into plain, easy-to-understand ${targetLang}.
    Focus on explaining the core meaning, obligations, or health implications without using jargon.
    
    Return a JSON object with:
    - "simplifiedText": The simplified version in ${targetLang}.
    - "keyTerms": An array of objects with "term" (original jargon) and "explanation" (simple meaning in ${targetLang}).
    
    Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          simplifiedText: { type: Type.STRING },
          keyTerms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["term", "explanation"],
            },
          },
        },
        required: ["simplifiedText", "keyTerms"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function transliterateScript(text: string, targetScript: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Transliterate the following text into the ${targetScript} script. This is script-to-script conversion, not translation.
    
    Text: ${text}
    
    Return a JSON object with "transliteratedText".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transliteratedText: { type: Type.STRING },
        },
        required: ["transliteratedText"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function detectDialect(text: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following text and detect its specific Indian dialect (e.g., Bhojpuri, Maithili, Haryanvi, Marwari, etc.).
    Provide a "standardized" version of the text in the main language (e.g., Standard Hindi) and explain the dialectal nuances.
    
    Return a JSON object with:
    - "detectedDialect": The name of the dialect.
    - "standardizedText": The text in standard version of the parent language.
    - "nuances": A brief explanation of what makes this dialect unique in this context.
    
    Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedDialect: { type: Type.STRING },
          standardizedText: { type: Type.STRING },
          nuances: { type: Type.STRING },
        },
        required: ["detectedDialect", "standardizedText", "nuances"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function translateConversation(messages: { role: 'user' | 'assistant', text: string }[], targetLang: string) {
  const history = messages.map(m => `${m.role === 'user' ? 'Person A' : 'Person B'}: ${m.text}`).join('\n');
  const lastMessage = messages[messages.length - 1].text;

  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `You are a real-time conversation translator. 
    Translate the following message from a conversation into ${targetLang}.
    Maintain the tone, emotion, and context of the conversation.
    
    Conversation History:
    ${history}
    
    Message to translate: "${lastMessage}"
    
    Return a JSON object with:
    - "translation": The translated text.
    - "pronunciation": Phonetic pronunciation in English.
    - "contextNote": Any brief note on tone or cultural nuance if relevant.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translation: { type: Type.STRING },
          pronunciation: { type: Type.STRING },
          contextNote: { type: Type.STRING },
        },
        required: ["translation", "pronunciation", "contextNote"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export type VideoAnalysisType = 'summarization' | 'object_detection' | 'action_recognition' | 'sentiment';

export async function analyzeVideo(
  base64Data: string, 
  mimeType: string, 
  targetLang: string, 
  analysisType: VideoAnalysisType = 'summarization'
) {
  const prompts = {
    summarization: `Analyze this video content and provide a detailed summary in ${targetLang}. Focus on the key messages and context.`,
    object_detection: `Identify all significant objects, people, and items visible in this video. Provide the list in ${targetLang}.`,
    action_recognition: `Describe the main actions, movements, and events occurring in this video in ${targetLang}.`,
    sentiment: `Analyze the emotional tone and sentiment of the video (visuals and audio if any) and explain it in ${targetLang}.`
  };

  const response = await safeGenerate({
    model: "gemini-3.1-pro-preview",
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      { text: `${prompts[analysisType]} Return as a JSON object with "result" (string) and "details" (array of strings).` }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["summary", "keyPoints"],
      },
    },
  });
  const parsed = JSON.parse(response.text || "{}");
  return {
    summary: parsed.summary,
    keyPoints: parsed.keyPoints,
    result: parsed.summary // For handleSpeech fallback
  };
}

export async function generateSpeech(text: string, retries = availableKeys.length): Promise<string> {
  const params = {
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
    },
  };
  
  const cacheKey = `speech:${text}`;
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  try {
    const response = await ai.models.generateContent(params);
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (audioPart?.inlineData?.data) {
      const data = audioPart.inlineData.data;
      requestCache.set(cacheKey, data);
      return data;
    }
    throw new NLPError("Failed to generate speech.");
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests")) {
      if (rotateKey() && retries > 1) {
        console.warn("API limit reached for TTS, retrying with next key...");
        return generateSpeech(text, retries - 1);
      }
      throw new NLPError("API quota exceeded for all available keys.");
    }
    throw new NLPError("Failed to generate speech.");
  }
}

export async function summarizeText(text: string, lang: string, length: 'short' | 'medium' | 'long' = 'medium') {
  const lengthPrompt = {
    short: "one or two sentences",
    medium: "a concise paragraph",
    long: "a detailed summary with key points"
  }[length];

  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following text in ${lang}. The summary should be ${lengthPrompt}.\n\nText: ${text}`,
  });
  return response.text;
}

export async function analyzeSentiment(text: string, lang: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Analyze the sentiment of the following text written in ${lang}. Provide a detailed breakdown of the emotional tone. Return a JSON object with "sentiment" (positive, negative, or neutral), "score" (0 to 1), and a brief "explanation" in English.\n\nText: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING },
          score: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
        },
        required: ["sentiment", "score", "explanation"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function generateSyntheticData(topic: string, lang: string, count: number = 5) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} diverse and high-quality synthetic sentences in ${lang} related to the topic: "${topic}". These sentences should be suitable for training an NLP model (e.g., translation or classification). Return as a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });
  return JSON.parse(response.text || "[]");
}

export async function extractTextFromImage(base64Data: string, mimeType: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Extract all the text from this image. Return only the extracted text. If there is no text, return an empty string." }
      ]
    }
  });
  return response.text;
}

export async function translateSignLanguage(base64Data: string, mimeType: string, targetLang: string) {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: `Identify the Indian Sign Language (ISL) gesture shown in this image and translate its meaning into ${targetLang}. 
        If it's a common global sign, provide that meaning. Return a JSON object with "meaning" and "confidence" (0-1).` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meaning: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["meaning", "confidence"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function translateSignVideo(base64Data: string, mimeType: string, targetLang: string) {
  const response = await safeGenerate({
    model: "gemini-3.1-pro-preview",
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      { text: `This video shows a person performing an Indian Sign Language (ISL) gesture. 
      Analyze the motion and translate the meaning into ${targetLang}. 
      Return a JSON object with "meaning" and "confidence" (0-1).` }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          meaning: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["meaning", "confidence"],
      },
    },
  });
  return JSON.parse(response.text || "{}");
}

export async function translateDocument(base64Data: string, mimeType: string, targetLang: string) {
  const response = await safeGenerate({
    model: "gemini-3.1-pro-preview",
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      { text: `You are an expert document translator and cultural bridging AI.
      Translate the text in this document to ${targetLang}. 
      
      CRITICAL INSTRUCTIONS:
      1. Return the output as properly structured Markdown.
      2. Ensure you match the visual hierarchy (headings, bold, lists, paragraphs) of the original document.
      3. Do NOT summarize or skip anything. Translate exactly line by line.
      4. Simplify confusing English jargon into easily understood regional terms in ${targetLang}.` }
    ]
  });
  return response.text;
}
