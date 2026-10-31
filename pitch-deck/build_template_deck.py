"""
Build the JalLekha submission deck ON the official Seva First Innovation
Challenge template (template inheritance — fill-in).

Source of truth: the official template PPTX. This script copies it and
replaces every bracketed placeholder with the team's submission content,
keeping the template's geometry, fonts (Nirmala UI), colors (navy 1B2A5C /
orange F28C28), titles, subtitles and footers untouched.

Usage: python build_template_deck.py <official_template.pptx> <out.pptx>
"""
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

ORANGE = RGBColor.from_string("F28C28")
LIGHT = RGBColor.from_string("C9D2EC")
WHITE = RGBColor.from_string("FFFFFF")

SHOT = "assets/app-overview.png"  # product screenshot embedded on the cover panel


def norm(s):
    """Canonical form for matching: unify dashes/arrows/bullets/quotes/nbsp."""
    for a, b in (("\x0b", " "), ("\r", " "), ("\u2013", "-"), ("\u2014", "-"),
                 ("\u2192", ">"), ("\u203a", ">"), ("\u2022", ">"),
                 ("\u00a0", " "),
                 ("\u201c", '"'), ("\u201d", '"'), ("\u2018", "'"), ("\u2019", "'")):
        s = s.replace(a, b)
    return " ".join(s.split())


def first_run_replace(p, text):
    runs = p.runs
    if not runs:
        p.add_run().text = text
        return
    runs[0].text = text
    for r in runs[1:]:
        r._r.getparent().remove(r._r)


def set_tf(tf, lines):
    """Replace a text frame's paragraphs with `lines`, keeping run-0
    formatting of the first paragraph; surplus paragraphs are cleared."""
    while len(tf.paragraphs) < len(lines):
        tf.add_paragraph()
    for i, p in enumerate(tf.paragraphs):
        if i < len(lines):
            first_run_replace(p, lines[i])
        else:
            for r in list(p.runs):
                r._r.getparent().remove(r._r)


def replace_by_text(slide, raw_mapping, tag=""):
    mapping = {norm(k): v for k, v in raw_mapping.items()}  # keys normalized too
    hit = set()

    def visit(shapes):
        for s in shapes:
            if s.shape_type == 6:
                visit(s.shapes)
            elif s.has_text_frame:
                full = norm(s.text_frame.text)
                if full in mapping:
                    set_tf(s.text_frame, mapping[full].split("\n"))
                    hit.add(full)
                    continue
                for p in s.text_frame.paragraphs:
                    key = norm(p.text)
                    if key in mapping:
                        first_run_replace(p, mapping[key])
                        hit.add(key)
    visit(slide.shapes)
    missed = set(map(norm, mapping)) - hit
    if missed:
        print(f"  !! [{tag}] UNMATCHED: {sorted(missed)[:3]}")
    return missed


def shape_at(slide, x_in, y_in):
    for s in slide.shapes:
        if s.left is not None and abs(s.left.inches - x_in) < 0.06 and abs(s.top.inches - y_in) < 0.06:
            return s
    return None


def text_shape_at(slide, x_in, y_in, expect=None):
    """The TEXT BOX at a position (not a filled AUTO_SHAPE sharing the spot)."""
    for s in slide.shapes:
        if s.left is None or not s.has_text_frame:
            continue
        if abs(s.left.inches - x_in) < 0.06 and abs(s.top.inches - y_in) < 0.06:
            if expect is None or norm(s.text_frame.text) == norm(expect):
                return s
    return None


def main(src, dst):
    prs = Presentation(src)
    s = prs.slides

    # ---------------- Slide 1 — cover ----------------
    replace_by_text(s[0], {
        "SEVA INNOVATION CHALLENGE 2026 > REFERENCE PITCH DECK":
            "SEVA INNOVATION CHALLENGE 2026 > JALLEKHA - TEAM SEVAFORGE",
        "[Name of Your Innovation]": "JalLekha",
        '[One line: what it does, for whom - e.g. "A low-cost sensor that warns farmers of pest attack 5 days in advance"]':
            "A water-balance engine that reconciles tanker receipts, tank readings and meter logs - what came in, what was measured, what needs checking.",
        "How to use this template": "Working prototype - live demo",
    }, "s1")
    for shp in s[0].shapes:
        if shp.has_text_frame and shp.text_frame.text.startswith("Keep to 6 slides"):
            set_tf(shp.text_frame, [
                "Deterministic engine - AI never decides.",
                "55 unit + 33 e2e checks, all green.",
                "Browser demo · synthetic data.",
            ])
            shp.height = Inches(0.95)
    tb = s[0].shapes.add_textbox(Inches(0.5), Inches(2.80), Inches(5.5), Inches(1.05))
    tf = tb.text_frame
    tf.word_wrap = True
    set_tf(tf, [
        "Sector: Sustainability - Energy, Climate and Others",
        "Sub-theme: pollution mitigation, water conservation, waste management",
        "Track A - Product / Technology Solution · Open Level",
    ])
    for p in tf.paragraphs:
        for r in p.runs:
            r.font.size, r.font.name, r.font.color.rgb = Pt(10.5), "Nirmala UI", LIGHT
    s[0].shapes.add_picture(SHOT, Inches(6.69), Inches(2.48), width=Inches(2.32))
    url = s[0].shapes.add_textbox(Inches(6.60), Inches(3.99), Inches(2.75), Inches(0.24))
    set_tf(url.text_frame, ["jallekha.vercel.app/demo"])
    for p in url.text_frame.paragraphs:
        for r in p.runs:
            r.font.size, r.font.name, r.font.bold, r.font.color.rgb = Pt(9.5), "Nirmala UI", True, ORANGE

    # ---------------- Slide 2 — The Problem ----------------
    replace_by_text(s[1], {
        "Describe the problem in 2-3 simple sentences. Focus on the root cause, not just the symptom.":
            "Tanker receipts, tank dipstick readings and cumulative meter logs live in three separate registers. When water doesn't add up, staff trace entries by hand - and the register cannot say why.",
        "Name the people, community, department or industry facing it; mention the location (village, city, district).":
            "Campus facilities teams and housing-society maintenance staff; students and residents feel it in billing disputes and unreliable supply. Target: urban Maharashtra.",
        "Give data from credible sources - Census, NFHS, government reports, departmental records, or your own survey (sample size and date).":
            "Honest by design: no field pilot yet. The engine is validated on synthetic ledgers - 55 unit tests and 33 browser checks assert the four signature scenarios to the litre (docs/VALIDATION.md).",
        "What is being done today and why it is not enough (cost, reach, speed, quality)?":
            "Registers total numbers but flag nothing: duplicates go unnoticed, missing readings read as losses, and corrections overwrite the audit trail - disputes cannot be evidenced.",
        "[X (number)]": "3",
        "[people / farmers / students affected every year in the target area]":
            "separate registers - one water balance that must agree",
        "[One line on the cost of inaction - lives, money, time or environment]":
            "Unmeasured losses stay invisible; supplier disputes stay unresolvable.",
    }, "s2")

    # ---------------- Slide 3 — Solution ----------------
    replace_by_text(s[2], {
        "[Explain the product, service, process or technology in 3-4 lines. Add a photo, sketch or screenshot of the prototype on the right of this text if available.]":
            "Facilities teams record tanker receipts, tank readings and meter values; a deterministic engine reconciles them into one water balance with a visible uncertainty interval - and findings become owned, evidence-backed cases.",
        "[What goes in / who uses it]": "Receipts, dipstick readings, meter logs - typed or CSV",
        "[What the solution does]": "Engine computes R = O + D - U - C with summed bounds",
        "[Result for the user]": "Verdict, findings, owned cases, audit trail",
        "[The one thing your solution does that others cannot. Mention any patent filed / granted, if applicable.]":
            "Uncertainty you can see and verdicts that never accuse - same inputs, same verdict, and every correction keeps its before-and-after history.",
    }, "s3")
    tbl = next(sh for sh in s[2].shapes if sh.has_table).table
    table_fill = {
        (1, 1): "₹ 0 software + hours of tracing",
        (1, 2): "₹ 0 licence - any browser",
        (2, 1): "Days of hand-tracing per dispute",
        (2, 2): "Seconds to a documented verdict",
        (3, 1): "One register-holder's memory",
        (3, 2): "Any operator; CSV in, review out",
        (4, 1): "Spreadsheet discipline required",
        (4, 2): "Guided demo; plain-language verdicts",
    }
    for (r, c), txt in table_fill.items():
        set_tf(tbl.cell(r, c).text_frame, [txt])

    # ---------------- Slide 4 — Feasibility ----------------
    replace_by_text(s[3], {
        "Hardware, software, materials, lab or field facilities used or needed.":
            "Next.js 16 + TypeScript web app; pure-TypeScript rule engine recon-v1.0; CSV import; browser-local storage; optional provider-neutral AI, off by default.",
        "Cost per unit / per user and total cost for a pilot. Show how it is affordable.":
            "₹ 0 licence - runs in a browser on one existing device. Pilot needs operator time only: no sensors, no hardware.",
        "Key milestones for the next 3, 6 and 12 months.":
            "Now: 4-6 week single-device pilot. Next: shared authenticated workspaces (adapter designed). Then: multi-site rollup.",
        "Government department, PSU, local body, industry or NGO that will adopt or pilot it.":
            "Seeking one permissioned campus or society; measurement-quality mentorship; a route toward a government-department pilot.",
    }, "s4")
    circ = shape_at(s[3], 4.83, 1.78)  # "Working Prototype" circle on the tracker
    if circ is not None:
        circ.fill.solid()
        circ.fill.fore_color.rgb = ORANGE

    # ---------------- Slide 5 — Impact ----------------
    replace_by_text(s[4], {
        "[in first year of implementation]": "pilot campus or society in year one",
        "[compared to current practice]": "impact metrics instrumented - baselines set on field data",
        "[created or supported]": "sustainability domains evidenced: water, haulage, trust",
        "Effect on quality of life, safety, inclusion (women, rural, divyang), or environment.":
            "Evidence-backed records end billing disputes and repeat reconciliation work; residents see a documented balance instead of a disputed bill.",
        "How the solution will run long-term - revenue model, user fee, CSR or department budget.":
            "Zero-licence software on existing devices. The pilot publishes baselines first - no litres-saved claims before field data exists.",
        "How it can be replicated in other districts or states, and what is needed to do so.":
            "NOW: single-device pilot > NEXT: shared authenticated workspaces (adapter designed) > THEN: multi-site rollup for a campus chain or ward.",
    }, "s5")
    for x, val in ((0.60, "1"), (3.67, "4"), (6.74, "3")):
        shp = shape_at(s[4], x, 1.40)
        if shp is not None:
            set_tf(shp.text_frame, [val])

    # ---------------- Slide 6 — Team & Support ----------------
    replace_by_text(s[5], {
        "[Name 1]": "Arya Jannawar",
        "[Name 2]": "Siddhant Pardeshi",
        "[Name 3]": "Avani Jannawar",
        "[Name 4]": "Vijay Sahu",
        "[Mentor / faculty guide, if any: Name, designation]":
            "Mentor: to be assigned - seeking measurement-quality and study-design guidance.",
        "Mentorship & technical guidance": "One permissioned pilot campus or society",
        "Pilot with a government department": "Mentorship: study design & measurement quality",
        "Funding / grant support": "Lab access for reviewer-time measurement",
        "Incubation & workspace": "A route to shared, authenticated deployment",
        "Testing, certification or IP support": "Introduction to a department for a broader pilot",
        "[In one line, how the Challenge support will take your solution to the next stage.]":
            "A 4-6 week pilot on one device publishes the first honest baselines - turning the prototype into evidence.",
        "Thank you  |  [Contact email / mobile]":
            "Thank you  |  Team SevaForge · github.com/Avani376/jallekha · jallekha.vercel.app",
    }, "s6")
    roles = {
        (1.32, 1.76): "Team Lead",
        (3.77, 1.76): "Quality & user workflow",
        (1.32, 3.16): "Engineering lead",
        (3.77, 3.16): "Research & validation",
    }
    for (x, y), txt in roles.items():
        shp = shape_at(s[5], x, y)
        if shp is not None:
            set_tf(shp.text_frame, [txt])
    expertise = {
        (1.32, 2.00): "Product & the reconciliation equation",
        (3.77, 2.00): "55-test gate, 33 browser journeys",
        (1.32, 3.40): "Engine, CSV pipeline, adapters",
        (3.77, 3.40): "Measurement uncertainty & evidence",
    }
    for (x, y), txt in expertise.items():
        shp = shape_at(s[5], x, y)
        if shp is not None:
            set_tf(shp.text_frame, [txt])
    initials = {(0.65, 1.50): "AJ", (3.10, 1.50): "SP", (0.65, 2.90): "AV", (3.10, 2.90): "VS"}
    for (x, y), txt in initials.items():
        shp = text_shape_at(s[5], x, y, expect="Photo")
        if shp is not None:
            set_tf(shp.text_frame, [txt])
            for p in shp.text_frame.paragraphs:
                p.alignment = PP_ALIGN.CENTER
                for r in p.runs:
                    r.font.size, r.font.bold, r.font.color.rgb = Pt(12), True, ORANGE
        else:
            print(f"  !! [s6] Photo box not found at {x},{y}")

    prs.save(dst)
    print(f"saved {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
