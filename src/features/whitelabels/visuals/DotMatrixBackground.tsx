import { useEffect, useRef, type CSSProperties } from 'react'
import { Renderer, Camera, Mesh, Plane, Program, RenderTarget, Texture } from 'ogl'
import { DEFAULT_WHITELABEL_ACCENT, accentRgb } from './visualAccent'
import styles from './DotMatrixBackground.module.css'

// Adapted from the supplied OriginKit Dot Matrix. The two-pass simplex-noise
// and circular-dot shaders are retained verbatim (including its optional atlas branch).
const perlinVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`;

const perlinFragmentShader = `#version 300 es
precision mediump float;
uniform float uFrequency;
uniform float uTime;
uniform float uSpeed;
uniform float uValue;
uniform vec2 uResolution;
in vec2 vUv;
out vec4 fragColor;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  uv = (uv - 0.5) * vec2(aspect, 1.0) + 0.5;
  float hue = abs(snoise(vec3(uv * uFrequency, uTime * uSpeed)));
  vec3 rainbowColor = hsv2rgb(vec3(hue, 1.0, uValue));
  fragColor = vec4(rainbowColor, 1.0);
}`;

const dotVertexShader = `#version 300 es
in vec2 uv;
in vec2 position;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0., 1.);
}`;

const dotFragmentShader = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform sampler2D uTexture;
uniform int uPaletteCount;
uniform vec3 uPalette[10];
uniform float uPaletteA[10];
uniform float uCellSize;
uniform float uGamma;
uniform float uPaletteBias;
uniform int uUseGlyphAtlas;
uniform sampler2D uGlyphAtlas;
uniform ivec2 uGlyphGrid;
uniform int uCharCount;
out vec4 fragColor;

void main() {
  vec2 pix = gl_FragCoord.xy;
  float cell = max(uCellSize, 1.0);

  vec2 cellIdx = floor(pix / cell);
  vec2 cellCenter = (cellIdx + 0.5) * cell;
  vec3 col = texture(uTexture, cellCenter / uResolution.xy).rgb;
  float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
  gray = pow(clamp(gray, 0.0001, 1.0), uGamma);

  float mark = 0.0;
  if (uUseGlyphAtlas == 1 && uCharCount > 0 && uGlyphGrid.x > 0 && uGlyphGrid.y > 0) {
    float g = clamp(gray + uPaletteBias, 0.0, 1.0);
    int idx = int(clamp(floor(g * float(uCharCount - 1) + 0.5), 0.0, float(uCharCount - 1)));
    vec2 cellUV = fract(pix / cell);
    vec2 grid = vec2(uGlyphGrid);
    vec2 tileSize = 1.0 / grid;
    float colIdx = float(idx % uGlyphGrid.x);
    float rowIdx = floor(float(idx) / float(uGlyphGrid.x));
    vec2 atlasUV = (vec2(colIdx, rowIdx) + cellUV) * tileSize;
    vec3 glyphSample = texture(uGlyphAtlas, atlasUV).rgb;
    mark = dot(glyphSample, vec3(0.299, 0.587, 0.114));
  } else {
    vec2 cellUV = fract(pix / cell) - 0.5;
    float dist = length(cellUV);
    float radius = clamp(gray + uPaletteBias, 0.0, 1.0) * 0.5;
    float aa = fwidth(dist) + 1e-4;
    mark = 1.0 - smoothstep(radius - aa, radius + aa, dist);
  }

  float g2 = clamp(gray + uPaletteBias, 0.0, 1.0);
  int cnt = max(uPaletteCount, 1);
  vec3 dotCol;
  float dotOpacity;
  if (cnt <= 1) {
    dotCol = uPalette[0];
    dotOpacity = uPaletteA[0];
  } else {
    float scaled = g2 * float(cnt - 1);
    int i0 = int(floor(scaled));
    i0 = clamp(i0, 0, cnt - 2);
    float f = scaled - float(i0);
    dotCol = mix(uPalette[i0], uPalette[i0 + 1], f);
    dotOpacity = mix(uPaletteA[i0], uPaletteA[i0 + 1], f);
  }
  fragColor = vec4(dotCol, mark * dotOpacity);
}`;


type DotMatrixBackgroundProps = { accentColor?: string }

/** Decorative, content-scoped OGL layer; never owns layout or pointer input. */
export function DotMatrixBackground({ accentColor = DEFAULT_WHITELABEL_ACCENT }: DotMatrixBackgroundProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const canvas = document.createElement('canvas')
    // Probe before OGL construction: avoid its null-context error on unsupported devices.
    if (!canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false })) return

    let renderer: Renderer | undefined
    let target: RenderTarget | undefined
    let noiseProgram: Program | undefined
    let dotProgram: Program | undefined
    let geometry: Plane | undefined
    let dummy: Texture | undefined
    let frame = 0
    let resizeFrame = 0
    let disposed = false
    let visible = true
    let lastFrame = 0
    let elapsed = 3.5
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobile = window.matchMedia('(max-width: 767px)')

    const release = () => {
      if (!renderer) return
      const gl = renderer.gl
      geometry?.remove()
      noiseProgram?.remove()
      dotProgram?.remove()
      if (dummy) gl.deleteTexture(dummy.texture)
      if (target) {
        gl.deleteTexture(target.texture.texture)
        gl.deleteFramebuffer(target.buffer)
      }
      canvas.remove()
      delete host.dataset.renderer
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      renderer = undefined
    }

    try {
      renderer = new Renderer({ canvas, dpr: 1, alpha: true, premultipliedAlpha: false, depth: false, webgl: 2 })
      const gl = renderer.gl
      const camera = new Camera(gl, { near: 0.1, far: 100 })
      camera.position.set(0, 0, 3)
      geometry = new Plane(gl, { width: 2, height: 2 })
      noiseProgram = new Program(gl, {
        vertex: perlinVertexShader, fragment: perlinFragmentShader,
        depthTest: false, depthWrite: false,
        uniforms: {
          uTime: { value: elapsed }, uFrequency: { value: 1.8833 },
          uSpeed: { value: 0.2 }, uValue: { value: 1 },
          uResolution: { value: [1, 1] },
        },
      })
      target = new RenderTarget(gl, { depth: false })
      dummy = new Texture(gl, { image: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1, generateMipmaps: false })
      dotProgram = new Program(gl, {
        vertex: dotVertexShader, fragment: dotFragmentShader,
        transparent: true, depthTest: false, depthWrite: false,
        uniforms: {
          uResolution: { value: [1, 1] }, uTexture: { value: target.texture },
          uPaletteCount: { value: 4 },
          uPalette: { value: [[0.1, 0.13, 0.25], [0.33, 0.34, 0.79], accentRgb(accentColor), [0.68, 0.71, 0.93]] },
          uPaletteA: { value: [0.35, 0.58, 0.8, 0.52] },
          uCellSize: { value: 14.18 }, uGamma: { value: 1.6842 }, uPaletteBias: { value: 0.15 },
          uUseGlyphAtlas: { value: 0 }, uGlyphAtlas: { value: dummy },
          uGlyphGrid: { value: [0, 0] }, uCharCount: { value: 0 },
        },
      })
      const noise = new Mesh(gl, { geometry, program: noiseProgram })
      const dots = new Mesh(gl, { geometry, program: dotProgram })
      const draw = () => {
        if (disposed || gl.isContextLost()) return
        noiseProgram!.uniforms.uTime.value = elapsed
        renderer!.render({ scene: noise, camera, target: target! })
        renderer!.render({ scene: dots, camera })
      }
      const resize = () => {
        resizeFrame = 0
        if (disposed) return
        const width = Math.max(1, host.clientWidth)
        const height = Math.max(1, host.clientHeight)
        // Uniform scale keeps dots circular; cap raster work rather than changing CSS size.
        renderer!.dpr = Math.min(window.devicePixelRatio || 1, mobile.matches ? 1 : 1.25, Math.sqrt(1_800_000 / (width * height)), 4096 / Math.max(width, height))
        renderer!.setSize(width, height)
        target!.setSize(gl.canvas.width, gl.canvas.height)
        camera.perspective({ aspect: width / height })
        const resolution = [gl.canvas.width, gl.canvas.height]
        noiseProgram!.uniforms.uResolution.value = resolution
        dotProgram!.uniforms.uResolution.value = resolution
        dotProgram!.uniforms.uCellSize.value = 14.18 * renderer!.dpr
        draw()
      }
      const scheduleResize = () => {
        if (!resizeFrame) resizeFrame = requestAnimationFrame(resize)
      }
      const canPlay = () => !disposed && visible && !document.hidden && !motion.matches && !gl.isContextLost()
      const tick = (time: number) => {
        frame = 0
        if (!canPlay()) return
        const delta = time - lastFrame
        if (delta >= 1000 / (mobile.matches ? 18 : 30)) {
          elapsed += Math.min(delta, 100) / 1000
          lastFrame = time
          draw()
        }
        frame = requestAnimationFrame(tick)
      }
      const sync = () => {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        lastFrame = performance.now()
        if (motion.matches) { elapsed = 3.5; draw() }
        if (canPlay()) frame = requestAnimationFrame(tick)
      }
      const onContextLost = (event: Event) => {
        event.preventDefault()
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        delete host.dataset.renderer
      }
      const observer = new ResizeObserver(scheduleResize)
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
      observer.observe(host)
      intersection.observe(host)
      document.addEventListener('visibilitychange', sync)
      motion.addEventListener('change', sync)
      mobile.addEventListener('change', scheduleResize)
      canvas.addEventListener('webglcontextlost', onContextLost)
      host.appendChild(canvas)
      host.dataset.renderer = 'webgl'
      resize()
      sync()
      return () => {
        disposed = true
        cancelAnimationFrame(frame)
        cancelAnimationFrame(resizeFrame)
        observer.disconnect()
        intersection.disconnect()
        document.removeEventListener('visibilitychange', sync)
        motion.removeEventListener('change', sync)
        mobile.removeEventListener('change', scheduleResize)
        canvas.removeEventListener('webglcontextlost', onContextLost)
        release()
      }
    } catch {
      disposed = true
      cancelAnimationFrame(frame)
      cancelAnimationFrame(resizeFrame)
      release()
    }
  }, [accentColor])

  return <div ref={hostRef} className={styles.background} style={{ '--wl-accent': accentColor } as CSSProperties} aria-hidden="true" />
}
