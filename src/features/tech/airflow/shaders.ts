import * as THREE from 'three'

/** Line segments with per-vertex colour + alpha (streaks). */
export function createStreakMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.9 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(vColor, vAlpha * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Soft round points with size attenuation. */
export function createPointMaterial(size: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uSize: { value: size }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uSize;
      uniform float uPixelRatio;
      attribute vec3 aColor;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * uPixelRatio / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25) discard;
        float a = smoothstep(0.25, 0.0, d);
        gl_FragColor = vec4(vColor, a * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Streamlines with animated dashes travelling downstream. */
export function createStreamlineMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 1 }, uOpacity: { value: 0.85 } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aS;
      varying vec3 vColor;
      varying float vS;
      void main() {
        vColor = aColor;
        vS = aS;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vS;
      void main() {
        float f = fract(vS * 1.6 - uTime * uSpeed);
        float dash = 0.22 + 0.78 * smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.35, 0.6, f));
        gl_FragColor = vec4(vColor, dash * uOpacity);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Helical strands wrapped around a vortex core, rotating in the vertex shader. */
export function createVortexMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute vec3 aN;
      attribute vec3 aB;
      attribute float aS;
      attribute float aPhase;
      attribute float aSign;
      attribute float aR;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        float th = aPhase + aSign * (aS * 9.0 - uTime * 7.0);
        float r = aR * (1.0 + aS * 0.12);
        vec3 p = position + r * (cos(th) * aN + sin(th) * aB);
        vColor = aColor;
        vFade = (1.0 - smoothstep(4.0, 9.0, aS)) * smoothstep(0.0, 0.3, aS);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        gl_FragColor = vec4(vColor, 0.9 * vFade);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

/** Soft radial disc used to render the turbulent wake volume. */
export function createWakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ff7a1a') } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = uv;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c) * 2.0;
        float n = 0.75 + 0.25 * sin(12.0 * c.x + 9.0 * c.y + uTime * 3.0) * sin(7.0 * c.y - uTime * 2.0);
        float a = (1.0 - smoothstep(0.2, 1.0, d)) * vAlpha * n;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
}
