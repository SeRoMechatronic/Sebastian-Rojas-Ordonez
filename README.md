# sebastianrojas-ordoñez.com

Personal portfolio of **Sebastian Rojas-Ordoñez**, Robotics Systems Engineer and PhD researcher (IKERLAN · UPV/EHU).

A buildless static site on GitHub Pages with a custom domain. English by default, with a one-click switch to Spanish and a light/dark theme switch.

## Tabs

The page is split into five tabs. Each one has its own colours and style, in both light and dark themes:

| Tab | URL | Content | Style |
| --- | --- | --- | --- |
| Home | `/` or `#home` | Hero, about, links to the other tabs, call to action | Brand teal |
| Research | `#research` | Publications with journal covers, abstracts, in-page PDF viewer | Editorial: paper, serif type, gold |
| Engineering | `#engineering` | Flagship systems, skills, open source, engineering archive | Blueprint: grid, square corners, blue |
| Background | `#background` | Route between countries (flags), experience, education, honours, languages | Map: contour lines, terracotta route |
| Contact | `#contact` | Email, CV and profiles | White on a warm gradient |

The URL fragment picks the tab, so links such as `#research`, `#experience` or `#paper-acme-2026` open the right tab, and back/forward works. CSS does the switching (`:target`); `main.js` adds the animated transition (View Transitions), the sliding tab indicator, a page title per tab and keyboard focus. Without JavaScript every section is shown one after the other. On screens narrower than 860 px the tabs move to a bar at the bottom.

The colours of each tab are design tokens in section 1b of `main.css` (`.p-research`, `.p-engineering`, `.p-background`, `.p-contact`).

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | All content, in English, with `data-i18n` keys on every translatable element |
| `assets/css/main.css` | Styles: design tokens (light/dark), components, responsive, reduced motion, print |
| `assets/js/i18n.js` | Spanish translations and interface strings |
| `assets/js/main.js` | Language and theme switches, menu, scroll effects, abstracts, PDF viewer, copy e-mail |
| `assets/img/` | Optimised portrait (WebP + JPEG), Open Graph card, app icons |
| `assets/papers/` | Paper cover thumbnails (first page of each PDF, 620 px wide WebP) |
| `papers/` | The five open-access papers (CC BY 4.0), each with the journal cover and paper title as its first page |
| `assets/Sebastian_Rojas_Ordonez_CV.pdf` | Downloadable CV (keep this path: other sites may link to it) |
| `404.html`, `robots.txt`, `sitemap.xml`, `site.webmanifest`, `CNAME` | GitHub Pages and SEO support |
| `tools/check_i18n.py` | Checks that every text has a Spanish version |

## Editing text

1. Change the English text in `index.html`.
2. Change the entry with the same `data-i18n` key in `assets/js/i18n.js`.
3. Run `python tools/check_i18n.py`. It lists missing or unused translations and markup that differs between languages.

Links to share the Spanish version directly: `https://sebastianrojas-ordoñez.com/?lang=es`.

## Adding a paper

All five papers are hosted here and open in the in-page viewer. For a new one:

1. Add the PDF to `papers/` with a short lowercase name such as `2027-journal-short-title.pdf`. Open-access papers (for example CC BY 4.0) can be redistributed with attribution; for other licences, check the publisher's policy first.
2. Save its first page (the cover) as a 620 px wide WebP in `assets/papers/` with the same name.
3. Copy an existing card in `index.html` and update the title, authors, abstract, keywords, tags (date and page count), file size, `download` file name, DOI, and the image `width`/`height`.
4. Add the Spanish strings for the new `data-i18n` keys to `assets/js/i18n.js` and run `python tools/check_i18n.py`.

## Local preview

No build step or dependencies:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
