"use client";

import { useRef, useCallback, useEffect } from "react";

export function useMap(containerRef: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);

  const getMap = useCallback(() => mapRef.current, []);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return { mapRef, getMap };
}
