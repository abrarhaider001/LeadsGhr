# Feature implementation status

Snapshot: 2026-10-26. This compares the original feature guides with the active Electron desktop source. A partial status means a usable slice exists, but the guide is not fully met. A1 is implemented for the current desktop local-search flow; its historical account-sync and named-profile integrations remain with A5/G6. The Chrome extension is planned as a separate future product.

| Status | Count |
| --- | ---: |
| Implemented for desktop local flow | 1 |
| Partially implemented on desktop | 22 |
| Not implemented on desktop | 21 |
| Deferred to a separate Chrome extension | 10 |

## Desktop features

| Feature | Status | Current coverage and remaining work |
| --- | --- | --- |
| [A1: Niche Library](A1-Niche%20Library/FEATURES-A1-README.md) | Implemented for desktop local flow | Bundled packs, category page, editable terms, merge preview, local persistence, expanded search queries and result deduplication. Named profiles and account sync belong to A5/G6. |
| [A2: Custom Niche Builder and Keyword Expansion](A2-Custom%20Niche%20Builder%20and%20Keyword%20Expansion/FEATURES-A2-README.md) | Partial | Custom niches can be added and selected; local synonym expansion is missing. |
| [A3: Geo Targeting](A3-Geo%20Targeting/FEATURES-A3-README.md) | Partial | State and location selection is present; ZIP, radius and wider geography are missing. |
| [A4: Filter Engine](A4-Filter%20Engine/FEATURES-A4-README.md) | Not implemented | No pre/post crawl filter rule engine. |
| [A5: Saved Search Profiles and Templates](A5-Saved%20Search%20Profiles%20and%20Templates/FEATURES-A5-README.md) | Not implemented | No runnable saved search profiles or templates. |
| [A6: Dry Run and Yield Estimator](A6-Dry%20Run%20and%20Yield%20Estimator/FEATURES-A6-README.md) | Not implemented | No sampling-based yield estimator. |
| [B1: Search Engine Discovery](B1-Search%20Engine%20Discovery/FEATURES-B1-README.md) | Not implemented | No general web-search discovery pipeline. |
| [B2: Map Listings Adapter](B2-Map%20Listings%20Adapter/FEATURES-B2-README.md) | Partial | Visible Google business cards stream into a dedicated saved local crawl run; full fields and source coverage remain incomplete. |
| [B3: Public Directory Adapters](B3-Public%20Directory%20Adapters/FEATURES-B3-README.md) | Not implemented | No public directory source adapters. |
| [B4: Open Map Data Importer](B4-Open%20Map%20Data%20Importer/FEATURES-B4-README.md) | Not implemented | No offline OpenStreetMap importer. |
| [B5: Professional Network Company Pages (Browser Extension, Assisted Mode)](B5-Professional%20Network%20Company%20Pages%20%28Browser%20Extension%2C%20Assisted%20Mode%29/FEATURES-B5-README.md) | Not implemented | Assisted professional-network capture belongs to a separate future extension. |
| [B6: Social Public Pages Reader](B6-Social%20Public%20Pages%20Reader/FEATURES-B6-README.md) | Not implemented | Social links are discovered, but public social page details are not read. |
| [B7: Associations, Chambers and Licence Registries](B7-Associations%2C%20Chambers%20and%20Licence%20Registries/FEATURES-B7-README.md) | Not implemented | No association, chamber or registry adapters. |
| [B8: Bring Your Own List](B8-Bring%20Your%20Own%20List/FEATURES-B8-README.md) | Not implemented | No bring-your-own-list import and enrichment flow. |
| [C1: Website Crawler](C1-Website%20Crawler/FEATURES-C1-README.md) | Partial | The unsaved test now queues homepage links, prioritizes contact, and groups emails by page; saved production orchestration remains. |
| [C2: Contact Page Detector](C2-Contact%20Page%20Detector/FEATURES-C2-README.md) | Partial | Same-site links and common contact paths are found; ranking, sitemaps and multilingual detection are missing. |
| [C3: Email Extractor](C3-Email%20Extractor/FEATURES-C3-README.md) | Partial | Page text and mailto email extraction work; obfuscation and structured-data extraction are missing. |
| [C4: Phone Extractor and Normaliser](C4-Phone%20Extractor%20and%20Normaliser/FEATURES-C4-README.md) | Partial | tel links are parsed with libphonenumber-js; body-text phone extraction and type classification are missing. |
| [C5: Address Parser and Geocoder](C5-Address%20Parser%20and%20Geocoder/FEATURES-C5-README.md) | Not implemented | No address parser or offline geocoder. |
| [C6: Social Profile Finder](C6-Social%20Profile%20Finder/FEATURES-C6-README.md) | Partial | Common social links are found in page anchors; structured sameAs and full platform coverage are missing. |
| [C7: Company Profile Builder](C7-Company%20Profile%20Builder/FEATURES-C7-README.md) | Not implemented | No company profile synthesis. |
| [C8: Structured Data Reader](C8-Structured%20Data%20Reader/FEATURES-C8-README.md) | Not implemented | No JSON-LD, microdata or RDFa reader. |
| [D1: Deduplication and Entity Resolution](D1-Deduplication%20and%20Entity%20Resolution/FEATURES-D1-README.md) | Partial | A simple deduplication key utility exists; fuzzy company resolution and review are missing. |
| [D2: Email Verifier](D2-Email%20Verifier/FEATURES-D2-README.md) | Not implemented | No domain/MX, disposable, catch-all or SMTP verification workflow. |
| [D3: Phone Validator](D3-Phone%20Validator/FEATURES-D3-README.md) | Partial | Telephone parsing validates extracted tel links; a full number-validation workflow and flags are missing. |
| [D4: Lead Scoring](D4-Lead%20Scoring/FEATURES-D4-README.md) | Partial | A simple quickScore utility exists; the specified weighted lead scoring is not wired into the lead workflow. |
| [D5: Source Tracking and Confidence](D5-Source%20Tracking%20and%20Confidence/FEATURES-D5-README.md) | Not implemented | No field-level source and confidence record. |
| [E1: Live Excel Export](E1-Live%20Excel%20Export/FEATURES-E1-README.md) | Not implemented | No live Excel workbook output. |
| [E2: Multi-format Export](E2-Multi-format%20Export/FEATURES-E2-README.md) | Partial | Crawl results automatically export to CSV; Dashboard and Exports can re-export saved rows. JSON, VCF, presets and broader column controls remain missing. |
| [E3: Database and Run History](E3-Database%20and%20Run%20History/FEATURES-E3-README.md) | Partial | SQLite stores crawl criteria, query checkpoints, rows and export history for resume and re-export. Full provenance, run comparison and richer history remain missing. |
| [E4: Excel Template Designer](E4-Excel%20Template%20Designer/FEATURES-E4-README.md) | Not implemented | No Excel template designer. |
| [F1: Job Queue and Scheduler](F1-Job%20Queue%20and%20Scheduler/FEATURES-F1-README.md) | Partial | A local queue adapter can enqueue jobs; persistent scheduling and worker controls are missing. |
| [F2: Proxy Pool Manager](F2-Proxy%20Pool%20Manager/FEATURES-F2-README.md) | Not implemented | No proxy pool manager. |
| [F3: Politeness Engine and robots.txt](F3-Politeness%20Engine%20and%20robots.txt/FEATURES-F3-README.md) | Partial | Robots checks and polite delays exist; centralized concurrency and crawl-delay handling are missing. |
| [F4: Resilience Layer](F4-Resilience%20Layer/FEATURES-F4-README.md) | Partial | Timeouts, redirect limits and challenge checks exist; full retry/backoff and fallback handling are missing. |
| [F5: Challenge and Block Policy](F5-Challenge%20and%20Block%20Policy/FEATURES-F5-README.md) | Partial | Challenges cause a pause; comprehensive per-source block policy is missing. |
| [F6: Logging and Monitoring](F6-Logging%20and%20Monitoring/FEATURES-F6-README.md) | Not implemented | No structured request log or health-monitoring panel. |
| [G1: Dashboard](G1-Dashboard/FEATURES-G1-README.md) | Partial | Latest pipelines uses local run records with CSV export; metric totals and chart use local run and export data. |
| [G2: Live Run Console](G2-Live%20Run%20Console/FEATURES-G2-README.md) | Partial | Crawler activity and Maps result streaming exist; full run progress, speed and ETA console are missing. |
| [G3: Lead Table Workspace](G3-Lead%20Table%20Workspace/FEATURES-G3-README.md) | Partial | Local lead table with search and status filter exists; editing, tagging and advanced grid tools are missing. |
| [G4: Outreach Segments and Templates](G4-Outreach%20Segments%20and%20Templates/FEATURES-G4-README.md) | Not implemented | No outreach segmentation or template workflow. |
| [G5: Compliance Center](G5-Compliance%20Center/FEATURES-G5-README.md) | Not implemented | No compliance center or suppression controls. |
| [G6: Accounts, Billing and Plans](G6-Accounts%2C%20Billing%20and%20Plans/FEATURES-G6-README.md) | Partial | Local editable profile exists; Supabase account flow, billing, seats and password reset are missing. |
| [G7: Settings and Team](G7-Settings%20and%20Team/FEATURES-G7-README.md) | Partial | Local desktop preferences persist; team, roles and broader organisation settings are missing. |

## Separate future Chrome extension

The extension does not run in the current desktop project. These ten guides remain future work:

- [X1: Extension Shell, Side Panel and Login](X1-Extension%20Shell%2C%20Side%20Panel%20and%20Login/FEATURES-X1-README.md)
- [X2: One-Click Site Scan](X2-One-Click%20Site%20Scan/FEATURES-X2-README.md)
- [X3: Page Data Capture (Assisted)](X3-Page%20Data%20Capture%20%28Assisted%29/FEATURES-X3-README.md)
- [X4: Batch Domain Scan Queue](X4-Batch%20Domain%20Scan%20Queue/FEATURES-X4-README.md)
- [X5: Local Lead List and Dedupe](X5-Local%20Lead%20List%20and%20Dedupe/FEATURES-X5-README.md)
- [X6: Quick Verify](X6-Quick%20Verify/FEATURES-X6-README.md)
- [X7: Export in the Browser (CSV and Excel)](X7-Export%20in%20the%20Browser%20%28CSV%20and%20Excel%29/FEATURES-X7-README.md)
- [X8: Sync with the Main Website](X8-Sync%20with%20the%20Main%20Website/FEATURES-X8-README.md)
- [X9: Compliance Guard in the Extension](X9-Compliance%20Guard%20in%20the%20Extension/FEATURES-X9-README.md)
- [X10: Lite Filters and Quick Score](X10-Lite%20Filters%20and%20Quick%20Score/FEATURES-X10-README.md)

## How this was checked

Reviewed the 54 feature guides against active code in `apps/desktop/src`, `packages/app/src`, and the shared `core`, `extract`, `crawler`, `quality`, `export`, and `platform` packages. Historical web/server requirements were interpreted in the context of the desktop-only product decision. This is a source audit; it does not claim end-to-end behavior has been manually exercised.
