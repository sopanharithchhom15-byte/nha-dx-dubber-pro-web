import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';

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

// ============================================================================
// MICROSOFT EDGE NEURAL TTS (V2 DRM TOKEN ENGINE - PISETH & SREYMOM)
// Exactly ported from the original Nha DX Dubber Pro Android engine
// ============================================================================

const WIN_EPOCH = 11644473600n;
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = '143';

const SHA256_INITIAL = [
  0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
  0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
].map(x => x >>> 0);

const SHA256_STATE = [
  0xFD9FBEA2, 0x91243CE7, 0xBE499094, 0xCD2E1E0A,
  0x6C006F49, 0x04BD35AB, 0xFEB0A7E4, 0x03EFFBD2
].map(x => x >>> 0);

const SHA256_SCHEDULE = [
  0xEB24BF9E, 0x1558691F, 0xA0C09EE2, 0x0CFA32BA,
  0xA622EE8C, 0xD1DD9491, 0xC0DD25A0, 0xF9E70AB6,
  0xF0C31573, 0x7058CE4E, 0x7188E606, 0x00E5AB33,
  0xD258B060, 0x72766564
].map(x => x >>> 0);

const SHA256_ROUND_CONSTANTS = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
].map(x => x >>> 0);

const SHA256_ADJUSTMENT = (0xC9DC06A7) >>> 0;
const SHA256_BLOCK_CONSTANTS = [...SHA256_ROUND_CONSTANTS];
SHA256_BLOCK_CONSTANTS[14] = SHA256_ADJUSTMENT;

const SHA256_SIGMA0_ADJUSTMENT = (0x059C0B80) >>> 0;
const SHA256_SIGMA1_ADJUSTMENT = (0x000B92C0) >>> 0;

const CS64_COEFFICIENTS = [
  [0xE82E91B1, 0xB32700D0], [0x44DE24C6, 0x88DFF51D],
  [0x3BEB65BC, 0x29514038], [0xC89C5933, 0xB328CBDF],
  [0x8D1EC211, 0xD405B4D5], [0x314EF5D5, 0x26E55F3C],
  [0xE92491B1, 0x607801C6], [0xF0A5B9D5, 0x82B2C1FB],
  [0x06064CF3, 0xFA51A3DA], [0xDA79FA60, 0x207CC464],
  [0xBED20560, 0x3C3C74F3], [0x89F9C9F8, 0xD2D14B61],
  [0x35FA38C6, 0xBB04A2C1], [0xCB49E3C6, 0xC5626167]
].map(([a, b]) => [a >>> 0, b >>> 0]);

const CS64_FACTOR = (0x82893933) >>> 0;
const CS64_ADJUSTMENT0 = (0xF2F90B1A) >>> 0;
const CS64_ADJUSTMENT1 = (0x0B1A0000) >>> 0;

function rol16(v) {
  v = v >>> 0;
  return (((v << 16) | (v >>> 16)) >>> 0);
}

function sigma0(v) {
  v = v >>> 0;
  return (((v >>> 7) ^ ((v << 25) >>> 0) ^ (v >>> 18) ^ ((v << 14) >>> 0) ^ (v >>> 3)) >>> 0);
}

function sigma1(v) {
  v = v >>> 0;
  return (((v >>> 17) ^ ((v << 15) >>> 0) ^ (v >>> 19) ^ ((v << 13) >>> 0) ^ (v >>> 10)) >>> 0);
}

function expandSha256Schedule(words, firstWord) {
  for (let i = firstWord; i < 64; i++) {
    const x = words[i - 2];
    const y = words[i - 15];
    const s1 = sigma1(x);
    const s0 = sigma0(y);
    const val = (s1 + words[i - 7] + s0 + words[i - 16]) >>> 0;
    words.push(val);
  }
}

function sha256Rounds(state, words, firstRound) {
  let [a, b, c, d, e, f, g, h] = state;
  const constants = (firstRound === 14) ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS;

  for (let i = firstRound; i < 64; i++) {
    const rot_e = (((e >>> 6) | ((e << 26) >>> 0)) ^ ((e >>> 11) | ((e << 21) >>> 0)) ^ ((e >>> 25) | ((e << 7) >>> 0))) >>> 0;
    const ch = (g ^ (e & (f ^ g))) >>> 0;
    const t1 = (h + rot_e + ch + constants[i] + words[i]) >>> 0;
    const rot_a = (((a >>> 2) | ((a << 30) >>> 0)) ^ ((a >>> 13) | ((a << 19) >>> 0)) ^ ((a >>> 22) | ((a << 10) >>> 0))) >>> 0;
    const maj = ((a & b) | (c & (a | b))) >>> 0;
    const t2 = (rot_a + maj) >>> 0;

    h = g;
    g = f;
    f = e;
    e = (d + t1) >>> 0;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) >>> 0;
  }

  return [a, b, c, d, e, f, g, h];
}

function sha256Init(data7) {
  const words = new Array(14).fill(0);
  const w14 = ((data7[0] << 16) | (data7[1] << 8) | data7[2]) >>> 0;
  words.push(w14);
  const w15 = ((data7[3] << 24) | (data7[4] << 16) | (data7[5] << 8) | data7[6]) >>> 0;
  words.push(w15);

  for (let i = 16; i < 30; i++) {
    let val = SHA256_SCHEDULE[i - 16];
    if (i - 2 >= 14) {
      const s1 = sigma1(words[i - 2]);
      val = (val + ((i === 16) ? (s1 ^ SHA256_SIGMA1_ADJUSTMENT) : s1)) >>> 0;
    }
    if (i - 7 >= 14) {
      val = (val + words[i - 7]) >>> 0;
    }
    if (i - 15 >= 14) {
      const s0 = sigma0(words[i - 15]);
      val = (val + ((i === 29) ? (s0 ^ SHA256_SIGMA0_ADJUSTMENT) : s0)) >>> 0;
    }
    words.push(val);
  }

  const w30 = (sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14] + SHA256_ADJUSTMENT - SHA256_ROUND_CONSTANTS[14]) >>> 0;
  words.push(w30);

  expandSha256Schedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  const res = new Array(8);
  for (let i = 0; i < 8; i++) {
    res[i] = (SHA256_INITIAL[i] + working[i]) >>> 0;
  }
  return res;
}

function sha256Digest(data) {
  if (data.length < 7) throw new Error("Data too short");
  const length = BigInt(57 + data.length);
  const data7 = data.slice(0, 7);

  let rem = Number((55n - length) % 64n);
  if (rem < 0) rem += 64;
  const paddedLen = (data.length - 7) + 1 + rem + 8;
  const padded = new Uint8Array(paddedLen);

  padded.set(data.slice(7), 0);
  padded[data.length - 7] = 0x80;
  const bitLen = length * 8n;
  const lenPos = paddedLen - 8;
  for (let i = 0; i < 8; i++) {
    padded[lenPos + i] = Number((bitLen >> BigInt((7 - i) * 8)) & 0xFFn);
  }

  let state = sha256Init(data7);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    const words = [];
    for (let i = 0; i < 16; i++) {
      const p = offset + i * 4;
      const w = ((padded[p] << 24) | (padded[p + 1] << 16) | (padded[p + 2] << 8) | padded[p + 3]) >>> 0;
      words.push(w);
    }
    expandSha256Schedule(words, 16);
    const working = sha256Rounds(state, words, 0);
    for (let i = 0; i < 8; i++) {
      state[i] = (state[i] + working[i]) >>> 0;
    }
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (state[i] >>> 24) & 0xFF;
    out[i * 4 + 1] = (state[i] >>> 16) & 0xFF;
    out[i * 4 + 2] = (state[i] >>> 8) & 0xFF;
    out[i * 4 + 3] = state[i] & 0xFF;
  }
  return out;
}

function wordsLe4Even(data) {
  let pad = (-data.length) % 4;
  if (pad < 0) pad += 4;
  const totalLen = data.length + pad;
  const padded = new Uint8Array(totalLen);
  padded.set(data, 0);

  const wordCount = Math.floor(totalLen / 4);
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const p = i * 4;
    const w = (padded[p] | (padded[p + 1] << 8) | (padded[p + 2] << 16) | (padded[p + 3] << 24)) >>> 0;
    words.push(w);
  }
  if (words.length % 2 !== 0) {
    words.push(0);
  }
  return words;
}

function cs64Digest(data, digest) {
  let keyA = (digest[0] | (digest[1] << 8) | (digest[2] << 16) | (digest[3] << 24)) >>> 0;
  let keyB = (digest[4] | (digest[5] << 8) | (digest[6] << 16) | (digest[7] << 24)) >>> 0;
  keyA = (keyA | 1) >>> 0;
  keyB = (keyB | 1) >>> 0;

  const factors = [
    Number((BigInt(keyA) * BigInt(CS64_FACTOR)) & 0xFFFFFFFFn) >>> 0,
    Number((BigInt(keyB) * BigInt(CS64_FACTOR)) & 0xFFFFFFFFn) >>> 0
  ];

  const terms = [];
  const offsets = [];

  for (let i = 0; i < CS64_COEFFICIENTS.length; i++) {
    const coeff = CS64_COEFFICIENTS[i][0];
    const off = CS64_COEFFICIENTS[i][1];
    terms.push(Number((BigInt(coeff) * BigInt(factors[i % 2])) & 0xFFFFFFFFn) >>> 0);
    offsets.push(off);
  }

  const prefixed = new Uint8Array(1 + data.length);
  prefixed[0] = 0x00;
  prefixed.set(data, 1);
  const words = wordsLe4Even(prefixed);

  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    const k = (index % 2 === 0 ? keyA : keyB);
    let term = Number((BigInt(word) * BigInt(k)) & 0xFFFFFFFFn) >>> 0;
    const mult = (index % 2 === 0 ? 0xEF0569FB : 0xC31713DB) >>> 0;
    let offset = Number((BigInt(rol16(word)) * BigInt(mult)) & 0xFFFFFFFFn) >>> 0;

    if (index === 0) {
      term = Number((BigInt(term) + BigInt(CS64_ADJUSTMENT0) * BigInt(factors[0])) & 0xFFFFFFFFn) >>> 0;
      offset = (offset + CS64_ADJUSTMENT1) >>> 0;
    }
    terms.push(term);
    offsets.push(offset);
  }

  let swapAcc = 0;
  let swapLast = 0;
  let state = 0;
  let acc = 0;

  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index];
    const y = terms[index + 1];

    let t = rol16((offsets[index] + x) >>> 0);
    let q = Number((BigInt(t) * 0x76F50F34n) & 0xFFFFFFFFn) >>> 0;
    let addQ = (Number((BigInt(rol16(q)) * 0xC3EFEA97n) & 0xFFFFFFFFn) + q) >>> 0;
    swapAcc = (swapAcc + addQ) >>> 0;

    t = rol16((offsets[index + 1] + y) >>> 0);
    q = Number((BigInt(t) * 0x1881CE3Cn) & 0xFFFFFFFFn) >>> 0;
    swapLast = (Number((BigInt(rol16(q)) * 0x35BD1EC9n) & 0xFFFFFFFFn) + q) >>> 0;
    swapAcc = (swapAcc + swapLast) >>> 0;

    state = Number((BigInt(state) * BigInt(keyA) + BigInt(x)) & 0xFFFFFFFFn) >>> 0;
    state = Number((BigInt(rol16(state)) * 0xCF98B111n) & 0xFFFFFFFFn) >>> 0;
    state = Number((BigInt(rol16(state)) * 0x87085B9Fn) & 0xFFFFFFFFn) >>> 0;
    state = Number((BigInt(rol16(state)) * 0x12CEB96Dn) & 0xFFFFFFFFn) >>> 0;
    state = Number((BigInt(rol16(state)) * 0x257E1D83n) & 0xFFFFFFFFn) >>> 0;
    acc = (acc + state) >>> 0;

    t = Number((BigInt(state) * BigInt(keyB) + BigInt(y)) & 0xFFFFFFFFn) >>> 0;
    t = Number((BigInt(rol16(t)) * 0xA27416F5n) & 0xFFFFFFFFn) >>> 0;
    t = Number((BigInt(rol16(t)) * 0xD38396FFn) & 0xFFFFFFFFn) >>> 0;
    const rolT = Number((BigInt(rol16(t)) * 0x7C932B89n) & 0xFFFFFFFFn) >>> 0;
    state = Number((BigInt(rol16(rolT)) * 0xBFA49F69n) & 0xFFFFFFFFn) >>> 0;
    acc = (acc + state) >>> 0;
  }

  return [(swapLast ^ state) >>> 0, (swapAcc ^ acc) >>> 0];
}

function generateSecMsGecV2(unixTimestamp) {
  const unixSec = BigInt(unixTimestamp ? Math.floor(unixTimestamp) : Math.floor(Date.now() / 1000));
  let ticks = unixSec + WIN_EPOCH;
  ticks -= (ticks % 300n);
  ticks *= 10000000n;

  const strToHash = ticks.toString() + TRUSTED_CLIENT_TOKEN;
  const data = Buffer.from(strToHash, 'ascii');

  const digest = sha256Digest(data);
  const cs64Parts = cs64Digest(data, digest);

  let cs64Hex = '';
  for (const part of cs64Parts) {
    const b = [
      part & 0xFF,
      (part >>> 8) & 0xFF,
      (part >>> 16) & 0xFF,
      (part >>> 24) & 0xFF
    ];
    for (const by of b) {
      cs64Hex += by.toString(16).padStart(2, '0').toUpperCase();
    }
  }

  let digestHex = '';
  for (const b of digest) {
    digestHex += b.toString(16).padStart(2, '0').toUpperCase();
  }

  return `${cs64Hex}-${digestHex}`;
}

/**
 * Microsoft Edge TTS Neural Speech (Piseth & Sreymom Khmer voices)
 */
async function synthesizeEdgeTTS(text, { voice = 'km-KH-PisethNeural', rate = '+0%', pitch = '+0Hz', volume = '+20%' } = {}) {
  const secMsGec = generateSecMsGecV2();
  const connectionId = crypto.randomUUID().replace(/-/g, '');
  const wssUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=2-${CHROMIUM_FULL_VERSION}&ConnectionId=${connectionId}`;
  const muid = crypto.randomUUID().replace(/-/g, '').toUpperCase();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wssUrl, {
      headers: {
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `muid=${muid};`
      }
    });

    const audioChunks = [];
    const requestId = crypto.randomUUID().replace(/-/g, '');

    ws.on('open', () => {
      const configMsg = "Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"
        + "{\"context\":{\"synthesis\":{\"audio\":{\"metadataoptions\":{\"sentenceBoundaryEnabled\":\"false\",\"wordBoundaryEnabled\":\"false\"},\"outputFormat\":\"audio-24khz-48kbitrate-mono-mp3\"}}}}";
      ws.send(configMsg);

      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="km-KH">`
        + `<voice name="${voice}">`
        + `<prosody pitch="${pitch}" rate="${rate}" volume="${volume}">`
        + escapeXml(text)
        + `</prosody></voice></speak>`;

      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        const textMsg = data.toString();
        if (textMsg.includes('Path:turn.end')) {
          ws.close(1000, 'Done');
          const finalBuffer = Buffer.concat(audioChunks);
          if (finalBuffer.length > 0) {
            resolve(finalBuffer);
          } else {
            reject(new Error('No audio data received from Edge TTS'));
          }
        }
      } else {
        const delim = Buffer.from('Path:audio\r\n');
        const delimIndex = data.indexOf(delim);
        if (delimIndex !== -1) {
          const audioStart = delimIndex + delim.length;
          if (audioStart < data.length) {
            audioChunks.push(data.subarray(audioStart));
          }
        }
      }
    });

    ws.on('error', (err) => reject(err));
    ws.on('unexpected-response', (req, res) => {
      reject(new Error(`Edge TTS HTTP ${res.statusCode} ${res.statusMessage}`));
    });
  });
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
  const rateNum = (rate !== undefined && rate !== null && !isNaN(rate)) ? parseInt(rate, 10) : 0;
  const rateStr = rateNum >= 0 ? `+${rateNum}%` : `${rateNum}%`;
  const pitchStr = pitch || '+0Hz';
  const volumeStr = volume || '+20%';

  // 1. If Azure key is provided, try Azure first
  const activeAzureKey = azureKey || process.env.AZURE_SPEECH_KEY;
  if (activeAzureKey && activeAzureKey.trim()) {
    try {
      const audioBuffer = await synthesizeAzureTTS(cleanText, {
        voice: selectedVoice,
        rate: rateStr,
        pitch: pitchStr,
        volume: volumeStr,
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
      console.warn('Azure TTS failed, attempting Edge TTS fallback:', azureErr.message);
    }
  }

  // 2. Microsoft Edge TTS (Piseth / Sreymom Neural - Free Engine from Original App)
  try {
    const audioBuffer = await synthesizeEdgeTTS(cleanText, {
      voice: selectedVoice,
      rate: rateStr,
      pitch: pitchStr,
      volume: volumeStr
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.send(audioBuffer);
  } catch (edgeErr) {
    console.error('Edge TTS error:', edgeErr.message);
    return res.status(502).json({
      error: 'Edge TTS synthesis failed',
      details: edgeErr.message
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
