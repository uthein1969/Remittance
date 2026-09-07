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
Examine this Myanmar NRC card image closely. The text may be handwritten or stamped in Myanmar script.

Please read and extract all details from this NRC card:
1. "nrcNumber": Convert the Myanmar NRC number into standard English format e.g. "7/PAMANA(N)345720" or "12/BAHANA(N)184920" (State / TownshipCode(Type) 6-digit-number). Convert Myanmar numerals to English digits (e.g. ၇ -> 7, ၃၄၅၇၂၀ -> 345720) and Myanmar township code to English (e.g. ပမန -> PAMANA, ဗဟန -> BAHANA, ပတန -> PATANA, မဟန -> MAHANA, ဒဂန -> DAGANA, etc.).
2. "nrcNumberMm": The original Burmese NRC number as written (e.g. "၇/ပမန(နိုင်)၃၄၅၇၂၀").
3. "nameMm": The sender's name in Myanmar script as written on the card (e.g. "မောင်သိန်းလွင်ဦး" or "ဦးသိန်းလွင်ဦး").
4. "nameEn": The sender's name in English capital letters (e.g. "U THEIN LWIN OO" or "MAUNG THEIN LWIN OO").
5. "fatherName": The father's name (အဘအမည်) in English capital letters (e.g. "U HTUN AYE" or "U KYAW SEIN").
6. "fatherNameMm": The father's name in Burmese script (e.g. "ဦးထွန်းအေး").
7. "dob": Date of birth in DD/MM/YYYY format. Convert Myanmar numbers (e.g. ၃.၅.၁၉၆၉ -> "03/05/1969").
8. "address": The full residential address or township/ward shown on the card (e.g. "ဥယျာဉ်ရပ်ကွက်၊ ပျဉ်းမနား").
9. "occupation": Occupation if visible on card (e.g. "ကျောင်းသား" or "Company Staff").
10. "bloodGroup": Blood group if visible (e.g. "B(+)" or "O(+)").

Return strictly valid JSON with no extra commentary or markdown formatting.
Schema:
{
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
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
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
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
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
