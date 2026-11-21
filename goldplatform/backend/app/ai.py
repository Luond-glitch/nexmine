"""Three-provider assistant with failover. Each question goes to ONE provider first (round-robin to share load);
if it errors, times out or answers UNSURE, the next provider takes over, then the third.
Greetings and thanks are answered instantly without calling any model."""
import itertools, logging, re, requests
from .config import settings as S
from .manual import library_answer, manual_reply, manual_topic
from .rag import context_block, retrieve
import time

log = logging.getLogger("ai")
T = 25
_rr = itertools.count()
_ok: dict[str, str] = {}   # last model that worked, per provider

SYSTEM = """You are the assistant of the Responsible Gold Mining and Environmental Protection Platform for Kenya, \
starting with Abimbo (Bondo, Siaya County). Guiding principle: consult before you mine, protect lives, protect the environment.
IN SCOPE: gold itself (what it is, where it occurs, how it is found, mined and processed, its uses and history, and how to mine it legally and responsibly in Kenya); greetings, thanks and small talk (answer warmly in the user's language and invite a mining or environment question); \
questions about who you are or what you can do; and anything about environment and mining: artisanal and small-scale gold mining, \
EIA, EMCA 1999, Mining Act 2016, permits, NEMA and other authorities, mine and shaft safety, occupational health, mercury and \
cyanide, water, soil, tailings, waste, rehabilitation, community participation, and how to use this platform.
For broad questions in scope, give a useful general answer first, then say what to confirm with an authority or expert.
Official sources you may point people to: nema.go.ke (NEMA), mining.go.ke (State Department for Mining), new.kenyalaw.org (Kenya Law).
RULES:
- Never invent laws, section numbers, penalties, permit requirements, dimensions or references. If you are not sure of an exact \
provision, say so and point to NEMA, the State Department for Mining or Kenya Law.
- You are not a lawyer, mining engineer, regulator or licensed EIA expert. For site-specific decisions recommend a licensed EIA expert.
- If someone reports cracks, falling rocks, ground movement or an unstable shaft: tell them to evacuate now and get a professional inspection first.
- Use simple, structured language. Reply in the language the user writes in (English or Kiswahili).
- Reply exactly OFF_TOPIC only when the message is clearly unrelated (sport, celebrities, entertainment, coding, etc.).
- Reply exactly UNSURE only if you genuinely cannot give any reliable answer. Never use it for greetings."""
AUD = {"miner": "\nAudience: a miner or community member. Be practical and plain.",
       "researcher": "\nAudience: a student or researcher. Be academic and precise; never fabricate citations, say when you cannot verify a source."}
OFF = {"en": "I can only help with environment and mining topics: gold mining, safety, environmental protection, EIA and Kenyan regulations. Try asking about one of those.",
       "sw": "Ninaweza kusaidia tu kuhusu mazingira na uchimbaji: dhahabu, usalama, ulinzi wa mazingira, EIA na sheria za Kenya. Jaribu kuuliza kuhusu mojawapo."}

# ---------- instant replies for greetings, thanks and goodbyes (no model needed) ----------
_GREET = r"hello|hallo|hi|hey|hiya|habari(?: yako| za asubuhi| za mchana| za jioni| za siku| gani| zenu)?|hujambo|hamjambo|jambo|mambo(?: vipi)?|vipi|niaje|sasa|salamu|shikamoo|marahaba|good (?:morning|afternoon|evening|day)|how are you doing|how are you|how is it going|hali yako|u hali gani|uko aje|za asubuhi"
_THANKS = r"thanks|thank you|thank you very much|asante(?: sana)?|shukrani|nashukuru"
_BYE = r"bye|goodbye|see you|kwaheri|tutaonana|baadaye"
_FILL = r"there|friend|rafiki|bro|boss|sir|madam|please|tafadhali|yako|wako|assistant|bot|msaidizi|na|and|all|everyone|wote"
_SW_WORDS = {"habari", "hujambo", "hamjambo", "jambo", "mambo", "vipi", "niaje", "salamu", "shikamoo", "marahaba", "asante",
             "shukrani", "nashukuru", "kwaheri", "tutaonana", "baadaye", "sasa", "hali", "uko", "aje", "msaidizi", "tafadhali"}
HELLO = {"en": "Hello! I'm the Responsible Gold Mining assistant. Ask me about safe gold mining, environmental protection, EIA, permits or Kenyan mining and environmental law.",
         "sw": "Habari! Mimi ni msaidizi wa Uchimbaji Dhahabu kwa Uwajibikaji. Niulize kuhusu usalama wa uchimbaji, ulinzi wa mazingira, tathmini ya athari za mazingira (EIA), vibali au sheria za Kenya."}
WELL = {"en": "I'm well, thank you! ", "sw": "Nzuri sana, asante! "}
THX = {"en": "You're welcome! Ask me anytime about mining safety or the environment.", "sw": "Karibu sana! Niulize wakati wowote kuhusu usalama wa uchimbaji au mazingira."}
BYE = {"en": "Goodbye! Stay safe and protect the environment.", "sw": "Kwaheri! Kaa salama na ulinde mazingira."}


def _norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z\s]", " ", t.lower())).strip()


def quick_reply(text: str):
    t = _norm(text)
    if not t or len(t.split()) > 8: return None
    lang = "sw" if _SW_WORDS & set(t.split()) else "en"
    rest = t
    for pat in (_BYE, _THANKS, _GREET, _FILL):
        rest = re.sub(rf"\b(?:{pat})\b", " ", rest)
    if rest.strip(): return None                      # contains a real question; send to the models
    if re.search(rf"\b(?:{_BYE})\b", t): return BYE[lang]
    if re.search(rf"\b(?:{_THANKS})\b", t): return THX[lang]
    asks = re.search(r"how are you|how is it going|habari yako|hali yako|u hali gani|uko aje|habari gani|mambo vipi|vipi", t)
    return (WELL[lang] if asks else "") + HELLO[lang]


# ---------- providers ----------
class ProviderError(Exception):
    pass


def _post(url, headers, payload):
    r = requests.post(url, headers=headers, json=payload, timeout=T)
    if r.status_code >= 400:
        try:
            j = r.json(); e = j.get("error", j); msg = e.get("message") if isinstance(e, dict) else str(e)
        except Exception:
            msg = r.text
        raise ProviderError(r.status_code, (msg or "")[:140])
    return r.json()


def _gemini(system, msgs, model):
    c = [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]} for m in msgs]
    body = {"systemInstruction": {"parts": [{"text": system}]}, "contents": c}
    urls = ["https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent",      # AI Studio keys (AIza...)
            "https://aiplatform.googleapis.com/v1/publishers/google/models/{m}:generateContent"]  # Vertex express keys (AQ....)
    if S.gemini_api_key.startswith("AQ."): urls.reverse()
    last = None
    for u in urls:
        try:
            j = _post(u.format(m=model), {"x-goog-api-key": S.gemini_api_key}, body)
            try: return j["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError): raise ProviderError("empty", "no content returned")
        except ProviderError as e:
            last = e
            if e.args[0] not in (400, 401, 403, 404): raise   # wrong endpoint or key type: try the other one
    raise last


def _openai(system, msgs, model):
    j = _post("https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {S.openai_api_key}"},
              {"model": model, "messages": [{"role": "system", "content": system}, *msgs]})
    return j["choices"][0]["message"]["content"]


def _cohere(system, msgs, model):
    j = _post("https://api.cohere.com/v2/chat", {"Authorization": f"Bearer {S.cohere_api_key}"},
              {"model": model, "messages": [{"role": "system", "content": system}, *msgs]})
    return j["message"]["content"][0]["text"]


def _models(first, *fallbacks):
    return list(dict.fromkeys([first, *fallbacks]))


def _run(name, models, fn, system, msgs):
    order = ([_ok[name]] if name in _ok else []) + [m for m in models if m != _ok.get(name)]
    last, tried = None, []
    for m in order:
        try:
            text = fn(system, msgs, m); _ok[name] = m; return text
        except ProviderError as e:
            last = e; tried.append(f"{m}={e.args[0]}")
            if e.args[0] in (400, 404): continue   # retired or wrong model name: try the next model
            raise
    raise ProviderError(last.args[0], f"{last.args[1]} [models tried: {', '.join(tried)}]")


def providers():
    cfg = [("Gemini", _gemini, S.gemini_api_key, _models(S.gemini_model, "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.0-flash")),
           ("ChatGPT", _openai, S.openai_api_key, _models(S.openai_model, "gpt-4o-mini", "gpt-4.1-mini")),
           ("Cohere", _cohere, S.cohere_api_key, _models(S.cohere_model, "command-r-08-2024", "command-r-plus-08-2024", "command-a-03-2025"))]
    return [(n, (lambda sy, ms, f=f, mo=mo, n=n: _run(n, mo, f, sy, ms))) for n, f, k, mo in cfg if k]


def _why(e):
    return f"HTTP {e.args[0]}: {e.args[1]}" if isinstance(e, ProviderError) else type(e).__name__


def health():
    out = []
    for n, f in providers():
        try: f("Reply with the word OK.", [{"role": "user", "content": "ping"}]); out.append({"provider": n, "ok": True, "model": _ok.get(n)})
        except Exception as e: out.append({"provider": n, "ok": False, "error": _why(e)})
    return out or [{"provider": None, "ok": False, "error": "No API keys configured"}]


_cool: dict[str, float] = {}


def _fallback(question, failed, errors):
    """Every AI provider failed: answer from hand-written topics, then from the platform library, so the user always gets something useful."""
    text = manual_topic(question); sources = []
    if not text: text, sources = library_answer(question)
    if not text:
        text = ("The AI assistant is not available right now and I do not have a ready answer for that. "
                "Try asking about EIA, EMCA, NEMA, permits, shaft safety or mercury, open the Environmental Regulations or Authorities pages, "
                "or send a request to a verified EIA expert.")
    return {"answer": text, "provider": None, "offline": True, "tried": failed, "errors": errors, "sources": sources}


IN_SCOPE = re.compile(r"gold|dhahabu|mining|\bmine\b|miner|\bore\b|mineral|nugget|alluvial|quartz|\brock|metal|\bpit\b|shaft|environment|mazingira|water|soil|nema|\beia\b|emca|permit|kibali|uchimbaji|machimbo")
LANGLINE = {"en": "", "sw": "\nThe user chose Kiswahili: reply in clear Kiswahili.",
            "luo": "\nThe user chose Dholuo: reply in Dholuo only if you are confident of correct Dholuo, otherwise reply in simple English and say briefly that Dholuo support is limited."}


def ask(history, question, audience, language="en"):
    q = manual_reply(question) or quick_reply(question)
    if q: return {"answer": q, "provider": None, "tried": [], "errors": []}
    lang = "sw" if _SW_WORDS & set(_norm(question).split()) else "en"
    ps = providers()
    live = [p for p in ps if _cool.get(p[0], 0) < time.time()]   # skip providers that recently ran out of credit or rejected the key
    if not live:   # nothing usable right now (no keys, or all in cooldown): answer from our own content straight away
        return _fallback(question, [], [])
    ps = live
    k = next(_rr) % len(ps); ps = ps[k:] + ps[:k]
    msgs = [*history, {"role": "user", "content": question}]
    ctx, sources = context_block(retrieve(question))   # our own library first
    system = SYSTEM + AUD.get(audience, AUD["miner"]) + LANGLINE.get(language, "") + ctx; failed, errors = [], []
    for name, fn in ps:
        try:
            text = (fn(system, msgs) or "").strip()
        except Exception as e:   # network error, quota, bad key, timeout -> next provider
            if isinstance(e, ProviderError) and e.args[0] in (401, 403, 429): _cool[name] = time.time() + (120 if e.args[0] == 429 else 600)
            log.warning("%s failed: %s", name, _why(e)); failed.append(name); errors.append(f"{name}: {_why(e)}"); continue
        head = text.upper()[:10]
        if head.startswith("OFF_TOPIC") and IN_SCOPE.search(question.lower()):   # gold, mining and environment questions are never off topic
            failed.append(name); continue
        if head.startswith("OFF_TOPIC"): return {"answer": OFF[lang], "provider": name, "tried": failed, "errors": errors, "sources": []}
        if head.startswith("UNSURE") or len(text) < 2: failed.append(name); continue   # escalate to the next provider
        return {"answer": text, "provider": name, "tried": failed, "errors": errors, "sources": sources}
    return _fallback(question, failed, errors)
