import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// CORS middleware to support loading in AI Studio iframe safely
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware for parsing JSON with a larger limit for images
app.use(express.json({ limit: '50mb' }));

if (!process.env.GEMINI_API_KEY) {
  console.error('CRITICAL: GEMINI_API_KEY is not set in environment variables.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are CocoaSense, an expert AI agricultural advisor specialising in Theobroma cacao (cocoa) cultivation. Your role is to analyse observations about cocoa plants — from text descriptions and images — and provide detailed, actionable analysis for farmers.

Base your analysis on well-known cocoa ripeness indicators:
- Colour change from green → yellow/orange/red depending on variety
- Sound when tapped (hollow = ripe)
- Surface texture and firmness
- Leaf health as indicator of tree stress
- Visible mould, dark patches (Black Pod), insect damage (Capsid bugs, Pod borer)
- Season and regional context (West Africa, etc.)

Always be encouraging, practical, and use language accessible to smallholder farmers.`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    ripenessLabel: { type: SchemaType.STRING, description: "e.g. 'Ripe', 'Near-Ripe', 'Developing', 'Immature', 'Over-Ripe'" },
    ripenessScore: { type: SchemaType.NUMBER, description: "0–100, where 0=immature, 50=near-ripe, 85=ripe, 100=over-ripe" },
    weeksToHarvest: { type: SchemaType.STRING, description: "e.g. '0–1 week', '2–3 weeks', 'Already past peak'" },
    estimatedAgeWeeks: { type: SchemaType.STRING, description: "e.g. '22–24 weeks since pod set'" },
    bestHarvestWindow: { type: SchemaType.STRING, description: "e.g. 'Harvest within 5–7 days for maximum yield'" },
    podYieldEstimate: { type: SchemaType.STRING, description: "e.g. 'Good pod fill expected; ~35–40 beans per pod'" },
    characteristics: { type: SchemaType.STRING, description: "2–4 sentences describing observed visual/physical traits" },
    harvestRecommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "3-5 specific actionable harvest tips" },
    risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "2-4 potential pest/disease/environmental risks" },
    nextSteps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "3-5 immediate action items for the farmer" },
    gaugeColor: { type: SchemaType.STRING, description: "CSS hex colour matching ripeness" }
  },
  required: [
    "ripenessLabel", "ripenessScore", "weeksToHarvest", "estimatedAgeWeeks", 
    "bestHarvestWindow", "podYieldEstimate", "characteristics", 
    "harvestRecommendations", "risks", "nextSteps", "gaugeColor"
  ]
};

app.post('/api/analyse', async (req, res) => {
  try {
    const { text, images } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured.');
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const parts: any[] = [];
    
    let promptText = `Farmer's observation: ${text || '(No text provided)'}\n\nPlease analyse the cocoa plant based on the provided information and images.`;
    parts.push({ text: promptText });

    if (images && Array.isArray(images)) {
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data // base64 string
          }
        });
      }
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA as any
      }
    });

    const responseText = result.response.text();
    const resultJson = JSON.parse(responseText || '{}');
    res.json(resultJson);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
