// ─── Palette ─────────────────────────────────────────────────────────────────
var PALETTE = [
  '#c45c1a','#2d7a4f','#3a6fa8','#8b4fa8','#b8860b',
  '#c04060','#2a8080','#7a5230','#4a7a2a','#a04040',
  '#3a5f8a','#6a3a8a','#888820','#20607a','#7a3a60'
];

// ─── State ────────────────────────────────────────────────────────────────────
var cuts = [];
var layouts = [];
var activeSheet = 0;
var cutIdCounter = 0;
var layoutScale = 1;
var dragState = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  try {
    addCut('Side panel', 600, 400, 2);
    addCut('Shelf', 800, 200, 3);
    addCut('Back panel', 900, 600, 1);
    setupDropZone();
    setupCSVInput();
    setupCanvasInteraction();
    showEmpty();
  } catch(e) {
    console.error('Init error:', e);
  }
});

// ─── Cut management ───────────────────────────────────────────────────────────
function addCut(name, w, h, qty) {
  name = (name !== undefined) ? name : '';
  w    = (w    !== undefined) ? w    : 300;
  h    = (h    !== undefined) ? h    : 200;
  qty  = (qty  !== undefined) ? qty  : 1;
  var id = ++cutIdCounter;
  var colorIdx = cuts.length % PALETTE.length;
  cuts.push({ id: id, name: name, w: w, h: h, qty: qty, colorIdx: colorIdx });
  renderCutList();
}

function removeCut(id) {
  cuts = cuts.filter(function(c) { return c.id !== id; });
  cuts.forEach(function(c, i) { c.colorIdx = i % PALETTE.length; });
  renderCutList();
}

function renderCutList() {
  var el = document.getElementById('cut-rows');
  el.innerHTML = '';
  cuts.forEach(function(c) {
    var row = document.createElement('div');
    row.className = 'cut-row';
    row.style.cssText = 'display:grid;grid-template-columns:2fr 72px 72px 60px 32px;gap:6px;align-items:center;margin-bottom:6px;';

    var nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = c.name; nameInput.placeholder = 'Piece name';
    nameInput.style.cssText = 'border-left:3px solid '+PALETTE[c.colorIdx]+';border-radius:0 6px 6px 0;padding-left:8px;';
    nameInput.addEventListener('change', (function(id){ return function(){ updateCut(id,'name',this.value); }; })(c.id));

    var wInput = document.createElement('input');
    wInput.type='number'; wInput.value=c.w; wInput.min=1;
    wInput.addEventListener('change',(function(id){return function(){updateCut(id,'w',+this.value);};})(c.id));

    var hInput = document.createElement('input');
    hInput.type='number'; hInput.value=c.h; hInput.min=1;
    hInput.addEventListener('change',(function(id){return function(){updateCut(id,'h',+this.value);};})(c.id));

    var qInput = document.createElement('input');
    qInput.type='number'; qInput.value=c.qty; qInput.min=1; qInput.max=999;
    qInput.addEventListener('change',(function(id){return function(){updateCut(id,'qty',+this.value);};})(c.id));

    var btn = document.createElement('button');
    btn.className='btn-danger'; btn.title='Remove';
    btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
    btn.addEventListener('click',(function(id){return function(){removeCut(id);};})(c.id));

    row.appendChild(nameInput); row.appendChild(wInput); row.appendChild(hInput);
    row.appendChild(qInput); row.appendChild(btn);
    el.appendChild(row);
  });
}

function updateCut(id, field, value) {
  var c = cuts.find(function(c){ return c.id===id; });
  if (c) c[field] = value;
}

// ─── CSV Import ───────────────────────────────────────────────────────────────
function setupCSVInput() {
  document.getElementById('csv-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) parseCSV(file);
    e.target.value = '';
  });
}

function setupDropZone() {
  var zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e){
    e.preventDefault(); zone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) parseCSV(file);
    else toast('Please drop a .csv file');
  });
  zone.addEventListener('click', function(){ document.getElementById('csv-input').click(); });
}

function parseCSV(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var lines = e.target.result.split('\n').map(function(l){return l.trim();}).filter(Boolean);
    if (lines.length < 2) { toast('CSV appears empty'); return; }
    var header = lines[0].toLowerCase().split(',').map(function(h){return h.trim();});
    var nameIdx=header.indexOf('name'), wIdx=header.indexOf('width');
    var hIdx=header.indexOf('height'), qIdx=header.indexOf('quantity');
    if (wIdx===-1||hIdx===-1){ toast('CSV must have width and height columns'); return; }
    var added=0;
    for (var i=1;i<lines.length;i++){
      var cols=lines[i].split(',').map(function(c){return c.trim();});
      var w=parseFloat(cols[wIdx]), h=parseFloat(cols[hIdx]);
      if (!w||!h||isNaN(w)||isNaN(h)) continue;
      var name=(nameIdx>=0)?cols[nameIdx]:('Piece '+(cuts.length+1));
      var qty=(qIdx>=0)?Math.max(1,parseInt(cols[qIdx])||1):1;
      addCut(name,w,h,qty); added++;
    }
    toast('Imported '+added+' cut'+(added!==1?'s':'')+' from CSV');
  };
  reader.readAsText(file);
}

function downloadSampleCSV() {
  var content='name,width,height,quantity\nSide Panel,600,400,2\nShelf A,800,200,3\nTop Panel,1200,400,1\nDrawer Front,300,150,4\nBack Panel,900,600,1\n';
  var blob=new Blob([content],{type:'text/csv'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='sample-cuts.csv'; a.click();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MaxRects + Contact-Point packing
//
// Goals:
//   1. All pieces pack toward top-left, leaving ONE large offcut bottom-right
//   2. Prefer orientations that keep pieces wide (avoid tall thin columns)
//   3. Maximise edge contact with placed pieces and sheet walls
//
// Scoring (lower = better):
//   Primary:   contact score (higher contact = lower penalty)
//   Secondary: bottom-left position (y then x)
//   Tie-break: aspect ratio penalty (penalise placing a piece in a way that
//              leaves a thin awkward free rectangle beside it)
// ═══════════════════════════════════════════════════════════════════════════════

function maxRectsPackSheet(sheetW, sheetH, pieces, kerf, grain) {
  var freeRects = [{ x:0, y:0, w:sheetW, h:sheetH }];
  var placed = [];
  // Track occupied regions for contact scoring
  var occupied = [];

  for (var pi = 0; pi < pieces.length; pi++) {
    var piece = pieces[pi];
    var best = findBestPlacement(freeRects, occupied, piece, kerf, grain, sheetW, sheetH);
    if (!best) continue;

    var fw = best.rotated ? piece.h : piece.w;
    var fh = best.rotated ? piece.w : piece.h;

    placed.push({
      x: best.x, y: best.y, w: fw, h: fh,
      name: piece.name, colorIdx: piece.colorIdx, rotated: best.rotated
    });

    // Add to occupied (without kerf — visual footprint)
    occupied.push({ x: best.x, y: best.y, w: fw, h: fh });

    // Split free rects around the placed footprint (with kerf)
    freeRects = splitFreeRects(freeRects, best.x, best.y, fw + kerf, fh + kerf);
    freeRects = pruneContained(freeRects);
  }

  return placed;
}

function findBestPlacement(freeRects, occupied, piece, kerf, grain, sheetW, sheetH) {
  var orientations = buildOrientations(piece, kerf, grain);
  var best = null;
  var bestScore = null;

  for (var oi = 0; oi < orientations.length; oi++) {
    var o = orientations[oi];

    for (var ri = 0; ri < freeRects.length; ri++) {
      var r = freeRects[ri];
      if (r.w < o.pw || r.h < o.ph) continue;

      // Candidate: place at top-left of this free rect
      var cx = r.x, cy = r.y;
      var fw = o.rotated ? piece.h : piece.w;
      var fh = o.rotated ? piece.w : piece.h;

      // Score this placement
      var score = scorePlacement(cx, cy, fw, fh, occupied, sheetW, sheetH, r);

      if (bestScore === null || isBetterScore(score, bestScore)) {
        bestScore = score;
        best = { x: cx, y: cy, pw: o.pw, ph: o.ph, rotated: o.rotated };
      }
    }
  }
  return best;
}

function buildOrientations(piece, kerf, grain) {
  var orients = [{ pw: piece.w+kerf, ph: piece.h+kerf, rotated: false }];
  if (!grain && piece.w !== piece.h) {
    orients.push({ pw: piece.h+kerf, ph: piece.w+kerf, rotated: true });
  }
  return orients;
}

function scorePlacement(x, y, w, h, occupied, sheetW, sheetH, freeRect) {
  // ── Position score (PRIMARY) ──────────────────────────────────────────────
  // Drive everything toward top-left corner.
  // Use the far corner of the piece (x+w, y+h) so larger pieces don't
  // unfairly beat smaller ones at the same origin.
  var posScore = (y + h) * sheetW + (x + w);

  // ── Contact score (SECONDARY) ────────────────────────────────────────────
  // Count mm of perimeter touching sheet top/left walls or placed pieces.
  // Only reward top wall (y=0) and left wall (x=0) — NOT right/bottom walls,
  // which would pull pieces away from the consolidation corner.
  var contact = 0;
  if (x === 0) contact += h;
  if (y === 0) contact += w;

  for (var i = 0; i < occupied.length; i++) {
    var o = occupied[i];
    if (x === o.x + o.w) {
      var ov = Math.min(y+h, o.y+o.h) - Math.max(y, o.y);
      if (ov > 0) contact += ov;
    }
    if (x + w === o.x) {
      var ov = Math.min(y+h, o.y+o.h) - Math.max(y, o.y);
      if (ov > 0) contact += ov;
    }
    if (y === o.y + o.h) {
      var ov = Math.min(x+w, o.x+o.w) - Math.max(x, o.x);
      if (ov > 0) contact += ov;
    }
    if (y + h === o.y) {
      var ov = Math.min(x+w, o.x+o.w) - Math.max(x, o.x);
      if (ov > 0) contact += ov;
    }
  }

  // ── Leftover quality (TERTIARY) ───────────────────────────────────────────
  // Penalise placements that leave thin unusable slivers beside the piece.
  var rightW = freeRect.w - w;
  var belowH = freeRect.h - h;
  var leftoverPenalty = 0;
  var thinThreshold = 150;
  if (rightW > 0 && rightW < thinThreshold) leftoverPenalty += (thinThreshold - rightW);
  if (belowH > 0 && belowH < thinThreshold) leftoverPenalty += (thinThreshold - belowH);

  return {
    posScore: posScore,
    contact: contact,
    leftoverPenalty: leftoverPenalty
  };
}

function isBetterScore(a, b) {
  // Primary: lowest position score (top-left corner wins)
  if (a.posScore !== b.posScore) return a.posScore < b.posScore;
  // Secondary: higher contact (tighter packing)
  if (a.contact !== b.contact) return a.contact > b.contact;
  // Tertiary: lower leftover penalty (avoid thin slivers)
  return a.leftoverPenalty < b.leftoverPenalty;
}

function splitFreeRects(freeRects, px, py, pw, ph) {
  var result = [];
  for (var i = 0; i < freeRects.length; i++) {
    var r = freeRects[i];
    // No intersection — keep
    if (px >= r.x+r.w || px+pw <= r.x || py >= r.y+r.h || py+ph <= r.y) {
      result.push(r); continue;
    }
    // Left strip
    if (px > r.x)
      result.push({ x:r.x, y:r.y, w:px-r.x, h:r.h });
    // Right strip
    if (px+pw < r.x+r.w)
      result.push({ x:px+pw, y:r.y, w:(r.x+r.w)-(px+pw), h:r.h });
    // Top strip
    if (py > r.y)
      result.push({ x:r.x, y:r.y, w:r.w, h:py-r.y });
    // Bottom strip
    if (py+ph < r.y+r.h)
      result.push({ x:r.x, y:py+ph, w:r.w, h:(r.y+r.h)-(py+ph) });
  }
  return result;
}

function pruneContained(rects) {
  return rects.filter(function(a, i) {
    return !rects.some(function(b, j) {
      if (i===j) return false;
      return b.x<=a.x && b.y<=a.y && b.x+b.w>=a.x+a.w && b.y+b.h>=a.y+a.h;
    });
  });
}

// ─── Sort strategies for multi-heuristic search ───────────────────────────────
var SORT_STRATEGIES = [
  // Deterministic orderings (7)
  function(a,b){ return (b.w*b.h)-(a.w*a.h); },              // largest area first
  function(a,b){ return (a.w*a.h)-(b.w*b.h); },              // smallest area first
  function(a,b){ return b.h-a.h; },                           // tallest first
  function(a,b){ return a.h-b.h; },                           // shortest first
  function(a,b){ return b.w-a.w; },                           // widest first
  function(a,b){ return a.w-b.w; },                           // narrowest first
  function(a,b){ return (b.w+b.h)-(a.w+a.h); }               // largest perimeter first
];

// Seeded deterministic shuffle — produces 13 different orderings reproducibly
function shuffled(pieces, seed) {
  var arr = pieces.slice();
  var s = seed;
  for (var i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    var j = Math.abs(s) % (i + 1);
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// ─── Score a full multi-sheet layout (lower = better) ────────────────────────
// Primary:   fewest sheets
// Secondary: highest utilisation on the last (most wasteful) sheet
//            — this drives consolidation of waste onto fewer sheets
// Tertiary:  total waste area
function scoreLayout(layoutResult, sheetArea) {
  var sheets = layoutResult.length;
  if (sheets === 0) return { sheets: 999, lastUtil: 0, waste: Infinity };
  var lastSheet = layoutResult[sheets - 1];
  var lastUsed = lastSheet.placed.reduce(function(s,p){ return s+p.w*p.h; }, 0);
  var lastUtil = lastUsed / sheetArea;
  var totalUsed = layoutResult.reduce(function(s,sh){
    return s + sh.placed.reduce(function(ss,p){ return ss+p.w*p.h; }, 0);
  }, 0);
  var waste = (sheets * sheetArea) - totalUsed;
  return { sheets: sheets, lastUtil: lastUtil, waste: waste };
}

function isBetterLayout(a, b) {
  if (a.sheets !== b.sheets) return a.sheets < b.sheets;
  if (Math.abs(a.lastUtil - b.lastUtil) > 0.001) return a.lastUtil > b.lastUtil;
  return a.waste < b.waste;
}

// ─── Run one full layout attempt with a given piece ordering ─────────────────
function runLayoutPass(pieces, sw, sh, kerf, grain) {
  var resultSheets = [];
  var remaining = pieces.slice();

  while (remaining.length > 0) {
    var placed = maxRectsPackSheet(sw, sh, remaining, kerf, grain);
    if (placed.length === 0) break;

    var usedFlags = remaining.map(function(){ return false; });
    placed.forEach(function(pp){
      var pw = pp.rotated ? pp.h : pp.w;
      var ph = pp.rotated ? pp.w : pp.h;
      for (var i=0; i<remaining.length; i++){
        if (!usedFlags[i] && remaining[i].name===pp.name &&
            remaining[i].w===pw && remaining[i].h===ph){
          usedFlags[i]=true; return;
        }
      }
      for (var i=0; i<remaining.length; i++){
        if (!usedFlags[i] && remaining[i].name===pp.name &&
            remaining[i].w===ph && remaining[i].h===pw){
          usedFlags[i]=true; return;
        }
      }
    });

    var newRemaining = remaining.filter(function(_,i){ return !usedFlags[i]; });
    resultSheets.push({ w:sw, h:sh, placed:placed });
    if (newRemaining.length === remaining.length) break;
    remaining = newRemaining;
  }
  return resultSheets;
}

// ─── Optimise entry point ─────────────────────────────────────────────────────
function optimise() {
  try {
    var sw   = +document.getElementById('sw').value;
    var sh   = +document.getElementById('sh').value;
    var kerf = +document.getElementById('kerf').value || 0;
    var grain = document.getElementById('grain').checked;

    if (!sw||!sh||sw<1||sh<1){ toast('Enter valid sheet dimensions'); return; }
    if (cuts.length===0){ toast('Add at least one cut'); return; }

    var tooLarge=[];
    cuts.forEach(function(c){
      var fitsNormal  = c.w<=sw && c.h<=sh;
      var fitsRotated = !grain && c.h<=sw && c.w<=sh;
      if (!fitsNormal&&!fitsRotated) tooLarge.push(c.name||(c.w+'x'+c.h));
    });
    if (tooLarge.length>0){
      toast('Too large for sheet: '+tooLarge.slice(0,3).join(', ')+(tooLarge.length>3?'...':''));
      return;
    }

    // Expand quantities
    var pieces=[];
    cuts.forEach(function(c){
      for (var q=0; q<c.qty; q++){
        pieces.push({ w:c.w, h:c.h, name:c.name||(c.w+'x'+c.h), colorIdx:c.colorIdx });
      }
    });

    var sheetArea = sw * sh;
    var PASSES = 20;
    var bestLayouts = null;
    var bestScore = null;

    // 7 deterministic sort strategies + 13 seeded shuffles = 20 passes
    for (var pass = 0; pass < PASSES; pass++) {
      var ordered;
      if (pass < SORT_STRATEGIES.length) {
        ordered = pieces.slice().sort(SORT_STRATEGIES[pass]);
      } else {
        ordered = shuffled(pieces, pass * 7919); // prime seed per pass
      }

      var result = runLayoutPass(ordered, sw, sh, kerf, grain);
      if (result.length === 0) continue;

      var score = scoreLayout(result, sheetArea);
      if (bestScore === null || isBetterLayout(score, bestScore)) {
        bestScore = score;
        bestLayouts = result;
      }
    }

    if (!bestLayouts || bestLayouts.length === 0) {
      toast('Could not place any pieces — check dimensions');
      return;
    }

    layouts = bestLayouts;
    activeSheet = 0;
    renderResults(sw, sh);

  } catch(e){
    console.error('Optimise error:',e);
    toast('Error: '+e.message);
  }
}

// ─── Render results ───────────────────────────────────────────────────────────
function renderResults(sw, sh) {
  var totalArea = sw*sh*layouts.length;
  var usedArea  = layouts.reduce(function(s,sheet){
    return s+sheet.placed.reduce(function(ss,p){return ss+p.w*p.h;},0);
  },0);
  var wasteArea   = totalArea-usedArea;
  var util        = Math.round(usedArea/totalArea*100);
  var totalPieces = layouts.reduce(function(s,sheet){return s+sheet.placed.length;},0);

  document.getElementById('m-sheets').textContent = layouts.length;
  document.getElementById('m-cuts').textContent   = totalPieces;
  document.getElementById('m-waste').textContent  = (wasteArea/1e6).toFixed(2)+' m\u00B2';

  var badge=document.getElementById('util-badge');
  badge.textContent=util+'%';
  badge.className='util-badge '+(util>=75?'util-good':util>=50?'util-ok':'util-low');

  var tabs=document.getElementById('sheet-tabs');
  tabs.innerHTML='';
  layouts.forEach(function(s,i){
    var su=Math.round(s.placed.reduce(function(sum,p){return sum+p.w*p.h;},0)/(sw*sh)*100);
    var btn=document.createElement('button');
    btn.className='sheet-tab'+(i===0?' active':'');
    btn.textContent='Sheet '+(i+1)+'  \u00B7  '+su+'%';
    btn.addEventListener('click',(function(idx){return function(){switchSheet(idx,sw,sh);};})(i));
    tabs.appendChild(btn);
  });

  buildLegend();
  document.getElementById('empty-state').style.display='none';
  document.getElementById('results-area').style.display='flex';
  drawSheet(0,sw,sh);
}

function switchSheet(idx,sw,sh){
  activeSheet=idx;
  sw=sw||+document.getElementById('sw').value;
  sh=sh||+document.getElementById('sh').value;
  document.querySelectorAll('.sheet-tab').forEach(function(t,i){t.classList.toggle('active',i===idx);});
  drawSheet(idx,sw,sh);
}

function buildLegend(){
  var el=document.getElementById('legend');
  el.innerHTML='';
  cuts.forEach(function(c){
    var item=document.createElement('div'); item.className='legend-item';
    var swatch=document.createElement('div'); swatch.className='legend-swatch'; swatch.style.background=PALETTE[c.colorIdx];
    var label=document.createElement('span'); label.textContent=c.name||(c.w+'\u00D7'+c.h);
    var dims=document.createElement('span');
    dims.style.cssText='color:var(--text3);font-family:var(--mono);font-size:10px;margin-left:3px';
    dims.textContent=c.w+'\u00D7'+c.h+'mm';
    item.appendChild(swatch); item.appendChild(label); item.appendChild(dims);
    el.appendChild(item);
  });
}

// ─── Canvas interaction ───────────────────────────────────────────────────────
function setupCanvasInteraction() {
  var canvas = document.getElementById('layout-canvas');
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('mouseup', onCanvasMouseUp);
  canvas.addEventListener('mouseleave', onCanvasMouseUp);
  canvas.addEventListener('dblclick', onCanvasDblClick);
}

function getCanvasPos(canvas, e) {
  var rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / layoutScale, y: (e.clientY - rect.top) / layoutScale };
}

function findPieceAt(pos) {
  if (!layouts[activeSheet]) return -1;
  var placed = layouts[activeSheet].placed;
  for (var i = placed.length - 1; i >= 0; i--) {
    var p = placed[i];
    if (pos.x >= p.x && pos.x <= p.x + p.w && pos.y >= p.y && pos.y <= p.y + p.h) return i;
  }
  return -1;
}

function onCanvasMouseDown(e) {
  if (e.button !== 0 || !layouts[activeSheet]) return;
  var canvas = document.getElementById('layout-canvas');
  var pos = getCanvasPos(canvas, e);
  var idx = findPieceAt(pos);
  if (idx === -1) return;
  var p = layouts[activeSheet].placed[idx];
  dragState = { pieceIdx: idx, offsetX: pos.x - p.x, offsetY: pos.y - p.y };
  canvas.style.cursor = 'grabbing';
  e.preventDefault();
}

function onCanvasMouseMove(e) {
  var canvas = document.getElementById('layout-canvas');
  if (!dragState) {
    var pos = getCanvasPos(canvas, e);
    canvas.style.cursor = findPieceAt(pos) !== -1 ? 'grab' : 'default';
    return;
  }
  var pos = getCanvasPos(canvas, e);
  var sw = +document.getElementById('sw').value;
  var sh = +document.getElementById('sh').value;
  var p = layouts[activeSheet].placed[dragState.pieceIdx];
  p.x = Math.max(0, Math.min(sw - p.w, pos.x - dragState.offsetX));
  p.y = Math.max(0, Math.min(sh - p.h, pos.y - dragState.offsetY));
  drawSheet(activeSheet, sw, sh);
}

function onCanvasMouseUp() {
  if (dragState) {
    dragState = null;
    document.getElementById('layout-canvas').style.cursor = 'default';
  }
}

function onCanvasDblClick(e) {
  if (!layouts[activeSheet]) return;
  var canvas = document.getElementById('layout-canvas');
  var pos = getCanvasPos(canvas, e);
  var idx = findPieceAt(pos);
  if (idx === -1) return;
  var sw = +document.getElementById('sw').value;
  var sh = +document.getElementById('sh').value;
  var p = layouts[activeSheet].placed[idx];
  var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  var newW = p.h, newH = p.w;
  p.x = Math.max(0, Math.min(sw - newW, cx - newW / 2));
  p.y = Math.max(0, Math.min(sh - newH, cy - newH / 2));
  p.w = newW; p.h = newH;
  p.rotated = !p.rotated;
  drawSheet(activeSheet, sw, sh);
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────
function drawSheet(idx,sw,sh){
  var canvas=document.getElementById('layout-canvas');
  var wrap=document.querySelector('.canvas-area');
  var maxW=wrap.clientWidth-48, maxH=wrap.clientHeight-48;
  var scale=Math.min(maxW/sw, maxH/sh, 1.5);
  layoutScale=scale;

  canvas.width=Math.round(sw*scale); canvas.height=Math.round(sh*scale);
  canvas.style.width=canvas.width+'px'; canvas.style.height=canvas.height+'px';

  var ctx=canvas.getContext('2d');
  var sheet=layouts[idx];

  ctx.fillStyle='#f9f5ee'; ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle='rgba(180,160,130,0.18)'; ctx.lineWidth=0.5;
  var gs=100*scale;
  for (var x=gs;x<canvas.width;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for (var y=gs;y<canvas.height;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}

  sheet.placed.forEach(function(p){
    var col=PALETTE[p.colorIdx];
    var px=p.x*scale, py=p.y*scale, pw=p.w*scale, ph=p.h*scale;

    ctx.globalAlpha=0.88; ctx.fillStyle=col;
    roundRect(ctx,px,py,pw,ph,3); ctx.fill(); ctx.globalAlpha=1;

    ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1;
    roundRect(ctx,px,py,pw,ph,3); ctx.stroke();

    if (p.rotated){
      ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(px+4,py+ph/2); ctx.lineTo(px+pw-4,py+ph/2); ctx.stroke();
      ctx.setLineDash([]);
    }

    if (pw>40&&ph>22){
      var fs=Math.max(9,Math.min(13,pw/8,ph/3));
      ctx.textAlign='center'; ctx.textBaseline='middle';
      if (ph>40&&pw>60){
        ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.font='500 '+fs+'px sans-serif';
        var name=p.name.length>14?p.name.slice(0,13)+'\u2026':p.name;
        ctx.fillText(name,px+pw/2,py+ph/2-fs*0.6);
        ctx.fillStyle='rgba(255,255,255,0.70)'; ctx.font='400 '+Math.max(8,fs-2)+'px monospace';
        ctx.fillText(p.w+'\u00D7'+p.h,px+pw/2,py+ph/2+fs*0.7);
      } else {
        ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.font='500 '+fs+'px sans-serif';
        ctx.fillText(p.w+'\u00D7'+p.h,px+pw/2,py+ph/2);
      }
    }
  });

  ctx.strokeStyle='#9c8e7e'; ctx.lineWidth=1.5;
  ctx.strokeRect(0.75,0.75,canvas.width-1.5,canvas.height-1.5);

  var sheetUtil=Math.round(sheet.placed.reduce(function(s,p){return s+p.w*p.h;},0)/(sw*sh)*100);
  ctx.fillStyle='rgba(28,24,20,0.5)'; ctx.fillRect(0,canvas.height-22,canvas.width,22);
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='400 11px monospace';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('Sheet '+(idx+1)+' of '+layouts.length+
    '  \u00B7  '+sheet.placed.length+' pieces'+
    '  \u00B7  '+sw+'\u00D7'+sh+'mm'+
    '  \u00B7  '+sheetUtil+'% utilised',
    10,canvas.height-11);
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function showEmpty(){
  document.getElementById('empty-state').style.display='flex';
  document.getElementById('results-area').style.display='none';
}

// ─── PDF Export ───────────────────────────────────────────────────────────────
function exportPDF(){
  if (layouts.length===0){toast('Run optimise first');return;}
  if (typeof window.jspdf==='undefined'){toast('PDF library not loaded yet, try again');return;}
  try {
    var jsPDF=window.jspdf.jsPDF;
    var sw=+document.getElementById('sw').value;
    var sh=+document.getElementById('sh').value;
    var kerf=+document.getElementById('kerf').value||0;
    var grain=document.getElementById('grain').checked;
    var isLandscape=sw>sh;
    var pdf=new jsPDF({orientation:isLandscape?'landscape':'portrait',unit:'mm',format:'a4'});
    var PW=isLandscape?297:210, PH=isLandscape?210:297, M=14;

    pdf.setFillColor(28,24,20); pdf.rect(0,0,PW,28,'F');
    pdf.setFillColor(196,92,26); pdf.rect(0,28,PW,2,'F');
    pdf.setFontSize(16); pdf.setFont('helvetica','bold'); pdf.setTextColor(249,244,239);
    pdf.text('WOOD CUT OPTIMISER',M,17);
    pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(156,142,126);
    pdf.text('Generated '+new Date().toLocaleDateString('en-AU',{day:'2-digit',month:'short',year:'numeric'}),PW-M,17,{align:'right'});

    var cy=40;
    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(107,94,78);
    pdf.text('CONFIGURATION',M,cy); cy+=6;
    pdf.setFont('helvetica','normal'); pdf.setTextColor(28,24,20); pdf.setFontSize(10);
    pdf.text('Sheet size: '+sw+' \u00D7 '+sh+' mm',M,cy); cy+=5.5;
    pdf.text('Kerf allowance: '+kerf+' mm',M,cy); cy+=5.5;
    pdf.text('Grain direction respected: '+(grain?'Yes':'No'),M,cy); cy+=10;

    var totalArea=sw*sh*layouts.length;
    var usedArea=layouts.reduce(function(s,sh){return s+sh.placed.reduce(function(ss,p){return ss+p.w*p.h;},0);},0);
    var wasteArea=totalArea-usedArea;
    var util=Math.round(usedArea/totalArea*100);
    var totalPieces=layouts.reduce(function(s,sh){return s+sh.placed.length;},0);

    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(107,94,78);
    pdf.text('RESULTS SUMMARY',M,cy); cy+=6;
    var mCol=(PW-M*2)/4;
    [{label:'Sheets needed',val:layouts.length},{label:'Total pieces',val:totalPieces},
     {label:'Avg utilisation',val:util+'%'},{label:'Total waste',val:(wasteArea/1e6).toFixed(2)+' m\u00B2'}
    ].forEach(function(m,i){
      var mx=M+i*mCol;
      pdf.setFillColor(238,233,224); pdf.roundedRect(mx,cy,mCol-4,18,2,2,'F');
      pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(28,24,20);
      pdf.text(String(m.val),mx+(mCol-4)/2,cy+10,{align:'center'});
      pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(107,94,78);
      pdf.text(m.label.toUpperCase(),mx+(mCol-4)/2,cy+15.5,{align:'center'});
    });
    cy+=26;

    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(107,94,78);
    pdf.text('CUT LIST',M,cy); cy+=5;
    var colW=[6,80,30,30,20,30];
    var hdrs=['','Name','Width (mm)','Height (mm)','Qty','Area (m\u00B2)'];
    pdf.setFillColor(28,24,20); pdf.rect(M,cy,PW-M*2,7,'F');
    pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(249,244,239);
    var cx=M; hdrs.forEach(function(h,i){pdf.text(h,cx+2,cy+5);cx+=colW[i];}); cy+=7;
    cuts.forEach(function(c,idx){
      var col=hexToRGB(PALETTE[c.colorIdx]);
      pdf.setFillColor(idx%2===0?247:238,idx%2===0?244:233,idx%2===0?239:224);
      pdf.rect(M,cy,PW-M*2,6.5,'F');
      pdf.setFillColor(col.r,col.g,col.b); pdf.rect(M,cy,5,6.5,'F');
      pdf.setFont('helvetica','normal'); pdf.setTextColor(28,24,20);
      cx=M;
      ['',c.name||'-',c.w,c.h,c.qty,(c.w*c.h*c.qty/1e6).toFixed(3)].forEach(function(v,i){
        if (i!==0) pdf.text(String(v),cx+2,cy+4.5); cx+=colW[i];
      }); cy+=6.5;
    });

    for (var si=0;si<layouts.length;si++){
      pdf.addPage(isLandscape?'landscape':'portrait');
      var sheet=layouts[si];
      pdf.setFillColor(28,24,20); pdf.rect(0,0,PW,28,'F');
      pdf.setFillColor(196,92,26); pdf.rect(0,28,PW,2,'F');
      pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(249,244,239);
      pdf.text('SHEET '+(si+1)+' OF '+layouts.length,M,17);
      var su=Math.round(sheet.placed.reduce(function(s,p){return s+p.w*p.h;},0)/(sw*sh)*100);
      pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(156,142,126);
      pdf.text(sheet.placed.length+' pieces  \u00B7  '+su+'% utilised  \u00B7  '+sw+'\u00D7'+sh+'mm',PW-M,17,{align:'right'});

      var da={x:M,y:34,w:PW-M*2-60,h:PH-34-M};
      var sc=Math.min(da.w/sw,da.h/sh);
      var dw=sw*sc, dh=sh*sc;
      var ox=da.x+(da.w-dw)/2, oy=da.y;
      pdf.setFillColor(249,245,238); pdf.rect(ox,oy,dw,dh,'F');

      sheet.placed.forEach(function(p){
        var col=hexToRGB(PALETTE[p.colorIdx]);
        pdf.setFillColor(col.r,col.g,col.b);
        pdf.rect(ox+p.x*sc,oy+p.y*sc,p.w*sc,p.h*sc,'F');
        pdf.setDrawColor(255,255,255); pdf.setLineWidth(0.3);
        pdf.rect(ox+p.x*sc,oy+p.y*sc,p.w*sc,p.h*sc,'S');
        var ppw=p.w*sc, pph=p.h*sc;
        if (ppw>10&&pph>6){
          var fs=Math.max(5,Math.min(8,ppw/8));
          pdf.setFontSize(fs); pdf.setFont('helvetica','bold'); pdf.setTextColor(255,255,255);
          var lbl=p.name.length>12?p.name.slice(0,11)+'\u2026':p.name;
          pdf.text(lbl,ox+p.x*sc+ppw/2,oy+p.y*sc+pph/2-(pph>10?1:0),{align:'center'});
          if (pph>10){
            pdf.setFontSize(Math.max(4,Math.min(6,ppw/10)));
            pdf.setFont('helvetica','normal');
            pdf.text(p.w+'\u00D7'+p.h,ox+p.x*sc+ppw/2,oy+p.y*sc+pph/2+3,{align:'center'});
          }
        }
      });

      pdf.setDrawColor(107,94,78); pdf.setLineWidth(0.5);
      pdf.rect(ox,oy,dw,dh,'S');

      var lx=ox+dw+6, ly=oy+2;
      pdf.setFontSize(6); pdf.setFont('helvetica','bold'); pdf.setTextColor(107,94,78);
      pdf.text('PIECES',lx,ly); ly+=5;
      sheet.placed.forEach(function(p){
        if (ly>oy+dh) return;
        var col=hexToRGB(PALETTE[p.colorIdx]);
        pdf.setFillColor(col.r,col.g,col.b); pdf.rect(lx,ly-2.5,4,4,'F');
        pdf.setFontSize(5.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(28,24,20);
        var lbl=p.name.length>10?p.name.slice(0,9)+'\u2026':p.name;
        pdf.text(lbl+' '+p.w+'\u00D7'+p.h+(p.rotated?' R':''),lx+5.5,ly,{maxWidth:50});
        ly+=5;
      });
    }

    pdf.save('wood-cuts-'+Date.now()+'.pdf');
    toast('PDF exported');
  } catch(e){
    console.error('PDF error:',e); toast('PDF error: '+e.message);
  }
}

// ─── DXF Export ───────────────────────────────────────────────────────────────
// ACI colors loosely matching the palette (indices 1-15 give distinct colours)
var DXF_ACI = [1,3,5,6,2,1,4,30,62,10,140,170,58,42,190];

function exportDXF() {
  if (layouts.length === 0) { toast('Run optimise first'); return; }
  var sw = +document.getElementById('sw').value;
  var sh = +document.getElementById('sh').value;
  var lines = [];

  function w(s) { lines.push(s); }

  // Header
  w('0'); w('SECTION'); w('2'); w('HEADER');
  w('9'); w('$ACADVER'); w('1'); w('AC1014');
  w('9'); w('$INSUNITS'); w('70'); w('4'); // mm
  w('0'); w('ENDSEC');

  // Tables (minimal — just layer table)
  w('0'); w('SECTION'); w('2'); w('TABLES');
  w('0'); w('TABLE'); w('2'); w('LAYER'); w('70'); w(String(cuts.length + 1));
  // Default layer
  w('0'); w('LAYER'); w('2'); w('0'); w('70'); w('0'); w('62'); w('7'); w('6'); w('CONTINUOUS');
  // One layer per cut type
  cuts.forEach(function(c) {
    w('0'); w('LAYER');
    w('2'); w(sanitizeDxfName(c.name || (c.w + 'x' + c.h)));
    w('70'); w('0');
    w('62'); w(String(DXF_ACI[c.colorIdx] || 7));
    w('6'); w('CONTINUOUS');
  });
  w('0'); w('ENDTAB'); w('0'); w('ENDSEC');

  // Entities
  w('0'); w('SECTION'); w('2'); w('ENTITIES');

  var sheetGap = 100; // mm gap between sheets

  layouts.forEach(function(sheet, si) {
    var offsetX = si * (sw + sheetGap);

    // Sheet border
    w('0'); w('LWPOLYLINE');
    w('8'); w('SHEET_BORDER');
    w('62'); w('7');
    w('90'); w('4');
    w('70'); w('1');
    dxfVertex(w, offsetX, 0);
    dxfVertex(w, offsetX + sw, 0);
    dxfVertex(w, offsetX + sw, sh);
    dxfVertex(w, offsetX, sh);

    // Sheet label
    w('0'); w('TEXT');
    w('8'); w('SHEET_BORDER');
    w('10'); w(fmt(offsetX + 5));
    w('20'); w(fmt(sh + 10));
    w('30'); w('0');
    w('40'); w('20');
    w('1'); w('Sheet ' + (si + 1) + ' of ' + layouts.length + '  ' + sw + 'x' + sh + 'mm');

    sheet.placed.forEach(function(p) {
      var layerName = sanitizeDxfName(p.name || (p.w + 'x' + p.h));
      var aciColor = String(DXF_ACI[p.colorIdx] || 7);
      var px = offsetX + p.x;
      var py = p.y;

      // Piece outline
      w('0'); w('LWPOLYLINE');
      w('8'); w(layerName);
      w('62'); w(aciColor);
      w('90'); w('4');
      w('70'); w('1');
      dxfVertex(w, px, py);
      dxfVertex(w, px + p.w, py);
      dxfVertex(w, px + p.w, py + p.h);
      dxfVertex(w, px, py + p.h);

      // Piece label
      w('0'); w('TEXT');
      w('8'); w(layerName);
      w('62'); w(aciColor);
      w('10'); w(fmt(px + p.w / 2));
      w('20'); w(fmt(py + p.h / 2 + 5));
      w('30'); w('0');
      w('40'); w(fmt(Math.max(5, Math.min(20, p.w / 8, p.h / 3))));
      w('72'); w('1'); // centre-justified
      w('11'); w(fmt(px + p.w / 2));
      w('21'); w(fmt(py + p.h / 2 + 5));
      w('1'); w(p.name || (p.w + 'x' + p.h));

      // Dimensions line
      w('0'); w('TEXT');
      w('8'); w(layerName);
      w('62'); w(aciColor);
      w('10'); w(fmt(px + p.w / 2));
      w('20'); w(fmt(py + p.h / 2 - 8));
      w('30'); w('0');
      w('40'); w(fmt(Math.max(4, Math.min(14, p.w / 10, p.h / 4))));
      w('72'); w('1');
      w('11'); w(fmt(px + p.w / 2));
      w('21'); w(fmt(py + p.h / 2 - 8));
      w('1'); w(p.w + 'x' + p.h + 'mm' + (p.rotated ? ' R' : ''));
    });
  });

  w('0'); w('ENDSEC');
  w('0'); w('EOF');

  var content = lines.join('\n');
  var blob = new Blob([content], { type: 'application/dxf' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wood-cuts-' + Date.now() + '.dxf';
  a.click();
  toast('DXF exported');
}

function dxfVertex(w, x, y) {
  w('10'); w(fmt(x));
  w('20'); w(fmt(y));
}

function fmt(n) { return parseFloat(n.toFixed(4)).toString(); }

function sanitizeDxfName(s) {
  return s.replace(/[^A-Za-z0-9_\-]/g, '_').slice(0, 31) || 'PIECE';
}

function hexToRGB(hex){
  return { r:parseInt(hex.slice(1,3),16), g:parseInt(hex.slice(3,5),16), b:parseInt(hex.slice(5,7),16) };
}

var toastTimer;
function toast(msg){
  var el=document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('show');},3200);
}
