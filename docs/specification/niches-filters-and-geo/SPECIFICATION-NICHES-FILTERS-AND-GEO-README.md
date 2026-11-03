> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Niches Filters And Geo

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Starter estimation niches, filter operators, geographic cells, and crawl speed profiles.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 73

PART 7
Niche Library and Filter Reference
The starting library for the estimation industry, plus the complete filter field list and geo cell
strategy.
7.1 Starter niche packs (estimation industry)
Niche Core keywords Related terms Negative keywords
Construction cost construction cost estimating, cost bid estimating, preconstruction jobs, salary, course
estimating estimator company services, budget estimates
Quantity takeoff quantity takeoff services, QTO, BOQ preparation, bill of template, free
material takeoff quantities download, tutorial
MEP estimating MEP estimating services, MEP mechanical electrical plumbing jobs, training
takeoff estimates, HVAC and plumbing bids
Electrical estimating electrical estimating services, low voltage estimating, panel electrician jobs, course
electrical takeoff schedule takeoff
HVAC estimating HVAC estimating services, duct takeoff, load calculation estimate repair near me
HVAC takeoff
Plumbing estimating plumbing estimating services, piping takeoff, fixture count plumber near me
plumbing takeoff
Roofing estimating roofing estimating services, roof roof measurement report, aerial roof roofing jobs
takeoff measurement
Drywall and painting drywall estimating, painting finish takeoff, interior finishes estimate paint store
estimating services
Concrete and steel concrete estimating, rebar structural takeoff, rebar detailing supplier price list
takeoff, steel estimating
Flooring estimating flooring estimating services, tile takeoff, carpet takeoff installer jobs
flooring takeoff
Sitework and earthwork takeoff, sitework excavation estimating, civil quantity equipment rental
earthwork estimating takeoff
Landscaping landscape estimating services, hardscape estimate, irrigation takeoff lawn care near me
estimating landscape takeoff
Solar estimating solar estimating services, solar PV system design estimate, solar bid solar panels price
takeoff support
Interior fit-out fit-out estimating, interior fit out joinery estimating, ceiling estimating furniture shop
cost consultant
Restoration and insurance estimating services, property damage estimate, repair claim help for
insurance restoration estimating scope writing homeowners
Quantity surveying quantity surveying firm, cost BOQ, cost planning, tender QS jobs, course
consultant documents
Specialty subs (target general contractor, subcontractor commercial contractor, design-build careers, equipment
clients) sale

## Source page 74

Selling idea
The best clients for an estimating company are contractors who need bids priced. A second set of niches
(general contractors, roofers, HVAC contractors, solar installers) should ship as 'Target client packs'. This
turns LeadAtlas into a ready tool for estimators looking for work, which is likely your own first use case.
7.2 Filter field reference
Field Operators Example Stage
Has email / phone / website is true / false Has email = true Post
Email status is, is not, in Status in (Valid, Risky) Post
Email kind is generic / named Kind = generic Post
Country, state, city is, in, not in State in (TX, FL) Pre and post
Rating greater, less, between Rating > 4.0 Post (source must
supply)
Review count greater, less Reviews > 10 Post
Years in business greater, less Years > 3 Post (size hint)
Team size hint between Team 5 to 50 Post
Services keywords contains any / all / none Contains 'MEP' Post
Website language is, in Language = en Post
Domain type is, is not Is not marketplace Pre
Exclude list not in file Not in 'existing clients.csv' Pre and post
Score greater, less Score > 70 Post
Found in run / date is, after, before After 1 Oct 2026 Post
Tags has, has not Has tag 'hot' Post
7.3 Geo cell strategy
- Split every big area into cells of one city (or one ZIP group in large cities).
- Run each niche keyword group against each cell; limit results per cell per source (default 60).
- If a cell hits the limit, split it by ZIP or neighbourhood and rerun only the extra cells.
- Keep a cell log (source, cell, date, results) so repeat runs skip fresh cells and revisit stale ones.
- For countries without good postal data, use grid cells generated from the offline place database.
7.4 Speed profiles
Profile Domains in parallel Delay per domain Browser contexts Best for
Gentle 2 4 to 8 s 1 High-risk sources, new IPs
Balanced 10 2 to 4 s 2 Daily use (default)
Fast 20 1 to 2 s 3 Website crawling only, good
connection

