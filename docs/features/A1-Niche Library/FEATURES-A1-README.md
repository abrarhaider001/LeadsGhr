# A1: Niche Library

**Status:** Implemented for the desktop local-search flow. Named search profiles, Supabase account sync, and RAG/chatbot features are separate future integrations; see [current limits](#current-limits).

## Purpose and benefit

The Niche Library turns a simple business name into a reusable set of public-search terms. A user can choose one or more niches, inspect the terms, refine them for their market, and see the combined keyword set before searching. This helps broaden discovery beyond one exact phrase and removes duplicate terms when several niches overlap. No external data API is used.

## What is included

- A dedicated **Niche Library** page in the desktop sidebar, styled with the current light theme.
- 35 bundled starter packs in `packages/app/data/niche-packs.json`, organized into Construction, Building trades, Site and civil, Development, Property services, and Professional services. Custom niches appear in **Custom**.
- A category list, niche/keyword search, pack details, selection button, and selected indicators.
- Each starter pack defines search terms (name and alternate names), related services, negative terms, and typical website phrases.
- User-added custom niches, including multiple comma- or newline-separated names. A custom niche starts with its name as a search term. **Delete custom niche** opens the shared `DeleteModal` before the niche is removed.
- Editable search and negative term chips. Removing a bundled term stores a user override; adding a term stores a user addition. **Reset pack edits** restores the bundled pack without deleting the underlying data. Custom niches can be deleted.
- A combined preview of all selected packs: unique keyword count, unique search-query term count per location, negative-term count, and the merged chips. Matching is case-insensitive and retains readable display text.
- Local persistence through validated Electron IPC in `search-criteria.json` in `C:\LeadsGhr\data`. The built-in JSON is never rewritten by personal edits.
- Settings > Preferences > Search provides **Use Niche Library search terms**. It defaults off: Search Results prepares one query for each selected niche name and location. When on, it prepares one query for every distinct pack search term and location, deduplicates identical term/location pairs, and applies the pack negative terms to matching business names. Both modes merge repeated businesses in the temporary result list.

## User flow

1. Open **Niche Library** from the sidebar. Choose a category or type a niche, service, or keyword into the search field.
2. Open a niche to inspect its search terms, related services, exclusions, and example website phrases. Click **Select niche**. Repeat for more niches; the combined preview updates immediately.
3. Add or remove terms if the bundled wording does not fit the target market. Enter multiple terms separated by commas. Use **Reset pack edits** to return to the shipped pack.
4. For a business type not in the starter list, click **Add niche** and enter one or more names. The new niches are selected automatically. Add useful alternate search terms in the pack details.
5. Click **Continue to search**. On **New Search**, confirm niches, select U.S. states, then select locations. Click **Search contractors**.
6. With the preference off, Search Results runs the selected niche name once per location. Turn it on in **Settings > Preferences > Search > Search breadth** to run every distinct pack search term per location, one query at a time. A company returned under several terms appears once in the table. Results on that page remain temporary; the library settings remain local across launches.

Example: with one HVAC niche and two locations, fast mode makes 2 queries using `HVAC Contractors`. Expanded mode makes up to 6 queries using `HVAC Contractors`, `HVAC contractor`, and `heating and cooling contractor` in each location. Selecting another pack with the same term does not repeat that exact term/location query.

## Data and code

| Part | Location | Responsibility |
| --- | --- | --- |
| Bundled packs | `packages/app/data/niche-packs.json` | Versioned, hand-curated starter terms and categories. |
| Original starter names | `packages/app/data/niches.json` | Existing New Search choice list; kept in the same order as the packs. |
| Merge and edit rules | `packages/app/src/niche-library-data.ts` | Case-insensitive deduplication, custom-pack fallback, and user overrides. |
| Library screen | `packages/app/src/niche-library-page.tsx` | Browsing, selection, term editing, custom niches, and combined preview. |
| Search draft | `packages/app/src/search-setup-page.tsx` | State and location selection; links back to the library. |
| Query execution | `packages/app/src/search-results-page.tsx` | Expanded term/location queue, exclusions, and result deduplication. |
| Validation and storage | `packages/schemas/src/index.ts`, `apps/desktop/src/main.ts` | Zod-validated criteria and serialized local file writes. |

`search-criteria.json` stores selected niche names, custom niche names, locations, and per-niche edit layers (`addedKeywords`, `removedKeywords`, `addedNegativeKeywords`, `removedNegativeKeywords`). Pack updates can change the bundled JSON without overwriting user additions and removals. No niche selection or extracted business result is sent to Supabase.

## Current limits

- Packs are curated starter content, not an exhaustive industry taxonomy. Additional categories and term reviews are content work.
- Search terms drive expanded public searches. Related services contribute to the combined keyword set but are not each launched as an extra search. Typical website phrases are currently reference metadata; the crawler does not rank pages using them yet.
- Negative terms filter visible **business names** for that pack only in expanded mode. They are not a general page-content exclusion engine; broader pre/post filters belong to A4.
- The combined choice is saved as the active **local draft**, not a named reusable search profile. Named profiles and scheduling belong to A5. Supabase account sync depends on the future account flow in G6.
- Expanded mode multiplies selected pack terms by locations and can produce a long queue; fast mode uses one query per niche and location. Source availability, robots rules, challenge pauses, and polite delays still apply. Search Results does not guarantee exhaustive coverage and does not save temporary Maps results.

## RAG and chatbot integration plan (not implemented)

The library already provides structured terms a future local assistant can read. A later RAG/chatbot feature should use this data as *retrieval context*, not as an instruction source:

1. **Index source:** Convert each pack to a small document with stable pack ID, name, category, search terms, related services, negatives, website phrases, version, and local edit provenance. Index only data already shipped with or entered into this app.
2. **Retrieval:** Match a user question against pack names, categories, and terms using local keyword search first. Optional on-device embeddings can be added later without an external data API. Return pack IDs and matched terms with each result.
3. **Answering:** A chatbot may explain why a niche was suggested, compare packs, propose alternate terms, or draft a selection. It should show the exact source packs and terms used. Proposed edits must be reviewed by the user before they change the library.
4. **Search handoff:** The assistant can prepare a proposed set of niche IDs and terms, but the existing Niche Library selection and New Search location controls remain the source of truth. Never start crawling or change saved criteria merely because retrieved page text requests it.
5. **Safety and privacy:** Treat website content as untrusted data; never follow instructions embedded in crawled pages. Keep personal keyword edits and extraction data on the user's computer. Respect the same public-data, robots, delay, and challenge rules as manual searches.

Potential subfeatures are **pack search and explanation**, **niche comparison**, **term suggestions with approval**, **natural-language draft builder**, **source-grounded Q&A**, and **local feedback on poor suggestions**. None of these assistant features or model runtimes is present in the desktop app today.
