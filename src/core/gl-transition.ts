// WebGL shader transitions between two wallpapers. Uses the gl-transitions
// convention: each entry defines `vec4 transition(vec2 uv)` with helpers
// getFromColor / getToColor + a `progress` uniform. WebGL (not WebGPU) for
// broad WebView support. Any failure falls back to an instant swap.

/* eslint-disable @typescript-eslint/no-explicit-any */

export const GL_TRANSITIONS: Record<string, string> = {
  // Eke Péter — crosswarp
  crosswarp: `
    vec4 transition(vec2 p) {
      float x = progress;
      x = smoothstep(0.0, 1.0, x*2.0 + p.x - 1.0);
      return mix(getFromColor((p-0.5)*(1.0-x)+0.5), getToColor((p-0.5)*x+0.5), x);
    }`,
  // paniq — morph
  morph: `
    vec4 transition(vec2 p) {
      float strength = 0.1;
      vec4 ca = getFromColor(p);
      vec4 cb = getToColor(p);
      vec2 oa = ((ca.rg + ca.b) * 0.5) * 2.0 - 1.0;
      vec2 ob = ((cb.rg + cb.b) * 0.5) * 2.0 - 1.0;
      vec2 oc = mix(oa, ob, 0.5) * strength;
      float w0 = progress;
      float w1 = 1.0 - w0;
      return mix(getFromColor(p + oc*w0), getToColor(p - oc*w1), progress);
    }`,
  // gre — pixelize
  pixelize: `
    vec4 transition(vec2 uv) {
      vec2 squaresMin = vec2(20.0);
      float steps = 50.0;
      float d = min(progress, 1.0 - progress);
      float dist = steps > 0.0 ? ceil(d * steps) / steps : d;
      vec2 squareSize = 2.0 * dist / squaresMin;
      vec2 p = dist > 0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv;
      return mix(getFromColor(p), getToColor(p), progress);
    }`,
  // mikolalysenko — dreamy
  dreamy: `
    vec2 dreamOffset(float pr, float x, float theta) {
      float shifty = 0.03 * pr * cos(10.0 * (pr + x));
      return vec2(0.0, shifty);
    }
    vec4 transition(vec2 p) {
      return mix(getFromColor(p + dreamOffset(progress, p.x, 0.0)),
                 getToColor(p + dreamOffset(1.0 - progress, p.x, 3.14159)), progress);
    }`,
  // gre — windowslice
  windowslice: `
    vec4 transition(vec2 p) {
      float count = 10.0;
      float smoothness = 0.5;
      float pr = smoothstep(-smoothness, 0.0, p.x - progress*(1.0+smoothness));
      float s = step(pr, fract(count * p.x));
      return mix(getFromColor(p), getToColor(p), s);
    }`,
  // pschroen — directionalwarp
  directionalwarp: `
    vec4 transition(vec2 uv) {
      vec2 dir = vec2(-1.0, 1.0);
      float smoothness = 0.5;
      vec2 v = normalize(dir);
      v /= abs(v.x) + abs(v.y);
      float d = v.x * 0.5 + v.y * 0.5;
      float m = 1.0 - smoothstep(-smoothness, 0.0, v.x*uv.x + v.y*uv.y - (d - 0.5 + progress*(1.0+smoothness)));
      return mix(getFromColor((uv-0.5)*(1.0-m)+0.5), getToColor((uv-0.5)*m+0.5), m);
    }`,
  // gre — ripple
  ripple: `
    vec4 transition(vec2 uv) {
      vec2 dir = uv - vec2(0.5);
      float dist = length(dir);
      vec2 offset = dir * (sin(progress*dist*80.0 - progress*40.0) + 0.5) / 30.0;
      return mix(getFromColor(uv + offset), getToColor(uv), smoothstep(0.2, 1.0, progress));
    }`,
  // Sergey Kosarevsky — swirl
  swirl: `
    vec4 transition(vec2 uv) {
      float radius = 1.0;
      vec2 p = uv - 0.5;
      float d = length(p * vec2(ratio, 1.0));
      if (d < radius) {
        float t = (radius - d) / radius;
        float a = (progress <= 0.5 ? progress : 1.0 - progress) * t * t * 8.0 * 3.14159;
        float s = sin(a); float c = cos(a);
        p = vec2(p.x*c - p.y*s, p.x*s + p.y*c);
      }
      p += 0.5;
      return mix(getFromColor(p), getToColor(p), progress);
    }`,
  // pthrasher — crosshatch
  crosshatch: `
    vec4 transition(vec2 p) {
      float dist = distance(vec2(0.5), p) / 3.0;
      float r = progress - min(random(vec2(p.y, 0.0)), random(vec2(0.0, p.x)));
      return mix(getFromColor(p), getToColor(p), mix(0.0, mix(step(dist, r), 1.0, smoothstep(0.7, 1.0, progress)), smoothstep(0.0, 0.1, progress)));
    }`,
  // gre — wind
  wind: `
    vec4 transition(vec2 uv) {
      float size = 0.2;
      float r = random(vec2(0.0, uv.y));
      float m = smoothstep(0.0, -size, uv.x*(1.0-size) + size*r - progress*(1.0+size));
      return mix(getFromColor(uv), getToColor(uv), m);
    }`,
  // iris reveal from centre
  iris: `
    vec4 transition(vec2 uv) {
      float smoothness = 0.25;
      float dist = distance(uv, vec2(0.5)) * 1.41421356;
      float m = smoothstep(progress - smoothness, progress + smoothness, dist);
      return mix(getToColor(uv), getFromColor(uv), m);
    }`,
  // polka dots curtain
  polka: `
    vec4 transition(vec2 uv) {
      float dots = 20.0;
      float d = max(distance(uv, vec2(0.0)), 0.001);
      bool next = distance(fract(uv * dots), vec2(0.5)) < (progress / d);
      return next ? getToColor(uv) : getFromColor(uv);
    }`,
};

export function isGlTransition(name: string): boolean {
  return name in GL_TRANSITIONS;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

function fragmentFor(body: string): string {
  return `
precision highp float;
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float progress;
uniform float ratio;
uniform vec2 uFromScale;
uniform vec2 uToScale;
varying vec2 vUv;
vec4 getFromColor(vec2 uv) { return texture2D(uFrom, 0.5 + (uv - 0.5) * uFromScale); }
vec4 getToColor(vec2 uv) { return texture2D(uTo, 0.5 + (uv - 0.5) * uToScale); }
float random(vec2 co) { return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453); }
${body}
void main() { gl_FragColor = transition(vUv); }`;
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

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[gl-transition] shader error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function coverScale(imgW: number, imgH: number, canvasW: number, canvasH: number): [number, number] {
  const ia = imgW / imgH;
  const ca = canvasW / canvasH;
  return ia > ca ? [ca / ia, 1] : [1, ia / ca];
}

/**
 * Animate a shader transition from fromUrl → toUrl over `ms`. Calls `onDone`
 * when finished (or immediately on any failure) — the caller sets the final
 * static wallpaper there.
 */
export async function runGlTransition(
  fromUrl: string,
  toUrl: string,
  name: string,
  ms: number,
  onDone: () => void,
): Promise<void> {
  const body = GL_TRANSITIONS[name];
  if (!body) return onDone();

  let canvas: HTMLCanvasElement | null = null;
  try {
    const [imgA, imgB] = await Promise.all([loadImage(fromUrl), loadImage(toUrl)]);

    canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;z-index:-1;pointer-events:none;width:100%;height:100%';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(window.innerWidth * dpr));
    const ch = Math.max(1, Math.round(window.innerHeight * dpr));
    canvas.width = cw;
    canvas.height = ch;
    document.body.appendChild(canvas);

    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) throw new Error('no webgl');

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentFor(body));
    if (!vs || !fs) throw new Error('shader compile');
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const makeTex = (img: HTMLImageElement, unit: number) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      return tex;
    };
    makeTex(imgA, 0);
    makeTex(imgB, 1);
    gl.uniform1i(gl.getUniformLocation(prog, 'uFrom'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'uTo'), 1);
    gl.uniform2fv(gl.getUniformLocation(prog, 'uFromScale'), coverScale(imgA.width, imgA.height, cw, ch));
    gl.uniform2fv(gl.getUniformLocation(prog, 'uToScale'), coverScale(imgB.width, imgB.height, cw, ch));
    gl.uniform1f(gl.getUniformLocation(prog, 'ratio'), cw / ch);
    const uProgress = gl.getUniformLocation(prog, 'progress');

    gl.viewport(0, 0, cw, ch);
    const start = performance.now();
    const theCanvas = canvas;
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        gl.uniform1f(uProgress, t);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

    // Swap the static wallpaper first, then drop the canvas next frame (no flash).
    onDone();
    requestAnimationFrame(() => theCanvas.remove());
    return;
  } catch (e) {
    console.warn('[gl-transition] fallback:', e);
    canvas?.remove();
    onDone();
  }
}
