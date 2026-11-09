import { useEffect, useRef, useState } from 'react'
import styles from './LoginVisualPanel.module.css'

// The supplied OriginKit Vector Wordmark is the rendering baseline here.
// Its shader, atlas channels, grid snap, drift, and sweep are retained; only
// the stage/font measurements and palette are fitted to this login header.
const TEXT = 'SUPER ADMIN'
const MAX_DPR = 2
const MAX_TEX = 4096
const HANDLES = 3
const CELL_ASPECT = 0.6
const DRIFT_X = 0.08
const DRIFT_Y = 0.04
const DRIFT_RATE = 1.3
const DRIFT_RATE_Y = 1.3 * 1.3
const SWEEP_RATE = 0.5
const SWEEP_BAND = 0.28
const RESNAP = 0.2
const DAMP_REF = 20
const SPEED_REF = 50
const DOT_DIAMETER = 4 / 440
const DOT_PITCH = 12 / 440

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const fract = (x: number) => x - Math.floor(x)

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`

// Kept from the supplied source: RG soft/sharp glyph mask, pointer reach,
// vertical text/shade blend, and dashed triangle plus node-box geometry.
const FRAG = `
precision highp float;

uniform sampler2D uMap;
uniform vec2 uRes;
uniform vec2 uAtlas;
uniform vec2 uPtr;
uniform float uReach;
uniform vec3 uText;
uniform vec3 uShade;
uniform vec4 uAccent;
uniform vec2 uV0;
uniform vec2 uV1;
uniform vec2 uV2;
uniform float uHalf;

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 blurRG(vec2 uv, float e) {
    vec4 sum = vec4(0.0);
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float th = radians(fi / 6.0 * 360.0);
        vec2 dir = vec2(cos(th), sin(th));
        vec2 off = dir * (hash(vec2(fi, uv.x + uv.y)) + e);
        sum += texture2D(uMap, uv + off * e);
    }
    return (sum / 6.0).rg;
}

vec2 segment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    vec2 ap = p - a;
    float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    return vec2(length(ap - ab * t), t);
}

float stroke(float d, float lw, float px) {
    return 1.0 - smoothstep(lw, lw + px, d);
}

float dashedLine(vec2 p, vec2 a, vec2 b, float lw, float px) {
    vec2 s = segment(p, a, b);
    float dash = step(0.5, fract(s.y * length(b - a) * 100.0));
    return stroke(s.x, lw, px) * dash;
}

float boxEdge(vec2 p, vec2 c, float h, float lw, float px) {
    vec2 q = abs(p - c) - vec2(h);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    return stroke(abs(d), lw, px);
}

void main() {
    float aspect = uRes.x / uRes.y;

    vec2 E = (vUv * uRes - (uRes - uAtlas) * 0.5) / uAtlas;
    float inside = step(0.0, E.x) * step(E.x, 1.0) * step(0.0, E.y) * step(E.y, 1.0);
    vec2 safeUv = clamp(E, 0.0, 1.0);

    float b = clamp(1.0 - E.y * 3.5, 0.0, 1.0) * 0.008;
    vec2 soft = blurRG(safeUv, b);
    vec2 sharp = blurRG(safeUv, b * 0.1);

    float d = length((vUv - uPtr) / vec2(1.0, aspect));
    float k = 1.0 - pow(smoothstep(0.0, max(uReach, 1e-4), d), 3.0);

    float mask = mix(soft.r, sharp.g, k) * inside;
    vec3 fill = mix(uShade, uText, smoothstep(0.0, 1.0, E.y));

    vec2 P = vec2(vUv.x * aspect, vUv.y);
    float px = 1.0 / uRes.y;
    float lw = px * 0.2;
    float lines = max(
        max(dashedLine(P, uV0, uV1, lw, px), dashedLine(P, uV1, uV2, lw, px)),
        dashedLine(P, uV2, uV0, lw, px)
    );
    float boxes = max(
        max(boxEdge(P, uV0, uHalf, lw, px), boxEdge(P, uV1, uHalf, lw, px)),
        boxEdge(P, uV2, uHalf, lw, px)
    );
    float A = max(lines, boxes) * uAccent.a * (1.0 - vUv.y);

    vec4 card = vec4(fill * mask, mask);
    vec4 comp = vec4(uAccent.rgb * A, A) + card * (1.0 - A);

    gl_FragColor = comp * pow(clamp(E.y, 0.0, 1.0), 0.7);
}`

function compile(gl: WebGLRenderingContext) {
  const make = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
    gl.deleteShader(shader)
    return null
  }
  const vertex = make(gl.VERTEX_SHADER, VERT)
  const fragment = make(gl.FRAGMENT_SHADER, FRAG)
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'aPos')
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  gl.deleteProgram(program)
  return null
}

type Atlas = { canvas: HTMLCanvasElement; cssW: number; cssH: number }
type FontSpec = {
  family: string
  weight: string
  style: string
  size: number
  letterSpacing: string
}

function fontString(f: FontSpec, px: number) {
  return f.style + ' ' + f.weight + ' ' + px + 'px ' + f.family
}

// This is the supplied OriginKit red-fill/green-dotted-stroke atlas builder.
function buildAtlas(
  text: string,
  f: FontSpec,
  drawFontPx: number,
  dpr: number,
  targetTextWidth: number,
): Atlas | null {
  const probe = document.createElement('canvas').getContext('2d')
  if (!probe) return null

  const setFont = (ctx: CanvasRenderingContext2D, px: number) => {
    ctx.font = fontString(f, px)
  }

  // Canvas letterSpacing is inconsistent across the browsers used for this
  // login. Draw the source atlas glyphs at the exact CSS tracking instead.
  setFont(probe, drawFontPx)
  const glyphWidth = [...text].reduce((sum, character) => sum + probe.measureText(character).width, 0)
  const tracking = (targetTextWidth - glyphWidth) / text.length
  const letterAdvance = (px: number) => tracking * (px / drawFontPx)

  const measure = (px: number) => {
    setFont(probe, px)
    const m = probe.measureText(text)
    const asc = m.actualBoundingBoxAscent || px * 0.8
    const desc = m.actualBoundingBoxDescent || px * 0.22
    const width = [...text].reduce((sum, character) => sum + probe.measureText(character).width, 0)
    return { w: Math.max(1, width + letterAdvance(px) * text.length), asc, desc }
  }

  let fpx = Math.max(8, drawFontPx * dpr)
  let m = measure(fpx)
  let pad = fpx * 0.12
  const over = Math.max((m.w + pad * 2) / MAX_TEX, (m.asc + m.desc + pad * 2) / MAX_TEX)
  if (over > 1) {
    fpx = Math.max(8, fpx / over)
    m = measure(fpx)
    pad = fpx * 0.12
  }

  const w = Math.max(1, Math.ceil(m.w + pad * 2))
  const h = Math.max(1, Math.ceil(m.asc + m.desc + pad * 2))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, w, h)
  setFont(ctx, fpx)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.globalCompositeOperation = 'lighter'

  const drawTrackedText = (mode: 'fill' | 'stroke') => {
    let x = pad
    for (const character of text) {
      if (mode === 'fill') ctx.fillText(character, x, pad + m.asc)
      else ctx.strokeText(character, x, pad + m.asc)
      x += ctx.measureText(character).width + letterAdvance(fpx)
    }
  }

  ctx.fillStyle = '#ff0000'
  drawTrackedText('fill')

  const block = m.asc + m.desc
  ctx.strokeStyle = '#00ff00'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(1, block * DOT_DIAMETER)
  ctx.setLineDash([0, Math.max(2, block * DOT_PITCH)])
  drawTrackedText('stroke')

  const cssPerPx = drawFontPx / fpx
  return { canvas, cssW: w * cssPerPx, cssH: h * cssPerPx }
}

function fontFromLabel(label: HTMLElement): FontSpec {
  const computed = getComputedStyle(label)
  return {
    family: computed.fontFamily,
    weight: computed.fontWeight,
    style: computed.fontStyle === 'italic' ? 'italic' : 'normal',
    size: Math.max(8, Number.parseFloat(computed.fontSize) || 28),
    letterSpacing: computed.letterSpacing,
  }
}

export function VectorWordmark() {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [ready, setReady] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(media.matches)
      if (media.matches) setReady(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reducedMotion) return
    const host = hostRef.current
    const canvas = canvasRef.current
    const label = labelRef.current
    if (!host || !canvas || !label) return

    const context = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    })
    if (!context) return
    const gl = context
    const prog = compile(gl)
    if (!prog) return

    const U = {
      map: gl.getUniformLocation(prog, 'uMap'),
      res: gl.getUniformLocation(prog, 'uRes'),
      atlas: gl.getUniformLocation(prog, 'uAtlas'),
      ptr: gl.getUniformLocation(prog, 'uPtr'),
      reach: gl.getUniformLocation(prog, 'uReach'),
      text: gl.getUniformLocation(prog, 'uText'),
      shade: gl.getUniformLocation(prog, 'uShade'),
      accent: gl.getUniformLocation(prog, 'uAccent'),
      v0: gl.getUniformLocation(prog, 'uV0'),
      v1: gl.getUniformLocation(prog, 'uV1'),
      v2: gl.getUniformLocation(prog, 'uV2'),
      half: gl.getUniformLocation(prog, 'uHalf'),
    }

    const quad = gl.createBuffer()
    const tex = gl.createTexture()
    if (!quad || !tex) {
      if (quad) gl.deleteBuffer(quad)
      if (tex) gl.deleteTexture(tex)
      gl.deleteProgram(prog)
      return
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.disable(gl.BLEND)

    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    let alive = true
    let boxW = Math.max(1, host.offsetWidth)
    let boxH = Math.max(1, host.offsetHeight)
    let boxDirty = true
    let dpr = 1
    let bufW = 0
    let bufH = 0
    let atlasRatioW = 1
    let atlasRatioH = 1
    let atlasKey = ''
    let fontSpec = fontFromLabel(label)

    function drawFontPx() {
      return fontSpec.size
    }

    function resize() {
      boxW = Math.max(1, host!.offsetWidth)
      boxH = Math.max(1, host!.offsetHeight)
      dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(boxW * dpr))
      const h = Math.max(1, Math.round(boxH * dpr))
      if (w === bufW && h === bufH) return
      bufW = w
      bufH = h
      canvas!.width = w
      canvas!.height = h
    }

    function rebuildAtlas() {
      const px = Math.max(8, drawFontPx())
      // Supersample only the tiny login atlas; the supplied RG drawing is unchanged.
      const atlas = buildAtlas(TEXT, fontSpec, px, Math.max(2, dpr), label!.getBoundingClientRect().width)
      if (!atlas) return
      atlasRatioW = Math.max(1e-4, atlas.cssW / px)
      atlasRatioH = Math.max(1e-4, atlas.cssH / px)

      if (document.fonts) {
        try {
          const probe = fontString(fontSpec, 64)
          if (!document.fonts.check(probe)) {
            const again = () => { if (alive) atlasKey = '' }
            document.fonts.load(probe, TEXT).then(again, again)
          }
        } catch {
          // Keep the first atlas until font readiness triggers a rebuild.
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      const cw = atlas.canvas.width
      const ch = atlas.canvas.height
      const pot = (cw & (cw - 1)) === 0 && (ch & (ch - 1)) === 0
      if (pot) {
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      }
    }

    const target = { x: -0.5, y: 0.5 }
    const eased = { x: -0.5, y: 0.5 }
    const cells = Array.from({ length: HANDLES }, () => ({ x: -0.5, y: 0.5 }))
    const verts = Array.from({ length: HANDLES }, () => ({ x: -0.5, y: 0.5 }))
    let hasPointer = false
    let sweepClock = 0
    let driftT = 0

    function snap(x: number, y: number, cw: number, ch: number) {
      const cx = Math.floor(x / cw)
      const cy = Math.floor(y / ch)
      const found: { x: number; y: number; d: number }[] = []
      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          const px = (cx + i + 0.5) * cw
          const py = (cy + j + 0.5) * ch
          found.push({ x: px, y: py, d: Math.hypot(px - x, py - y) })
        }
      }
      found.sort((a, b) => a.d - b.d)
      for (let i = 0; i < HANDLES; i += 1) {
        cells[i].x = found[i + 1].x
        cells[i].y = found[i + 1].y
      }
    }

    const onMove = (event: PointerEvent) => {
      hasPointer = true
      const rect = host!.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      target.x = (event.clientX - rect.left) / rect.width
      target.y = 1 - (event.clientY - rect.top) / rect.height
    }
    const onLeave = () => {
      hasPointer = false
      target.x = -0.5
      eased.x = -0.5
    }
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)

    function sync() {
      if (boxDirty) {
        boxDirty = false
        resize()
      }
      fontSpec = fontFromLabel(label!)
      const f = fontSpec
      const key = [TEXT, f.family, f.weight, f.style, f.size, f.letterSpacing, dpr].join('|')
      if (key !== atlasKey) {
        atlasKey = key
        rebuildAtlas()
      }
    }

    function step(dt: number) {
      const rate = 50 / SPEED_REF
      // Source geometry normalized to glyph size, not the former 1200x800 stage.
      const cw = Math.max(0.01, (drawFontPx() * 1.08) / boxH)
      const ch = cw * CELL_ASPECT
      const aspect = boxW / boxH

      if (!hasPointer) {
        const band = (atlasRatioH * Math.max(8, drawFontPx())) / boxH
        target.x += dt * SWEEP_RATE * rate
        target.y = (1 - band) / 2 + SWEEP_BAND * band
        if (target.x > 1.5) {
          target.x = -0.5
          eased.x = -0.5
        }
        sweepClock += dt
        if (sweepClock >= RESNAP) {
          sweepClock = 0
          snap(target.x * aspect, target.y, cw, ch)
        }
      } else {
        snap(target.x * aspect, target.y, cw, ch)
      }

      const damp = clamp((60 / 100) * DAMP_REF * dt, 0, 1)
      eased.x += (target.x - eased.x) * damp
      eased.y += (target.y - eased.y) * damp

      driftT += dt * rate
      for (let i = 0; i < HANDLES; i += 1) {
        const c = cells[i]
        const sx = Math.round(c.x / cw - 0.5)
        const sy = Math.round(c.y / ch - 0.5)
        const h1 = fract(Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453)
        const h2 = fract(Math.sin(sx * 269.5 + sy * 183.3) * 43758.5453)
        verts[i].x = c.x + DRIFT_X * cw * Math.sin(driftT * DRIFT_RATE + h1 * Math.PI * 2)
        verts[i].y = c.y + DRIFT_Y * ch * Math.sin(driftT * DRIFT_RATE_Y + h2 * Math.PI * 2)
      }
    }

    function draw() {
      gl.viewport(0, 0, bufW, bufH)
      gl.useProgram(prog)
      gl.uniform1i(U.map, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform2f(U.res, boxW, boxH)
      const px = Math.max(8, drawFontPx())
      gl.uniform2f(U.atlas, atlasRatioW * px, atlasRatioH * px)
      gl.uniform2f(U.ptr, eased.x, eased.y)
      gl.uniform1f(U.reach, 290 / 1200)
      gl.uniform3f(U.text, 0.98, 0.97, 1)
      gl.uniform3f(U.shade, 0.74, 0.76, 0.87)
      gl.uniform4f(U.accent, 0.68, 0.61, 1, 0.72)
      gl.uniform2f(U.v0, verts[0].x, verts[0].y)
      gl.uniform2f(U.v1, verts[1].x, verts[1].y)
      gl.uniform2f(U.v2, verts[2].x, verts[2].y)
      gl.uniform1f(U.half, drawFontPx() * 0.55 / 2 / boxH)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    let raf = 0
    let last = 0
    let running = true
    let shown = false
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      sync()
      step(dt)
      draw()
      if (!shown) {
        shown = true
        setReady(true)
      }
      raf = requestAnimationFrame(frame)
    }
    const gate = () => {
      if (running && !document.hidden) {
        if (!raf) {
          last = 0
          raf = requestAnimationFrame(frame)
        }
      } else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      running = false
      gate()
      setReady(false)
    }
    const ro = new ResizeObserver(() => { boxDirty = true })
    ro.observe(host)
    document.addEventListener('visibilitychange', gate)
    canvas.addEventListener('webglcontextlost', onContextLost)
    if (document.fonts) {
      document.fonts.ready.then(
        () => { if (alive) atlasKey = '' },
        () => {},
      )
    }
    gate()

    return () => {
      alive = false
      running = false
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', gate)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      gl.deleteTexture(tex)
      gl.deleteBuffer(quad)
      gl.deleteProgram(prog)
    }
  }, [reducedMotion])

  return (
    <div className={styles.wordmark} data-ready={ready && !reducedMotion}>
      <span ref={labelRef} className={styles.wordmarkText}>SUPER ADMIN</span>
      {!reducedMotion && (
        <div ref={hostRef} className={styles.wordmarkStage}>
          <canvas ref={canvasRef} className={styles.wordmarkCanvas} data-ready={ready} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
