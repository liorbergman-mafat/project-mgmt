import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetch on mount, expose a reload() for after a mutation.
 *
 * `deps` controls when the fetch re-runs (e.g. a route param changing).
 * The stale-response guard matters on the project page: switching projects
 * quickly can otherwise let a slow first response overwrite a fast second one.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload };
}

/** How fast the glow catches up with the pointer, per frame. */
const GLOW_EASING = 0.12;
const GLOW_RADIUS = 260;

/**
 * The circuit-grid glow that follows the cursor across the main pane.
 *
 * The mask string is written straight to the node's style inside a rAF loop —
 * going through component state would re-render the whole page every frame.
 * The position is eased rather than snapped, so the glow trails the pointer.
 */
export function usePointerGlow<T extends HTMLElement>() {
  const glowRef = useRef<HTMLDivElement>(null);
  const glow = useRef({ x: 0, y: 0, tx: 0, ty: 0, on: false, seeded: false });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const tick = () => {
      const g = glow.current;
      const el = glowRef.current;
      if (el) {
        g.x += (g.tx - g.x) * GLOW_EASING;
        g.y += (g.ty - g.y) * GLOW_EASING;
        const mask =
          `radial-gradient(${GLOW_RADIUS}px circle at ${g.x.toFixed(1)}px ${g.y.toFixed(1)}px, ` +
          "rgba(0,0,0,.85) 0%, rgba(0,0,0,.45) 45%, rgba(0,0,0,0) 72%)";
        el.style.setProperty("mask-image", mask);
        el.style.setProperty("-webkit-mask-image", mask);
        el.style.opacity = g.on ? "1" : "0";
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const g = glow.current;
    g.tx = e.clientX - rect.left;
    g.ty = e.clientY - rect.top;
    // Jump to the pointer on the first move, so the glow does not sweep in
    // from the corner of the pane.
    if (!g.seeded) {
      g.x = g.tx;
      g.y = g.ty;
      g.seeded = true;
    }
    g.on = true;
  }, []);

  const onMouseLeave = useCallback(() => {
    glow.current.on = false;
  }, []);

  return { glowRef, onMouseMove, onMouseLeave };
}
