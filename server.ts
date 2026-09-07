import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Body parser with 25MB limit for high-res NRC card photos
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// NRC AI OCR Extraction endpoint
app.post('/api/ocr-nrc', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', fileName = '' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    let detectedMime = mimeType;
    if (imageBase64.startsWith('data:image/png')) detectedMime = 'image/png';
    else if (imageBase64.startsWith('data:image/jpeg') || imageBase64.startsWith('data:image/jpg')) detectedMime = 'image/jpeg';
    else if (imageBase64.startsWith('data:image/webp')) detectedMime = 'image/webp';

    const prompt = `You are a high-accuracy document intelligence AI specialized in reading Myanmar National Registration Cards (NRC / နိုင်ငံသားစိစစ်ရေးကတ်ပြား / နိုင်-ကတ်).
Examine this Myanmar NRC card image closely. The image can be the FRONT side, the BACK side, or BOTH sides of a Myanmar NRC card. The text may be handwritten or stamped in Myanmar script.

CRITICAL INSTRUCTIONS FOR NRC BACK (အနောက်ခြမ်း - နေရပ်လိပ်စာ):
- In Myanmar NRC cards, the full residential address ("နေရပ်လိပ်စာ") is ALWAYS printed on the BACK side of the card!
- Read all handwritten or stamped lines under "နေရပ်လိပ်စာ" very carefully:
  * Line 1 typically has: Street name and House No (အိမ်အမှတ်/လမ်းအမည်), e.g. "ကမ္ဘောဇ(၁)လမ်း၊"
  * Line 2 typically has: Ward or Village (ရပ်ကွက်/ကျေးရွာ), e.g. "ဆန်ဆိုင်း(ခ)ရပ်ကွက်၊"
  * Line 3 typically has: Town / Township / State (မြို့/မြို့နယ်/ပြည်နယ်), e.g. "တာချီလိတ်မြို့"
  * Join them into a complete Burmese address string: e.g. "ကမ္ဘောဇ(၁)လမ်း၊ ဆန်ဆိုင်း(ခ)ရပ်ကွက်၊ တာချီလိတ်မြို့"
- Also extract from the BACK side:
  * "bloodGroup": Blood group under "သွေးအုပ်စု" (e.g. "O", "A", "B", "AB")
  * "occupation": Under "အလုပ်အကိုင်" (e.g. "မှီခို", "ကုမ္ပဏီဝန်ထမ်း", "ကျောင်းသား", "လုပ်ငန်းရှင်")

CRITICAL INSTRUCTIONS FOR NRC FRONT (အရှေ့ခြမ်း):
1. "nrcNumber": Convert Myanmar NRC number into standard English format e.g. "13/TAKHALA(N)030561" or "7/PAMANA(N)345720" (State / TownshipCode(Type) 6-digit-number). Convert Myanmar numerals to English digits (e.g. ၁၃ -> 13, ၀၃၀၅၆၁ -> 030561) and Myanmar township code to English (e.g. တခလ -> TAKHALA, ပမန -> PAMANA, ဗဟန -> BAHANA, etc.).
2. "nrcNumberMm": Original Burmese NRC number as written (e.g. "၁၃/တခလ(နိုင်)၀၃၀၅၆၁").
3. "nameMm": Name in Myanmar script (e.g. "မအေးအေးစန်း" or "ဒေါ်အေးအေးစန်း").
4. "nameEn": English name in capital letters (e.g. "DAW AYE AYE SAN" or "U THEIN LWIN OO").
5. "fatherName": Father's name (အဘအမည်) in English capital letters (e.g. "U SOE MYINT").
6. "fatherNameMm": Father's name in Burmese (e.g. "ဦးစိုးမြင့်").
7. "dob": Date of birth in DD/MM/YYYY format (e.g. 02/03/1967).
8. "cardSide": "FRONT", "BACK", or "BOTH".

Return strictly valid JSON with no extra commentary or markdown formatting.
Schema:
{
  "cardSide": "FRONT" | "BACK" | "BOTH",
  "nrcNumber": string,
  "nrcNumberMm": string,
  "nameEn": string,
  "nameMm": string,
  "fatherName": string,
  "fatherNameMm": string,
  "dob": string,
  "address": string,
  "occupation": string,
  "bloodGroup": string,
  "confidence": number
}`;

    const ai = getAiClient();
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let responseText = '';
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} OCR failed, trying fallback:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastErr || new Error('No text generated from Gemini OCR models');
    }
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    }

    return res.json({
      success: true,
      data: parsedData,
      confidence: parsedData.confidence || 96,
      fileName,
    });
  } catch (error: any) {
    console.error('Error processing NRC OCR via Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process NRC OCR',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack Remittance & NRC OCR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
