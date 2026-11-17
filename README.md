# CompTIA A+ Study Quiz (PWA)

An installable Progressive Web App for practicing CompTIA A+ Core 1 (220-1201) and Core 2 (220-1202) topics.

## Features

- **Multiple-choice questions** with detailed explanations of both the correct answer and why the other options are wrong
- **Drag-and-drop** matching and ordering exercises
- **Performance-based simulations** (CLI-style troubleshooting)
- Categories: Hardware, Networking, Operating Systems, Security
- Filter by Core 1 / Core 2 or topic
- Progress tracking (stored locally)
- **Installable as a PWA** — works offline after first load
- Responsive design for mobile and desktop

## Questions

Includes publicly available CompTIA sample questions plus original practice items written to the current exam objectives. All answers include full explanations.

**Disclaimer:** This is an independent study tool and is not affiliated with, endorsed by, or sponsored by CompTIA. Questions are for educational practice only.

## Running Locally

1. Clone the repo
2. Open `index.html` in a browser, or serve the folder with any static server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```
3. To install as a PWA, use Chrome/Edge/Firefox and click the install icon in the address bar (or "Add to Home Screen" on mobile).

## Deploying

This is a static site. Push to any GitHub repository and enable GitHub Pages from the main branch root.

## License

MIT — feel free to use and modify for personal study.
