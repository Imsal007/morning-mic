# Founder Rehearsal: project rules

Read this first. These are standing instructions from the owner for this website and app.

## Standing rule
Before any decision or build on this project (design, backend, SEO, blogs, settings), run the council skill (`council:council`) on it, then do the work, check the work against the council's points, then show the owner both the final call and what was built. Do this every time, without being asked. SEO and AEO apply to every page, not only blog posts.

## Brand
- Name: **Founder Rehearsal** (renamed from Morning Mic on 15 Nov 2026). Line: **Rehearse in private. Walk in ready.**
- One sentence to use everywhere (homepage, metadata, structured data, llms.txt, directories): "Founder Rehearsal is a private speaking practice platform for founders, customised to each founder's needs."
- Do not use "Founders' Den" (clashes with an existing founders' club) or "Morning Mic" on the founders site.
- Customisation is a core promise. Every page that describes the product must say modules are built around the founder's own needs, goal and subject.
- Look: teal (`#45BDB3`) on dark navy (`#0A0F14`), Bricolage Grotesque headings with Newsreader italic for emphasis, Instrument Sans for text. Tokens are at the top of `founders/styles.css`. The owner chose this look; never change colours, fonts, logo or name without asking first.
- Logo: a founder in a spotlight (teal on navy). Replaced the sound-wave bars on 16 Nov 2026.

## Product
- Each founder has their own login and private space.
- At registration the founder states their needs (goal, challenge, subject, deadline, time available); modules are then built for them by hand at first.
- They practise, pass a module only when confident, then unlock the next. Before/after recordings show progress.
- Three tracks: public speaking, articulation, subject-matter expertise.
- Root `index.html` is the owner's personal practice tool (still called Morning Mic). Do not modify it unless the owner asks.
- The site lives in `founders/`: marketing homepage, `guides/`, and the member room in `app/`. All links are relative, so the folder can be served as the root of `founderrehearsal.com`.

## Growth: organic search first
- Win organically by targeting the phrases founders actually search, long and short, e.g. "how to stop saying um", "pitch practice for founders", "public speaking for shy founders", "explain your startup in 60 seconds".
- Every page must be genuinely useful on its own: a specific problem, a worked answer, and a path into the product. No thin or near-duplicate pages.
- Each page gets its own title, description, H1, FAQ markup and a canonical URL; all pages are in `sitemap.xml`.
- Keep the one-sentence description above identical everywhere so search and AI answer engines learn the entity.

## Honesty
- No fake testimonials, review counts, client logos or results. Illustrations are labelled as illustrations.
- Do not show a price until the owner decides one.

## Stack decisions
- Web app first, store apps later. Gates before building store apps: (1) five founders agree to a call after personal outreach, (2) founders are still practising in week three.
- Supabase (London region) for logins, database and private recording storage. Cloudflare for domain and DNS. Stripe for payments, on the web.
- Voice recordings are personal data (UK GDPR): privacy policy, clear consent at signup, private by default, delete-my-data.

## Backend (Supabase)
- Project `founder-rehearsal`, ref `jjqwmypgkiakkdhffiqu`, region eu-west-2 (London), free tier, in "Imsal007's Org".
- The project address and publishable key are in `founders/config.js`. They are public by design; row-level rules do the protecting. Never put a secret or service-role key in the repo.
- Tables: `applications` (public can insert, nobody can read through the API), `profiles`, `modules` (the ladder; founders can read only their own), `recordings` (founders read, add and delete only their own).
- Private storage bucket `recordings`; files are stored under `<user id>/<module id>/`.
- A new sign-up automatically gets a profile and a "Your baseline" module, so the "before" recording exists from day one.
- `claim_application_alert(id)` is intentionally callable without signing in (ids are random and never sent to the browser). Functions: `pass_module(module id)` passes the current module and unlocks the next; `delete_my_account()` removes the account and its rows. Both are intentionally callable by signed-in founders (the security advisor lists them as warnings).
- To build a founder's ladder: add rows to `modules` for their user id with `position` 2, 3, … and `status` `locked` (or `current` if nothing else is in progress). `cues` is a JSON list of strings.

## Status and handoff (15 Nov 2026)
Work is on branch `claude/affectionate-einstein-0p1j7o`. That branch is the production branch for Cloudflare Pages, so every push to it deploys the live site.

### Built
- `founderrehearsal.com` is registered in Cloudflare (expires 15 Nov 2027, auto-renew on) and live on Cloudflare Pages (project `founder-rehearsal`, output folder `founders`, also at `founder-rehearsal.pages.dev`).
- Automatic deploys work: the Cloudflare GitHub app has access to `morning-mic` only (17 Nov 2026).
- `www.founderrehearsal.com` (25 Nov 2026, tested): proxied A record `www` to 192.0.2.1, a 301 Single Redirect from `https://www.*` keeping path and query, and Always Use HTTPS on for this zone.
- Client site note: the repo `samuel-farley-pt-demo` was renamed `samuel-farley-pt` (same repo). On 17 Nov its access was removed from the Cloudflare GitHub app at the owner's request, so pushes to it will not deploy until access is restored. The owner keeps all business domains in this one Cloudflare account.
- Google Search Console: domain property verified (SAL Digital Google account, DNS TXT record); sitemap read successfully, 8 pages. `robots.txt` and a real `404.html` are live.
- Email: `hello@founderrehearsal.com` forwards to the SAL Digital Gmail (Cloudflare Email Routing).
- Application alerts (17 Nov 2026, tested): a new row in `applications` fires a database trigger (`private.notify_new_application`, URL in `private.settings`) that posts the row id to the Cloudflare Worker `fr-notify` (`notify/`, deployed by Workers Builds from this repo and branch). The worker calls `claim_application_alert` (returns details once, within 15 minutes) and emails the SAL Digital Gmail via Email Routing, from `alerts@founderrehearsal.com`, with Reply-To set to the applicant. The recipient is the `ALERT_TO` variable in the Cloudflare dashboard, kept out of this public repo.
- Guides page is a blog-style grid (layout modelled on blotato.com/blog) with inline SVG covers, topic filters and its own FAQ.
- 25 Nov 2026: all six posts rewritten as long guides (about 800 to 1,200 words each) with checked sources, table of contents, per-page FAQ and BlogPosting/FAQPage/Breadcrumb markup. New `og.png` and `apple-touch-icon.png`. Cite only sources you have opened; a search summary wrongly said video feedback helps speaking anxiety (Smits 2006 found it did not).
- Search Console, 25 Nov: URL inspection shows the homepage and all six posts indexed (the summary report lagged and showed 0). `/guides/` was unknown to Google; indexing requested for all. Search "founder rehearsal" (UK, 25 Nov) showed this site first; a similar domain, `foundersrehearsal.com` (plural), also appears, so include it in any trademark check. Performance up to 23 Nov: 8 impressions, 0 clicks.
- Name conflict (checked 25 Nov 2026): `foundersrehearsal.com` (plural) is a live Korean site, "Founders Rehearsal", a free co-founder decision simulator, registered 13 Oct 2026, a month before our domain. It was missed in the 15 Nov name check. For any new name, check singular, plural, hyphen and main extensions, open every live site found, and say what was not checked.
- Google "preferred sources": the feature is real, but the site was not listed in Google's source preferences tool on 25 Nov, so no link is shown. Recheck monthly at google.com/preferences/source?q=founderrehearsal.com before adding anything.
- Inside `.article`, buttons need their own text colour (the link colour once made the CTA invisible). Click every new link or button as a visitor before publishing.
- Supabase free tier pauses after about a week of low database activity; it was paused and restored on 25 Nov. No keep-alive is set up yet.
- Tracker: Google Sheet "Founder Rehearsal: SEO and growth tracker" in the SAL Digital Drive (keyword map, routines, launch checklist, first 5 clients).
- Supabase sign-in: site URL and redirect URLs are set to `https://founderrehearsal.com/app/` and `https://founder-rehearsal.pages.dev/app/`.
- Homepage redesigned and renamed, with an animated before/after stage illustration near the top. Guides, sitemap and llms.txt renamed, and all canonical URLs point to `https://founderrehearsal.com/`.
- Application form saves to the `applications` table (tested: saves, and cannot be read publicly).
- Member room at `founders/app/`: sign in with Google or an emailed link, consent screen, ladder, recorder with playback, saved takes, first-versus-latest comparison, pass a module, delete a take, delete all data.

### Not done or not tested
- Sign-in has not been tested end to end. Google sign-in needs a Google OAuth client ID and secret added in Supabase (Authentication, Sign In / Providers, Google); the callback URL is `https://jjqwmypgkiakkdhffiqu.supabase.co/auth/v1/callback`.
- The member room has only been checked signed out; recording, saving and passing are untested with a real account.
- No privacy policy or terms pages (need the owner's legal name and contact details).
- The owner has no admin screen; applications and modules are managed in the Supabase dashboard.

### Next steps, in order
1. Add Google sign-in credentials in Supabase.
2. Test sign-in, recording and delete-my-data with a real account.
3. New share image (`og.png`) in the new brand.
4. Privacy policy and terms pages; link them from the consent screen and footer.
5. Email: `hello@founderrehearsal.com` (Cloudflare Email Routing forwards for free; sending needs a mailbox provider).
6. Trademark: UK and US register searches found nothing for "Founder Rehearsal" (15 Nov 2026), but the name is descriptive and EU was not checked. Ask a trademark attorney before investing heavily.
7. A simple owner screen to read applications and write each founder's modules.
8. Personal outreach to founders; write more guides only for phrases that appear in real applications.

### Open items to confirm
- Registrant on `founderrehearsal.com` confirmed as the owner (17 Nov 2026). The Cloudflare account also holds a client domain, `farleyfitnesspt.co.uk`, and its Pages project `samuel-farley-pt-demo`; never change those when working on Founder Rehearsal.
- Whether the owner wants a pull request opened (do not open one unless asked).
