import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, LiveServerMessage, Modality } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

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

const defaultAi = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

if (!defaultAi) {
  console.warn('GEMINI_API_KEY not set; Gemini Live API is disabled on this server.');
}

const SYSTEM_PROMPT = `You are CacaoLens, an expert agricultural advisor specialising in Theobroma cacao (cocoa) cultivation. Your role is to analyse observations about cocoa plants — from text descriptions, images, and video clips — and provide detailed, actionable analysis for farmers.

CRITICAL FIRST STEP:
First, carefully verify if the provided images or descriptions are actually related to cocoa (cacao) plants, pods, leaves, seeds, or farm walk clips.
If they are clearly NOT related to cocoa (e.g. a picture of a cat, a car, or a different plant), you MUST set "isCocoa" to false, and explain in the "characteristics" field what you see instead. For all other required fields, output "N/A" or 0.

If it IS cocoa, set "isCocoa" to true, and classify what is primarily shown in the "objectType" field as one of: "Leaf", "Pod", "Cut Seed", "Walk Clip", or "Other".
Then, base your analysis on well-known cocoa indicators for that specific object type:
- Pods: Colour change, surface texture, firmness, visible mould/dark patches (Black Pod), insect damage (Capsid bugs).
- Leaves: Health as an indicator of tree stress, micro-nutrient deficiencies, fungal spots.
- Cut Seeds/Beans: Internal color, fermentation progress, defects.
- Walk Clips (Video/Multiple images): General canopy health, shading, overall farm status.

Always be encouraging, practical, and use language accessible to smallholder farmers.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isCocoa: { type: Type.BOOLEAN, description: "True if the images/files are related to cocoa/cacao. False if they are clearly something else." },
    objectType: { type: Type.STRING, description: "The primary object recognized: 'Leaf', 'Pod', 'Cut Seed', 'Walk Clip', or 'Other'." },
    ripenessLabel: { type: Type.STRING, description: "e.g. 'Ripe', 'Near-Ripe', 'Developing', 'Immature', 'Over-Ripe' (or 'Healthy' for leaves)" },
    ripenessScore: { type: Type.NUMBER, description: "0–100, where 0=immature/poor health, 50=near-ripe/fair, 85=ripe/good, 100=over-ripe/excellent" },
    weeksToHarvest: { type: Type.STRING, description: "e.g. '0–1 week', '2–3 weeks', 'Already past peak' (use N/A if not applicable)" },
    estimatedAgeWeeks: { type: Type.STRING, description: "e.g. '22–24 weeks since pod set' (use N/A if not applicable)" },
    bestHarvestWindow: { type: Type.STRING, description: "e.g. 'Harvest within 5–7 days for maximum yield' (use N/A if not applicable)" },
    podYieldEstimate: { type: Type.STRING, description: "e.g. 'Good pod fill expected; ~35–40 beans per pod' (use N/A if not applicable)" },
    characteristics: { type: Type.STRING, description: "2–4 sentences describing observed visual/physical traits or explaining why the image is not cocoa." },
    harvestRecommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 specific actionable tips related to harvest or care" },
    risks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-4 potential pest/disease/environmental risks" },
    nextSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 immediate action items for the farmer" },
    gaugeColor: { type: Type.STRING, description: "CSS hex colour matching ripeness/health (e.g. green for healthy leaves, yellow/red for ripe pods)" }
  },
  required: [
    "isCocoa", "objectType", "ripenessLabel", "ripenessScore", "weeksToHarvest", "estimatedAgeWeeks", 
    "bestHarvestWindow", "podYieldEstimate", "characteristics", 
    "harvestRecommendations", "risks", "nextSteps", "gaugeColor"
  ]
};

const JSON_SCHEMA = {
  type: "object",
  properties: {
    isCocoa: { type: "boolean" },
    objectType: { type: "string" },
    ripenessLabel: { type: "string" },
    ripenessScore: { type: "number" },
    weeksToHarvest: { type: "string" },
    estimatedAgeWeeks: { type: "string" },
    bestHarvestWindow: { type: "string" },
    podYieldEstimate: { type: "string" },
    characteristics: { type: "string" },
    harvestRecommendations: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
    gaugeColor: { type: "string" }
  },
  required: [
    "isCocoa", "objectType", "ripenessLabel", "ripenessScore", "weeksToHarvest", "estimatedAgeWeeks",
    "bestHarvestWindow", "podYieldEstimate", "characteristics",
    "harvestRecommendations", "risks", "nextSteps", "gaugeColor"
  ]
};

// Helper: mask an API key for safe logging
function maskKey(key: string | undefined): string {
  if (!key) return '(none)';
  if (key.length <= 8) return '***';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

// Helper: extract API key from request body or Authorization header
function extractApiKey(req: express.Request): string | undefined {
  const { apiKey } = req.body || {};
  const authHeader = (req.headers.authorization || req.headers.Authorization) as string | undefined;
  const headerApiKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  return apiKey || headerApiKey;
}

// ─── API Key Validation Endpoint ────────────────────────────────────────────

app.post('/api/validate-key', async (req, res) => {
  try {
    const { provider = 'gemini' } = req.body;
    const providedApiKey = extractApiKey(req);

    if (!providedApiKey && provider !== 'gemini') {
      return res.status(400).json({ valid: false, error: `No API key provided for ${provider}.` });
    }

    if (provider === 'gemini') {
      const activeKey = providedApiKey || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(400).json({ valid: false, error: 'No Gemini API key provided or configured on the server.' });
      }
      try {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: 'Respond with exactly: OK',
          config: { maxOutputTokens: 10 }
        });
        return res.json({ valid: true, provider: 'gemini', message: 'Gemini API key is valid.' });
      } catch (e: any) {
        return res.status(401).json({ valid: false, provider: 'gemini', error: `Gemini key validation failed: ${e.message}` });
      }

    } else if (provider === 'openai') {
      try {
        const openai = new OpenAI({ apiKey: providedApiKey });
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
          max_tokens: 5,
        });
        return res.json({ valid: true, provider: 'openai', message: 'OpenAI API key is valid.' });
      } catch (e: any) {
        return res.status(401).json({ valid: false, provider: 'openai', error: `OpenAI key validation failed: ${e.message}` });
      }

    } else if (provider === 'anthropic') {
      try {
        const anthropic = new Anthropic({ apiKey: providedApiKey });
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
        });
        return res.json({ valid: true, provider: 'anthropic', message: 'Anthropic API key is valid.' });
      } catch (e: any) {
        return res.status(401).json({ valid: false, provider: 'anthropic', error: `Anthropic key validation failed: ${e.message}` });
      }

    } else if (provider === 'meta') {
      try {
        const openai = new OpenAI({ apiKey: providedApiKey, baseURL: 'https://api.groq.com/openai/v1' });
        const response = await openai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
          max_tokens: 5,
        });
        return res.json({ valid: true, provider: 'meta', message: 'Groq/Meta API key is valid.' });
      } catch (e: any) {
        return res.status(401).json({ valid: false, provider: 'meta', error: `Groq/Meta key validation failed: ${e.message}` });
      }

    } else {
      return res.status(400).json({ valid: false, error: `Unsupported provider: ${provider}` });
    }
  } catch (error: any) {
    console.error('Key validation error:', error.message);
    res.status(500).json({ valid: false, error: 'Internal server error during key validation.' });
  }
});

// ─── Main Analysis Endpoint ─────────────────────────────────────────────────

app.post('/api/analyse', async (req, res) => {
  try {
    const { text, images, audio, files, provider = 'gemini' } = req.body;
    const providedApiKey = extractApiKey(req);

    console.log(`[analyse] provider=${provider} key=${maskKey(providedApiKey)} text_len=${(text || '').length} images=${images?.length || 0} files=${files?.length || 0}`);

    let promptText = `Farmer's observation: ${text || '(No text provided)'}\n\nPlease analyse the cocoa plant based on the provided information, images, video, audio, files or folder structures.`;
    
    // Add folder structures metadata if present
    if (files && Array.isArray(files)) {
      const folderFiles = files.filter(f => f.path);
      if (folderFiles.length > 0) {
        promptText += `\n\n[Uploaded Folder structure description]:\nThe farmer uploaded a local folder. Here are the paths of files in this folder:\n`;
        folderFiles.forEach(f => {
          promptText += `- Name: ${f.name} | Path: ${f.path} | Type: ${f.mimeType} | Size: ${f.size} bytes\n`;
        });
        promptText += `\nScan through all these assets from the folder structure to formulate your agricultural diagnostic advisory.`;
      }
    }
    
    let resultJson: any = null;

    if (provider === 'gemini') {
      const activeApiKey = providedApiKey || process.env.GEMINI_API_KEY;
      if (!activeApiKey) throw new Error('Gemini API key is not configured. Go to Settings (⚙️) to enter your Gemini API key, or set GEMINI_API_KEY on the server.');

      const ai = new GoogleGenAI({ apiKey: activeApiKey });
      const parts: any[] = [{ text: promptText }];

      // Handle traditional/compatibility image list
      if (images && Array.isArray(images)) {
        for (const img of images) {
          parts.push({
            inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.data }
          });
        }
      }

      // Handle the generic files & folders list
      if (files && Array.isArray(files)) {
        for (const file of files) {
          if (file.data) {
            parts.push({
              text: `File attached: name="${file.name}"${file.path ? ` path="${file.path}"` : ''} | Type: ${file.mimeType}`
            });
            parts.push({
              inlineData: { mimeType: file.mimeType || 'application/octet-stream', data: file.data }
            });
          }
        }
      }

      if (audio && audio.data) {
        parts.push({
          inlineData: { mimeType: audio.mimeType || 'audio/webm', data: audio.data }
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA
        }
      });
      resultJson = JSON.parse(response.text || '{}');
      
    } else if (provider === 'openai' || provider === 'meta') {
      const activeApiKey = providedApiKey;
      if (!activeApiKey) throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Groq/Meta'} API key is required. Go to Settings (⚙️) to enter your API key.`);
      
      const baseURL = provider === 'meta' ? 'https://api.groq.com/openai/v1' : undefined;
      const model = provider === 'meta' ? 'llama-3.3-70b-versatile' : 'gpt-4o';
      
      const openai = new OpenAI({ apiKey: activeApiKey, baseURL });
      const contentParts: any[] = [{ type: 'text', text: promptText }];
      
      if (images && Array.isArray(images)) {
        for (const img of images) {
          const mimeType = img.mimeType || 'image/jpeg';
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${img.data}` }
          });
        }
      }
      
      if (files && Array.isArray(files)) {
        for (const file of files) {
          if (file.data && file.mimeType?.startsWith('image/')) {
            contentParts.push({
              type: "image_url",
              image_url: { url: `data:${file.mimeType};base64,${file.data}` }
            });
          }
        }
      }

      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + "\n\nRespond with a valid JSON matching this schema: " + JSON.stringify(JSON_SCHEMA) },
          { role: 'user', content: contentParts }
        ],
        response_format: { type: "json_object" }
      });
      
      resultJson = JSON.parse(response.choices[0].message.content || '{}');
      
    } else if (provider === 'anthropic') {
      const activeApiKey = providedApiKey;
      if (!activeApiKey) throw new Error('Anthropic API key is required. Go to Settings (⚙️) to enter your Claude API key.');

      const anthropic = new Anthropic({ apiKey: activeApiKey });
      const contentParts: any[] = [{ type: 'text', text: promptText }];
      
      if (images && Array.isArray(images)) {
        for (const img of images) {
          contentParts.push({
            type: "image",
            source: {
              type: "base64",
              media_type: (img.mimeType || 'image/jpeg') as any,
              data: img.data
            }
          });
        }
      }
      
      if (files && Array.isArray(files)) {
        for (const file of files) {
          if (file.data && file.mimeType?.startsWith('image/')) {
            contentParts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: file.mimeType as any,
                data: file.data
              }
            });
          }
        }
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT + "\n\nYou MUST respond with ONLY a valid JSON object matching this schema: " + JSON.stringify(JSON_SCHEMA) + "\nDo not include any markdown formatting like ```json or any other text.",
        messages: [{ role: 'user', content: contentParts }]
      });
      
      let resText = (response.content[0] as any).text || '{}';
      // Clean up markdown block if present
      resText = resText.replace(/```json\n?|\n?```/g, '').trim();
      resultJson = JSON.parse(resText);
    } else {
      throw new Error(`Unsupported provider: ${provider}. Supported providers are: gemini, openai, anthropic, meta.`);
    }

    res.json(resultJson);
  } catch (error: any) {
    console.error('Analysis error:', error.message);
    
    // Return provider-specific error messages
    let statusCode = 500;
    let userMessage = error.message || 'Internal server error';

    if (error.message?.includes('API key')) {
      statusCode = 401;
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      statusCode = 429;
      userMessage = `Rate limit exceeded. Please wait a moment and try again. (${error.message})`;
    } else if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
      statusCode = 404;
      userMessage = `The requested AI model was not found. The provider may have updated their model names. (${error.message})`;
    }

    res.status(statusCode).json({ error: userMessage });
  }
});

// Proxy endpoint to the local Python ML service
app.post('/api/predict', async (req, res) => {
  try {
    const pythonUrl = process.env.PYTHON_ML_URL || 'http://localhost:5000/predict';
    const response = await fetch(pythonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Predict proxy error:', err);
    res.status(500).json({ error: 'Failed to call Python ML service. Make sure it is running (npm run start-python).' });
  }
});

// Proxy endpoint to Python ML model info
app.get('/api/model-info', async (req, res) => {
  try {
    const pythonUrl = process.env.PYTHON_ML_URL || 'http://localhost:5000';
    const baseUrl = pythonUrl.replace(/\/predict$/, '');
    const response = await fetch(`${baseUrl}/model-info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Python ML service is not running.' });
  }
});

async function startServer() {
  const server = http.createServer(app);
  
  // Set up WebSocket server for Live API
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs) => {
    try {
      if (!defaultAi) {
        clientWs.send(JSON.stringify({ error: 'Live API unavailable: GEMINI_API_KEY not set on server.' }));
        clientWs.close();
        return;
      }
      const session = await defaultAi.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: SYSTEM_PROMPT + "\n\nYou are now in a live voice conversation with a farmer showing you their cocoa crops. You should speak clearly and concisely to help them evaluate crop health.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (error) => {
            console.error("Live API Error:", error);
            clientWs.send(JSON.stringify({ error: 'Live API Error' }));
          },
          onclose: () => {
             console.log("Live API connection closed");
          }
        },
      });

      let sessionReady = true;

      clientWs.on('message', (data) => {
        try {
          if (!sessionReady) return;
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          }
          if (msg.video) {
             session.sendRealtimeInput({
               video: { data: msg.video, mimeType: 'image/jpeg' }
             });
          }
        } catch (err) {
          console.error("Error sending realtime input:", err);
        }
      });
      
      clientWs.on('close', () => {
         sessionReady = false;
         try {
           session.close();
         } catch (e) {
           console.error("Error closing Live API session:", e);
         }
      });
    } catch (err) {
      console.error("Failed to connect to Live API:", err);
      clientWs.send(JSON.stringify({ error: "Failed to connect to Live API" }));
    }
  });

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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
