// ── Optical Lineage エフェクトエンジン（k-eis DESIGN FILTER 00-γ・個人用/非公開）
// Velvet Glowの「1本のパッチリスト」から一歩進んで、写真を形作る3つの独立した系譜を
// BODY・LENS・FILMという3つの軸に分解した。ライカMマウントは現実に「どのレンズでもどの
// ボディにも着けられる」ため、Silver GelatinのCAMERA×FILM STOCKと違い、ここでの組み合わせは
// 現実にありえるものだけになる。
//
// 13のパラメータ:
// 01 COLOR SCIENCE   → センサー由来の色の濃さ・癖（BODY担当、デジタル機のみ）
// 02 SHADOW TINT     → 暗部だけの選択的な色転び（BODY担当、デジタル機のみ）
// 03 TONE ROLLOFF    → 黒とハイライトの粘り（BODY=デジタル機の時はBODY担当／FILM選択時はFILM担当）
// 04 COLOR TEMP      → 色温度
// 05 SATURATION      → 彩度
// 06 DETAIL          → 解像感（BODY担当・全機種共通。センサー解像力またはレンジファインダーの合焦精度）
// 07 GRAIN           → 粒状感（BODY=デジタル機の時はセンサーノイズ／FILM選択時はフィルム粒子）
// 08 LIGHT LEAK      → 光線引き込み（FILM担当。原理的にフィルムカメラでしか起こらない）
// 09 MICRO CONTRAST  → レンズの立体感（LENS担当）
// 10 GLOW            → 開放時のグロウ（LENS担当）
// 11 VIGNETTE        → 光学的な周辺減光（LENS担当）
// 12 FIELD BLUR      → 像面の流れ（LENS担当）
// 13 SOFT FOCUS      → 開放時の全体的な柔らかさ（LENS担当）
// + MONOCHROME       → M Monochromボディでオン

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const outputCanvas = document.getElementById('outputCanvas');
const canvasBadge = document.getElementById('canvasBadge');
const ctx = outputCanvas.getContext('2d');

const colorScienceSlider = document.getElementById('colorScience');
const shadowTintSlider = document.getElementById('shadowTint');
const toneRolloffSlider = document.getElementById('toneRolloff');
const colorTempSlider = document.getElementById('colorTemp');
const saturationSlider = document.getElementById('saturation');
const detailSlider = document.getElementById('detail');
const grainSlider = document.getElementById('grain');
const lightLeakSlider = document.getElementById('lightLeak');
const microContrastSlider = document.getElementById('microContrast');
const glowSlider = document.getElementById('glow');
const vignetteSlider = document.getElementById('vignette');
const fieldBlurSlider = document.getElementById('fieldBlur');
const softFocusSlider = document.getElementById('softFocus');
const monochromeCheckbox = document.getElementById('monochrome');

const colorScienceVal = document.getElementById('colorScienceVal');
const shadowTintVal = document.getElementById('shadowTintVal');
const toneRolloffVal = document.getElementById('toneRolloffVal');
const colorTempVal = document.getElementById('colorTempVal');
const saturationVal = document.getElementById('saturationVal');
const detailVal = document.getElementById('detailVal');
const grainVal = document.getElementById('grainVal');
const lightLeakVal = document.getElementById('lightLeakVal');
const microContrastVal = document.getElementById('microContrastVal');
const glowVal = document.getElementById('glowVal');
const vignetteVal = document.getElementById('vignetteVal');
const fieldBlurVal = document.getElementById('fieldBlurVal');
const softFocusVal = document.getElementById('softFocusVal');

const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const bodyBtns = document.querySelectorAll('#bodyGrid .select-btn');
const lensBtns = document.querySelectorAll('#lensGrid .select-btn');
const filmBtns = document.querySelectorAll('#filmGrid .select-btn');

let originalImage = null;
let originalImageData = null;
let previewImageData = null;
let isDragging = false;

// ── ファイル読み込み
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
});
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); });

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      setupCanvas(img);
      applyOpticalLineage();
      dropZone.style.display = 'none';
      canvasBadge.style.display = 'block';
      outputCanvas.style.display = 'block';
      downloadBtn.disabled = false;
      resetBtn.disabled = false;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupCanvas(img) {
  const MAX_W = 900;
  let w = img.width, h = img.height;
  if (w > MAX_W) { h = h * (MAX_W / w); w = MAX_W; }
  outputCanvas.width = w;
  outputCanvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  originalImageData = ctx.getImageData(0, 0, w, h);

  const PREVIEW_MAX_W = 320;
  const pScale = Math.min(1, PREVIEW_MAX_W / w);
  const pw = Math.max(1, Math.round(w * pScale));
  const ph = Math.max(1, Math.round(h * pScale));
  const pCanvas = document.createElement('canvas');
  pCanvas.width = pw; pCanvas.height = ph;
  const pCtx = pCanvas.getContext('2d');
  pCtx.drawImage(img, 0, 0, pw, ph);
  previewImageData = pCtx.getImageData(0, 0, pw, ph);
}

let driftRAF = null;
function requestApply() {
  if (driftRAF) cancelAnimationFrame(driftRAF);
  driftRAF = requestAnimationFrame(() => {
    driftRAF = null;
    if (isDragging) {
      applyOpticalLineage(true);
    } else {
      canvasBadge.textContent = '処理中… PROCESSING';
      canvasBadge.style.display = 'block';
      setTimeout(() => {
        applyOpticalLineage(false);
        canvasBadge.textContent = 'PREVIEW';
      }, 10);
    }
  });
}

// ── 決定論的な擬似ランダム（GRAINに使用）
function pseudoRandom2D(x, y) {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// ── スライディングウィンドウのボックスブラー（半径によらず高速）
function boxBlur(data, w, h, radius) {
  if (radius < 1) return data.slice();
  const r = Math.max(1, Math.round(radius));
  const temp = new Float32Array(data.length);
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    let sr=0, sg=0, sb=0, sa=0;
    for (let k = -r; k <= r; k++) {
      const sx = k < 0 ? 0 : (k >= w ? w - 1 : k);
      const i = row + sx*4;
      sr += data[i]; sg += data[i+1]; sb += data[i+2]; sa += data[i+3];
    }
    const count = 2*r + 1;
    temp[row] = sr/count; temp[row+1] = sg/count; temp[row+2] = sb/count; temp[row+3] = sa/count;
    for (let x = 1; x < w; x++) {
      const addX = (x+r) >= w ? w-1 : x+r;
      const remX = (x-1-r) < 0 ? 0 : x-1-r;
      const ai = row + addX*4, ri = row + remX*4;
      sr += data[ai] - data[ri]; sg += data[ai+1] - data[ri+1]; sb += data[ai+2] - data[ri+2]; sa += data[ai+3] - data[ri+3];
      const oi = row + x*4;
      temp[oi] = sr/count; temp[oi+1] = sg/count; temp[oi+2] = sb/count; temp[oi+3] = sa/count;
    }
  }
  for (let x = 0; x < w; x++) {
    let sr=0, sg=0, sb=0, sa=0;
    for (let k = -r; k <= r; k++) {
      const sy = k < 0 ? 0 : (k >= h ? h - 1 : k);
      const i = (sy*w+x)*4;
      sr += temp[i]; sg += temp[i+1]; sb += temp[i+2]; sa += temp[i+3];
    }
    const count = 2*r + 1;
    let oi = x*4;
    out[oi] = sr/count; out[oi+1] = sg/count; out[oi+2] = sb/count; out[oi+3] = sa/count;
    for (let y = 1; y < h; y++) {
      const addY = (y+r) >= h ? h-1 : y+r;
      const remY = (y-1-r) < 0 ? 0 : y-1-r;
      const ai = (addY*w+x)*4, ri = (remY*w+x)*4;
      sr += temp[ai] - temp[ri]; sg += temp[ai+1] - temp[ri+1]; sb += temp[ai+2] - temp[ri+2]; sa += temp[ai+3] - temp[ri+3];
      oi = (y*w+x)*4;
      out[oi] = sr/count; out[oi+1] = sg/count; out[oi+2] = sb/count; out[oi+3] = sa/count;
    }
  }
  return out;
}

function applyOpticalLineage(preview) {
  if (!originalImageData) return;
  const src = (preview && previewImageData) ? previewImageData : originalImageData;
  const w = src.width, h = src.height;
  const radiusScale = preview ? (previewImageData.width / originalImageData.width) : 1;
  let out = new Uint8ClampedArray(src.data.length);

  const colorScience = parseInt(colorScienceSlider.value) / 100;
  const shadowTint = parseInt(shadowTintSlider.value) / 100;
  const toneRolloff = parseInt(toneRolloffSlider.value) / 100;
  const colorTemp = (parseInt(colorTempSlider.value) - 50) / 50;
  const saturation = (parseInt(saturationSlider.value) - 50) / 50;
  const detail = parseInt(detailSlider.value) / 100;
  const grain = parseInt(grainSlider.value) / 100;
  const lightLeak = parseInt(lightLeakSlider.value) / 100;
  const microContrast = parseInt(microContrastSlider.value) / 100;
  const glow = parseInt(glowSlider.value) / 100;
  const vignette = parseInt(vignetteSlider.value) / 100;
  const fieldBlur = parseInt(fieldBlurSlider.value) / 100;
  const softFocus = parseInt(softFocusSlider.value) / 100;
  const mono = monochromeCheckbox.checked;

  // ── STEP 1: COLOR SCIENCE + TONE ROLLOFF（1パスの per-pixel 処理）
  const blackLift = toneRolloff * 14;
  const kneeStart = 0.78 - toneRolloff * 0.12;

  for (let i = 0; i < src.data.length; i += 4) {
    let r = src.data[i], g = src.data[i+1], b = src.data[i+2];
    const avg = (r + g + b) / 3;

    r = avg + (r - avg) * (1 + 0.55 * colorScience);
    g = avg + (g - avg) * (1 + 0.2 * colorScience);
    b = avg + (b - avg) * (1 + 0.1 * colorScience);
    r = r * (1 + 0.04 * colorScience);

    r = blackLift + r * (1 - blackLift/255);
    g = blackLift + g * (1 - blackLift/255);
    b = blackLift + b * (1 - blackLift/255);
    const softKnee = (v) => {
      const t = v / 255;
      if (t <= kneeStart) return v;
      const excess = (t - kneeStart) / (1 - kneeStart);
      const compressed = kneeStart + (1 - kneeStart) * (1 - Math.pow(1 - excess, 1 + toneRolloff * 2.5));
      return compressed * 255;
    };
    r = softKnee(Math.max(0, Math.min(255, r)));
    g = softKnee(Math.max(0, Math.min(255, g)));
    b = softKnee(Math.max(0, Math.min(255, b)));

    out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = src.data[i+3];
  }

  // ── STEP 2: DETAIL（アンシャープマスク。センサー解像力／レンジファインダーの合焦精度）
  if (detail > 0.01) {
    const blurred = boxBlur(out, w, h, 1.4 * Math.max(radiusScale, 0.35));
    const next = new Uint8ClampedArray(out.length);
    const amount = detail * 1.1;
    for (let i = 0; i < out.length; i += 4) {
      next[i]   = out[i]   + (out[i]   - blurred[i])   * amount;
      next[i+1] = out[i+1] + (out[i+1] - blurred[i+1]) * amount;
      next[i+2] = out[i+2] + (out[i+2] - blurred[i+2]) * amount;
      next[i+3] = out[i+3];
    }
    out = next;
  }

  // ── STEP 3: MICRO CONTRAST（中間トーンの局所コントラスト。レンズの立体感）
  if (microContrast > 0.01) {
    const blurRadius = 10 * Math.max(radiusScale, 0.35);
    const blurred = boxBlur(out, w, h, blurRadius);
    const next = new Uint8ClampedArray(out.length);
    const amount = microContrast * 0.9;
    for (let i = 0; i < out.length; i += 4) {
      const lum = out[i]*0.299 + out[i+1]*0.587 + out[i+2]*0.114;
      const midWeight = 1 - Math.abs(lum - 128) / 128;
      const w2 = amount * Math.max(0, midWeight);
      next[i]   = out[i]   + (out[i]   - blurred[i])   * w2;
      next[i+1] = out[i+1] + (out[i+1] - blurred[i+1]) * w2;
      next[i+2] = out[i+2] + (out[i+2] - blurred[i+2]) * w2;
      next[i+3] = out[i+3];
    }
    out = next;
  }

  // ── STEP 4: GLOW（ハイライト抽出→ぼかし→スクリーン合成）
  if (glow > 0.01) {
    const threshold = 195;
    const highlights = new Uint8ClampedArray(out.length);
    for (let i = 0; i < out.length; i += 4) {
      const lum = out[i]*0.299 + out[i+1]*0.587 + out[i+2]*0.114;
      const amt = Math.max(0, lum - threshold) / (255 - threshold);
      highlights[i]   = out[i]   * amt;
      highlights[i+1] = out[i+1] * amt;
      highlights[i+2] = out[i+2] * amt;
      highlights[i+3] = 255;
    }
    const bloomRadius = 3 + glow * 14 * Math.max(radiusScale, 0.35);
    const bloomed = boxBlur(highlights, w, h, bloomRadius);
    const bloomStrength = glow * 0.6;
    for (let i = 0; i < out.length; i += 4) {
      out[i]   = 255 - (255 - out[i])   * (1 - (bloomed[i]/255)   * bloomStrength);
      out[i+1] = 255 - (255 - out[i+1]) * (1 - (bloomed[i+1]/255) * bloomStrength);
      out[i+2] = 255 - (255 - out[i+2]) * (1 - (bloomed[i+2]/255) * bloomStrength);
    }
  }

  // ── STEP 5: SOFT FOCUS（画面全体を軽くぼかしてブレンド）
  if (softFocus > 0.01) {
    const blurred = boxBlur(out, w, h, (2 + softFocus * 10) * Math.max(radiusScale, 0.35));
    const next = new Uint8ClampedArray(out.length);
    for (let i = 0; i < out.length; i += 4) {
      next[i]   = out[i]   * (1-softFocus*0.6) + blurred[i]   * (softFocus*0.6);
      next[i+1] = out[i+1] * (1-softFocus*0.6) + blurred[i+1] * (softFocus*0.6);
      next[i+2] = out[i+2] * (1-softFocus*0.6) + blurred[i+2] * (softFocus*0.6);
      next[i+3] = out[i+3];
    }
    out = next;
  }

  // ── STEP 6: COLOR TEMP + SATURATION
  if (Math.abs(colorTemp) > 0.01 || Math.abs(saturation) > 0.01) {
    for (let i = 0; i < out.length; i += 4) {
      let r = out[i], g = out[i+1], b = out[i+2];
      if (colorTemp > 0) { r += colorTemp*22; g += colorTemp*8; b -= colorTemp*14; }
      else { b += -colorTemp*22; r += colorTemp*14; }
      const avg = (r+g+b)/3;
      const satMul = 1 + saturation*0.5;
      r = avg + (r-avg)*satMul; g = avg + (g-avg)*satMul; b = avg + (b-avg)*satMul;
      out[i] = Math.max(0,Math.min(255,r)); out[i+1] = Math.max(0,Math.min(255,g)); out[i+2] = Math.max(0,Math.min(255,b));
    }
  }

  // ── STEP 6.5: SHADOW TINT（暗部だけ色を転がす。判定基準は輝度のみ）
  if (shadowTint > 0.01) {
    for (let i = 0; i < out.length; i += 4) {
      const r = out[i], g = out[i+1], b = out[i+2];
      const lum = (r+g+b)/3;
      const darkWeight = Math.max(0, 1 - lum/110);
      const amt = darkWeight*darkWeight * shadowTint;
      out[i]   = Math.max(0, Math.min(255, r + amt*18));
      out[i+1] = Math.max(0, Math.min(255, g - amt*14));
      out[i+2] = Math.max(0, Math.min(255, b + amt*18));
    }
  }

  // ── STEP 7: GRAIN（センサーノイズ／フィルム粒子。輝度ノイズ＋わずかな色ノイズ）
  if (grain > 0.01) {
    const seedOff = 4000;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y*w+x)*4;
        const n = (pseudoRandom2D(x+seedOff, y+seedOff) - 0.5) * 2;
        const lumNoise = n * grain * 24;
        const cn = (pseudoRandom2D(x-seedOff, y+seedOff) - 0.5) * 2;
        const chromaNoise = cn * grain * 8;
        out[i]   = out[i]   + lumNoise + chromaNoise;
        out[i+1] = out[i+1] + lumNoise;
        out[i+2] = out[i+2] + lumNoise - chromaNoise;
      }
    }
  }

  // ── STEP 8: VIGNETTE（光学的な周辺減光）
  if (vignette > 0.01) {
    const cx = w/2, cy = h/2, maxDist = Math.sqrt(cx*cx+cy*cy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy)) / maxDist;
        const darken = 1 - Math.max(0, d - 0.35) * vignette * 1.3;
        const i = (y*w+x)*4;
        out[i] *= darken; out[i+1] *= darken; out[i+2] *= darken;
      }
    }
  }

  // ── STEP 8.5: FIELD BLUR（像面の流れ）
  if (fieldBlur > 0.01) {
    const blurred = boxBlur(out, w, h, (2 + fieldBlur * 10) * Math.max(radiusScale, 0.35));
    const cx = w/2, cy = h/2, maxDist = Math.sqrt(cx*cx+cy*cy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy)) / maxDist;
        const blend = Math.max(0, Math.min(1, (d - 0.25) * fieldBlur * 1.3));
        const i = (y*w+x)*4;
        out[i]   = out[i]   * (1-blend) + blurred[i]   * blend;
        out[i+1] = out[i+1] * (1-blend) + blurred[i+1] * blend;
        out[i+2] = out[i+2] * (1-blend) + blurred[i+2] * blend;
      }
    }
  }

  // ── STEP 9: LIGHT LEAK（角からの暖色フレア。原理的にフィルムカメラでしか起こらない）
  if (lightLeak > 0.01) {
    const cx = w * 0.85, cy = h * 0.1, maxDist = Math.sqrt(w*w+h*h) * 0.6;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy)) / maxDist;
        const amt = Math.max(0, 1 - d) * lightLeak * 0.8;
        const i = (y*w+x)*4;
        out[i]   = out[i]   + amt*180;
        out[i+1] = out[i+1] + amt*70;
        out[i+2] = out[i+2] - amt*30;
      }
    }
  }

  if (mono) {
    for (let i = 0; i < out.length; i += 4) {
      const gray = out[i]*0.299 + out[i+1]*0.587 + out[i+2]*0.114;
      out[i] = out[i+1] = out[i+2] = gray;
    }
  }

  const resultData = new ImageData(out, w, h);

  if (preview && previewImageData) {
    let tempCanvas = applyOpticalLineage._tempCanvas;
    if (!tempCanvas) { tempCanvas = document.createElement('canvas'); applyOpticalLineage._tempCanvas = tempCanvas; }
    tempCanvas.width = w; tempCanvas.height = h;
    tempCanvas.getContext('2d').putImageData(resultData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tempCanvas, 0, 0, w, h, 0, 0, outputCanvas.width, outputCanvas.height);
  } else {
    ctx.putImageData(resultData, 0, 0);
  }
}

// ── BODY・LENS・FILMのプリセット定義
const BODIES = {
  none:  { type:'digital', colorScience:0,  shadowTint:0,  saturation:50, colorTemp:50, detail:0,  toneRolloff:0, grain:0, mono:false },
  // Leica M3（1954）：ファインダー倍率0.91倍・基線長68.5mmで歴代最高のピント精度。完全機械式で露出計もセンサーもない
  m3:    { type:'film',    colorScience:0,  shadowTint:0,  saturation:50, colorTemp:50, detail:95, mono:false },
  // Leica M6（1984）：M3ほどの倍率はないがTTL露出計を内蔵した「精密機械の完成形」
  m6:    { type:'film',    colorScience:0,  shadowTint:0,  saturation:50, colorTemp:50, detail:85, mono:false },
  // Leica M8：Kodak CCD、ローパスレス、IR感度の高さから黒がマゼンタに転ぶ。撮って出しはおとなしい
  m8:    { type:'digital', colorScience:28, shadowTint:22, saturation:42, colorTemp:46, detail:70, toneRolloff:42, grain:4, mono:false },
  // Leica M9：フルサイズKodak CCD。M8よりIRクセは薄いが「濃い色+深い黒+滑らかな階調」の濃密さ
  m9:    { type:'digital', colorScience:42, shadowTint:0,  saturation:45, colorTemp:53, detail:55, toneRolloff:20, grain:5, mono:false },
  // Leica M10：現代的なフルサイズCMOS。CCD特有の癖から脱却したクリーンな現代化
  m10:   { type:'digital', colorScience:15, shadowTint:0,  saturation:50, colorTemp:50, detail:60, toneRolloff:12, grain:2, mono:false },
  // Leica M Monochrom：専用白黒センサー。カラーフィルターアレイなしで解像力が非常に高い
  mmono: { type:'digital', colorScience:0,  shadowTint:0,  saturation:50, colorTemp:50, detail:75, toneRolloff:15, grain:6, mono:true }
};

const LENSES = {
  none: { microContrast:0, glow:0, vignette:0, fieldBlur:0, softFocus:0 },
  // Leica Summilux-M 50mm f/1.4 pre-ASPH：開放時のグロウと柔らかさが主役
  summiluxsoft: { microContrast:18, glow:22, vignette:12, fieldBlur:15, softFocus:25 },
  // Leica Summicron-M 50mm f/2：シャープネス・マイクロコントラストは残しつつ、背景とハイライトは滑らか
  summicron: { microContrast:35, glow:8, vignette:8, fieldBlur:5, softFocus:8 }
};

const FILMS = {
  none: { toneRolloff:0, grain:0, lightLeak:0 },
  // Kodak Tri-X 400：豊かな黒、コントラストの強い中間調、独特の有機的な粒状感
  triX400: { toneRolloff:15, grain:55, lightLeak:0 },
  // Ilford HP5 Plus：Tri-Xより柔らかく控えめ
  hp5Plus: { toneRolloff:30, grain:35, lightLeak:0 },
  // Ilford Delta 100：極めて微粒子・高解像でクリーン
  delta100: { toneRolloff:10, grain:12, lightLeak:0 }
};

function setSlider(slider, valEl, value, suffix) {
  slider.value = value;
  valEl.textContent = (suffix !== undefined) ? suffix : value + '%';
}

function applyBody(key) {
  const b = BODIES[key];
  if (!b) return;

  setSlider(colorScienceSlider, colorScienceVal, b.colorScience);
  setSlider(shadowTintSlider, shadowTintVal, b.shadowTint);
  setSlider(saturationSlider, saturationVal, b.saturation, b.saturation===50?'中間':(b.saturation<50?`-${50-b.saturation}`:`+${b.saturation-50}`));
  setSlider(colorTempSlider, colorTempVal, b.colorTemp, b.colorTemp===50?'中間':(b.colorTemp<50?`-${50-b.colorTemp}`:`+${b.colorTemp-50}`));
  setSlider(detailSlider, detailVal, b.detail);
  monochromeCheckbox.checked = b.mono;

  if (b.type === 'digital') {
    setSlider(toneRolloffSlider, toneRolloffVal, b.toneRolloff);
    setSlider(grainSlider, grainVal, b.grain);
    setSlider(lightLeakSlider, lightLeakVal, 0); // デジタル機にライトリークは物理的にありえない
  }
  // フィルム機の場合、TONE ROLLOFF/GRAIN/LIGHT LEAKはFILM側の値をそのまま残す（何もしない）

  requestApply();
}

function applyLens(key) {
  const l = LENSES[key];
  if (!l) return;

  setSlider(microContrastSlider, microContrastVal, l.microContrast);
  setSlider(glowSlider, glowVal, l.glow);
  setSlider(vignetteSlider, vignetteVal, l.vignette);
  setSlider(fieldBlurSlider, fieldBlurVal, l.fieldBlur);
  setSlider(softFocusSlider, softFocusVal, l.softFocus);

  requestApply();
}

function applyFilm(key) {
  const f = FILMS[key];
  if (!f) return;

  setSlider(toneRolloffSlider, toneRolloffVal, f.toneRolloff);
  setSlider(grainSlider, grainVal, f.grain);
  setSlider(lightLeakSlider, lightLeakVal, f.lightLeak);

  requestApply();
}

bodyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    bodyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyBody(btn.dataset.body);
  });
});

lensBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    lensBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyLens(btn.dataset.lens);
  });
});

filmBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filmBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilm(btn.dataset.film);
  });
});

// ── UIイベント：スライダー
const allSliders = [colorScienceSlider, shadowTintSlider, toneRolloffSlider, colorTempSlider, saturationSlider, detailSlider, grainSlider, lightLeakSlider, microContrastSlider, glowSlider, vignetteSlider, fieldBlurSlider, softFocusSlider];
allSliders.forEach(slider => {
  slider.addEventListener('pointerdown', () => { isDragging = true; });
  slider.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
});
function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  requestApply();
}
allSliders.forEach(slider => {
  slider.addEventListener('pointerup', endDrag);
  slider.addEventListener('touchend', endDrag);
  slider.addEventListener('change', endDrag);
});
window.addEventListener('pointerup', () => { if (isDragging) endDrag(); });
window.addEventListener('touchend', () => { if (isDragging) endDrag(); });

colorScienceSlider.addEventListener('input', () => { colorScienceVal.textContent = colorScienceSlider.value + '%'; requestApply(); });
shadowTintSlider.addEventListener('input', () => { shadowTintVal.textContent = shadowTintSlider.value + '%'; requestApply(); });
toneRolloffSlider.addEventListener('input', () => { toneRolloffVal.textContent = toneRolloffSlider.value + '%'; requestApply(); });
colorTempSlider.addEventListener('input', () => {
  const v = parseInt(colorTempSlider.value);
  colorTempVal.textContent = v===50?'中間':(v<50?`-${50-v}`:`+${v-50}`);
  requestApply();
});
saturationSlider.addEventListener('input', () => {
  const v = parseInt(saturationSlider.value);
  saturationVal.textContent = v===50?'中間':(v<50?`-${50-v}`:`+${v-50}`);
  requestApply();
});
detailSlider.addEventListener('input', () => { detailVal.textContent = detailSlider.value + '%'; requestApply(); });
grainSlider.addEventListener('input', () => { grainVal.textContent = grainSlider.value + '%'; requestApply(); });
lightLeakSlider.addEventListener('input', () => { lightLeakVal.textContent = lightLeakSlider.value + '%'; requestApply(); });
microContrastSlider.addEventListener('input', () => { microContrastVal.textContent = microContrastSlider.value + '%'; requestApply(); });
glowSlider.addEventListener('input', () => { glowVal.textContent = glowSlider.value + '%'; requestApply(); });
vignetteSlider.addEventListener('input', () => { vignetteVal.textContent = vignetteSlider.value + '%'; requestApply(); });
fieldBlurSlider.addEventListener('input', () => { fieldBlurVal.textContent = fieldBlurSlider.value + '%'; requestApply(); });
softFocusSlider.addEventListener('input', () => { softFocusVal.textContent = softFocusSlider.value + '%'; requestApply(); });
monochromeCheckbox.addEventListener('change', requestApply);

// ── 保存・リセット
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'optical-lineage.png';
  link.href = outputCanvas.toDataURL('image/png');
  link.click();
});

resetBtn.addEventListener('click', () => {
  bodyBtns.forEach(b => b.classList.toggle('active', b.dataset.body === 'none'));
  lensBtns.forEach(b => b.classList.toggle('active', b.dataset.lens === 'none'));
  filmBtns.forEach(b => b.classList.toggle('active', b.dataset.film === 'none'));
  applyBody('none');
  applyLens('none');
  applyFilm('none');
});
