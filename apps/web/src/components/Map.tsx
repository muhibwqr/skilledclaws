"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";
const TREND_SOURCE_ID = "trend-data";
const HEATMAP_LAYER_ID = "trend-heatmap";

export interface MapProps {
  accessToken: string;
  geojson?: GeoJSON.FeatureCollection | null;
  className?: string;
}

export function Map({ accessToken, geojson, className }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !accessToken || initializedRef.current) return;
    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 2,
    });

    map.on("load", () => {
      map.addSource(TREND_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: "heatmap",
        source: TREND_SOURCE_ID,
        maxzoom: 14,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": 1,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(51,51,51,0)",
            0.25,
            "rgba(102,102,102,0.5)",
            0.5,
            "rgba(153,153,153,0.6)",
            0.75,
            "rgba(204,204,204,0.8)",
            1,
            "rgba(255,255,255,0.9)",
          ],
          "heatmap-radius": 20,
          "heatmap-opacity": 0.85,
        },
      });
    });

    mapRef.current = map;
    initializedRef.current = true;

    return () => {
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
    };
  }, [accessToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(TREND_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(geojson ?? { type: "FeatureCollection", features: [] });
  }, [geojson]);

  return <div ref={containerRef} className={className ?? "absolute inset-0"} />;
}
