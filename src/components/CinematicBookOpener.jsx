import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const PAGE_WIDTH = 3.25;
const PAGE_HEIGHT = 4.65;
const PAGE_SEGMENTS = 32;
const PAGE_COUNT = 20;
const COVER_THICKNESS = 0.085;
const STACK_THICKNESS = 0.26;

const AUTHORHUB_COLORS = {
    chocolateRoast: "#2B1010",
    burntCaramel: "#8B4513",
    ancientAmber: "#D7898E",
    toastedAlmond: "#CAA131",
    mabogany: "#8B4511",
    sunsetOrange: "#F2994A",
    twilightRose: "#C77E7E",
    warmPaper: "#F4E6D2",
    paperShadow: "#B99062",
};

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function smoothstep(edge0, edge1, value) {
    const x = clamp01((value - edge0) / Math.max(0.00001, edge1 - edge0));
    return x * x * (3 - 2 * x);
}

function damp(current, target, lambda, delta) {
    return THREE.MathUtils.damp(current, target, lambda, delta);
}

function dampVector3(vector, targetArray, lambda, delta) {
    vector.x = damp(vector.x, targetArray[0], lambda, delta);
    vector.y = damp(vector.y, targetArray[1], lambda, delta);
    vector.z = damp(vector.z, targetArray[2], lambda, delta);
}

function applyUniformValue(material, uniformName, value) {
    if (!material?.userData?.shader?.uniforms?.[uniformName]) return;
    material.userData.shader.uniforms[uniformName].value = value;
}

function applySharedUniforms(material, time, bendT, amplitude, fiberScale, dissolve) {
    applyUniformValue(material, "uTime", time);
    applyUniformValue(material, "uBendT", bendT);
    applyUniformValue(material, "uAmplitude", amplitude);
    applyUniformValue(material, "uPaperFiberScale", fiberScale);
    applyUniformValue(material, "uDissolve", dissolve);
}

function createPatinaStandardMaterial({
    baseColor = AUTHORHUB_COLORS.warmPaper,
    patinaColor = AUTHORHUB_COLORS.burntCaramel,
    inkColor = AUTHORHUB_COLORS.chocolateRoast,
    roughness = 0.82,
    metalness = 0.0,
    side = THREE.DoubleSide,
    transparent = false,
    opacity = 1,
    edgeDarkness = 0.38,
    pageMode = true,
}) {
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColor),
        roughness,
        metalness,
        side,
        transparent,
        opacity,
    });

    material.userData.shader = null;
    material.userData.baseUniforms = {
        uTime: { value: 0 },
        uBendT: { value: 0 },
        uAmplitude: { value: pageMode ? 0.24 : 0.035 },
        uPaperFiberScale: { value: 1 },
        uDissolve: { value: 0 },
        uEdgeDarkness: { value: edgeDarkness },
        uPatinaColor: { value: new THREE.Color(patinaColor) },
        uInkColor: { value: new THREE.Color(inkColor) },
    };

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = material.userData.baseUniforms.uTime;
        shader.uniforms.uBendT = material.userData.baseUniforms.uBendT;
        shader.uniforms.uAmplitude = material.userData.baseUniforms.uAmplitude;
        shader.uniforms.uPaperFiberScale = material.userData.baseUniforms.uPaperFiberScale;
        shader.uniforms.uDissolve = material.userData.baseUniforms.uDissolve;
        shader.uniforms.uEdgeDarkness = material.userData.baseUniforms.uEdgeDarkness;
        shader.uniforms.uPatinaColor = material.userData.baseUniforms.uPatinaColor;
        shader.uniforms.uInkColor = material.userData.baseUniforms.uInkColor;

        const vertexInjection = `
      uniform float uTime;
      uniform float uBendT;
      uniform float uAmplitude;
      varying vec2 vPatinaUv;
      varying float vEdgeMask;
      varying float vFiberNoise;

      float ahHash12Vertex(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
    `;

        const vertexTransform = `
      vec3 transformed = vec3(position);

      vPatinaUv = uv;

      float normalizedX = clamp(uv.x, 0.0, 1.0);
      float normalizedY = clamp(uv.y, 0.0, 1.0);

      float openPulse = max(0.0, (1.0 - uBendT) * uBendT);
      float hingeTension = normalizedX * normalizedX * (3.0 - 2.0 * normalizedX);
      float crossArch = sin(normalizedX * 3.1415926535897932384626433832795);
      float verticalBreath = sin(normalizedY * 3.1415926535897932384626433832795);
      float travelingRipple = sin((normalizedX * 5.4) - (uBendT * 4.8) + (uTime * 1.15));

      transformed.z += crossArch * uAmplitude * openPulse;
      transformed.z += travelingRipple * 0.026 * openPulse * hingeTension;
      transformed.y += verticalBreath * 0.022 * openPulse * hingeTension;
      transformed.x += 0.035 * openPulse * hingeTension;

      float leftEdge = 1.0 - smoothstep(0.0, 0.08, normalizedX);
      float rightEdge = smoothstep(0.92, 1.0, normalizedX);
      float bottomEdge = 1.0 - smoothstep(0.0, 0.07, normalizedY);
      float topEdge = smoothstep(0.93, 1.0, normalizedY);
      vEdgeMask = clamp(max(max(leftEdge, rightEdge), max(bottomEdge, topEdge)), 0.0, 1.0);

      vFiberNoise = ahHash12Vertex((uv * 210.0) + vec2(uTime * 0.017, uTime * 0.011));
    `;

        const fragmentInjection = `
      uniform float uTime;
      uniform float uPaperFiberScale;
      uniform float uDissolve;
      uniform float uEdgeDarkness;
      uniform vec3 uPatinaColor;
      uniform vec3 uInkColor;

      varying vec2 vPatinaUv;
      varying float vEdgeMask;
      varying float vFiberNoise;

      float ahHash12Fragment(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      float ahFiber(vec2 uv, float scale) {
        float grainA = ahHash12Fragment(uv * scale * vec2(183.0, 241.0));
        float grainB = ahHash12Fragment((uv + vec2(0.17, 0.43)) * scale * vec2(71.0, 311.0));
        float strand = sin((uv.y * scale * 95.0) + (grainA * 4.0)) * 0.5 + 0.5;
        return clamp((grainA * 0.48) + (grainB * 0.34) + (strand * 0.18), 0.0, 1.0);
      }
    `;

        const colorTransform = `
      #include <color_fragment>

      float fiber = ahFiber(vPatinaUv, uPaperFiberScale);
      float marginPatina = clamp(vEdgeMask * uEdgeDarkness, 0.0, 0.72);
      float oxidizedSpeckle = smoothstep(0.58, 1.0, fiber) * 0.14;
      float inkBruise = smoothstep(0.74, 1.0, vFiberNoise) * 0.12;

      diffuseColor.rgb = mix(diffuseColor.rgb, uPatinaColor, marginPatina + oxidizedSpeckle);
      diffuseColor.rgb = mix(diffuseColor.rgb, uInkColor, inkBruise + (vEdgeMask * 0.12));

      float dissolveFiber = ahFiber(vPatinaUv + vec2(uTime * 0.013, -uTime * 0.009), max(1.0, uPaperFiberScale * 2.25));
      float dissolveThreshold = smoothstep(0.04, 0.96, uDissolve);
      float dissolveAlpha = 1.0 - smoothstep(dissolveThreshold - 0.16, dissolveThreshold + 0.16, dissolveFiber);

      if (uDissolve > 0.015 && dissolveAlpha < 0.18) {
        discard;
      }

      diffuseColor.a *= mix(1.0, dissolveAlpha, smoothstep(0.05, 0.92, uDissolve));
    `;

        shader.vertexShader = vertexInjection + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", vertexTransform);

        shader.fragmentShader = fragmentInjection + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", colorTransform);

        material.userData.shader = shader;
    };

    material.customProgramCacheKey = () => `authorhub-patina-${pageMode ? "page" : "cover"}-${baseColor}-${patinaColor}-${inkColor}`;

    return material;
}

function createFlexDepthMaterial() {
    const material = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        side: THREE.DoubleSide,
    });

    material.userData.shader = null;
    material.userData.baseUniforms = {
        uTime: { value: 0 },
        uBendT: { value: 0 },
        uAmplitude: { value: 0.24 },
        uPaperFiberScale: { value: 1 },
        uDissolve: { value: 0 },
    };

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = material.userData.baseUniforms.uTime;
        shader.uniforms.uBendT = material.userData.baseUniforms.uBendT;
        shader.uniforms.uAmplitude = material.userData.baseUniforms.uAmplitude;
        shader.uniforms.uPaperFiberScale = material.userData.baseUniforms.uPaperFiberScale;
        shader.uniforms.uDissolve = material.userData.baseUniforms.uDissolve;

        const vertexInjection = `
      uniform float uTime;
      uniform float uBendT;
      uniform float uAmplitude;
    `;

        const vertexTransform = `
      vec3 transformed = vec3(position);

      float normalizedX = clamp(uv.x, 0.0, 1.0);
      float normalizedY = clamp(uv.y, 0.0, 1.0);

      float openPulse = max(0.0, (1.0 - uBendT) * uBendT);
      float hingeTension = normalizedX * normalizedX * (3.0 - 2.0 * normalizedX);
      float crossArch = sin(normalizedX * 3.1415926535897932384626433832795);
      float verticalBreath = sin(normalizedY * 3.1415926535897932384626433832795);
      float travelingRipple = sin((normalizedX * 5.4) - (uBendT * 4.8) + (uTime * 1.15));

      transformed.z += crossArch * uAmplitude * openPulse;
      transformed.z += travelingRipple * 0.026 * openPulse * hingeTension;
      transformed.y += verticalBreath * 0.022 * openPulse * hingeTension;
      transformed.x += 0.035 * openPulse * hingeTension;
    `;

        shader.vertexShader = vertexInjection + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", vertexTransform);

        material.userData.shader = shader;
    };

    material.customProgramCacheKey = () => "authorhub-flex-depth-material";

    return material;
}

function useWindowScrollProgress(enabled) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!enabled) return undefined;

        let frame = 0;

        function update() {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
                setProgress(clamp01(window.scrollY / maxScroll));
            });
        }

        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, [enabled]);

    return progress;
}

function CinematicCameraRig({ motion, triggerGateway }) {
    const { camera } = useThree();
    const lookAtRef = useRef(new THREE.Vector3(0.45, 0.08, 0));

    useFrame((state, delta) => {
        const gatewayTarget = triggerGateway ? 1 : 0;
        motion.current.gateway = damp(motion.current.gateway, gatewayTarget, 3.8, delta);

        const gateway = motion.current.gateway;
        const stow = motion.current.stow;

        const baseX = lerp(0.55, 0.12, stow);
        const baseY = lerp(0.42, 0.1, stow);
        const baseZ = lerp(7.15, 5.2, stow);

        const pushX = lerp(baseX, 0.12, gateway);
        const pushY = lerp(baseY, 0.03, gateway);
        const pushZ = lerp(baseZ, 1.08, gateway);

        dampVector3(camera.position, [pushX, pushY, pushZ], gateway > 0.02 ? 5.8 : 3.2, delta);

        camera.fov = damp(camera.fov, lerp(43, 18, gateway), 4.4, delta);
        camera.near = 0.02;
        camera.far = 80;
        camera.updateProjectionMatrix();

        lookAtRef.current.x = damp(lookAtRef.current.x, lerp(0.45, 1.55, gateway), 4.5, delta);
        lookAtRef.current.y = damp(lookAtRef.current.y, lerp(0.08, 0.01, gateway), 4.5, delta);
        lookAtRef.current.z = damp(lookAtRef.current.z, lerp(0.0, 0.03, gateway), 4.5, delta);

        camera.lookAt(lookAtRef.current);
    });

    return null;
}

function FrontCover({ motion, coverGeometry }) {
    const pivotRef = useRef(null);
    const meshRef = useRef(null);

    const material = useMemo(
        () =>
            createPatinaStandardMaterial({
                baseColor: AUTHORHUB_COLORS.burntCaramel,
                patinaColor: AUTHORHUB_COLORS.mabogany,
                inkColor: AUTHORHUB_COLORS.chocolateRoast,
                roughness: 0.72,
                metalness: 0.04,
                side: THREE.FrontSide,
                edgeDarkness: 0.46,
                pageMode: false,
            }),
        [],
    );

    useFrame((state, delta) => {
        const open = motion.current.open;
        const gateway = motion.current.gateway;
        const t = smoothstep(0.04, 0.74, open);
        const weightedEase = t * t * (3 - 2 * t);
        const targetRotation = -weightedEase * 2.72;

        if (pivotRef.current) {
            pivotRef.current.rotation.y = damp(pivotRef.current.rotation.y, targetRotation, 5.6, delta);
            pivotRef.current.rotation.z = damp(pivotRef.current.rotation.z, -0.018 * Math.sin(state.clock.elapsedTime * 0.8) * (1 - t), 5.0, delta);
        }

        applySharedUniforms(material, state.clock.elapsedTime, t, 0.035, lerp(1, 36, gateway), gateway);
    });

    return (
        <group ref={pivotRef} position={[0, 0, 0.075]}>
            <mesh ref={meshRef} castShadow receiveShadow position={[PAGE_WIDTH / 2, 0, 0]}>
                <primitive attach="geometry" object={coverGeometry} />
                <primitive attach="material" object={material} />
            </mesh>
        </group>
    );
}

function BackCover({ coverGeometry }) {
    const material = useMemo(
        () =>
            createPatinaStandardMaterial({
                baseColor: "#5A2A12",
                patinaColor: AUTHORHUB_COLORS.burntCaramel,
                inkColor: AUTHORHUB_COLORS.chocolateRoast,
                roughness: 0.78,
                metalness: 0.03,
                side: THREE.FrontSide,
                edgeDarkness: 0.52,
                pageMode: false,
            }),
        [],
    );

    return (
        <mesh castShadow receiveShadow position={[PAGE_WIDTH / 2, 0, -0.115]}>
            <primitive attach="geometry" object={coverGeometry} />
            <primitive attach="material" object={material} />
        </mesh>
    );
}

function Spine({ motion }) {
    const spineRef = useRef(null);

    const spineGeometry = useMemo(() => new THREE.BoxGeometry(0.22, PAGE_HEIGHT + 0.24, STACK_THICKNESS + 0.22, 6, 16, 6), []);

    const material = useMemo(
        () =>
            createPatinaStandardMaterial({
                baseColor: AUTHORHUB_COLORS.chocolateRoast,
                patinaColor: AUTHORHUB_COLORS.burntCaramel,
                inkColor: "#130606",
                roughness: 0.66,
                metalness: 0.06,
                side: THREE.FrontSide,
                edgeDarkness: 0.5,
                pageMode: false,
            }),
        [],
    );

    useFrame((state, delta) => {
        const gateway = motion.current.gateway;
        if (spineRef.current) {
            spineRef.current.rotation.z = damp(spineRef.current.rotation.z, Math.sin(state.clock.elapsedTime * 0.7) * 0.006, 2.8, delta);
        }
        applySharedUniforms(material, state.clock.elapsedTime, motion.current.open, 0.012, lerp(1, 32, gateway), gateway * 0.45);
    });

    useEffect(() => {
        return () => {
            spineGeometry.dispose();
            material.dispose();
        };
    }, [spineGeometry, material]);

    return (
        <mesh ref={spineRef} castShadow receiveShadow position={[-0.105, 0, -0.015]}>
            <primitive attach="geometry" object={spineGeometry} />
            <primitive attach="material" object={material} />
        </mesh>
    );
}

function TurningSheet({ index, total, motion, pageGeometry }) {
    const pivotRef = useRef(null);
    const meshRef = useRef(null);

    const renderMaterial = useMemo(() => {
        const warmth = index % 3 === 0 ? "#F0DFC8" : index % 3 === 1 ? "#F6E9D6" : "#EEDBC0";
        return createPatinaStandardMaterial({
            baseColor: warmth,
            patinaColor: AUTHORHUB_COLORS.burntCaramel,
            inkColor: AUTHORHUB_COLORS.chocolateRoast,
            roughness: 0.94,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.985,
            edgeDarkness: 0.34,
            pageMode: true,
        });
    }, [index]);

    const depthMaterial = useMemo(() => createFlexDepthMaterial(), []);

    useEffect(() => {
        if (meshRef.current) {
            meshRef.current.customDepthMaterial = depthMaterial;
        }

        return () => {
            renderMaterial.dispose();
            depthMaterial.dispose();
        };
    }, [renderMaterial, depthMaterial]);

    useFrame((state, delta) => {
        const open = motion.current.open;
        const gateway = motion.current.gateway;
        const localDelay = index * 0.012;
        const localDuration = 0.64 + index * 0.006;
        const t = smoothstep(0.14 + localDelay, 0.14 + localDelay + localDuration, open);

        const pageSoftness = 1 - index / Math.max(1, total - 1);
        const flutter = Math.sin(state.clock.elapsedTime * (1.15 + index * 0.05) + index * 0.9) * 0.012 * (1 - t) * pageSoftness;
        const peelAngle = -t * (2.54 + pageSoftness * 0.18);
        const settledAngle = -0.032 + index * 0.002;

        if (pivotRef.current) {
            pivotRef.current.rotation.y = damp(pivotRef.current.rotation.y, peelAngle + settledAngle + flutter, 7.2, delta);
            pivotRef.current.rotation.z = damp(pivotRef.current.rotation.z, Math.sin(t * Math.PI) * 0.018 * pageSoftness, 6.0, delta);
            pivotRef.current.position.z = damp(pivotRef.current.position.z, -0.055 + index * 0.0065 + Math.sin(t * Math.PI) * 0.026, 7.0, delta);
            pivotRef.current.position.y = damp(pivotRef.current.position.y, Math.sin(t * Math.PI) * 0.012 * pageSoftness, 7.0, delta);
        }

        const fiberScale = lerp(1.0, 48.0, gateway);
        const dissolve = clamp01(gateway * 1.08 - index * 0.008);
        const amplitude = lerp(0.16, 0.31, pageSoftness);

        applySharedUniforms(renderMaterial, state.clock.elapsedTime, t, amplitude, fiberScale, dissolve);
        applySharedUniforms(depthMaterial, state.clock.elapsedTime, t, amplitude, fiberScale, dissolve);
    });

    const pageInset = 0.035;
    const zOffset = -0.045 + index * 0.0065;
    const yJitter = (index % 5) * 0.0015;
    const xJitter = (index % 4) * 0.0025;

    return (
        <group ref={pivotRef} position={[xJitter, yJitter, zOffset]}>
            <mesh ref={meshRef} castShadow receiveShadow position={[PAGE_WIDTH / 2 - pageInset, 0, 0]}>
                <primitive attach="geometry" object={pageGeometry} />
                <primitive attach="material" object={renderMaterial} />
            </mesh>
        </group>
    );
}

function PageBlockEdges({ motion }) {
    const edgeRef = useRef(null);

    const edgeGeometry = useMemo(() => new THREE.BoxGeometry(PAGE_WIDTH - 0.06, PAGE_HEIGHT - 0.04, 0.11, 1, 1, 8), []);

    const material = useMemo(
        () =>
            createPatinaStandardMaterial({
                baseColor: "#E7D3B6",
                patinaColor: AUTHORHUB_COLORS.burntCaramel,
                inkColor: AUTHORHUB_COLORS.chocolateRoast,
                roughness: 0.96,
                metalness: 0,
                side: THREE.FrontSide,
                edgeDarkness: 0.58,
                pageMode: false,
            }),
        [],
    );

    useFrame((state, delta) => {
        const open = motion.current.open;
        const gateway = motion.current.gateway;

        if (edgeRef.current) {
            edgeRef.current.scale.x = damp(edgeRef.current.scale.x, lerp(1.0, 0.92, open), 4.2, delta);
            edgeRef.current.scale.z = damp(edgeRef.current.scale.z, lerp(1.0, 0.72, open), 4.2, delta);
        }

        applySharedUniforms(material, state.clock.elapsedTime, open, 0.012, lerp(1, 42, gateway), gateway * 0.6);
    });

    useEffect(() => {
        return () => {
            edgeGeometry.dispose();
            material.dispose();
        };
    }, [edgeGeometry, material]);

    return (
        <mesh ref={edgeRef} castShadow receiveShadow position={[PAGE_WIDTH / 2 - 0.03, 0, -0.052]}>
            <primitive attach="geometry" object={edgeGeometry} />
            <primitive attach="material" object={material} />
        </mesh>
    );
}

function BookModel({ motion, scrollProgress, autoOpen }) {
    const groupRef = useRef(null);

    const pageGeometry = useMemo(() => new THREE.PlaneGeometry(PAGE_WIDTH - 0.11, PAGE_HEIGHT - 0.14, PAGE_SEGMENTS, PAGE_SEGMENTS), []);

    const coverGeometry = useMemo(
        () => new THREE.BoxGeometry(PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.2, COVER_THICKNESS, 8, 20, 4),
        [],
    );

    useFrame((state, delta) => {
        const elapsed = state.clock.elapsedTime;

        let openTarget = 1;
        let stowTarget = 0;

        if (typeof scrollProgress === "number") {
            openTarget = smoothstep(0.02, 0.42, scrollProgress);
            stowTarget = smoothstep(0.56, 0.92, scrollProgress);
        } else if (autoOpen) {
            openTarget = smoothstep(0.0, 1.0, elapsed / 2.8);
            stowTarget = 0;
        }

        motion.current.open = damp(motion.current.open, openTarget, 2.4, delta);
        motion.current.stow = damp(motion.current.stow, stowTarget, 2.8, delta);

        const open = motion.current.open;
        const stow = motion.current.stow;
        const gateway = motion.current.gateway;

        if (groupRef.current) {
            const levitation = Math.sin(elapsed * 0.78) * 0.055 * (1 - stow) * (1 - gateway);
            const slowYaw = Math.sin(elapsed * 0.35) * 0.045 * (1 - stow) * (1 - gateway);
            const slowRoll = Math.sin(elapsed * 0.51 + 1.7) * 0.022 * (1 - stow) * (1 - gateway);

            const targetX = lerp(1.65, 0.06, open);
            const targetY = lerp(-0.04, 0.06, open) + levitation;
            const targetZ = lerp(0.0, 0.0, open);

            groupRef.current.position.x = damp(groupRef.current.position.x, lerp(targetX, 0.0, stow), 2.8, delta);
            groupRef.current.position.y = damp(groupRef.current.position.y, lerp(targetY, 0.02, stow), 2.8, delta);
            groupRef.current.position.z = damp(groupRef.current.position.z, targetZ, 2.8, delta);

            groupRef.current.rotation.x = damp(groupRef.current.rotation.x, lerp(-0.34, -0.08, stow), 2.9, delta);
            groupRef.current.rotation.y = damp(groupRef.current.rotation.y, -0.58 + slowYaw + stow * Math.PI * 0.25 + gateway * 0.12, 2.9, delta);
            groupRef.current.rotation.z = damp(groupRef.current.rotation.z, 0.12 + slowRoll - stow * 0.22, 2.9, delta);

            const targetScale = lerp(1.0, 0.82, stow);
            const gatewayScale = lerp(targetScale, 1.45, gateway);
            groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, gatewayScale, 3.4, delta));
        }
    });

    useEffect(() => {
        return () => {
            pageGeometry.dispose();
            coverGeometry.dispose();
        };
    }, [pageGeometry, coverGeometry]);

    const sheets = useMemo(() => Array.from({ length: PAGE_COUNT }, (_, index) => index), []);

    return (
        <group ref={groupRef} position={[2, 0, 0]} rotation={[-0.34, -0.58, 0.12]}>
            <Spine motion={motion} />
            <BackCover coverGeometry={coverGeometry} />
            <PageBlockEdges motion={motion} />
            {sheets.map((index) => (
                <TurningSheet key={`authorhub-sheet-${index}`} index={index} total={PAGE_COUNT} motion={motion} pageGeometry={pageGeometry} />
            ))}
            <FrontCover motion={motion} coverGeometry={coverGeometry} />
        </group>
    );
}

function BookLights() {
    return (
        <>
            <ambientLight intensity={0.48} />
            <directionalLight
                castShadow
                position={[-3.2, 4.4, 4.8]}
                intensity={2.15}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={20}
                shadow-camera-left={-5.5}
                shadow-camera-right={5.5}
                shadow-camera-top={5.5}
                shadow-camera-bottom={-5.5}
                shadow-bias={-0.00018}
                shadow-normalBias={0.026}
            />
            <pointLight position={[3.2, 2.1, 2.6]} intensity={0.72} color={AUTHORHUB_COLORS.sunsetOrange} distance={8.5} decay={2} />
            <pointLight position={[-2.4, -1.6, 3.5]} intensity={0.42} color={AUTHORHUB_COLORS.ancientAmber} distance={7.8} decay={2} />
        </>
    );
}

function ShadowCatcher() {
    const material = useMemo(
        () =>
            new THREE.ShadowMaterial({
                color: new THREE.Color(AUTHORHUB_COLORS.chocolateRoast),
                opacity: 0.22,
                transparent: true,
            }),
        [],
    );

    const geometry = useMemo(() => new THREE.PlaneGeometry(9, 7, 1, 1), []);

    useEffect(() => {
        return () => {
            material.dispose();
            geometry.dispose();
        };
    }, [material, geometry]);

    return (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0.55, -2.54, 0.15]}>
            <primitive attach="geometry" object={geometry} />
            <primitive attach="material" object={material} />
        </mesh>
    );
}

function CinematicScene({ motion, scrollProgress, autoOpen, triggerGateway }) {
    return (
        <>
            <CinematicCameraRig motion={motion} triggerGateway={triggerGateway} />
            <BookLights />
            <BookModel motion={motion} scrollProgress={scrollProgress} autoOpen={autoOpen} />
            <ShadowCatcher />
        </>
    );
}

export default function CinematicBookOpener({
    className = "",
    height = "680px",
    scrollDriven = false,
    scrollProgress,
    triggerGateway = false,
    autoOpen = true,
    title = "AuthorHub",
    subtitle = "A cinematic writing desk for living manuscripts.",
}) {
    const internalScrollProgress = useWindowScrollProgress(scrollDriven && typeof scrollProgress !== "number");
    const resolvedScrollProgress = typeof scrollProgress === "number" ? clamp01(scrollProgress) : scrollDriven ? internalScrollProgress : undefined;

    const motion = useRef({
        open: 0,
        stow: 0,
        gateway: 0,
    });

    return (
        <section
            className={`cinematic-book-opener ${triggerGateway ? "is-gateway" : ""} ${className}`}
            style={{ "--book-opener-height": height }}
        >
            <div className="cinematic-book-copy">
                <p className="cinematic-book-eyebrow">AuthorHub / Living Manuscript Interface</p>
                <h1>{title}</h1>
                <p>{subtitle}</p>
            </div>

            <div className="cinematic-book-canvas-wrap" aria-hidden="true">
                <Canvas
                    shadows
                    dpr={[1, 1.6]}
                    camera={{ position: [0.55, 0.42, 7.15], fov: 43, near: 0.02, far: 80 }}
                    gl={{
                        antialias: true,
                        alpha: true,
                        powerPreference: "high-performance",
                        stencil: false,
                        depth: true,
                    }}
                    onCreated={({ gl }) => {
                        gl.setClearColor(0x000000, 0);
                        gl.outputColorSpace = THREE.SRGBColorSpace;
                        gl.toneMapping = THREE.ACESFilmicToneMapping;
                        gl.toneMappingExposure = 1.04;
                        gl.shadowMap.enabled = true;
                        gl.shadowMap.type = THREE.PCFSoftShadowMap;
                    }}
                >
                    <CinematicScene
                        motion={motion}
                        scrollProgress={resolvedScrollProgress}
                        autoOpen={autoOpen}
                        triggerGateway={triggerGateway}
                    />
                </Canvas>
            </div>

            <div className="book-gateway-grid" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
            </div>
        </section>
    );
}