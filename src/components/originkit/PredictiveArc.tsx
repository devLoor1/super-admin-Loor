// OriginKit Predictive Arc — supplied shader retained; bounded decorative lifecycle.
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion, useVisibleMotion } from './useVisualMotion'
import styles from './PredictiveArc.module.css'

const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uDpr, uCell, uDot;
uniform float uPeak, uHeight, uThick, uFall;
uniform vec3  uBg, uBase, uAccent, uHigh;
uniform vec2  uMouse;
uniform float uMouseRadius, uMouseStrength;

void main(){
  float cs = max(uCell, 2.0);
  vec2 ci = floor(gl_FragCoord.xy / cs);
  vec2 cc = (ci + 0.5) * cs;

  float x = cc.x / uDpr;
  float y = (uRes.y - cc.y) / uDpr;
  float w = uRes.x / uDpr;
  float h = uRes.y / uDpr;

  float normX = (x - w * 0.5) / (w * 0.75);
  float curveY = h * uPeak + normX * normX * (h * uHeight);

  float mdx = x - uMouse.x;
  float influence = uMouseStrength * exp(-(mdx * mdx) / (2.0 * uMouseRadius * uMouseRadius + 1.0));
  curveY = mix(curveY, uMouse.y, influence);

  float dist = abs(y - curveY);
  float th = (140.0 + (1.0 - abs(normX)) * 80.0) * uThick;

  vec3 col = uBg;
  if (dist < th) {
    float i = 1.0 - dist / th;
    float waveX = sin(x * 0.015 + uTime);
    float waveY = cos(y * 0.02 + uTime);
    i = i * 0.7 + waveX * waveY * 0.3 * i;
    i *= max(0.0, 1.0 - pow(abs(normX), uFall));

    if (i > 0.02) {
      float side = uDot * i * uDpr;
      vec2 d = abs(gl_FragCoord.xy - cc);
      float cov = 1.0 - smoothstep(side * 0.5 - 1.0, side * 0.5 + 1.0, max(d.x, d.y));

      vec3 ink = mix(uBase, uAccent, clamp(pow(i, 1.1), 0.0, 1.0));
      ink = mix(ink, uHigh, smoothstep(0.72, 1.0, i));
      col = mix(uBg, ink, cov * clamp(i * 1.6, 0.0, 1.0));
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`

// Exported preset's dot field/thickness + supplied base component's curved arch.
const ARC = { peak: 0.35, height: 0.7, thickness: 2.06, falloff: 6, density: 78, dotSize: 1.02, speed: 100, pointerRadius: 236, pointerStrength: 0.34 }
const COLORS = { background: [8, 11, 19], base: [52, 21, 107], accent: [160, 80, 255], highlight: [232, 217, 255] }
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

/** Static translation of the supplied shader's curve/dot/color math, at time zero. */
function drawStaticArc(canvas: HTMLCanvasElement, width: number, height: number) {
  let context: CanvasRenderingContext2D | null
  try { context = canvas.getContext('2d') } catch { return }
  if (!context || width <= 0 || height <= 0) return
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(1_200_000 / (width * height)))
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.fillStyle = `rgb(${COLORS.background.join(' ')})`
  context.fillRect(0, 0, width, height)
  const pitch = Math.min(width, height) / ARC.density
  for (let row = 0; row * pitch < height; row++) {
    const y = (row + 0.5) * pitch
    for (let column = 0; column * pitch < width; column++) {
      const x = (column + 0.5) * pitch
      const normX = (x - width * 0.5) / (width * 0.75)
      const curveY = height * ARC.peak + normX * normX * height * ARC.height
      const thickness = (140 + (1 - Math.abs(normX)) * 80) * ARC.thickness
      const distance = Math.abs(y - curveY)
      if (distance >= thickness) continue
      let intensity = 1 - distance / thickness
      intensity *= 0.7 + Math.sin(x * 0.015) * Math.cos(y * 0.02) * 0.3
      intensity *= Math.max(0, 1 - Math.pow(Math.abs(normX), ARC.falloff))
      if (intensity <= 0.02) continue
      const accentBlend = clamp01(Math.pow(intensity, 1.1))
      const high = clamp01((intensity - 0.72) / (1 - 0.72))
      const highlightBlend = high * high * (3 - 2 * high)
      const coverage = clamp01(intensity * 1.6)
      const color = COLORS.base.map((base, channel) => {
        const ink = base + (COLORS.accent[channel] - base) * accentBlend
        const lit = ink + (COLORS.highlight[channel] - ink) * highlightBlend
        return Math.round(COLORS.background[channel] + (lit - COLORS.background[channel]) * coverage)
      })
      const side = Math.min(pitch, pitch * 1.2 * ARC.dotSize * intensity)
      context.fillStyle = `rgb(${color.join(' ')})`
      context.fillRect(x - side / 2, y - side / 2, side, side)
    }
  }
  canvas.dataset.ready = 'true'
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/** Only AppShell's main-content region owns this effect; never the sidebar. */
export function PredictiveArc() {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const visible = useVisibleMotion(stageRef)
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 767px), (pointer: coarse)').matches)
  const [contextVersion, setContextVersion] = useState(0)
  const lowCapability = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2
  const animate = !reduced && !compact && !lowCapability && visible

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage || !animate) return
    let gl: WebGLRenderingContext | null
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' })
    } catch {
      return
    }
    if (!gl) return // Expected progressive enhancement failure, not a Dashboard error.
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    const program = gl.createProgram()
    const buffer = gl.createBuffer()
    const dispose = () => {
      if (!gl.isContextLost()) { gl.useProgram(null); gl.bindBuffer(gl.ARRAY_BUFFER, null) }
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
      canvas.dataset.ready = 'false'
      canvas.width = 1
      canvas.height = 1
    }
    if (!vs || !fs || !program || !buffer) { dispose(); return }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); return }
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const u = (name: string) => gl.getUniformLocation(program, name)
    const time = u('uTime')
    const resolution = u('uRes')
    const dprLocation = u('uDpr')
    const cell = u('uCell')
    const dot = u('uDot')
    gl.uniform1f(u('uPeak'), ARC.peak)
    gl.uniform1f(u('uHeight'), ARC.height)
    gl.uniform1f(u('uThick'), ARC.thickness)
    gl.uniform1f(u('uFall'), ARC.falloff)
    for (const [name, color] of [['uBg', COLORS.background], ['uBase', COLORS.base], ['uAccent', COLORS.accent], ['uHigh', COLORS.highlight]] as const) {
      gl.uniform3f(u(name), color[0] / 255, color[1] / 255, color[2] / 255)
    }
    const mouse = u('uMouse')
    const influence = u('uMouseStrength')
    gl.uniform1f(u('uMouseRadius'), ARC.pointerRadius)
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: 0, targetActive: 0 }
    // Observe the content region, not the pointer-transparent decorative canvas.
    const region = stage.parentElement
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = stage.getBoundingClientRect()
      pointer.targetX = event.clientX - rect.left
      // The shader measures y from the top; normalize instead of mirroring input.
      pointer.targetY = event.clientY - rect.top
      pointer.targetActive = pointer.targetX >= 0 && pointer.targetX <= rect.width && pointer.targetY >= 0 && pointer.targetY <= rect.height ? 1 : 0
    }
    const leave = () => { pointer.targetActive = 0 }
    region?.addEventListener('pointermove', move, { passive: true })
    region?.addEventListener('pointerleave', leave, { passive: true })
    region?.addEventListener('pointercancel', leave, { passive: true })

    let drawable = false
    const resize = () => {
      const { width, height } = stage.getBoundingClientRect()
      drawable = width > 0 && height > 0
      if (!drawable) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(1_200_000 / (width * height)))
      const bw = Math.max(1, Math.round(width * dpr))
      const bh = Math.max(1, Math.round(height * dpr))
      canvas.width = bw
      canvas.height = bh
      gl.viewport(0, 0, bw, bh)
      const pitchCss = Math.min(bw, bh) / dpr / ARC.density
      gl.uniform2f(resolution, bw, bh)
      gl.uniform1f(dprLocation, dpr)
      gl.uniform1f(cell, Math.max(2, pitchCss * dpr))
      gl.uniform1f(dot, pitchCss * 1.2 * ARC.dotSize)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    let frame = 0
    let last = 0
    let clock = 0
    const render = (now: number) => {
      frame = requestAnimationFrame(render)
      if (now - last < 1000 / 30 || !drawable || gl.isContextLost()) return
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      clock = (clock + dt * 0.9 * (ARC.speed / 50)) % 6283
      // Supplied position/activation lerp rates and 34% pointer strength.
      pointer.x += (pointer.targetX - pointer.x) * Math.min(1, dt * 12)
      pointer.y += (pointer.targetY - pointer.y) * Math.min(1, dt * 12)
      pointer.active += (pointer.targetActive - pointer.active) * Math.min(1, dt * 6)
      gl.uniform2f(mouse, pointer.x, pointer.y)
      gl.uniform1f(influence, ARC.pointerStrength * pointer.active)
      gl.uniform1f(time, clock)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.dataset.ready = 'true'
    }
    const lost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(frame)
      canvas.dataset.ready = 'false'
    }
    const restored = () => setContextVersion((version) => version + 1)
    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
      region?.removeEventListener('pointermove', move)
      region?.removeEventListener('pointerleave', leave)
      region?.removeEventListener('pointercancel', leave)
      dispose()
    }
  }, [animate, contextVersion])

  useEffect(() => {
    const stage = stageRef.current
    const canvas = fallbackRef.current
    if (!stage || !canvas) return
    const render = () => {
      const { width, height } = stage.getBoundingClientRect()
      drawStaticArc(canvas, width, height)
    }
    render()
    const observer = new ResizeObserver(render)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={stageRef} className={styles.stage} aria-hidden="true" data-predictive-arc data-motion={animate ? 'eligible' : 'static'}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas ref={fallbackRef} className={styles.fallback} />
    </div>
  )
}
