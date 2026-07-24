# AGENTS.md — Through Their Eyes

> This file is written for AI coding agents. It describes the project as it actually exists today. There was no previous `AGENTS.md` in the project root, so this document was created from scratch after inspecting every source file.

## Project overview

This is a **static, single-page interactive web experience** about colour-vision deficiency (CVD). The user picks a type of colour blindness (or is assigned one secretly), then walks through a day-in-the-life story made of illustrated scenes, quizzes, a Voices section with real community quotes, and a small CVD-aware palette simulator.

Key facts:

- No frameworks, no build tools, no package manager — pure HTML/CSS/JavaScript.
- Fully client-side; there is no backend or server-side logic.
- Bilingual: English and Simplified Chinese. Translations live in `i18n.js`.
- The visual CVD simulation is done with SVG `<filter>` colour matrices applied to elements with the class `simfx`.

## File structure

```
.
├── index.html        # Single-page markup, inline SVG defs, all sections/screens
├── app.js            # All JavaScript: state, navigation, interactions, colour simulator, effects
├── i18n.js           # Translation dictionary: var I18N = { en: {...}, zh: {...} }
├── style.css         # All styling, animations, responsive breakpoints
├── cividis.png       # Cividis colour-map reference image
├── wcag_aa.png       # WCAG AA conformance badge image
└── assets/           # Icons, photos and screenshots used in the wins section
    ├── *_icon.svg    # Product logos (Gmail, Spotify, Trello, Apple, Android)
    ├── spotify_dot.jpg
    ├── trello_colorblind_toggle.gif
    ├── google_old_*.png
    ├── google_new_*.png
    ├── google-workspace-icons-redesign-side-by-side-divider.webp
    ├── google images too similar.jpg
    ├── japan_traffic_light.png
    ├── japan_pedestrian.png
    ├── tube_map.png
    └── enchroma_with.jpg
```

`index.html` loads `i18n.js` first, then `app.js`:

```html
<script src="i18n.js"></script>
<script src="app.js"></script>
```

## Technology stack

- **HTML5** — semantic sections, inline SVG, ARIA attributes where appropriate.
- **CSS3** — custom properties, flex/grid layouts, keyframe animations, `prefers-reduced-motion` media queries.
- **Vanilla JavaScript (ES5-style)** — the code is wrapped in IIFEs and uses `var` so it runs in older browsers without transpilation.
- **External resources**:
  - Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`).
  - Several images hotlinked from Wikimedia Commons with inline SVG fallbacks.
- **No dependencies** such as React, Vue, Webpack, Vite, npm, etc.

## Runtime architecture

`app.js` is organised into a few self-contained IIFE blocks:

1. **State + navigation** (`order`, `state`, `show`, `applyLang`).
2. **Internationalisation** — reads `I18N`, updates `[data-i]`, `[data-i-html]`, `[data-i-svg]`, and typewriter text.
3. **Vision-mode logic** — sets `body[data-vision]` to `normal`, `deutan`, `protan`, `tritan`, or `achro`. CSS then applies the matching SVG filter to `.simfx`.
4. **Scene interactions** — click handlers for choices, feedback panels, data cards, and the "expense report" dialogue.
5. **Colour-vision palette simulator** — Brettel/Viénot-style linear-RGB matrices for protan/deutan/tritan simulation, rendered in the `#ctool` section.
6. **Atmosphere / effects** — preloader, canvas ambient background, custom cursor, magnetic hover, 3D tilt, click ripples, scroll reveal. All of this is skipped when `prefers-reduced-motion: reduce` is active.

Important CSS hook: `body[data-vision="deutan"] .simfx { filter:url(#f-deutan); }` (and likewise for the other types). The SVG filters are defined in `index.html` inside a hidden `<svg>`.

## Build and test commands

There is **no build step**.

To run locally:

```bash
# Option 1: open directly (some browsers block fetch/external resources from file://)
open index.html

# Option 2: serve with any static file server
python -m http.server 8000
# Then visit http://localhost:8000
```

No automated test suite exists. Testing is manual (see below).

## Code style guidelines

Follow the existing conventions:

- Keep JavaScript ES5-compatible: use `var`, named functions, and IIFEs.
- Do not introduce build tools or npm dependencies without a strong reason.
- Use CSS custom properties for colours and typography.
- Keep language keys in sync across `en` and `zh` in `i18n.js`.
- New translatable strings should use the existing key pattern, e.g. `section.element.purpose`.
- Any purely decorative motion **must** respect `prefers-reduced-motion: reduce`.
- Keep the "fancy-up" additive section at the bottom of `style.css` and the additive IIFE at the bottom of `app.js` separate from core logic.

## Testing instructions

Before committing changes, manually verify at least:

1. **Navigation**: every `[data-go]` button routes to the correct section, including `#twist` → `#voices` → `#lab`.
2. **Languages**: toggle EN / 中文 and confirm all visible text updates, including SVG text and HTML content.
3. **Vision modes**: select each CVD type and confirm the `.simfx` elements change; check the "surprise me" hidden mode reveal on the sunset screen.
4. **Reduced motion**: enable OS/browser reduced motion and confirm animations, ambient canvas, custom cursor, and tilt effects are disabled.
5. **Responsive**: check layout at 320 px, 760 px, and 1024+ px widths.
6. **Palette simulator**: add/remove colours, use presets, verify protan/deutan/tritan columns update.
7. **External images**: where Wikimedia images fail, the inline SVG fallback should appear.
8. **Console**: no JavaScript errors on initial load or during section transitions.

## Deployment

Deploy by copying the entire project directory to any static host (GitHub Pages, Netlify, Vercel, S3, etc.). Because there is no build, the root `index.html` can be served directly.

### Asset paths

Local asset paths are consistent: `index.html` loads `cividis.png`, `wcag_aa.png`, `app.js`, `i18n.js`, and `style.css` from the same directory, while other images and icons live in `assets/`. No path changes are required to deploy.

External hotlinks (Google Fonts, Wikimedia images) will not work offline.

## Security considerations

- **No secrets or credentials** are stored in the repository.
- **No user data is collected**; everything happens in the browser.
- **External resources** (Google Fonts, Wikimedia) are loaded without Subresource Integrity. They can be blocked or fail if the user is offline or a strict CSP is in place.
- **Inline SVG and inline scripts**: the page relies on inline SVG filters and external `<script>` tags. A very strict Content-Security-Policy would need `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (because CSS uses inline custom properties and animations), and allowances for the external font/image sources.
- If adding form handling or analytics later, do not store PII without explicit consent.

## Accessibility notes

The project is itself an accessibility education piece. Maintain:

- keyboard focusability for all interactive elements,
- `aria-hidden` on decorative canvas/SVG elements,
- colour-independent cues (patterns, labels, shapes) in the redesigned examples in the Lab section,
- `prefers-reduced-motion` support for all new animations.
