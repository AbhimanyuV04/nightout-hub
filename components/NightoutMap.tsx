"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type LocationPayload = { user_id: string; name: string; lat: number; lng: number };
type Positions = Record<string, { lat: number; lng: number; name: string }>;

const BROADCAST_INTERVAL_MS = 2000;

// Pulsing "live" dot (styles in globals.css) — this file only runs client-side (dynamic ssr:false).
const pulseIcon = L.divIcon({
  className: "",
  html: '<span class="pulse-dot"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function NightoutMap({
  roomCode,
  userId,
  userName,
}: {
  roomCode: string;
  userId: string | null;
  userName: string | null;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const centeredRef = useRef(false);

  const [positions, setPositions] = useState<Positions>({});
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const container = mapDivRef.current;
    const map = L.map(container).setView([20.5937, 78.9629], 5);
    // Dark basemap (CARTO) so the map matches the app instead of a white slab on black.
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);
    mapRef.current = map;
    // Map may init inside a hidden tab (0x0); fix size when the tab is revealed.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`room_${roomCode}`)
      .on("broadcast", { event: "location" }, ({ payload }) => {
        const p = payload as LocationPayload;
        setPositions((prev) => ({ ...prev, [p.user_id]: { lat: p.lat, lng: p.lng, name: p.name } }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [id, pos] of Object.entries(positions)) {
      const existing = markersRef.current.get(id);
      if (existing) existing.setLatLng([pos.lat, pos.lng]);
      else
        markersRef.current.set(
          id,
          L.marker([pos.lat, pos.lng], { icon: pulseIcon })
            .bindTooltip(pos.name, {
              permanent: true,
              direction: "top",
              className: "nightout-label",
            })
            .addTo(map)
        );
    }
  }, [positions]);

  useEffect(
    () => () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    },
    []
  );

  function stopSharing() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setSharing(false);
  }

  function startSharing() {
    if (!userId || !userName) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device");
      return;
    }
    setError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const payload: LocationPayload = {
          user_id: userId,
          name: userName,
          lat: coords.latitude,
          lng: coords.longitude,
        };
        setPositions((prev) => ({ ...prev, [userId]: { lat: payload.lat, lng: payload.lng, name: userName } }));
        if (!centeredRef.current) {
          centeredRef.current = true;
          mapRef.current?.setView([payload.lat, payload.lng], 15);
        }
        const now = Date.now();
        if (now - lastSentRef.current >= BROADCAST_INTERVAL_MS) {
          lastSentRef.current = now;
          channelRef.current?.send({ type: "broadcast", event: "location", payload });
        }
      },
      (err) => {
        setError(err.message);
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setSharing(true);
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Live map</h2>
        <span className="muted text-sm">{Object.keys(positions).length} sharing</span>
      </div>
      {userId ? (
        <button
          type="button"
          onClick={sharing ? stopSharing : startSharing}
          className={sharing ? "btn-ghost w-full py-3" : "btn-primary"}
        >
          {sharing ? "Stop Sharing Location" : "Start Sharing Location"}
        </button>
      ) : (
        <p className="muted text-sm">Join this room to share your location</p>
      )}
      {error && <p className="text-sm text-[#FF375F]">{error}</p>}
      <div ref={mapDivRef} className="h-[60vh] w-full overflow-hidden rounded-xl" />
    </section>
  );
}
