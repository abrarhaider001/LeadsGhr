> **Current product decision (desktop-only):** This page preserves an original specification requirement. LeadsGhr now runs only in Electron. Extraction data stays in local SQLite/files; Supabase holds account data only. Web/hosted-worker references are historical. Extension features belong to a separate future project.

# Responsible Use

> **Source transcript and current override:** The project is now named **LeadsGhr**; "LeadAtlas" below is the original PDF title and wording. This section preserves the supplied PDF as product context. Its older platform, stack, vendor and palette proposals are superseded by the [three-platform architecture](../../structure/STRUCTURE_README.md), [feature coverage](../../platforms/PLATFORMS_README.md) and [four-color theme](../../theme/THEME_README.md). LeadsGhr now uses a light-only theme; dark/system theme references in the PDF are historical. Public-data and responsible-use requirements still apply.

Public business-data principles, outreach-law overview, required policies, objections, and Chrome extension privacy rules.

**Source:** LeadAtlas Complete Specification, version 3.0 (October 2026). The page-by-page reference below preserves the source wording for traceability. PDF table extraction may change visual column alignment. These are requirements, not implemented features. See the [documentation index](../../DOCS_README.md) for implementation guides and feature READMEs.

## Source page 85

PART 11
Responsible Use, Privacy and Legal
Notes
Practical rules that protect your users and your business. This section is general information,
not legal advice; have a lawyer review your policy and terms before selling the product.
11.1 Principles built into the product
- Public, visible, business: collect only business contact information that is openly published.
- Respect site rules: robots.txt always wins; no logins; no evasion.
- Transparency: identify the crawler honestly and give a contact page for site owners.
- Minimise: do not collect fields that are not needed; hide personal-looking emails by default in
regulated regions.
- Provenance: every field shows its public source and date.
- Opt-out: suppression list is global and applied to every export and every future run.
- Retention: auto-delete old leads (default 12 months) unless the user changes it.
11.2 Outreach laws overview
Region Law (examples) What to remember
United States CAN-SPAM Honest subject, physical address, working unsubscribe, honour
opt-outs within 10 business days
European Union and GDPR, PECR / ePrivacy Needs a lawful basis; B2B generic emails are lower risk, named
UK individuals need more care; provide notice and opt-out
Canada CASL Consent rules are strict; business-address exceptions are
narrow
Australia Spam Act Consent or inferred consent for business contact, unsubscribe
required
Gulf and South Asia Local data protection and Rules are changing; check each country before bulk outreach
telecom rules
11.3 In-app legal texts to prepare
- Usage policy shown on first run (acceptable use, user responsibility, no illegal use).
- Terms of service and refund policy for the product.
- Privacy policy and terms of use for the web application, including a clear customer responsibility
clause.
- Crawler information page (what the bot is, how to request exclusion).
- Template notice the user can paste into outreach emails explaining where the contact was found.
11.4 What to do when a site owner objects

## Source page 86

1. Provide an exclusion form and mailbox on the crawler information page.
2. Add the domain to a global block list shipped in the next adapter pack.
3. Remove stored data for that domain on the user's side when they sync (Agency plan can push block
lists).
4. Log the request and the action taken.
11.5 Chrome extension: store rules and privacy
- Follow the Chrome Web Store developer policies (check the current version before each submission):
one clear purpose, honest description, a privacy policy link and no hidden data collection.
- Manifest V3 does not allow remotely hosted code. Selector packs, block lists and settings are data
(JSON), not code, so they can be updated without a store release.
- Ask for the smallest set of permissions. Website access is requested per site, only when the user
presses Scan.
- Never send the user's cookies or browsing history anywhere. Scans use fetch without credentials; the
extension only stores what the user saves.
- Say clearly in the listing what is stored locally and what is synced to the website account.
- Provide an easy way to delete local data and to delete the account and synced data.

