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
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
      canvas.dataset.ready = 'false'
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
    // Supplied preset's arch/coverage retained. Palette and speed fit this shell.
    gl.uniform1f(u('uPeak'), 1)
    gl.uniform1f(u('uHeight'), 0)
    gl.uniform1f(u('uThick'), 2.06)
    gl.uniform1f(u('uFall'), 6)
    gl.uniform3f(u('uBg'), 15 / 255, 19 / 255, 29 / 255)
    gl.uniform3f(u('uBase'), 52 / 255, 56 / 255, 92 / 255)
    gl.uniform3f(u('uAccent'), 111 / 255, 101 / 255, 179 / 255)
    gl.uniform3f(u('uHigh'), 145 / 255, 135 / 255, 211 / 255)
    // Background must not intercept interaction; pointer influence is disabled.
    gl.uniform2f(u('uMouse'), 0, 0)
    gl.uniform1f(u('uMouseRadius'), 236)
    gl.uniform1f(u('uMouseStrength'), 0)

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
      const pitchCss = Math.min(bw, bh) / dpr / 78
      gl.uniform2f(resolution, bw, bh)
      gl.uniform1f(dprLocation, dpr)
      gl.uniform1f(cell, Math.max(2, pitchCss * dpr))
      gl.uniform1f(dot, pitchCss * 1.2 * 1.02)
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
      clock = (clock + dt * 0.9 * (35 / 50)) % 6283
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
      dispose()
    }
  }, [animate, contextVersion])

  return (
    <div ref={stageRef} className={styles.stage} aria-hidden="true" data-predictive-arc data-motion={animate ? 'eligible' : 'static'}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
