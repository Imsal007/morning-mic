# Founder Rehearsal: project rules

Read this first. These are standing instructions from the owner for this website and app.

## Standing rule
Before any decision or build on this project, run the council skill (`anthropic-skills:council`) on it, then do the work, then show the owner both the council's final call and what was built. Do this every time, without being asked.

## Brand
- Name: **Founder Rehearsal** (renamed from Morning Mic on 15 Nov 2026). Line: **Rehearse in private. Walk in ready.**
- One sentence to use everywhere (homepage, metadata, structured data, llms.txt, directories): "Founder Rehearsal is a private speaking practice platform for founders, customised to each founder's needs."
- Do not use "Founders' Den" (clashes with an existing founders' club) or "Morning Mic" on the founders site.
- Customisation is a core promise. Every page that describes the product must say modules are built around the founder's own needs, goal and subject.
- Look: a dark rehearsal room with one warm stage light. Warm black, ivory text, gold accent (`#E2B866`), Newsreader serif for headings, Instrument Sans for text. Tokens are at the top of `founders/styles.css`.

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
- Functions: `pass_module(module id)` passes the current module and unlocks the next; `delete_my_account()` removes the account and its rows. Both are intentionally callable by signed-in founders (the security advisor lists them as warnings).
- To build a founder's ladder: add rows to `modules` for their user id with `position` 2, 3, … and `status` `locked` (or `current` if nothing else is in progress). `cues` is a JSON list of strings.

## Status and handoff (15 Nov 2026)
Work is on branch `claude/affectionate-einstein-0p1j7o`. It is not merged and the site is not live.

### Built
- `founderrehearsal.com` is registered in Cloudflare (expires 15 Nov 2027, auto-renew on). No DNS or hosting is set up yet.
- Homepage redesigned and renamed, with an animated before/after stage illustration near the top. Guides, sitemap and llms.txt renamed, and all canonical URLs point to `https://founderrehearsal.com/`.
- Application form saves to the `applications` table (tested: saves, and cannot be read publicly).
- Member room at `founders/app/`: sign in with Google or an emailed link, consent screen, ladder, recorder with playback, saved takes, first-versus-latest comparison, pass a module, delete a take, delete all data.

### Not done or not tested
- Sign-in has not been tested end to end. Google sign-in needs OAuth credentials added in Supabase. The emailed link works only after the site address is added to Supabase's allowed redirect URLs.
- The member room has only been checked signed out; recording, saving and passing are untested with a real account.
- `founders/assets/og.png` still shows the old Morning Mic name and colours.
- No privacy policy or terms pages (need the owner's legal name and contact details).
- The owner has no admin screen; applications and modules are managed in the Supabase dashboard.

### Next steps, in order
1. Hosting: serve the `founders/` folder as the root of `founderrehearsal.com` (recommended: Cloudflare Pages with `founders` as the output folder, so the owner's personal tool at the repo root stays separate).
2. In Supabase, set the site URL and redirect URL to `https://founderrehearsal.com/app/`, then add Google sign-in credentials. Test sign-in, recording and delete-my-data with a real account.
3. New share image (`og.png`) in the new brand.
4. Privacy policy and terms pages; link them from the consent screen and footer.
5. Email: `hello@founderrehearsal.com` (Cloudflare Email Routing forwards for free; sending needs a mailbox provider).
6. Trademark: UK and US register searches found nothing for "Founder Rehearsal" (15 Nov 2026), but the name is descriptive and EU was not checked. Ask a trademark attorney before investing heavily.
7. A simple owner screen to read applications and write each founder's modules.
8. Personal outreach to founders; write more guides only for phrases that appear in real applications.

### Open items to confirm
- The Cloudflare account's default registrant contact was another person's details; the owner said they would correct it. Confirm the registrant on `founderrehearsal.com`.
- Whether the owner wants a pull request opened (do not open one unless asked).
