# Morning Mic: project rules

Read this first. These are standing instructions from the owner for this website and app.

## Standing rule
Before any decision or build on this project, run the council skill (`anthropic-skills:council`) on it, then do the work, then show the owner both the council's final call and what was built. Do this every time, without being asked.

## Brand
- Name: **Morning Mic**. Tagline: **Take the mic.**
- One sentence to use everywhere (homepage, metadata, structured data, llms.txt, directories): "Morning Mic is a private speaking practice platform for founders, customised to each founder's needs."
- Do not use "Founders' Den" (clashes with an existing founders' club).
- Customisation is a core promise. Every page that describes the product must say modules are built around the founder's own needs, goal and subject.

## Product
- Each founder has their own login and private space.
- At registration the founder states their needs (goal, challenge, subject, deadline, time available); modules are then built for them by hand at first.
- They practise, pass a module only when confident, then unlock the next. Before/after recordings show progress.
- Three tracks: public speaking, articulation, subject-matter expertise.
- Root `index.html` is the owner's personal practice tool. Do not modify it unless the owner asks.
- The marketing site lives in `founders/` for now (served at `/morning-mic/founders/`); it moves to the root of the Morning Mic domain later.

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
- Supabase (London region) for logins, database and private recording storage. Cloudflare for domain and DNS. GitHub for hosting. Stripe for payments, on the web.
- Voice recordings are personal data (UK GDPR): privacy policy, clear consent at signup, private by default, delete-my-data.
- Use Sonnet for backend and login work. Remind the owner to switch to Fable (`/model claude-fable-5-2`) for the full design pass once logins work and the screens exist.

## Status and handoff (15 Nov 2026)
Work so far is on branch `claude/affectionate-einstein-0p1j7o`. It is not merged to the main branch yet, so none of `founders/` is live.

### Built
- `founders/index.html`: Morning Mic marketing homepage (tracks, before/after illustration, ladder, needs-based application form, FAQ, guides teaser). Self-hosted fonts in `founders/assets/fonts`, share image `founders/assets/og.png`.
- Six guide pages plus an index in `founders/guides/`, with Article, FAQ and breadcrumb markup. `founders/sitemap.xml` and `founders/llms.txt` list them.
- The application form asks for goals, where they get stuck, what they speak about, comfort, language and time. It sends nowhere yet: `FORM_ENDPOINT` in `founders/index.html` is empty.

### Decisions made
- Brand is Morning Mic; "Founders' Den" is dropped. Web app first, store apps later (see gates above).
- Domain plan: register `morningmic.app` as the main address and `getmorningmic.com` as the `.com` that redirects to it. The owner is buying them in Cloudflare; not confirmed bought. `morningmic.com` is taken by an unrelated Arabic radio site registered 21 Oct 2026.
- Supabase connector is connected on the owner's account, but no project exists yet. Plan: London region, free tier, show the cost confirmation before creating.
- No prices are shown on the site; the owner has not set one.

### Next steps, in order
1. Once the domains are bought: change canonical, Open Graph and structured-data URLs from `imsal007.github.io/morning-mic/founders/` to the new domain, add a `CNAME` file, and point DNS in Cloudflare.
2. Create the Supabase project; store applications; wire the form to it.
3. Founder login, private space, saved recordings, before/after playback, row-level privacy rules.
4. Privacy policy and terms pages (needs the owner's legal name and contact details). Consent at signup for voice recordings; delete-my-data.
5. Trademark search for "Morning Mic" (UK and US).
6. Full design pass with Fable once logins and screens exist; remind the owner to run `/model claude-fable-5-2`.
7. Personal outreach to founders; write more guides only for phrases that appear in real applications.

### Open items to confirm
- Which branch GitHub Pages serves, so we know where to merge to make `founders/` live.
- Whether the owner wants a pull request opened (do not open one unless asked).
