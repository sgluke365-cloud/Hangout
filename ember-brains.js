// Ember's brains: which AI answers for Ember, and switching to the next one when one is busy.
//
// The server can hold keys for several AI services. Each service offers a few models, and every
// model has its own limits, so they form one long chain, for example:
//   Groq llama-3.3-70b → Groq gpt-oss-120b → Groq gpt-oss-20b → Groq llama-3.1-8b →
//   Gemini 3.8 Flash → Gemini 3.5 Flash-Lite → …
// Ember asks the first brain in the chain that isn't resting. When a brain says "too many
// requests" (or fails), it rests until its limit resets and Ember moves on to the next one.
// Only when every brain is resting does Ember fall back to its storybook (in the browser).
//
// Keys and settings (all optional; set them in Render → Environment):
//   ANTHROPIC_API_KEY   Claude (paid, best).              SPIRIT_MODEL   default claude-haiku-5-5
//   GROQ_API_KEY        Groq (free tier).                 GROQ_MODELS    comma-separated list
//                       Groq also gives Ember its ears on phones (speech to text): GROQ_EAR_MODELS
//   GEMINI_API_KEY      Google Gemini (free tier).        GEMINI_MODELS  comma-separated list
//   SPIRIT_ORDER        which services to try first, default "anthropic,groq,gemini"
//
// Ember's voice (a natural voice instead of the phone's own), tried in this order:
//   DEEPGRAM_API_KEY    Deepgram Aura-2 ($200 free credit, no card).  DEEPGRAM_VOICE  default aura-2-draco-en
//   GROQ_API_KEY        Groq Orpheus (free, but only ~100 lines a day). GROQ_VOICE  default troy ("off" to skip)
//   EMBER_VOICE_DAILY_CHARS  most characters spoken per day (default 100000), to keep the credit safe
'use strict';

const env = process.env;
const list = (v, d) => (v ? String(v).split(',') : d).map(s => s.trim()).filter(Boolean);

// Groq's free plan: the gpt-oss models and Qwen. (The Llama models became Enterprise-only in 2026;
// they stay at the end in case a key can still use them. A brain that isn't available rests a day.)
const GROQ_DEFAULT = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GROQ_EARS_DEFAULT = ['whisper-large-v3-turbo', 'whisper-large-v3'];
const GEMINI_DEFAULT = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
const BASE = {
  anthropic: (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, ''),
  groq: (env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
  gemini: (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''),
  deepgram: (env.DEEPGRAM_BASE_URL || 'https://api.deepgram.com/v1').replace(/\/+$/, '')
};
const NAMES = { anthropic: 'Claude', groq: 'Groq', gemini: 'Gemini', deepgram: 'Deepgram' };

function makeChain() {
  const chain = [];
  for (const service of list(env.SPIRIT_ORDER, ['anthropic', 'groq', 'gemini']).map(s => s.toLowerCase())) {
    if (service === 'anthropic' && env.ANTHROPIC_API_KEY) chain.push({ service, model: env.SPIRIT_MODEL || 'claude-haiku-5-5', key: env.ANTHROPIC_API_KEY, paid: true });
    if (service === 'groq' && env.GROQ_API_KEY) for (const model of list(env.GROQ_MODELS, GROQ_DEFAULT)) chain.push({ service, model, key: env.GROQ_API_KEY });
    if (service === 'gemini' && env.GEMINI_API_KEY) for (const model of list(env.GEMINI_MODELS, GEMINI_DEFAULT)) chain.push({ service, model, key: env.GEMINI_API_KEY });
  }
  for (const b of chain) { b.id = `${b.service}:${b.model}`; b.restUntil = 0; b.why = ''; }
  return chain;
}
const chain = makeChain();
// Ember's ears: speech-to-text models, used on phones where the browser can't listen while voice
// chat has the microphone. Each model has its own limits (Groq free plan: 20 a minute, 2,000 a day).
const ears = env.GROQ_API_KEY ? list(env.GROQ_EAR_MODELS, GROQ_EARS_DEFAULT).map(model => ({ service: 'groq', model, key: env.GROQ_API_KEY, id: 'groq:' + model, restUntil: 0, why: '' })) : [];
const earsDay = { day: '', count: 0 };
// Ember's voice: text to speech. max is the most characters one request may carry.
const voices = [];
if (env.DEEPGRAM_API_KEY) voices.push({ service: 'deepgram', model: env.DEEPGRAM_VOICE || 'aura-2-draco-en', key: env.DEEPGRAM_API_KEY, max: 1800 });
if (env.GROQ_API_KEY && String(env.GROQ_VOICE || '').toLowerCase() !== 'off') voices.push({ service: 'groq', model: env.GROQ_VOICE_MODEL || 'canopylabs/orpheus-v1-english', voice: env.GROQ_VOICE || 'troy', key: env.GROQ_API_KEY, max: 185 });
for (const b of voices) { b.id = `${b.service}:${b.model}`; b.restUntil = 0; b.why = ''; }
const voiceDay = { day: '', chars: 0 };

// ---------- how long to rest after a refusal ----------
const MIN = 60e3, HOUR = 60 * MIN;
// "2m59.56s", "7.66s", "34s", "1h2m" → milliseconds
function duration(s) {
  if (s == null) return 0;
  s = String(s).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s) * 1000; // plain seconds (retry-after)
  let ms = 0;
  for (const [, n, u] of s.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) ms += parseFloat(n) * { ms: 1, s: 1e3, m: MIN, h: HOUR }[u];
  return ms;
}
// Gemini's daily quotas reset at midnight Pacific time.
function untilPacificMidnight() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date());
  const get = t => +parts.find(p => p.type === t).value % 24;
  const since = (get('hour') * 3600 + get('minute') * 60 + get('second')) * 1000;
  return 24 * HOUR - since + 30e3;
}
class Refused extends Error {
  constructor(why, restMs) { super(why); this.why = why; this.rest = restMs; }
}
async function refusal(b, r) {
  let body = '';
  try { body = (await r.text()).slice(0, 2000); } catch { }
  const st = r.status, low = body.toLowerCase();
  const retryAfter = duration(r.headers.get('retry-after'));
  if (st === 429) {
    if (b.service === 'gemini') {
      const delay = duration((body.match(/"retryDelay"\s*:\s*"([^"]+)"/) || [])[1]);
      if (/perday|per_day|requests per day|daily/.test(low)) return new Refused('daily limit reached', Math.max(delay, untilPacificMidnight()));
      return new Refused('too many requests', Math.max(delay, 20e3));
    }
    const reset = Math.max(retryAfter, duration(r.headers.get('x-ratelimit-reset-requests')), duration(r.headers.get('x-ratelimit-reset-tokens')));
    return new Refused(/per day|\brpd\b|\btpd\b|daily/.test(low) ? 'daily limit reached' : 'too many requests', Math.min(24 * HOUR, Math.max(reset, 10e3)));
  }
  if (/terms/.test(low) && st >= 400 && st < 500) return new Refused(`needs its terms accepted once: open ${b.model} in the Groq console playground (console.groq.com/playground) and accept them`, 5 * MIN); // check again soon: once they're accepted, the voice comes back by itself
  if (st === 402) return new Refused('no credit left (HTTP 402)', 6 * HOUR);
  if (st === 401 || st === 403) return new Refused(`the key was refused (HTTP ${st}); check ${b.service.toUpperCase()}_API_KEY`, HOUR);
  if (st === 404 || /decommission|not found|not supported|deprecated|does not exist/.test(low)) return new Refused(`model not available (HTTP ${st})`, 24 * HOUR);
  if (/credit balance|billing|insufficient|quota/.test(low)) return new Refused(`no credit or quota left (HTTP ${st})`, 6 * HOUR);
  if (st === 400) return new Refused(`request rejected (HTTP 400): ${body.slice(0, 160)}`, 6 * HOUR);
  return new Refused(`server error (HTTP ${st})`, Math.max(retryAfter, 30e3)); // 5xx, 529 overloaded
}

// ---------- talking to each service ----------
// Each returns an async iterator of text pieces, or throws Refused before any text.
async function* sse(r) {
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try { yield JSON.parse(data); } catch { }
    }
  }
}
async function openAnthropic(b, p, signal) {
  const r = await fetch(BASE.anthropic + '/v1/messages', {
    method: 'POST', signal,
    headers: { 'x-api-key': b.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: b.model, max_tokens: p.maxTokens, system: p.system, messages: p.messages, stream: true })
  });
  if (!r.ok || !r.body) throw await refusal(b, r);
  return (async function* () {
    for await (const ev of sse(r)) {
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta' && typeof ev.delta.text === 'string') yield ev.delta.text;
      else if (ev.type === 'error') throw new Error('stream error: ' + JSON.stringify(ev.error || ev).slice(0, 200));
    }
  })();
}
async function openGroq(b, p, signal) {
  const reasoning = /gpt-oss/.test(b.model);
  const body = {
    model: b.model, stream: true, temperature: 0.9,
    max_tokens: p.maxTokens + (reasoning ? 700 : 0), // gpt-oss thinks first, and that counts too
    messages: [{ role: 'system', content: p.system }].concat(p.messages)
  };
  if (reasoning) { body.include_reasoning = false; body.reasoning_effort = 'low'; }
  else if (/qwen/.test(b.model)) body.reasoning_format = 'hidden';
  const r = await fetch(BASE.groq + '/chat/completions', {
    method: 'POST', signal,
    headers: { authorization: 'Bearer ' + b.key, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok || !r.body) throw await refusal(b, r);
  return (async function* () {
    for await (const ev of sse(r)) {
      if (ev.error) throw new Error('stream error: ' + JSON.stringify(ev.error).slice(0, 200));
      const t = ev.choices && ev.choices[0] && ev.choices[0].delta && ev.choices[0].delta.content;
      if (typeof t === 'string' && t) yield t;
    }
  })();
}
async function openGemini(b, p, signal) {
  const r = await fetch(`${BASE.gemini}/models/${encodeURIComponent(b.model)}:streamGenerateContent?alt=sse`, {
    method: 'POST', signal,
    headers: { 'x-goog-api-key': b.key, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: p.system }] },
      contents: p.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      // Flash models may think before answering; the thinking counts towards this, so leave room
      generationConfig: { maxOutputTokens: p.maxTokens + 1500, temperature: 0.9 }
    })
  });
  if (!r.ok || !r.body) throw await refusal(b, r);
  return (async function* () {
    for await (const ev of sse(r)) {
      if (ev.error) throw new Error('stream error: ' + JSON.stringify(ev.error).slice(0, 200));
      const parts = ev.candidates && ev.candidates[0] && ev.candidates[0].content && ev.candidates[0].content.parts;
      if (Array.isArray(parts)) for (const part of parts) if (part && !part.thought && typeof part.text === 'string' && part.text) yield part.text;
    }
  })();
}
const OPEN = { anthropic: openAnthropic, groq: openGroq, gemini: openGemini };

// Hide any <think>…</think> a model writes into its answer (tags may arrive split across pieces).
async function* noThinking(it) {
  const OPEN_TAG = '<think>', CLOSE_TAG = '</think>';
  // how many characters at the end of s could be the start of tag
  const partial = (s, tag) => { for (let k = Math.min(tag.length - 1, s.length); k > 0; k--) if (tag.startsWith(s.slice(-k))) return k; return 0; };
  let inside = false, buf = '';
  for await (const piece of it) {
    buf += piece;
    let out = '';
    for (;;) {
      if (inside) {
        const j = buf.indexOf(CLOSE_TAG);
        if (j < 0) { buf = buf.slice(buf.length - partial(buf, CLOSE_TAG)); break; }
        buf = buf.slice(j + CLOSE_TAG.length); inside = false;
      } else {
        const i = buf.indexOf(OPEN_TAG);
        if (i >= 0) { out += buf.slice(0, i); buf = buf.slice(i + OPEN_TAG.length); inside = true; continue; }
        const k = partial(buf, OPEN_TAG);
        out += buf.slice(0, buf.length - k); buf = buf.slice(buf.length - k);
        break;
      }
    }
    if (out) yield out;
  }
  if (buf && !inside) yield buf;
}

// Ask the first brain that isn't resting. Resolves to { brain, first, rest } where first is the
// first piece of text and rest is an async iterator of the remaining pieces, or to null when
// every brain is resting (then .retryIn says when the soonest one wakes up).
// canUse(brain) lets the server skip some brains (for example the paid one past its daily cap).
async function ask(p, signal, canUse) {
  const now = Date.now();
  for (const b of chain) {
    if (b.restUntil > now || (canUse && !canUse(b))) continue;
    try {
      const it = noThinking(await OPEN[b.service](b, p, signal));
      const first = await it.next(); // wait for real words before committing to this brain
      if (first.done) throw new Refused('answered with nothing', 60e3);
      if (b.why) { console.log(`Ember: ${label(b)} is answering again.`); b.why = ''; }
      return { brain: b, first: first.value, rest: it };
    } catch (e) {
      if (signal && signal.aborted) throw e;
      const rest = e instanceof Refused ? e.rest : 30e3;
      const why = e instanceof Refused ? e.why : `could not be reached (${e.message})`;
      b.restUntil = Date.now() + rest; b.why = why;
      const next = chain.find(x => x !== b && x.restUntil <= Date.now() && (!canUse || canUse(x)));
      console.warn(`Ember: ${label(b)} ${why}; resting ${fmt(rest)}${next ? `, switching to ${label(next)}` : ''}.`);
    }
  }
  return null;
}
// Turn a short recording (WAV) into text with the first ear that isn't resting.
// Resolves to the text ('' when nobody spoke), or null when every ear is resting.
async function hear(wav, signal) {
  for (const b of ears) {
    if (b.restUntil > Date.now()) continue;
    try {
      const form = new FormData();
      form.append('file', new Blob([wav], { type: 'audio/wav' }), 'speech.wav');
      form.append('model', b.model);
      form.append('prompt', 'Ember, the campfire spirit.'); // so the name is spelled right
      form.append('response_format', 'json');
      form.append('temperature', '0');
      const r = await fetch(BASE.groq + '/audio/transcriptions', { method: 'POST', signal, headers: { authorization: 'Bearer ' + b.key }, body: form });
      if (!r.ok) throw await refusal(b, r);
      const j = await r.json();
      if (b.why) { console.log(`Ember's ears: ${label(b)} is listening again.`); b.why = ''; }
      const day = new Date().toISOString().slice(0, 10);
      if (earsDay.day !== day) { earsDay.day = day; earsDay.count = 0; }
      earsDay.count++;
      return String((j && j.text) || '').trim();
    } catch (e) {
      if (signal && signal.aborted) throw e;
      const rest = e instanceof Refused ? e.rest : 30e3;
      const why = e instanceof Refused ? e.why : `could not be reached (${e.message})`;
      b.restUntil = Date.now() + rest; b.why = why;
      const next = ears.find(x => x !== b && x.restUntil <= Date.now());
      console.warn(`Ember's ears: ${label(b)} ${why}; resting ${fmt(rest)}${next ? `, switching to ${label(next)}` : ''}.`);
    }
  }
  return null;
}
// Ember says one line out loud: { audio, type, voice } from the first voice that isn't resting,
// or null when every voice is resting. mood is a story's genre (Orpheus can act it out a little).
const MOODS = { spooky: 'mysterious', legend: 'dramatic', funny: 'cheerful' };
function today() { return new Date().toISOString().slice(0, 10); }
function voiceChars() { return voiceDay.day === today() ? voiceDay.chars : 0; }
// split a long sentence at commas and the like so each piece fits one request
function pieces(text, max) {
  const out = [];
  let rest = text.trim();
  while (rest.length > max) {
    const win = rest.slice(0, max);
    let cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf('; '), win.lastIndexOf(': '), win.lastIndexOf(' - '), win.lastIndexOf('… '));
    if (cut < max * 0.4) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}
// join WAV files that share one format (Orpheus answers in WAV)
function joinWav(bufs) {
  const data = bufs.map(b => { const i = b.indexOf('data'); return i < 0 ? Buffer.alloc(0) : b.subarray(i + 8); });
  const head = Buffer.from(bufs[0].subarray(0, bufs[0].indexOf('data') + 8));
  const len = data.reduce((t, d) => t + d.length, 0);
  head.writeUInt32LE(head.length - 8 + len, 4); head.writeUInt32LE(len, head.length - 4);
  return Buffer.concat([head, ...data]);
}
async function speakOne(b, text, mood, signal) {
  let r;
  if (b.service === 'deepgram') {
    r = await fetch(`${BASE.deepgram}/speak?model=${encodeURIComponent(b.model)}`, { method: 'POST', signal, headers: { authorization: 'Token ' + b.key, 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
  } else {
    const input = (MOODS[mood] ? `[${MOODS[mood]}] ` : '') + text;
    r = await fetch(BASE.groq + '/audio/speech', { method: 'POST', signal, headers: { authorization: 'Bearer ' + b.key, 'content-type': 'application/json' }, body: JSON.stringify({ model: b.model, voice: b.voice, input, response_format: 'wav' }) });
  }
  if (!r.ok) throw await refusal(b, r);
  const audio = Buffer.from(await r.arrayBuffer());
  if (audio.length < 100) throw new Refused('answered with no sound', 60e3);
  return { audio, type: (r.headers.get('content-type') || (b.service === 'groq' ? 'audio/wav' : 'audio/mpeg')).split(';')[0] };
}
async function speak(text, mood, signal) {
  for (const b of voices) {
    if (b.restUntil > Date.now()) continue;
    try {
      const parts = pieces(text, b.max), got = [];
      for (const part of parts) got.push(await speakOne(b, part, mood, signal));
      if (voiceDay.day !== today()) { voiceDay.day = today(); voiceDay.chars = 0; }
      voiceDay.chars += text.length;
      if (b.why) { console.log(`Ember's voice: ${label(b)} is speaking again.`); b.why = ''; }
      return { audio: got.length === 1 ? got[0].audio : joinWav(got.map(g => g.audio)), type: got[0].type, voice: b };
    } catch (e) {
      if (signal && signal.aborted) throw e;
      const rest = e instanceof Refused ? e.rest : 30e3;
      const why = e instanceof Refused ? e.why : `could not be reached (${e.message})`;
      b.restUntil = Date.now() + rest; b.why = why;
      const next = voices.find(x => x !== b && x.restUntil <= Date.now());
      console.warn(`Ember's voice: ${label(b)} ${why}; resting ${fmt(rest)}${next ? `, switching to ${label(next)}` : ', using each phone\'s own voice meanwhile'}.`);
    }
  }
  return null;
}
function voicesRetryIn() { return voices.length ? Math.max(1, Math.ceil((Math.min(...voices.map(b => b.restUntil)) - Date.now()) / 1000)) : 0; }
function voicesStatus() {
  const now = Date.now();
  return { charsToday: voiceChars(), voices: voices.map(b => ({ voice: label(b), ready: b.restUntil <= now, restingFor: b.restUntil > now ? fmt(b.restUntil - now) : undefined, why: b.restUntil > now ? b.why : undefined })) };
}
function earsRetryIn() {
  return ears.length ? Math.max(1, Math.ceil((Math.min(...ears.map(b => b.restUntil)) - Date.now()) / 1000)) : 0;
}
function earsStatus() {
  const now = Date.now();
  return { today: earsDay.day === new Date().toISOString().slice(0, 10) ? earsDay.count : 0, models: ears.map(b => ({ ear: label(b), ready: b.restUntil <= now, restingFor: b.restUntil > now ? fmt(b.restUntil - now) : undefined, why: b.restUntil > now ? b.why : undefined })) };
}
function retryIn(canUse) {
  const now = Date.now();
  const usable = chain.filter(b => !canUse || canUse(b));
  return usable.length ? Math.max(1, Math.ceil((Math.min(...usable.map(b => b.restUntil)) - now) / 1000)) : 0;
}
function label(b) { return `${NAMES[b.service]} ${b.voice ? b.model.split('/').pop() + ' (' + b.voice + ')' : b.model}`; }
function fmt(ms) { const s = Math.round(ms / 1000); return s < 120 ? `${s}s` : s < 7200 ? `${Math.round(s / 60)} min` : `${Math.round(s / 360) / 10} h`; }
function status() {
  const now = Date.now();
  return chain.map(b => ({ brain: label(b), ready: b.restUntil <= now, restingFor: b.restUntil > now ? fmt(b.restUntil - now) : undefined, why: b.restUntil > now ? b.why : undefined }));
}
function describe() {
  if (!chain.length) return 'Ember the campfire spirit is in storybook mode. Set GROQ_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY to let it really talk.';
  return `Ember the campfire spirit talks through ${chain.length} brain${chain.length > 1 ? 's' : ''}, switching when one is busy: ${chain.map(label).join(' → ')}.` +
    (ears.length ? ` On phones it hears through ${ears.map(label).join(' → ')}.` : '') +
    (voices.length ? ` Its voice: ${voices.map(label).join(' → ')}, then each phone's own voice.` : ' Its voice is each phone\'s own (set DEEPGRAM_API_KEY for a natural voice).');
}

module.exports = { chain, ask, retryIn, status, describe, duration, untilPacificMidnight, ears, hear, earsRetryIn, earsStatus, label, voices, speak, voicesRetryIn, voicesStatus, voiceChars, pieces, joinWav };
