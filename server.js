import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check endpoint (Critical for Render.com health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Nha DX Dubber Pro Web App',
    time: new Date().toISOString()
  });
});

// Supported Voices Endpoint
const SUPPORTED_VOICES = [
  { id: 'km-KH-PisethNeural', name: 'សំឡេងប្រុស (Piseth Neural)', gender: 'Male', locale: 'km-KH' },
  { id: 'km-KH-SreymomNeural', name: 'សំឡេងស្រី (Sreymom Neural)', gender: 'Female', locale: 'km-KH' }
];

app.get('/api/voices', (req, res) => {
  res.json({ voices: SUPPORTED_VOICES });
});

/**
 * Escape XML characters for SSML
 */
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Azure Cognitive Speech REST API
 */
async function synthesizeAzureTTS(text, { voice, rate, pitch, volume, azureKey, azureRegion }) {
  const region = azureRegion || process.env.AZURE_SPEECH_REGION || 'eastus';
  const key = azureKey || process.env.AZURE_SPEECH_KEY;

  if (!key) {
    throw new Error('No Azure Speech Key provided');
  }

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="km-KH">
    <voice name="${voice}">
      <prosody pitch="${pitch || '+0Hz'}" rate="${rate || '+0%'}" volume="${volume || '+20%'}">
        ${escapeXml(text)}
      </prosody>
    </voice>
  </speak>`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key.trim(),
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'NhaDXDubberProServer'
    },
    body: ssml
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure TTS error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Microsoft Edge TTS Neural Speech (Free)
 */
async function synthesizeEdgeTTS(text, { voice, rate, pitch, volume }) {
  const selectedVoice = voice || 'km-KH-PisethNeural';
  const rateNum = (rate !== undefined && rate !== null && !isNaN(rate)) ? parseInt(rate, 10) : 0;
  const rateStr = rateNum >= 0 ? `+${rateNum}%` : `${rateNum}%`;
  const pitchStr = pitch || '+0Hz';
  const volumeStr = volume || '+20%';

  const tts = new MsEdgeTTS();
  await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    try {
      const { audioStream } = tts.toStream(text, {
        rate: rateStr,
        pitch: pitchStr,
        volume: volumeStr
      });

      const chunks = [];
      audioStream.on('data', (chunk) => chunks.push(chunk));
      audioStream.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        if (fullBuffer.length === 0) {
          reject(new Error('Empty audio buffer received from Edge TTS'));
        } else {
          resolve(fullBuffer);
        }
      });
      audioStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Split text into chunks safe for Google Translate TTS (~180 chars)
 */
function splitTextForTTS(text, maxLength = 180) {
  if (text.length <= maxLength) return [text];
  const parts = text.split(/([\s,។\n]+)/);
  const chunks = [];
  let current = '';
  for (const part of parts) {
    if ((current + part).length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = part;
    } else {
      current += part;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Google Khmer TTS (100% Free, reliable everywhere)
 */
async function synthesizeGoogleKhmerTTS(text) {
  const chunks = splitTextForTTS(text, 180);
  const audioBuffers = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=km&client=tw-ob&q=${encodeURIComponent(chunk.trim())}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Google TTS error: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuffer));
  }

  if (audioBuffers.length === 0) {
    throw new Error('No audio synthesized by Google TTS');
  }

  return Buffer.concat(audioBuffers);
}

/**
 * Text-to-Speech API Endpoint
 * Accepts: { text, voice, rate, pitch, volume, azureKey, azureRegion }
 * Returns: audio/mpeg binary stream
 */
app.post('/api/tts', async (req, res) => {
  const { text, voice, rate, pitch, volume, azureKey, azureRegion } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing or empty "text" parameter' });
  }

  const cleanText = text.trim();
  const selectedVoice = voice || 'km-KH-PisethNeural';

  // 1. If Azure key is provided, try Azure first
  const activeAzureKey = azureKey || process.env.AZURE_SPEECH_KEY;
  if (activeAzureKey && activeAzureKey.trim()) {
    try {
      const audioBuffer = await synthesizeAzureTTS(cleanText, {
        voice: selectedVoice,
        rate,
        pitch,
        volume,
        azureKey: activeAzureKey,
        azureRegion
      });

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length,
        'Cache-Control': 'public, max-age=86400'
      });
      return res.send(audioBuffer);
    } catch (azureErr) {
      console.warn('Azure TTS failed, attempting fallback:', azureErr.message);
    }
  }

  // 2. Try Microsoft Edge TTS (Piseth / Sreymom Neural)
  try {
    const audioBuffer = await synthesizeEdgeTTS(cleanText, {
      voice: selectedVoice,
      rate,
      pitch,
      volume
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.send(audioBuffer);
  } catch (edgeErr) {
    console.warn('Edge TTS synthesis error, attempting Google Khmer TTS fallback:', edgeErr.message);
  }

  // 3. Fallback: Ultra-Reliable Google Khmer Neural Voice
  try {
    const audioBuffer = await synthesizeGoogleKhmerTTS(cleanText);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.send(audioBuffer);
  } catch (googleErr) {
    console.error('All TTS engines failed:', googleErr.message);
    return res.status(500).json({
      error: 'TTS synthesis failed',
      details: googleErr.message
    });
  }
});

// Serve static assets (dist/ if present, otherwise root directory)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: '1h' }));
}
app.use(express.static(__dirname, { maxAge: '1h' }));

// SPA Fallback: Serve index.html for any unhandled GET route
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
      ? path.join(distPath, 'index.html')
      : path.join(__dirname, 'index.html');
    return res.sendFile(indexPath);
  }
  next();
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Nha DX Dubber Pro Web App server running on http://${HOST}:${PORT}`);
  console.log(`📁 Serving static assets from: ${distPath}`);
  console.log(`🩺 Health check URL: http://${HOST}:${PORT}/api/health`);
});
