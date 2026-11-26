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
- Automatic deploys work through the Cloudflare GitHub app.
- `www.founderrehearsal.com` (25 Nov 2026, tested): proxied A record `www` to 192.0.2.1, a 301 Single Redirect from `https://www.*` keeping path and query, and Always Use HTTPS on for this zone.
- Client site note: the repo `samuel-farley-pt-demo` was renamed `samuel-farley-pt` (same repo). Its Cloudflare GitHub access was removed on 17 Nov at the owner's request and restored on 25 Nov; the app now has `morning-mic` and `samuel-farley-pt`. Keep both selected. The owner keeps all business domains in this one Cloudflare account.
- Google Search Console: domain property verified (SAL Digital Google account, DNS TXT record); sitemap read successfully, 8 pages. `robots.txt` and a real `404.html` are live.
- Email: `hello@founderrehearsal.com` forwards to the SAL Digital Gmail (Cloudflare Email Routing).
- Application alerts (17 Nov 2026, tested): a new row in `applications` fires a database trigger (`private.notify_new_application`, URL in `private.settings`) that posts the row id to the Cloudflare Worker `fr-notify` (`notify/`, deployed by Workers Builds from this repo and branch). The worker calls `claim_application_alert` (returns details once, within 15 minutes) and emails the SAL Digital Gmail via Email Routing, from `alerts@founderrehearsal.com`, with Reply-To set to the applicant. The recipient is the `ALERT_TO` variable in the Cloudflare dashboard, kept out of this public repo.
- Guides page is a blog-style grid (layout modelled on blotato.com/blog) with inline SVG covers, topic filters and its own FAQ.
- 25 Nov 2026: all six posts rewritten as long guides (about 800 to 1,200 words each) with checked sources, table of contents, per-page FAQ and BlogPosting/FAQPage/Breadcrumb markup. New `og.png` and `apple-touch-icon.png`. Cite only sources you have opened; a search summary wrongly said video feedback helps speaking anxiety (Smits 2006 found it did not).
- Search Console, 25 Nov: URL inspection shows the homepage and all six posts indexed (the summary report lagged and showed 0). `/guides/` was unknown to Google; indexing requested for all. Search "founder rehearsal" (UK, 25 Nov) showed this site first; a similar domain, `foundersrehearsal.com` (plural), also appears, so include it in any trademark check. Performance up to 23 Nov: 8 impressions, 0 clicks.
- Pricing wording (owner rule, 25 Nov 2026): never say "free" on the site. The price depends on the modules built for each founder and is given after they get in touch.
- Launch readiness, 25 Nov 2026: application form and email alert tested and working. Email-link sign-in still cannot reach members (the built-in sender only delivers to project team addresses; custom SMTP is required). Privacy, terms and cookies pages published 26 Nov.
- Name conflict (checked 25 Nov 2026): `foundersrehearsal.com` (plural) is a live Korean site, "Founders Rehearsal", a free co-founder decision simulator, registered 13 Oct 2026, a month before our domain. It was missed in the 15 Nov name check. For any new name, check singular, plural, hyphen and main extensions, open every live site found, and say what was not checked.
- Google "preferred sources": the feature is real, but the site was not listed in Google's source preferences tool on 25 Nov, so no link is shown. Recheck monthly at google.com/preferences/source?q=founderrehearsal.com before adding anything.
- Inside `.article`, buttons need their own text colour (the link colour once made the CTA invisible). Click every new link or button as a visitor before publishing.
- Supabase free tier pauses after about a week of low database activity; it was paused and restored on 25 Nov. No keep-alive is set up yet.
- Member profile (26 Nov 2026): the member room has a "My profile" view (about me, goals, progress, delete). Founders fill it in after signing in; the owner asked to keep the public application form as it is, and nothing is copied from it. Fields are optional columns on `profiles`. Tested with stand-in data and a rolled-back row-rule check; not yet saved from a real signed-in account. The privacy policy must cover these fields.
- Browser caching (26 Nov 2026): pages are rechecked on every visit but scripts and styles are cached for 4 hours. A new page with a cached old script left "My profile" dead. After changing `styles.css`, `app/app.css`, `app/app.js` or `config.js`, update its `?v=` tag in `founders/app/index.html` (first 8 characters of the file's md5, line endings stripped). Other pages that load `styles.css` have no tag yet: add one when it changes. Test as a returning visitor, not only with a fresh load.
- Scored audio practice (26 Nov 2026): a module with `modules.scoring` set (`{kind:'read',wpm:[a,b]}` or `{kind:'talk',minSecs,maxFillers}`) behaves like Morning Mic: drills, British model voice, four result boxes, drill ticks, "Ask coach to sign off", then the next module opens. Code is `app/practice.js` plus `app.js`; drill text lives in the database. The owner's test account has the 10 Morning Mic modules (replacing the empty baseline). Modules without `scoring` work as before. Scores go in `attempts` (no transcript is stored); `pass_module` requires a passing score for every drill. No AI coach is connected; talk modules pass on numbers. Differs from Morning Mic: repeated fillers ("um um um") are all counted. Tested with a stand-in microphone and speech checker and rolled-back database checks, not yet with a real voice.
- Saved audio is limited to 30 recordings per founder (client check and `recordings_cap` trigger; 10 MB per file). Founders can delete any saved audio or score. A larger allowance is a possible later pro version. The cap does not stop a signed-in user uploading files straight to storage.
- Score help (26 Nov 2026): the room shows each drill's goal in seconds, says after a failed take which target was missed and what to change, and has "What do these mean?". First real-voice test: 7 takes on module 1 drill 2 scored 93% clarity and failed only on pace (94-116 wpm, minimum 120). Pass targets unchanged. Pace is timed from Record to Stop, silence included.
- Google Analytics (26 Nov 2026): property "Founder Rehearsal" (566025825) inside the SAL Digital Analytics account, measurement ID G-EEWT6MLNNY, web stream for founderrehearsal.com, linked to the Search Console domain property. Enhanced measurement: page views and scrolls only (outbound, search, form, video, download off). Google signals off; event and user retention 2 months. Never touch the other properties or the Nuri Atelier account.
- `founders/analytics.js` shows Accept/Reject and loads Google only after Accept, only on founderrehearsal.com. NEVER add it to `app/` (owner rule: no analytics in the member room). One custom event, `application_sent`, name only. Every new public page needs the script tag with a `?v=` md5 tag; retag all pages when the file changes. Microsoft Clarity not added: it records page use, so it needs its own council and privacy update first.

- Legal pages (26 Nov 2026): `founders/privacy/`, `founders/terms/`, `founders/cookies/`, linked from footers, the application form and the member room. Owner decision: Founder Rehearsal runs under SAL Digital Solutions Ltd (England and Wales, no. 17464493, trades as SAL Digital; checked on Companies House) until a separate company is needed; if it moves, tell members before data moves. Every public footer carries the company line. Written without a lawyer.
- Promises the pages make, which must be kept: delete unconverted applications and their alert emails within 12 months (manual); emails normally 12 months; complaints and requests up to 3 years; acknowledge data complaints within 30 days; answer rights requests within a month; do not play recordings unless asked or needed for security or law; separate opt-in before any training or advertising use; update the cookies page and ask consent BEFORE adding analytics. If data handling changes (AI coach, analytics, video, new provider), update the privacy page first. Guide pages rebuilt with a script must keep the legal footer links.
- Not checked: whether SAL Digital Solutions Ltd has paid the ICO data protection fee; provider data-processing agreements (the application mailbox is a Google mailbox).
- Still requested by the owner: Microsoft analytics (Clarity), and LinkedIn, Instagram and Facebook pages.
- Owner direction (26 Nov 2026): audio first, then video; no new modules until the owner has practised through the audio ones. No price on the site: on first contact ask what the speaking problem costs the founder and how much it matters, then quote for the modules built. Training-improvement use and publicity use each need their own opt-in; never show a face without permission. Do not claim "we never share data with third parties" (hosting, sign-in and speech services process it).
- Name decision (26 Nov 2026): keep "Founder Rehearsal" and the domain; claim social handles and brand organically; hold paid ads, print and store apps until the checks are done. This is research, not legal clearance. Seen: USPTO showed no "foundersrehearsal"; live US mark "REHEARSAL" (reg. 4738938, class 9, an app for learning acting scripts), first 50 of 68 "rehearsal" results reviewed. UK register now needs a human check (owner to search "founder rehearsal" and "founders rehearsal"). EU, WIPO and Korean registers not checked. UK filing costs from GBP 205. Revisit if anyone writes about the name, a similar mark appears, or the Korean site starts selling speaking practice.
- Tracker: Google Sheet "Founder Rehearsal: SEO and growth tracker" in the SAL Digital Drive (keyword map, routines, launch checklist, first 5 clients).
- Supabase sign-in: site URL and redirect URLs are set to `https://founderrehearsal.com/app/` and `https://founder-rehearsal.pages.dev/app/`.
- Homepage redesigned and renamed, with an animated before/after stage illustration near the top. Guides, sitemap and llms.txt renamed, and all canonical URLs point to `https://founderrehearsal.com/`.
- Application form saves to the `applications` table (tested: saves, and cannot be read publicly).
- Member room at `founders/app/`: sign in with Google or an emailed link, consent screen, ladder, recorder with playback, saved takes, first-versus-latest comparison, pass a module, delete a take, delete all data.

### Not done or not tested
- Google sign-in works (tested 26 Nov 2026 by the owner as founderrehearsal@gmail.com: user, profile, consent and baseline module created). Google Cloud project `founder-rehearsal-login` under founderrehearsal@gmail.com, OAuth app in **Testing**, so only listed test users can sign in. To open it to everyone, complete the Branding page (needs home page and privacy policy links) and publish. The client secret lives only in Google and Supabase.
- Recording, playback, passing a module and delete-my-data are still untested with a real account.
- Privacy, terms and cookies pages were published on 26 Nov 2026 (see Built).
- The owner has no admin screen; applications and modules are managed in the Supabase dashboard.

### Next steps, in order
1. Test recording, playback, passing a module and delete-my-data with the signed-in account.
2. Add the owner's own practice modules (including motivational speeches and affirmations).
3. Publish the Google OAuth app after the privacy page is live; set up custom SMTP for email links.
4. Privacy, terms and cookies pages: done 26 Nov.
5. Email: `hello@founderrehearsal.com` (Cloudflare Email Routing forwards for free; sending needs a mailbox provider).
6. Trademark: UK and US register searches found nothing for "Founder Rehearsal" (15 Nov 2026), but the name is descriptive and EU was not checked. Ask a trademark attorney before investing heavily.
7. A simple owner screen to read applications and write each founder's modules.
8. Personal outreach to founders; write more guides only for phrases that appear in real applications.

### Open items to confirm
- Registrant on `founderrehearsal.com` confirmed as the owner (17 Nov 2026). The Cloudflare account also holds a client domain, `farleyfitnesspt.co.uk`, and its Pages project `samuel-farley-pt-demo`; never change those when working on Founder Rehearsal.
- Whether the owner wants a pull request opened (do not open one unless asked).
