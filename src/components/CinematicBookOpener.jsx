import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const PAGE_WIDTH = 3.25;
const PAGE_HEIGHT = 4.65;
const PAGE_SEGMENTS = 32;
const PAGE_COUNT = 20;
const COVER_THICKNESS = 0.09;
const STACK_THICKNESS = 0.28;

const BOOK_ASSETS = {
  cover: "/bookcover.png",
  inside: "/bookinside.png",
};

const AUTHORHUB_COLORS = {
  chocolateRoast: "#2B1010",
  sunsetOrange: "#F2994A",
  ancientAmber: "#D7898E",
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

function makeCanvasTexture(canvas, gl) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy?.() ?? 1);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function useImageTexture(url) {
  const { gl } = useThree();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let alive = true;
    let loadedTexture = null;
    const loader = new THREE.TextureLoader();

    loader.load(
      url,
      (nextTexture) => {
        if (!alive) {
          nextTexture.dispose();
          return;
        }
        loadedTexture = nextTexture;
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy?.() ?? 1);
        nextTexture.wrapS = THREE.ClampToEdgeWrapping;
        nextTexture.wrapT = THREE.ClampToEdgeWrapping;
        nextTexture.needsUpdate = true;
        setTexture(nextTexture);
      },
      undefined,
      () => {
        if (alive) setTexture(null);
      },
    );

    return () => {
      alive = false;
      loadedTexture?.dispose();
    };
  }, [url, gl]);

  return texture;
}

function useProcessedPaperTexture(url) {
  const { gl } = useThree();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let alive = true;
    let generatedTexture = null;
    const image = new Image();

    image.onload = () => {
      if (!alive) return;
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1536;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f3eee5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.filter = "contrast(1.42) saturate(0.82) brightness(1.04)";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#a88967";
      for (let i = 0; i < 1800; i += 1) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const length = 2 + Math.random() * 18;
        ctx.fillRect(x, y, length, Math.random() > 0.8 ? 1.1 : 0.45);
      }
      generatedTexture = makeCanvasTexture(canvas, gl);
      setTexture(generatedTexture);
    };

    image.onerror = () => {
      if (alive) setTexture(null);
    };

    image.src = url;

    return () => {
      alive = false;
      generatedTexture?.dispose();
    };
  }, [url, gl]);

  return texture;
}

function useSpineFromCoverTexture(url) {
  const { gl } = useThree();
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let alive = true;
    let generatedTexture = null;
    const image = new Image();

    image.onload = () => {
      if (!alive) return;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      const cropWidth = image.naturalWidth * 0.24;
      ctx.drawImage(image, 0, 0, cropWidth, image.naturalHeight, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#d8d0c4";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#070707";
      ctx.fillRect(0, 0, 12, canvas.height);
      ctx.fillRect(canvas.width - 14, 0, 14, canvas.height);
      generatedTexture = makeCanvasTexture(canvas, gl);
      setTexture(generatedTexture);
    };

    image.onerror = () => {
      if (alive) setTexture(null);
    };

    image.src = url;

    return () => {
      alive = false;
      generatedTexture?.dispose();
    };
  }, [url, gl]);

  return texture;
}

function CinematicCameraRig({ motion, triggerGateway }) {
  const { camera } = useThree();
  const lookAtRef = useRef(new THREE.Vector3(0.42, 0.04, 0));

  useFrame((state, delta) => {
    const gatewayTarget = triggerGateway ? 1 : 0;
    motion.current.gateway = damp(motion.current.gateway, gatewayTarget, 3.8, delta);

    const gateway = motion.current.gateway;
    const stow = motion.current.stow;
    const baseX = lerp(0.46, 0.12, stow);
    const baseY = lerp(0.36, 0.1, stow);
    const baseZ = lerp(7.0, 5.15, stow);

    camera.position.x = damp(camera.position.x, lerp(baseX, 0.14, gateway), gateway > 0.02 ? 5.8 : 3.2, delta);
    camera.position.y = damp(camera.position.y, lerp(baseY, 0.03, gateway), gateway > 0.02 ? 5.8 : 3.2, delta);
    camera.position.z = damp(camera.position.z, lerp(baseZ, 1.08, gateway), gateway > 0.02 ? 5.8 : 3.2, delta);
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

function FrontCover({ motion, coverGeometry, coverTexture, insideTexture }) {
  const pivotRef = useRef(null);

  useFrame((state, delta) => {
    const t = smoothstep(0.04, 0.74, motion.current.open);
    const weightedEase = t * t * (3 - 2 * t);
    if (pivotRef.current) {
      pivotRef.current.rotation.y = damp(pivotRef.current.rotation.y, -weightedEase * 2.72, 5.6, delta);
      pivotRef.current.rotation.z = damp(pivotRef.current.rotation.z, -0.018 * Math.sin(state.clock.elapsedTime * 0.8) * (1 - t), 5.0, delta);
    }
  });

  const coverMaterialProps = {
    map: coverTexture,
    bumpMap: coverTexture,
    bumpScale: 0.025,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: false,
  };

  return (
    <group ref={pivotRef} position={[0, 0, 0.075]}>
      <mesh castShadow receiveShadow position={[PAGE_WIDTH / 2, 0, 0]}>
        <primitive attach="geometry" object={coverGeometry} />
        <meshStandardMaterial attach="material-0" color="#ece6da" roughness={0.95} bumpMap={insideTexture} bumpScale={0.022} />
        <meshStandardMaterial attach="material-1" color="#d8d0c4" roughness={0.95} bumpMap={insideTexture} bumpScale={0.022} />
        <meshStandardMaterial attach="material-2" color="#f0e9dd" roughness={0.96} bumpMap={insideTexture} bumpScale={0.02} />
        <meshStandardMaterial attach="material-3" color="#cec4b7" roughness={0.96} bumpMap={insideTexture} bumpScale={0.02} />
        <meshStandardMaterial attach="material-4" {...coverMaterialProps} />
        <meshStandardMaterial attach="material-5" {...coverMaterialProps} />
      </mesh>
      <mesh position={[PAGE_WIDTH / 2, 0, COVER_THICKNESS / 2 + 0.006]} castShadow receiveShadow>
        <planeGeometry args={[PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.2, 1, 1]} />
        <meshStandardMaterial {...coverMaterialProps} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh position={[PAGE_WIDTH / 2, 0, -COVER_THICKNESS / 2 - 0.006]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <planeGeometry args={[PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.2, 1, 1]} />
        <meshStandardMaterial {...coverMaterialProps} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
    </group>
  );
}

function BackCover({ coverGeometry, insideTexture }) {
  return (
    <mesh castShadow receiveShadow position={[PAGE_WIDTH / 2, 0, -0.115]}>
      <primitive attach="geometry" object={coverGeometry} />
      <meshStandardMaterial attach="material-0" color="#ded6c9" map={insideTexture} roughness={0.98} bumpMap={insideTexture} bumpScale={0.05} />
      <meshStandardMaterial attach="material-1" color="#d5cabd" map={insideTexture} roughness={0.98} bumpMap={insideTexture} bumpScale={0.05} />
      <meshStandardMaterial attach="material-2" color="#eee5d9" map={insideTexture} roughness={0.98} bumpMap={insideTexture} bumpScale={0.045} />
      <meshStandardMaterial attach="material-3" color="#d6cabd" map={insideTexture} roughness={0.98} bumpMap={insideTexture} bumpScale={0.045} />
      <meshStandardMaterial attach="material-4" color="#fffaf1" map={insideTexture} bumpMap={insideTexture} bumpScale={0.065} roughness={0.99} />
      <meshStandardMaterial attach="material-5" color="#fffaf1" map={insideTexture} bumpMap={insideTexture} bumpScale={0.065} roughness={0.99} />
    </mesh>
  );
}

function Spine({ spineTexture, insideTexture }) {
  const spineRef = useRef(null);
  const spineGeometry = useMemo(() => new THREE.BoxGeometry(0.25, PAGE_HEIGHT + 0.24, STACK_THICKNESS + 0.24, 6, 20, 6), []);

  useFrame((state, delta) => {
    if (spineRef.current) {
      spineRef.current.rotation.z = damp(spineRef.current.rotation.z, Math.sin(state.clock.elapsedTime * 0.7) * 0.006, 2.8, delta);
    }
  });

  useEffect(() => () => spineGeometry.dispose(), [spineGeometry]);

  return (
    <mesh ref={spineRef} castShadow receiveShadow position={[-0.12, 0, -0.015]}>
      <primitive attach="geometry" object={spineGeometry} />
      <meshStandardMaterial attach="material-0" map={spineTexture} bumpMap={insideTexture} bumpScale={0.04} roughness={0.97} />
      <meshStandardMaterial attach="material-1" map={spineTexture} bumpMap={insideTexture} bumpScale={0.04} roughness={0.97} />
      <meshStandardMaterial attach="material-2" color="#f0ebe1" map={insideTexture} bumpMap={insideTexture} bumpScale={0.05} roughness={0.98} />
      <meshStandardMaterial attach="material-3" color="#d9d0c4" map={insideTexture} bumpMap={insideTexture} bumpScale={0.05} roughness={0.98} />
      <meshStandardMaterial attach="material-4" map={spineTexture} bumpMap={insideTexture} bumpScale={0.04} roughness={0.97} />
      <meshStandardMaterial attach="material-5" map={spineTexture} bumpMap={insideTexture} bumpScale={0.04} roughness={0.97} />
    </mesh>
  );
}

function TurningSheet({ index, total, motion, pageGeometry, insideTexture }) {
  const pivotRef = useRef(null);

  useFrame((state, delta) => {
    const localDelay = index * 0.012;
    const localDuration = 0.64 + index * 0.006;
    const t = smoothstep(0.14 + localDelay, 0.14 + localDelay + localDuration, motion.current.open);
    const pageSoftness = 1 - index / Math.max(1, total - 1);
    const flutter = Math.sin(state.clock.elapsedTime * (1.15 + index * 0.05) + index * 0.9) * 0.012 * (1 - t) * pageSoftness;

    if (pivotRef.current) {
      pivotRef.current.rotation.y = damp(pivotRef.current.rotation.y, -t * (2.54 + pageSoftness * 0.18) - 0.032 + index * 0.002 + flutter, 7.2, delta);
      pivotRef.current.rotation.z = damp(pivotRef.current.rotation.z, Math.sin(t * Math.PI) * 0.018 * pageSoftness, 6.0, delta);
      pivotRef.current.position.z = damp(pivotRef.current.position.z, -0.055 + index * 0.0065 + Math.sin(t * Math.PI) * 0.026, 7.0, delta);
      pivotRef.current.position.y = damp(pivotRef.current.position.y, Math.sin(t * Math.PI) * 0.012 * pageSoftness, 7.0, delta);
    }
  });

  const pageInset = 0.035;
  const zOffset = -0.045 + index * 0.0065;
  const yJitter = (index % 5) * 0.0015;
  const xJitter = (index % 4) * 0.0025;

  return (
    <group ref={pivotRef} position={[xJitter, yJitter, zOffset]}>
      <mesh castShadow receiveShadow position={[PAGE_WIDTH / 2 - pageInset, 0, 0]}>
        <primitive attach="geometry" object={pageGeometry} />
        <meshStandardMaterial
          map={insideTexture}
          bumpMap={insideTexture}
          bumpScale={0.07}
          color="#fffdf7"
          roughness={0.99}
          metalness={0}
          side={THREE.DoubleSide}
          transparent
          opacity={0.992}
        />
      </mesh>
    </group>
  );
}

function PageBlockEdges({ motion, insideTexture }) {
  const edgeRef = useRef(null);
  const edgeGeometry = useMemo(() => new THREE.BoxGeometry(PAGE_WIDTH - 0.06, PAGE_HEIGHT - 0.04, 0.11, 1, 1, 8), []);

  useFrame((state, delta) => {
    if (edgeRef.current) {
      edgeRef.current.scale.x = damp(edgeRef.current.scale.x, lerp(1.0, 0.92, motion.current.open), 4.2, delta);
      edgeRef.current.scale.z = damp(edgeRef.current.scale.z, lerp(1.0, 0.72, motion.current.open), 4.2, delta);
    }
  });

  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  return (
    <mesh ref={edgeRef} castShadow receiveShadow position={[PAGE_WIDTH / 2 - 0.03, 0, -0.052]}>
      <primitive attach="geometry" object={edgeGeometry} />
      <meshStandardMaterial map={insideTexture} bumpMap={insideTexture} bumpScale={0.045} color="#fff8ee" roughness={0.99} />
    </mesh>
  );
}

function BookModel({ motion, scrollProgress, autoOpen }) {
  const groupRef = useRef(null);
  const coverTexture = useImageTexture(BOOK_ASSETS.cover);
  const insideTexture = useProcessedPaperTexture(BOOK_ASSETS.inside);
  const spineTexture = useSpineFromCoverTexture(BOOK_ASSETS.cover);

  const pageGeometry = useMemo(() => new THREE.PlaneGeometry(PAGE_WIDTH - 0.11, PAGE_HEIGHT - 0.14, PAGE_SEGMENTS, PAGE_SEGMENTS), []);
  const coverGeometry = useMemo(() => new THREE.BoxGeometry(PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.2, COVER_THICKNESS, 8, 20, 4), []);
  const sheets = useMemo(() => Array.from({ length: PAGE_COUNT }, (_, index) => index), []);

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

      groupRef.current.position.x = damp(groupRef.current.position.x, lerp(targetX, 0.0, stow), 2.8, delta);
      groupRef.current.position.y = damp(groupRef.current.position.y, lerp(targetY, 0.02, stow), 2.8, delta);
      groupRef.current.position.z = damp(groupRef.current.position.z, 0, 2.8, delta);
      groupRef.current.rotation.x = damp(groupRef.current.rotation.x, lerp(-0.34, -0.08, stow), 2.9, delta);
      groupRef.current.rotation.y = damp(groupRef.current.rotation.y, -0.58 + slowYaw + stow * Math.PI * 0.25 + gateway * 0.12, 2.9, delta);
      groupRef.current.rotation.z = damp(groupRef.current.rotation.z, 0.12 + slowRoll - stow * 0.22, 2.9, delta);
      groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, lerp(lerp(1.0, 0.82, stow), 1.45, gateway), 3.4, delta));
    }
  });

  useEffect(() => () => {
    pageGeometry.dispose();
    coverGeometry.dispose();
  }, [pageGeometry, coverGeometry]);

  return (
    <group ref={groupRef} position={[2, 0, 0]} rotation={[-0.34, -0.58, 0.12]}>
      <Spine spineTexture={spineTexture} insideTexture={insideTexture} />
      <BackCover coverGeometry={coverGeometry} insideTexture={insideTexture} />
      <PageBlockEdges motion={motion} insideTexture={insideTexture} />
      {sheets.map((index) => (
        <TurningSheet key={`authorhub-sheet-${index}`} index={index} total={PAGE_COUNT} motion={motion} pageGeometry={pageGeometry} insideTexture={insideTexture} />
      ))}
      <FrontCover motion={motion} coverGeometry={coverGeometry} coverTexture={coverTexture} insideTexture={insideTexture} />
    </group>
  );
}

function BookLights() {
  return (
    <>
      <ambientLight intensity={0.24} />
      <hemisphereLight args={["#fff3df", "#160f12", 0.72]} />
      <directionalLight
        castShadow
        position={[-3.6, 5.2, 4.5]}
        intensity={2.55}
        color="#fff1d8"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={22}
        shadow-camera-left={-5.5}
        shadow-camera-right={5.5}
        shadow-camera-top={5.5}
        shadow-camera-bottom={-5.5}
        shadow-bias={-0.00014}
        shadow-normalBias={0.028}
      />
      <spotLight position={[2.8, 3.0, 3.8]} angle={0.46} penumbra={0.86} intensity={0.9} color={AUTHORHUB_COLORS.sunsetOrange} distance={9} decay={2} />
      <pointLight position={[-2.8, -1.45, 3.6]} intensity={0.34} color={AUTHORHUB_COLORS.ancientAmber} distance={7.8} decay={2} />
      <pointLight position={[3.8, 0.9, -2.4]} intensity={0.38} color="#c7d2ff" distance={7.2} decay={2} />
    </>
  );
}

function ShadowCatcher() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0.55, -2.54, 0.15]}>
      <planeGeometry args={[9, 7]} />
      <shadowMaterial color={AUTHORHUB_COLORS.chocolateRoast} opacity={0.24} transparent />
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
  const motion = useRef({ open: 0, stow: 0, gateway: 0 });

  return (
    <section className={`cinematic-book-opener ${triggerGateway ? "is-gateway" : ""} ${className}`} style={{ "--book-opener-height": height }}>
      <div className="cinematic-book-copy">
        <p className="cinematic-book-eyebrow">AuthorHub / Living Manuscript Interface</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="cinematic-book-canvas-wrap" aria-hidden="true">
        <Canvas
          shadows
          dpr={[1.25, 2]}
          camera={{ position: [0.46, 0.36, 7.0], fov: 43, near: 0.02, far: 80 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false, depth: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
          <CinematicScene motion={motion} scrollProgress={resolvedScrollProgress} autoOpen={autoOpen} triggerGateway={triggerGateway} />
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
