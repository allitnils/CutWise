# Wood Cut Optimiser

A browser-based tool for optimising the layout of rectangular cuts across plywood sheets, minimising waste.

## Features

- Enter sheet size (defaults to standard 2440×1220mm plywood)
- Set kerf (blade width) in mm — defaults to 3mm
- Toggle grain direction respect (prevents 90° rotation of pieces)
- Named pieces with colour coding
- Import cut list via CSV upload or drag-and-drop
- Per-sheet visual layout with utilisation metrics
- PDF export — summary page + one layout page per sheet

## CSV Format

```
name,width,height,quantity
Side Panel,600,400,2
Shelf A,800,200,3
Top Panel,1200,400,1
```

A sample CSV is available to download inside the app.

---

## Deploying to GitHub Pages

### First time setup

1. Go to [github.com](https://github.com) and create a new repository
   - Name it anything, e.g. `wood-optimiser`
   - Set visibility to **Public**
   - Do NOT initialise with README (you already have these files)

2. Upload the files:
   - Click **Add file → Upload files**
   - Drag the entire contents of this folder:
     - `index.html`
     - `style.css`
     - `app.js`
     - `sample.csv`
     - `README.md`
   - Commit directly to `main`

3. Enable GitHub Pages:
   - Go to your repo → **Settings → Pages**
   - Under **Source**, select `Deploy from a branch`
   - Branch: `main` / folder: `/ (root)`
   - Click **Save**

4. Wait ~60 seconds, then visit:
   ```
   https://<your-github-username>.github.io/<repo-name>/
   ```

### Updating the app

Any time you push changes to `main`, GitHub Pages redeploys automatically within ~30 seconds.

If you prefer a git-based workflow:

```bash
git clone https://github.com/<you>/<repo>.git
# make changes
git add .
git commit -m "update"
git push
```

---

## Local development

No build tools required. Just open `index.html` in any modern browser:

```bash
# macOS
open index.html

# or use a simple local server (avoids any file:// quirks)
npx serve .
```

---

## Algorithm

Uses **Guillotine Best-Area-Fit** packing:
1. Pieces are sorted largest-to-smallest by area
2. Each piece is placed into the smallest free rectangle that fits it
3. The placed piece splits the free rectangle into two sub-rectangles
4. Contained sub-rectangles are pruned to keep the free list clean
5. Pieces that don't fit the current sheet overflow to a new sheet

With grain direction off, both orientations (0° and 90°) are evaluated per placement and the better fit is chosen.
