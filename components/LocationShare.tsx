"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type NightoutMapType from "./NightoutMap";

// ponytail: ssr:false requires a client wrapper — Leaflet touches window at import time
const NightoutMap = dynamic(() => import("./NightoutMap"), {
  ssr: false,
  loading: () => <div className="border p-4 h-64">Loading map...</div>,
});

export default function LocationShare(props: ComponentProps<typeof NightoutMapType>) {
  return <NightoutMap {...props} />;
}
