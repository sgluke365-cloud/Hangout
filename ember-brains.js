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
//   GEMINI_API_KEY      Google Gemini (free tier).        GEMINI_MODELS  comma-separated list
//   SPIRIT_ORDER        which services to try first, default "anthropic,groq,gemini"
'use strict';

const env = process.env;
const list = (v, d) => (v ? String(v).split(',') : d).map(s => s.trim()).filter(Boolean);

const GROQ_DEFAULT = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
const GEMINI_DEFAULT = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
const BASE = {
  anthropic: (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, ''),
  groq: (env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
  gemini: (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '')
};
const NAMES = { anthropic: 'Claude', groq: 'Groq', gemini: 'Gemini' };

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
function retryIn(canUse) {
  const now = Date.now();
  const usable = chain.filter(b => !canUse || canUse(b));
  return usable.length ? Math.max(1, Math.ceil((Math.min(...usable.map(b => b.restUntil)) - now) / 1000)) : 0;
}
function label(b) { return `${NAMES[b.service]} ${b.model}`; }
function fmt(ms) { const s = Math.round(ms / 1000); return s < 120 ? `${s}s` : s < 7200 ? `${Math.round(s / 60)} min` : `${Math.round(s / 360) / 10} h`; }
function status() {
  const now = Date.now();
  return chain.map(b => ({ brain: label(b), ready: b.restUntil <= now, restingFor: b.restUntil > now ? fmt(b.restUntil - now) : undefined, why: b.restUntil > now ? b.why : undefined }));
}
function describe() {
  if (!chain.length) return 'Ember the campfire spirit is in storybook mode. Set GROQ_API_KEY, GEMINI_API_KEY or ANTHROPIC_API_KEY to let it really talk.';
  return `Ember the campfire spirit talks through ${chain.length} brain${chain.length > 1 ? 's' : ''}, switching when one is busy: ${chain.map(label).join(' → ')}.`;
}

module.exports = { chain, ask, retryIn, status, describe, duration, untilPacificMidnight };
