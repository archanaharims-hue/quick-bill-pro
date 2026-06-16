import { useEffect, useRef, useCallback } from "react";

type Handler = (e: PointerEvent | MouseEvent) => void;

/**
 * Triggers on long-press (~500ms touch hold) OR double-click on non-touch devices.
 */
export function useLongPress(onTrigger: Handler, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggered = useRef(false);
  const handlerRef = useRef(onTrigger);
  handlerRef.current = onTrigger;

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") return;
      triggered.current = false;
      const ev = e.nativeEvent;
      timer.current = setTimeout(() => {
        triggered.current = true;
        try { navigator.vibrate?.(15); } catch {}
        handlerRef.current(ev);
      }, ms);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: (e: React.MouseEvent) => {
      if (triggered.current) {
        e.preventDefault();
        e.stopPropagation();
        triggered.current = false;
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (triggered.current) e.preventDefault();
    },
    onDoubleClick: (e: React.MouseEvent) => {
      handlerRef.current(e.nativeEvent);
    },
  };
}
