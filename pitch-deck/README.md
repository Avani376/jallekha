# SevaForge JalLekha Pitch Deck

The official 6-slide submission for the **Seva First Innovation Challenge 2026
(Maharashtra Zone)** — sector *Sustainability*, sub-theme *Technology for pollution
mitigation, water conservation and waste management*, Track A (Product / Technology).

**Built strictly on the official challenge template**
(`Seva-First-Innovation-Challenge-PPT-Template.pptx`, 10 × 5.62 in): the template's
layout, geometry, Nirmala UI typography, navy/orange palette, slide titles, guidance
subtitles and per-slide footers are preserved; every bracketed placeholder is replaced
with the team's submission content and the template's guidance boxes are repurposed
with product facts (per the template's own instructions).

- `SevaForge_JalLekha_Pitch_Deck.pptx` — editable submission deck (6 slides, template-native)
- `SevaForge_JalLekha_Pitch_Deck.pdf` — matching 6-page export for upload (template limit: ≤ 10 MB)
- `template_source.pptx` — unmodified copy of the official template (build input)
- `build_template_deck.py` — reproducible fill-in build:
  `python build_template_deck.py template_source.pptx SevaForge_JalLekha_Pitch_Deck.pptx`
  (python-pptx; placeholder-keyed text replacement that preserves run formatting)
- `assets/` — SevaForge logo (transparent) and product screenshots
  (`assets/app-overview.png` is embedded on the cover)

Slide contents follow the template's mandated order:
1 Cover (innovation + one-liner) · 2 The Problem (4 cards + headline stat) ·
3 Our Solution & Innovation (brief, how-it-works, comparison table, USP) ·
4 Feasibility & Implementation (stage tracker marked at **Working Prototype**, technology,
cost, timeline, partners) · 5 Impact & Scalability (stats + social/sustainability/scale-up) ·
6 Team & Support Required (four members, mentor line, support checklist, thank-you).

Every number in the deck is traceable: scenario figures come from the four signature
fixtures (`fixtures/synthetic/scenarios.ts`), test counts from the dated run log
(`docs/VALIDATION.md`, 31 Oct 2026: Vitest 55/55, Playwright e2e 33/33, tsc 0 errors).
No litres-saved or pilot claims are made — the deck states baselines are set during the pilot.
