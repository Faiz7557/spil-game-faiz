"""Deep verification of every reference against OpenAlex + Crossref.

Checks, per DOI:
  - the record actually exists at both registries
  - title / journal / year / volume / issue / pages
  - whether Crossref and OpenAlex agree on the publication year
    (online-first vs issue date is the classic APA trap)
  - ISSN-L, so SJR quartile can be looked up unambiguously
"""
import sys, io, json, time, urllib.parse, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

MAILTO = "research@example.org"

REFS = [
    ("K1-01", "10.1016/j.ejor.2023.12.018"),
    ("K1-02", "10.1016/j.eswa.2024.124408"),
    ("K1-03", "10.1016/j.tre.2025.104224"),
    ("K1-04", "10.1016/s0166-218x(99)00245-0"),
    ("K2-01", "10.3390/jmse10040517"),
    ("K2-02", "10.1016/j.knosys.2024.112074"),
    ("K3-01", "10.3390/jmse12101832"),
    ("K3-02", "10.1093/jcde/qwaf070"),
    ("K3-03", "10.1007/978-3-031-43612-3_6"),
    ("K3-07", "10.1016/j.knosys.2021.107526"),
    ("K3-08", "10.3390/app15031211"),
    ("K3-09", "10.3390/math14142538"),
    ("K3-10", "10.32473/flairs.v35i.130584"),
    ("K3-11", "10.3390/app13148283"),
    ("K3-12", "10.52202/085713-4916"),
    ("K3-13", "10.1109/iros.2017.8202133"),
    ("K5-02", "10.1016/j.ins.2009.12.010"),
    ("K5-03", "10.1109/wsc.2007.4419595"),
    ("TPL-01", "10.1016/j.cirpj.2023.05.008"),
]


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'thesis-verify/1.0 (mailto:%s)' % MAILTO})
    return json.load(urllib.request.urlopen(req, timeout=40))


def openalex(doi):
    try:
        d = get("https://api.openalex.org/works/doi:%s?mailto=%s" % (urllib.parse.quote(doi), MAILTO))
    except Exception as e:
        return {"error": str(e)}
    loc = d.get('primary_location') or {}
    src = loc.get('source') or {}
    b = d.get('biblio') or {}
    return {
        "title": d.get('display_name'),
        "year": d.get('publication_year'),
        "date": d.get('publication_date'),
        "venue": src.get('display_name'),
        "issn_l": src.get('issn_l'),
        "publisher": src.get('host_organization_name'),
        "volume": b.get('volume'), "issue": b.get('issue'),
        "pages": (str(b.get('first_page')) + "-" + str(b.get('last_page'))) if b.get('first_page') else None,
        "cited": d.get('cited_by_count'),
        "type": d.get('type'),
        "retracted": d.get('is_retracted'),
        "authors": [a['author']['display_name'] for a in d.get('authorships', [])],
    }


def crossref(doi):
    try:
        d = get("https://api.crossref.org/works/%s" % urllib.parse.quote(doi))['message']
    except Exception as e:
        return {"error": str(e)}
    parts = (d.get('published') or d.get('issued') or {}).get('date-parts', [[None]])
    return {
        "title": (d.get('title') or ['?'])[0],
        "year": parts[0][0],
        "venue": (d.get('container-title') or ['?'])[0] if d.get('container-title') else '?',
        "volume": d.get('volume'), "issue": d.get('issue'), "pages": d.get('page'),
        "issn": (d.get('ISSN') or [None])[0],
        "type": d.get('type'),
        "authors": [(a.get('given', '') + ' ' + a.get('family', '')).strip() for a in (d.get('author') or [])],
    }


problems = []
print("%-8s %-6s %s" % ("ID", "STATUS", "DETAIL"))
print("=" * 118)

for rid, doi in REFS:
    oa = openalex(doi)
    cr = crossref(doi)
    flags = []
    if "error" in oa: flags.append("OpenAlex MISS")
    if "error" in cr: flags.append("Crossref MISS")
    if not flags:
        if oa.get('retracted'): flags.append("RETRACTED")
        if oa.get('year') != cr.get('year'):
            flags.append("year OA=%s CR=%s" % (oa.get('year'), cr.get('year')))
        t1 = (oa.get('title') or '').lower().strip()
        t2 = (cr.get('title') or '').lower().strip()
        if t1 and t2 and t1 != t2:
            flags.append("title differs")
    status = "OK" if not flags else "CHECK"
    if flags: problems.append((rid, doi, flags))
    print("%-8s %-6s %s" % (rid, status, (oa.get('title') or cr.get('title') or '?')[:95]))
    if not flags or "error" not in oa:
        print("         venue : %s | ISSN-L %s | %s" % (oa.get('venue'), oa.get('issn_l'), oa.get('publisher')))
        print("         biblio: vol %s, issue %s, pp %s | %s | cited %s | type %s"
              % (oa.get('volume'), oa.get('issue'), oa.get('pages'), oa.get('date'), oa.get('cited'), oa.get('type')))
        print("         authors: %s" % ", ".join(oa.get('authors') or []))
    if flags:
        print("         >>> %s" % "; ".join(flags))
    print()
    time.sleep(0.15)

print("=" * 118)
print("Entries needing a decision: %d of %d" % (len(problems), len(REFS)))
for rid, doi, f in problems:
    print("  %-8s %-45s %s" % (rid, doi, "; ".join(f)))
