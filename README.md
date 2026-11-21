# Typographic Exploration — Album Covers

A showcase of student album covers from **Project 01: Typographic Exploration** (Visual Storytelling I, Digital Media & Design, Langara College). Each cover is shown exactly as submitted; click one to hear the song the student chose (played from YouTube).

Plain HTML, CSS and JavaScript. No build step and nothing to install.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The page |
| `assets/style.css` | All styling. DGMD colours and type are set at the top as variables |
| `assets/app.js` | Intro animation, grid, listening view, YouTube player |
| `assets/data.js` | **The list of covers.** Edit this to change order, names or songs |
| `assets/dgmd-on-dark.svg` | DGMD wordmark (on-dark version, from the GROW Workspace Figma file) |
| `covers/` | Each cover as `<slug>-1600.webp` (large) and `<slug>-640.webp` (grid) |

## Put it on GitHub Pages

1. On github.com, create a new **public** repository, for example `typographic-exploration`.
2. Upload everything in this folder: on the empty repo page choose **uploading an existing file**, drag in the folder's contents (`index.html`, `assets`, `covers`, `README.md`, `.nojekyll`), then **Commit changes**.
3. In the repo go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at `https://<your-username>.github.io/typographic-exploration/`.

To update it later, edit or re-upload the changed files in the repo. Pages republishes on its own.

## Preview on your own computer

The songs need the page served over http (YouTube won't play inside a page opened straight from your disk). In Terminal:

```
cd path/to/this/folder
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Common edits

- **Change the order:** move entries up or down in `assets/data.js`. Numbers update by themselves.
- **Fix a name or song:** edit that entry in `assets/data.js`.
- **Swap a song:** replace `yt` with the 11-character ID from the YouTube link (the part after `watch?v=` or `youtu.be/`).
- **Add a cover:** export the artwork as two square WebP files, `covers/<slug>-1600.webp` and `covers/<slug>-640.webp`, then add an entry to `data.js` with the same `slug`.

## Notes

- The intro plays once per browser session. "Replay intro" in the header runs it again. Visitors who have reduced motion turned on in their system settings skip it.
- Each cover has its own link: `…/#espresso` opens that cover's listening view directly.
- If YouTube is blocked on a network, the listening view shows a "Listen on YouTube" link instead.
- Covers © the student designers. Music rights belong to the artists and their labels.
