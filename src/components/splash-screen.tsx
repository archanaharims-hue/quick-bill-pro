import { useEffect, useState } from "react";

/**
 * How long the SSC splash stays fully visible before it starts fading out,
 * in milliseconds. Adjust this single constant to change the splash duration.
 */
export const SPLASH_DURATION_MS = 2000;

/** Duration of the fade-out transition into the app, in milliseconds. */
const SPLASH_FADE_MS = 500;

/**
 * Full-screen "SSC" launch animation. It renders on every app start, stays for
 * SPLASH_DURATION_MS, then smoothly fades out and unmounts.
 */
export function SplashScreen() {
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setLeaving(true), SPLASH_DURATION_MS);
    const removeTimer = setTimeout(
      () => setDone(true),
      SPLASH_DURATION_MS + SPLASH_FADE_MS,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (done) return null;

  return (
    <div
      className={`splash-root${leaving ? " splash-leaving" : ""}`}
      style={{ "--splash-fade": `${SPLASH_FADE_MS}ms` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="splash-glow" />
      <div className="splash-logo">
        <span className="splash-letter" style={{ animationDelay: "0ms" }}>S</span>
        <span className="splash-letter" style={{ animationDelay: "130ms" }}>S</span>
        <span className="splash-letter" style={{ animationDelay: "260ms" }}>C</span>
      </div>
      <div className="splash-bar">
        <span />
      </div>
    </div>
  );
}
