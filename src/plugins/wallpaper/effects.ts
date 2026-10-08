// Photo effects applied to a wallpaper via a 2D canvas (SKWD "Effects").
// Produces a new image Blob so the result can be saved as its own wallpaper.

export type EffectType = 'none' | 'grayscale' | 'sepia' | 'invert' | 'posterize' | 'recolor';

export const EFFECTS: { value: EffectType; label: string }[] = [
  { value: 'none', label: 'Original' },
  { value: 'recolor', label: 'Umfärben' },
  { value: 'grayscale', label: 'Graustufen' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'posterize', label: 'Poster' },
  { value: 'invert', label: 'Invertiert' },
];

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Apply an effect to a source image URL, returning a new JPEG Blob. */
export async function applyEffect(
  srcUrl: string,
  effect: EffectType,
  paletteHex: string[] = [],
): Promise<Blob> {
  const img = await loadImage(srcUrl);
  const maxDim = 3840;
  const s = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d');
  ctx.drawImage(img, 0, 0, w, h);

  if (effect !== 'none') {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const pal = paletteHex.map(hexToRgb);
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      if (effect === 'grayscale') {
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = y;
      } else if (effect === 'sepia') {
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = Math.min(255, tr);
        g = Math.min(255, tg);
        b = Math.min(255, tb);
      } else if (effect === 'invert') {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      } else if (effect === 'posterize') {
        const n = 4;
        r = Math.round((r / 255) * n) * (255 / n);
        g = Math.round((g / 255) * n) * (255 / n);
        b = Math.round((b / 255) * n) * (255 / n);
      } else if (effect === 'recolor' && pal.length) {
        let best = pal[0];
        let bd = Infinity;
        for (const c of pal) {
          const dr = r - c[0];
          const dg = g - c[1];
          const db = b - c[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bd) {
            bd = dist;
            best = c;
          }
        }
        r = best[0];
        g = best[1];
        b = best[2];
      }
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.92),
  );
}
