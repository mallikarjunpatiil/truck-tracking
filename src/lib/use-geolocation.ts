"use client";

import { useState, useCallback } from "react";

export interface GeoLocationResult {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: "granted" | "denied" | "unavailable" | "not_supported";
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<GeoLocationResult | null>(null);

  const requestLocation = useCallback((): Promise<GeoLocationResult> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        const res: GeoLocationResult = {
          latitude: null,
          longitude: null,
          accuracy: null,
          status: "not_supported",
        };
        setLocation(res);
        resolve(res);
        return;
      }

      setLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false);
          const res: GeoLocationResult = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            status: "granted",
          };
          setLocation(res);
          resolve(res);
        },
        (error) => {
          setLoading(false);
          let status: "denied" | "unavailable" = "denied";
          if (error.code === error.PERMISSION_DENIED) {
            status = "denied";
          } else {
            status = "unavailable";
          }
          const res: GeoLocationResult = {
            latitude: null,
            longitude: null,
            accuracy: null,
            status,
          };
          setLocation(res);
          resolve(res);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  return { requestLocation, location, loading };
}
