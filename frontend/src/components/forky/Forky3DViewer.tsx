import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "motion/react";

export type ForkyState = "idle" | "greet" | "talk" | "think" | "happy";

const CLIPS = ["idle", "greet", "talk", "think", "happy"];

type GLTFResult = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

function ForkyModel({ state }: { state: ForkyState }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/assets/forky/forky.glb") as GLTFResult;
  const { actions } = useAnimations(animations, group);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      for (const clip of CLIPS) actions[clip]?.stop();
      return;
    }
    for (const clip of CLIPS) {
      const action = actions[clip];
      if (action && action !== actions[state]) {
        action.fadeOut(0.25);
      }
    }
    const target = actions[state] ?? actions.idle;
    if (target) {
      target.reset();
      target.fadeIn(0.25);
      target.play();
    }
    return () => {
      for (const clip of CLIPS) actions[clip]?.stop();
    };
  }, [state, actions, reduceMotion]);

  return <primitive object={scene} ref={group} />;
}

/**
 * Forky 3D viewer. SSR-safe: renders nothing until mounted (no three.js on the
 * server). The GLB carries the idle/greet/talk/think/happy clips; the current
 * `state` crossfades into the matching clip.
 */
export function Forky3DViewer({ state }: { state: ForkyState }) {
  const [mounted, setMounted] = useState(false);
  const [webglOk, setWebglOk] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Probe WebGL availability before mounting the Canvas: in environments
    // without a GPU (headless CI, VMs, strict privacy browsers) creating a
    // context can crash the renderer. Fall back to the 2D sprite.
    let cancelled = false;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ??
        canvas.getContext("webgl");
      if (!cancelled) setWebglOk(!!gl);
    } catch {
      if (!cancelled) setWebglOk(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div data-testid="forky-canvas" className="flex h-full w-full items-center justify-center overflow-hidden">
      {mounted && !webglOk ? (
        <img
          src="/assets/forky/forky-preview.png"
          alt="Forky"
          className="h-2/3 max-h-72 w-auto drop-shadow-[0_18px_30px_rgba(124,92,255,0.35)]"
        />
      ) : null}
      {mounted && webglOk ? (
        <Canvas
          camera={{ position: [0.55, -0.8, 0.45], fov: 38 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[2, 3, 2.5]} intensity={1.6} />
          <directionalLight position={[-2.5, 1.5, -2]} intensity={0.5} />
          <pointLight position={[0.5, 1.2, -0.8]} intensity={12} color="#ffe9c4" />
          <ForkyModel state={state} />
        </Canvas>
      ) : null}
    </div>
  );
}
