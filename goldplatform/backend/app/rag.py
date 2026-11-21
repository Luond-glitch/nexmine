"""Finds the platform's own library entries that match a question, so the assistant can answer from them and cite them."""
import re
from .library_data import EDU, GUIDES, REGULATIONS, SITES, SUPPORT

STOP = set("the and for are what how can does should have with that this from your you about into when where which who why our any not but all was were will would could their there they them then than also been being its it's i me my we us to of in on at as is a an be do if or by".split()) | set("ni na kwa ya wa la za katika hii huo yake yangu je nini gani vipi nini".split())
ALIAS = {"gold": "gold deposits alluvial reef recovery mercury", "dhahabu": "gold mining","emca": "emca environmental management coordination act", "eia": "eia impact assessment", "nema": "nema authority",
         "osha": "occupational safety health", "wiba": "work injury benefits", "shaft": "shaft pit collapse", "mercury": "mercury minamata",
         "cyanide": "cyanide", "permit": "licence permit artisanal", "licence": "licence permit", "kenya": "", "mining": ""}


def _corpus():
    docs = []
    for r in REGULATIONS:
        docs.append(dict(title=r["title"], url=r["link"], kind="Regulation",
                         text=f'{r["title"]} {r["purpose"]} {r["mining"]} {r["regulator"]} {r.get("note", "")}', ref=r))
    for s in SITES:
        docs.append(dict(title=s["name"], url=s["url"], kind="Website", text=f'{s["name"]} {s["what"]} {s.get("contact", "")} {s.get("note", "")}', ref=s))
    for g in GUIDES:
        docs.append(dict(title=g["title"], url="", kind="Platform guide", text=" ".join([g["title"], g["intro"], *g["do"], *g["dont"], g["help"]]), ref=g))
    for e in EDU:
        docs.append(dict(title=e["title"], url="", kind="Education module", text=" ".join([e["title"], e["summary"], *e["points"], e["caution"]]), ref=e))
    for g in SUPPORT:
        for i in g["items"]:
            docs.append(dict(title=i["name"], url="", kind="Hotline", text=" ".join([i["name"], i["when"], " ".join(i["phones"]), i.get("email", ""), i.get("note", "")]), ref=i))
    return docs


DOCS = _corpus()


def _tok(t):
    return {w for w in re.findall(r"[a-z]{3,}", t.lower()) if w not in STOP}


for d in DOCS: d["tok"] = _tok(d["text"])
DF = {}
for d in DOCS:
    for w in d["tok"]: DF[w] = DF.get(w, 0) + 1


def retrieve(question: str, k: int = 3):
    q = _tok(question)
    for w in list(q):
        q |= _tok(ALIAS.get(w, ""))
    scored = []
    for d in DOCS:
        s = sum(1.0 / (1 + DF.get(w, 0)) * 4 for w in q & d["tok"])
        if s > 0.9: scored.append((s, d))
    return [d for _, d in sorted(scored, key=lambda x: -x[0])[:k]]


def context_block(docs):
    if not docs: return "", []
    lines = []
    for d in docs:
        r = d["ref"]
        if d["kind"] == "Regulation":
            body = f'{r["purpose"]} For miners: {r["mining"]} Regulator: {r["regulator"]}. {r.get("note", "")}'
        elif d["kind"] == "Website":
            body = f'{r["what"]} {r.get("contact", "")} {r.get("note", "")}'
        elif d["kind"] == "Education module":
            body = f'{r["summary"]} ' + " ".join(r["points"]) + f' Caution: {r["caution"]}'
        elif d["kind"] == "Hotline":
            body = f'{r["when"]} Phones: {", ".join(r["phones"]) or "none listed"}. {r.get("email", "")} {r.get("note", "")}'
        else:
            body = f'{r["intro"]} Do: {"; ".join(r["do"])}. Do not: {"; ".join(r["dont"])}. Get help: {r["help"]}'
        lines.append(f'- [{d["kind"]}] {d["title"]} ({d["url"] or "platform guide"}): {body}')
    block = ("\n\nPLATFORM LIBRARY ENTRIES relevant to this question. Base your answer on them first, say which entry you used, "
             "and do not add provisions they do not contain. If they do not answer the question, say the platform library does not cover it "
             "and give a careful general answer.\n" + "\n".join(lines))
    return block, [{"title": d["title"], "url": d["url"], "kind": d["kind"]} for d in docs]
