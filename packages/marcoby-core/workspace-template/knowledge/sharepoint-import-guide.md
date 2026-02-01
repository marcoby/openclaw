# SharePoint → Tech Buddy Import Guide

Goal
Bring key SharePoint docs into the local Knowledge Base for search, summaries, and decision support without exposing sensitive data.

Three options

1) Fastest (manual export)
- Pick 5–10 “anchor” docs (strategy, offers, pricing, SOPs, client templates)
- In SharePoint/OneDrive: Open doc → File → Save As → Download a copy (prefer .md or .txt; .docx is fine)
- Upload here in chat or drop into a staging folder in SharePoint and send links
- I will: file under knowledge/source/, extract notes + summaries, update index.yaml

2) Link-only (public view links)
- Make a temporary “Anyone with the link can view” link for non-sensitive docs
- Send the URLs; I’ll fetch and ingest text where accessible
- Tip: Remove/disable links after import

3) Robust (Microsoft Graph, read-only) — planned setup
- Create an Azure AD app with least-privilege read-only to a single SharePoint site/library
- Scope: Files.Read.All (app) or Sites.Selected + admin grant; no write permissions
- Store credentials securely; restrict to a dedicated “Marcoby Public Docs” library if possible
- I can prepare the exact step-by-step when you say “set up Graph access”

Pilot set (suggested)
- Final Report (done)
- Marcoby Manifest (done)
- Website copy or sales deck
- Pricing/packaging worksheet
- Top SOP: Client onboarding
- Niche assets: Law + Manufacturing one-pagers

What I’ll do on ingest
- Normalize to text/markdown
- Create structured notes and a concise summary
- Tag and index in knowledge/index.yaml
- Surface open questions or conflicts across docs

Say “start with option 1” and attach a couple files, or “set up Graph access” and I’ll walk you through the Azure app + permission steps.
