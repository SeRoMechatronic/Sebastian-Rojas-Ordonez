# sebastianrojas-ordoñez.com

Personal website of **Sebastian Rojas-Ordoñez** — PhD Researcher (IKERLAN · UPV/EHU) and Mechatronic Engineer.

Single-page static site (no build step) hosted on GitHub Pages with a custom domain.

## Structure

- `index.html` — the whole site: styles, markup, and scripts in one file
- `assets/` — profile photo, hero media, and tool logos
- `404.html`, `robots.txt`, `sitemap.xml` — GitHub Pages / SEO support
- `CNAME` — custom domain (punycode for `sebastianrojas-ordoñez.com`)

## Development

No tooling required. To preview locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Features

- Tabbed sections: Home · Research · Engineering · Background · Contact
- Light/dark theme with system-preference detection and persistence
- JSON-LD structured data (schema.org Person) and Open Graph / Twitter cards
- Responsive layout, keyboard navigation (keys 1–5), reduced-motion support
- Print-friendly: printing renders all sections as a CV-style document
