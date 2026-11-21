"""Hand-written replies. Edit the tables below to add or change phrases; no other code needs to change.
MANUAL_REPLIES are answered instantly. TOPIC_RULES and the library are used whenever the AI providers are unavailable."""
import re
from .library_data import EMERGENCY
from .rag import retrieve

ASK_EN = "How can I help with mining or the environment today?"
ASK_SW = "Naweza kukusaidia vipi kuhusu uchimbaji au mazingira leo?"
INTRO_EN = ("I'm the Responsible Gold Mining assistant. I can help with safe gold mining, shaft safety, environmental protection, EIA, "
            "permits, Kenyan mining and environmental law, and finding official websites and EIA experts on this platform.")
INTRO_SW = ("Mimi ni msaidizi wa Uchimbaji Dhahabu kwa Uwajibikaji. Naweza kusaidia kuhusu uchimbaji salama, usalama wa mashimo, ulinzi wa mazingira, "
            "EIA, vibali, sheria za Kenya, na kupata tovuti rasmi na wataalamu wa EIA kwenye jukwaa hili.")

# phrase (lower case, no punctuation) -> reply
MANUAL_REPLIES = {
 "hello": "Hello! " + ASK_EN, "hi": "Hello! " + ASK_EN, "hey": "Hey there! " + ASK_EN, "hello there": "Hello! " + ASK_EN,
 "how are you": "I'm fine, thank you! " + ASK_EN, "how are you doing": "I'm doing well, thank you! " + ASK_EN,
 "good morning": "Good morning! " + ASK_EN, "good afternoon": "Good afternoon! " + ASK_EN, "good evening": "Good evening! " + ASK_EN,
 "good night": "Good night! Stay safe.", "thanks": "You're welcome! " + ASK_EN, "thank you": "You're welcome! Ask me anytime.",
 "ok": "Alright! Ask me anything about mining safety or the environment.", "okay": "Alright! Ask me anything about mining safety or the environment.",
 "bye": "Goodbye! Stay safe and protect the environment.", "goodbye": "Goodbye! Stay safe and protect the environment.",
 "who are you": INTRO_EN, "what can you do": INTRO_EN, "help": INTRO_EN,
 "habari": "Mzuri, asante! " + ASK_SW, "habari yako": "Mzuri, asante! Wewe je? " + ASK_SW, "habari gani": "Nzuri! " + ASK_SW,
 "habari za asubuhi": "Nzuri, asante! Habari za asubuhi. " + ASK_SW, "habari za mchana": "Nzuri, asante! " + ASK_SW,
 "habari za jioni": "Nzuri, asante! " + ASK_SW, "habari za siku": "Nzuri, asante! " + ASK_SW,
 "hujambo": "Sijambo, asante! Na wewe je? " + ASK_SW, "hamjambo": "Hatujambo, asante! " + ASK_SW, "jambo": "Jambo! Karibu. " + ASK_SW,
 "mambo": "Poa! " + ASK_SW, "mambo vipi": "Poa kabisa! " + ASK_SW, "niaje": "Poa! " + ASK_SW, "sasa": "Poa! " + ASK_SW, "vipi": "Safi! " + ASK_SW,
 "shikamoo": "Marahaba! " + ASK_SW, "karibu": "Asante! " + ASK_SW, "pole": "Asante! " + ASK_SW, "pole na kazi": "Asante! " + ASK_SW,
 "asante": "Karibu sana! " + ASK_SW, "asante sana": "Karibu sana! Uliza wakati wowote.", "sawa": "Sawa! Niulize kuhusu uchimbaji salama au mazingira.",
 "kwaheri": "Kwaheri! Kaa salama na ulinde mazingira.", "tutaonana": "Tutaonana! Kaa salama.", "usiku mwema": "Usiku mwema pia! Kaa salama.",
 "wewe ni nani": INTRO_SW, "unaweza kufanya nini": INTRO_SW, "msaada": INTRO_SW,
}

# regex on the question -> reply (used when the AI providers fail). First match wins.
TOPIC_RULES = [
 (r"collaps|crack|falling rock|unstable|trapped|(shaft|pit).{0,20}(moving|caving|flood)|ground (is )?mov|kuporomoka|nyufa", EMERGENCY),
 (r"ambulance|hotline|emergency number|red cross|toll.?free|namba ya dharura|simu ya dharura",
  "In an emergency call 999 or 112. Kenya Red Cross: 1199 (toll-free). To report pollution or a chemical spill to NEMA: 0786 101 100 or 0741 101 100. Open 'Contact and Support' in the menu for all numbers."),
 (r"what('?s| is) (the )?gold|^gold$|define gold|gold means|dhahabu ni nini",
  "Gold is a soft, dense, yellow metal (chemical symbol Au, atomic number 79) that does not rust or tarnish. It is used in jewellery, electronics, dentistry and as a store of value. In nature it occurs as tiny grains or nuggets in rock veins (reef or lode deposits) and in river sediments and gravels (alluvial or placer deposits)."),
 (r"(how|where).{0,25}(mine|dig|extract|find|get|recover|start).{0,25}gold|start(ing)? gold mining|gold mining (steps|process)|kuchimba dhahabu|uchimbaji wa dhahabu",
  "In general, small-scale gold mining in Kenya involves: (1) confirming land rights or consent, (2) getting the right permit or licence from the State Department for Mining through the Online Mining Cadastre, (3) asking NEMA or a licensed EIA expert whether you need an EIA licence, (4) choosing a safe method with a qualified person, for example panning or sluicing for alluvial gold, or underground work for reef gold, which is much riskier, (5) recovering gold without mercury where possible, and (6) planning how to close and restore the land. Open 'Mining Education' for the details, and 'Environmental Regulations' for the official sources."),
 (r"(gold|dhahabu).{0,20}pric|pric.{0,20}gold|bei ya dhahabu",
  "I cannot give live gold prices. Prices change every day. Ask a licensed gold dealer, and confirm with the State Department for Mining which buyers are licensed."),
 (r"(where|how).{0,30}gold.{0,20}(found|occur|located|form)|gold deposit|gold ore|alluvial|placer|reef|quartz",
  "Gold occurs in two main ways: alluvial or placer gold in river sediments and gravels, usually worked in shallow pits or by washing; and hard-rock or reef gold in veins and rock, which often needs deeper workings and carries higher ground risks. A geologist or mining professional can tell you what a site holds. See 'Mining Education'."),
 (r"structure|ground support|timber|support (a )?shaft|pit wall|benching|how (do|should) i (build|dig|design)|miundo",
  "There is no single best structure: safe design depends on the ground, water and depth, and a qualified mining or geotechnical engineer must decide it for your site. General principles: support must match the ground; cut open pit walls to slope or step down rather than stand vertical; keep spoil, vehicles and people back from edges; build a secure collar at the top of a shaft; drain water away; inspect before every shift and after rain. Open 'Mining Education' for more. I cannot give sizes or spacings."),
 (r"report.*(pollution|incident|spill)|(pollution|incident|spill).*report|ripoti.*uchafuzi",
  "Report environmental incidents to NEMA: 0786 101 100, 0741 101 100 or incidence@nema.go.ke (from NEMA's service charter 2025 to 2027). For an emergency where people are in danger, call 999 or 112."),
 (r"\beia\b|impact assessment|tathmini ya athari",
  "An Environmental Impact Assessment (EIA) is a study of how a project could affect people and the environment, with a plan to reduce harm. In Kenya, EIA licences are applied for through NEMA and the study is prepared by a licensed EIA expert. Use 'EIA Experts' in the menu to find a verified expert, and 'Environmental Regulations' for the official links."),
 (r"\bemca\b|environmental management (and )?co.?ordination",
  "EMCA is the Environmental Management and Co-ordination Act, the main environmental law in Kenya. NEMA works under it and EIA licences are applied for under it. Open 'Environmental Regulations' in the menu for the official Kenya Law link."),
 (r"\bnema\b|national environment management",
  "NEMA is the National Environment Management Authority. It issues environmental licences, including EIA licences, and handles environmental compliance. See 'Authorities' in the menu for its website and licensing page."),
 (r"who (regulates|controls|licen[cs]es)|which authorit|mamlaka",
  "The State Department for Mining regulates the mining sector. NEMA handles environmental licensing and compliance. The Directorate of Occupational Safety and Health Services deals with workplace safety, and the Water Resources Authority with water use. Open 'Authorities' in the menu for websites."),
 (r"permit|licen[cs]e|kibali|artisanal",
  "The Mining Act 2016 and the Mining (Licence and Permit) Regulations 2017 cover mining permits, including artisanal mining permits. Applications go through the Online Mining Cadastre run by the State Department for Mining. Confirm current requirements and fees with them, and ask NEMA or an EIA expert whether you also need an EIA licence. See 'Environmental Regulations' for the official links."),
 (r"mercury|zebaki",
  "Mercury harms the nervous system, kidneys and unborn children, and pollutes water and fish. Do not burn mercury or amalgam in the open or at home, and do not throw it into water or soil. Ask an expert about mercury-free methods. See 'Environmental Protection' for more."),
 (r"cyanide|sianidi",
  "Cyanide is extremely poisonous. Do not use or store it without training, approval and safe handling. Ask NEMA and a qualified expert before any chemical is used to process ore."),
 (r"expert|consult|mtaalamu",
  "Open 'EIA Experts' in the menu to see verified experts, then choose 'Request consultation'. You can also send a request to all verified experts from 'My Requests'."),
 (r"\bgold\b|dhahabu",
  "Gold is a soft, dense, yellow metal used in jewellery, electronics and as a store of value. On this platform I can help with how gold occurs, how it is mined safely and legally in Kenya, permits and EIA, protecting water and soil, and avoiding mercury. Try asking, for example: 'How can I mine gold safely?' or 'Do I need a permit to mine gold?'"),
]


def _norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z\s]", " ", t.lower())).strip()


def manual_reply(text):
    return MANUAL_REPLIES.get(_norm(text))


def manual_topic(text):
    t = text.lower()
    for pat, reply in TOPIC_RULES:
        if re.search(pat, t): return reply
    return None


def library_answer(question):
    """Plain answer assembled from the platform's own library. Returns (text, sources) or (None, [])."""
    docs = retrieve(question, 2)
    if not docs: return None, []
    parts = []
    for d in docs:
        r = d["ref"]
        if d["kind"] == "Regulation": parts.append(f'{r["title"]}: {r["purpose"]} For miners: {r["mining"]}')
        elif d["kind"] == "Website": parts.append(f'{r["name"]}: {r["what"]} {r.get("contact", "")}'.strip())
        elif d["kind"] == "Education module": parts.append(f'{r["title"]}: {r["summary"]} ' + " ".join(r["points"][:2]))
        elif d["kind"] == "Hotline": parts.append(f'{r["name"]}: {r["when"]} ' + (", ".join(r["phones"]) or r.get("email", "")))
        else: parts.append(f'{r["title"]}: {r["intro"]} Do: ' + " ".join(r["do"][:2]))
    return "\n\n".join(parts), [{"title": d["title"], "url": d["url"], "kind": d["kind"]} for d in docs]
