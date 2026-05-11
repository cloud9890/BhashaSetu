import { GoogleGenAI, Type, Modality } from "@google/genai";
import Sentiment from 'sentiment';

// ─── Constants & Types ────────────────────────────────────────────────────────
const sentiment = new Sentiment();
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

// ─── Persistent Cache Implementation ──────────────────────────────────────────
class PersistentCache {
  private prefix = 'bhashasetu_cache_';
  private maxItems = 100;

  get(key: string) {
    const cached = localStorage.getItem(this.prefix + key);
    if (!cached) return null;
    try {
      const { data, expiry } = JSON.parse(cached);
      if (expiry && Date.now() > expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      return data;
    } catch { return null; }
  }

  set(key: string, data: any, ttlDays = 7) {
    const expiry = Date.now() + (ttlDays * 24 * 60 * 60 * 1000);
    localStorage.setItem(this.prefix + key, JSON.stringify({ data, expiry }));
    
    // Simple cleanup: if too many items, clear old ones
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
    if (keys.length > this.maxItems) {
      localStorage.removeItem(keys[0]);
    }
  }
}

const cache = new PersistentCache();

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "as", name: "Assamese" },
  { code: "brx", name: "Bodo" },
  { code: "doi", name: "Dogri" },
  { code: "gu", name: "Gujarati" },
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

// ─── Local Processing Helpers ────────────────────────────────────────────────

/**
 * Detects Indian scripts using Unicode ranges.
 * This runs instantly and requires zero API calls.
 */
function detectLanguageLocally(text: string): { languageCode: string, languageName: string } | null {
  const scripts = [
    { name: 'Hindi', code: 'hi', regex: /[\u0900-\u097F]/ },      // Devanagari
    { name: 'Bengali', code: 'bn', regex: /[\u0980-\u09FF]/ },    // Bengali/Assamese
    { name: 'Gurmukhi', code: 'pa', regex: /[\u0A00-\u0A7F]/ },   // Punjabi
    { name: 'Gujarati', code: 'gu', regex: /[\u0A80-\u0AFF]/ },
    { name: 'Odia', code: 'or', regex: /[\u0B00-\u0B7F]/ },
    { name: 'Tamil', code: 'ta', regex: /[\u0B80-\u0BFF]/ },
    { name: 'Telugu', code: 'te', regex: /[\u0C00-\u0C7F]/ },
    { name: 'Kannada', code: 'kn', regex: /[\u0C80-\u0CFF]/ },
    { name: 'Malayalam', code: 'ml', regex: /[\u0D00-\u0D7F]/ }
  ];

  for (const script of scripts) {
    if (script.regex.test(text)) {
      return { languageCode: script.code, languageName: script.name };
    }
  }

  // Fallback for English (basic latin)
  if (/^[A-Za-z0-9\s.,!?;:'"()\-]+$/.test(text)) {
    return { languageCode: 'en', languageName: 'English' };
  }

  return null;
}

/**
 * Basic sentiment analysis using AFINN word list.
 */
function analyzeSentimentLocally(text: string) {
  const result = sentiment.analyze(text);
  let label = 'neutral';
  if (result.score > 1) label = 'positive';
  else if (result.score < -1) label = 'negative';

  return {
    sentiment: label,
    score: Math.min(1, Math.max(0, (result.score + 5) / 10)), // Normalize to 0-1
    explanation: `Local analysis based on vocabulary keywords (Score: ${result.score}).`
  };
}

// ─── AI Service Logic ────────────────────────────────────────────────────────

async function safeGenerate(params: any, retries = availableKeys.length): Promise<any> {
  const cacheKey = btoa(JSON.stringify(params)).slice(0, 100); // Simple short hash-like key
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await ai.models.generateContent(params);
    if (!response.text && !params.config?.responseModalities?.includes(Modality.AUDIO)) {
      throw new NLPError("The AI model returned an empty response.");
    }
    
    const result = { text: response.text, candidates: response.candidates };
    cache.set(cacheKey, result);
    return result;
  } catch (error: any) {
    if (error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("Too Many Requests")) {
      if (rotateKey() && retries > 1) {
        return safeGenerate(params, retries - 1);
      }
      throw new NLPError("API quota exceeded for all available keys.");
    }
    console.error("Gemini API Error:", error);
    throw new NLPError(error.message || "An unexpected error occurred during processing.");
  }
}

export async function detectLanguage(text: string) {
  // Try local detection first
  const local = detectLanguageLocally(text);
  if (local) return local;

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
    contents: `You are BhashaSetu, a cultural bridging AI. Translate the following text to ${targetLang}.
    
    GOALS:
    1. Accuracy: Use formal, grammatically correct ${targetLang}.
    2. Culture: If the source contains idioms or cultural references, find the exact regional equivalent.
    3. Nuance: Preserve the original emotion (respectful, casual, urgent).
    
    Return JSON with:
    - "translation": The translated text.
    - "transliteration": Phonetic English script version.
    - "culturalContext": A brief English note on any regional idioms or etiquette used.
    
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
    contents: `The following text is "Code-Switched" (likely Hinglish, Benglish, or similar). 
    Normalize this into a formal, script-pure version in ${targetLang}. 
    Return a JSON object with "normalizedText" and "detectedMix".
    
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
    contents: `Analyze the idiom/phrase: "${text}".
    Find the closest CULTURAL (not literal) equivalent in ${targetLang}. 
    Return JSON with "originalMeaning", "idiomaticEquivalent", "literalTranslation", and "culturalOrigin".`,
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
    contents: `Simplify this ${domain} text into plain, easy ${targetLang}. 
    Return JSON with "simplifiedText" and "keyTerms" (array of {term, explanation}).
    
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
    contents: `Transliterate to ${targetScript} script (not translation). 
    Return JSON with "transliteratedText".
    Text: ${text}`,
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
    contents: `Detect specific Indian dialect in text. 
    Return JSON with "detectedDialect", "standardizedText", and "nuances".
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
  const history = messages.map(m => `${m.role === 'user' ? 'A' : 'B'}: ${m.text}`).join('\n');
  const lastMessage = messages[messages.length - 1].text;

  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Real-time convo translator. History:\n${history}\nTranslate: "${lastMessage}" to ${targetLang}.
    Return JSON with "translation", "pronunciation", "contextNote".`,
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

export async function analyzeVideo(base64Data: string, mimeType: string, targetLang: string, analysisType: VideoAnalysisType = 'summarization') {
  const prompts = {
    summarization: `Summarize video in ${targetLang}.`,
    object_detection: `Identify objects in ${targetLang}.`,
    action_recognition: `Describe actions in ${targetLang}.`,
    sentiment: `Analyze sentiment in ${targetLang}.`
  };

  const response = await safeGenerate({
    model: "gemini-3.1-pro-preview",
    contents: [
      { inlineData: { data: base64Data, mimeType } },
      { text: `${prompts[analysisType]} Return JSON with "summary" and "keyPoints" (array).` }
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
  return { ...parsed, result: parsed.summary };
}

export async function generateSpeech(text: string, retries = availableKeys.length): Promise<string> {
  const params = {
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: { responseModalities: [Modality.AUDIO] },
  };
  
  const cacheKey = `speech:${text}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await ai.models.generateContent(params);
    const audioData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (audioData) {
      cache.set(cacheKey, audioData);
      return audioData;
    }
    throw new Error();
  } catch {
    if (rotateKey() && retries > 1) return generateSpeech(text, retries - 1);
    throw new NLPError("Speech generation failed.");
  }
}

export async function summarizeText(text: string, lang: string, length: 'short' | 'medium' | 'long' = 'medium') {
  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Summarize in ${lang} (${length}): ${text}`,
  });
  return response.text;
}

export async function analyzeSentiment(text: string, lang: string) {
  // If text is primarily English, use local sentiment to save API calls
  if (/^[A-Za-z0-9\s.,!?;:'"()\-]+$/.test(text)) {
    return analyzeSentimentLocally(text);
  }

  const response = await safeGenerate({
    model: "gemini-3-flash-preview",
    contents: `Analyze sentiment in ${lang}. Return JSON with "sentiment", "score", "explanation".\nText: ${text}`,
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
    contents: `Generate ${count} synthetic sentences in ${lang} for topic: "${topic}". Return JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
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
        { text: "Extract all text." }
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
        { text: `Translate ISL sign to ${targetLang}. Return JSON with "meaning", "confidence".` }
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
      { text: `Translate ISL video to ${targetLang}. Return JSON with "meaning", "confidence".` }
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
      { text: `Translate doc to ${targetLang}. Structure as Markdown. Maintain hierarchy. Simplify jargon.` }
    ]
  });
  return response.text;
}
