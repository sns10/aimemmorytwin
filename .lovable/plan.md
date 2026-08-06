# MemoryTwin — Full Technical Documentation (PDF)

Produce a single, department-submittable technical report documenting the entire project: what it is, how it works, the architecture, every module, the mathematics, the data model, and the AI usage. Delivered as a PDF, plus the source Markdown so you can edit it later.

## What the document will contain

1. **Title page & abstract** — project name, one-paragraph abstract, tech-stack summary table.
2. **Problem statement & motivation** — why linear courses and plain spaced-repetition tools fail; who it helps.
3. **System overview** — the "digital twin of memory" concept and the end-to-end answer to update to re-render loop.
4. **Architecture** — layered diagram (UI, server functions, Postgres with row-level security, AI gateway), request lifecycle, the SSR vs client-data boundary, and why there is no separate backend service.
5. **Data model** — every table (subjects, chapters, topics, concepts, questions, lesson content, assignments, students, knowledge states, learning events, personality profiles, cohort topic stats, recommendation events): columns, keys, relationships, access policies, and an ER diagram.
6. **Mathematics** (the core chapter, with derivations and worked numeric examples):
   - Bayesian Knowledge Tracing: 4-parameter model, evidence step, learning step, item-difficulty modulation of guess/slip, prerequisite-gated learn rate.
   - Ebbinghaus / FSRS-lite forgetting: R(t) = exp(-dt / S), stability growth on recall, shrink on lapse, next-review scheduling at the 0.80 recall threshold.
   - Lane assignment as the cross-product of mastery x retrievability, plus the urgency and ranking score used inside each lane.
   - Adaptive item selection: target difficulty as a function of mastery, nearest-item choice, and the learning-zone rationale.
   - Placement seeding: batch Bayesian posterior from the diagnostic quiz.
   - Personality layer: TIPI scoring, Big Five cluster assignment, and how it re-weights presentation rather than the underlying math.
7. **Module-by-module reference** — for each file in `src/lib`, `src/routes`, and `src/components`: purpose, key exported functions, inputs and outputs, and who calls it.
8. **Application flows** — step-by-step walkthroughs with state changes: sign-up to placement to dashboard; a quiz attempt; the review queue; topic stage progression (Learn, Practice, Apply, Master, Review); assignment grading.
9. **AI usage** — where the language model is and is not used, how prompts are grounded in the real catalog, hallucination guards, and model choice.
10. **Auth, security & privacy** — session resolution, per-student data scoping, demo/guest mode, secret handling.
11. **Evaluation & limitations** — what is validated, parameter assumptions, and what future work would require.
12. **Appendices** — algorithm pseudocode, key SQL excerpts, file tree, glossary, and references (Corbett & Anderson 1995, Ebbinghaus, FSRS, the personality-based recommendation paper).

## How it will be produced

- Read the actual source (all of `src/lib`, the routes, the components, and the eight database migrations) so every formula, table, and function signature in the document matches the code — nothing invented.
- Write the report as Markdown, then render it to PDF with numbered headings, tables, monospaced formula and code blocks, and rendered diagrams (architecture, ER, lane matrix, forgetting curve).
- Visually inspect every rendered page and fix any clipping, overflow, or layout problems before delivering.
- Output `MemoryTwin_Technical_Documentation.pdf` along with its Markdown source. No application code is changed.

Expected length: roughly 20–30 pages.