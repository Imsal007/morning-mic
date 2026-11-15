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
