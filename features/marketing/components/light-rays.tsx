"use client"

import { useEffect, useRef } from "react"
import {
  Mesh,
  Program,
  Renderer,
  Triangle,
} from "ogl"
import { cn } from "@/lib/utils"

export type RaysOrigin =
  | "top-center"
  | "top-left"
  | "top-right"
  | "right"
  | "left"
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"

type LightRaysProps = {
  raysOrigin?: RaysOrigin
  raysColor?: string
  raysSpeed?: number
  lightSpread?: number
  rayLength?: number
  pulsating?: boolean
  fadeDistance?: number
  saturation?: number
  followMouse?: boolean
  mouseInfluence?: number
  noiseAmount?: number
  distortion?: number
  className?: string
}

type MousePosition = {
  x: number
  y: number
}

type WebGLUniforms = {
  iTime: { value: number }
  iResolution: { value: [number, number] }
  rayPos: { value: [number, number] }
  rayDir: { value: [number, number] }
  raysColor: { value: [number, number, number] }
  raysSpeed: { value: number }
  lightSpread: { value: number }
  rayLength: { value: number }
  pulsating: { value: number }
  fadeDistance: { value: number }
  saturation: { value: number }
  mousePos: { value: [number, number] }
  mouseInfluence: { value: number }
  noiseAmount: { value: number }
  distortion: { value: number }
}

type AnchorAndDirection = {
  anchor: [number, number]
  dir: [number, number]
}

const vertexShader = `
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float rayStrength(
  vec2 raySource,
  vec2 rayRefDirection,
  vec2 coord,
  float seedA,
  float seedB,
  float speed
) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle =
    cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;

  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff =
    clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0,
    1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);

  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) * rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.85;
  fragColor.y *= 0.35 + brightness * 0.6;
  fragColor.z *= 0.55 + brightness * 0.55;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`

function hexToRgb(hex: string): [number, number, number] {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return match
    ? [
        Number.parseInt(match[1], 16) / 255,
        Number.parseInt(match[2], 16) / 255,
        Number.parseInt(match[3], 16) / 255,
      ]
    : [1, 1, 1]
}

function getAnchorAndDirection(origin: RaysOrigin, width: number, height: number): AnchorAndDirection {
  const outside = 0.2

  switch (origin) {
    case "top-left":
      return { anchor: [0, -outside * height], dir: [0, 1] }
    case "top-right":
      return { anchor: [width, -outside * height], dir: [0, 1] }
    case "left":
      return { anchor: [-outside * width, 0.5 * height], dir: [1, 0] }
    case "right":
      return { anchor: [(1 + outside) * width, 0.5 * height], dir: [-1, 0] }
    case "bottom-left":
      return { anchor: [0, (1 + outside) * height], dir: [0, -1] }
    case "bottom-center":
      return { anchor: [0.5 * width, (1 + outside) * height], dir: [0, -1] }
    case "bottom-right":
      return { anchor: [width, (1 + outside) * height], dir: [0, -1] }
    default:
      return { anchor: [0.5 * width, -outside * height], dir: [0, 1] }
  }
}

export function LightRays({
  raysOrigin = "top-center",
  raysColor = "#8be9ff",
  raysSpeed = 1,
  lightSpread = 1,
  rayLength = 2,
  pulsating = true,
  fadeDistance = 1,
  saturation = 1,
  followMouse = true,
  mouseInfluence = 0.1,
  noiseAmount = 0,
  distortion = 0,
  className,
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const uniformsRef = useRef<WebGLUniforms | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const meshRef = useRef<Mesh | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const mouseThrottleRef = useRef<number | null>(null)
  const visibleRef = useRef(false)
  const mouseRef = useRef<MousePosition>({ x: 0.5, y: 0.42 })
  const smoothMouseRef = useRef<MousePosition>({ x: 0.5, y: 0.42 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

    const initialize = () => {
      if (!containerRef.current) return

      try {
        const renderer = new Renderer({
          dpr: dpr(),
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        })

        rendererRef.current = renderer
        const gl = renderer.gl
        gl.canvas.style.width = "100%"
        gl.canvas.style.height = "100%"

        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }

        containerRef.current.appendChild(gl.canvas)

        const uniforms: WebGLUniforms = {
          iTime: { value: 0 },
          iResolution: { value: [1, 1] },
          rayPos: { value: [0, 0] },
          rayDir: { value: [0, 1] },
          raysColor: { value: hexToRgb(raysColor) },
          raysSpeed: { value: raysSpeed },
          lightSpread: { value: lightSpread },
          rayLength: { value: rayLength },
          pulsating: { value: pulsating ? 1 : 0 },
          fadeDistance: { value: fadeDistance },
          saturation: { value: saturation },
          mousePos: { value: [mouseRef.current.x, mouseRef.current.y] },
          mouseInfluence: { value: mouseInfluence },
          noiseAmount: { value: noiseAmount },
          distortion: { value: distortion },
        }

        uniformsRef.current = uniforms

        const geometry = new Triangle(gl)
        const program = new Program(gl, {
          vertex: vertexShader,
          fragment: fragmentShader,
          uniforms,
        })
        const mesh = new Mesh(gl, { geometry, program })
        meshRef.current = mesh

        const updatePlacement = () => {
          if (!containerRef.current || !rendererRef.current || !uniformsRef.current) return

          rendererRef.current.dpr = dpr()
          const width = containerRef.current.clientWidth
          const height = containerRef.current.clientHeight
          rendererRef.current.setSize(width, height)

          const scaledWidth = width * rendererRef.current.dpr
          const scaledHeight = height * rendererRef.current.dpr

          uniformsRef.current.iResolution.value = [scaledWidth, scaledHeight]
          const { anchor, dir } = getAnchorAndDirection(
            raysOrigin,
            scaledWidth,
            scaledHeight,
          )
          uniformsRef.current.rayPos.value = anchor
          uniformsRef.current.rayDir.value = dir
        }

        const onResize = () => updatePlacement()
        window.addEventListener("resize", onResize, { passive: true })
        updatePlacement()

        const loop = (time: number) => {
          if (!rendererRef.current || !uniformsRef.current || !meshRef.current || !visibleRef.current) {
            return
          }

          uniformsRef.current.iTime.value = time * 0.001

          if (followMouse && mouseInfluence > 0) {
            const smoothing = 0.84
            smoothMouseRef.current.x =
              smoothMouseRef.current.x * smoothing + mouseRef.current.x * (1 - smoothing)
            smoothMouseRef.current.y =
              smoothMouseRef.current.y * smoothing + mouseRef.current.y * (1 - smoothing)

            uniformsRef.current.mousePos.value = [
              smoothMouseRef.current.x,
              smoothMouseRef.current.y,
            ]
          }

          rendererRef.current.render({ scene: meshRef.current })
          animationFrameRef.current = window.requestAnimationFrame(loop)
        }

        animationFrameRef.current = window.requestAnimationFrame(loop)

        cleanupRef.current = () => {
          if (animationFrameRef.current) {
            window.cancelAnimationFrame(animationFrameRef.current)
            animationFrameRef.current = null
          }

          window.removeEventListener("resize", onResize)

          if (rendererRef.current) {
            try {
              const canvas = rendererRef.current.gl.canvas
              const loseContext = rendererRef.current.gl.getExtension("WEBGL_lose_context")
              if (loseContext) loseContext.loseContext()
              if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
            } catch {
              // Ignore cleanup failures from unavailable extensions.
            }
          }

          rendererRef.current = null
          uniformsRef.current = null
          meshRef.current = null
        }
      } catch (error) {
        console.error("Failed to initialize LightRays", error)
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (mouseThrottleRef.current) return

      mouseThrottleRef.current = window.requestAnimationFrame(() => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        mouseRef.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        }
        mouseThrottleRef.current = null
      })
    }

    if (followMouse) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true })
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        visibleRef.current = entry.isIntersecting

        if (entry.isIntersecting) {
          cleanupRef.current?.()
          cleanupRef.current = null
          initialize()
        } else if (animationFrameRef.current) {
          window.cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      },
    )

    observerRef.current.observe(container)

    return () => {
      observerRef.current?.disconnect()
      cleanupRef.current?.()
      cleanupRef.current = null

      if (mouseThrottleRef.current) {
        window.cancelAnimationFrame(mouseThrottleRef.current)
        mouseThrottleRef.current = null
      }

      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [
    distortion,
    fadeDistance,
    followMouse,
    lightSpread,
    mouseInfluence,
    noiseAmount,
    pulsating,
    rayLength,
    raysColor,
    raysOrigin,
    raysSpeed,
    saturation,
  ])

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-hidden",
        className,
      )}
      aria-hidden="true"
    />
  )
}
