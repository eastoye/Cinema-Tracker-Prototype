import { useState, useCallback } from "react";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface UseLocationReturn {
  status: LocationStatus;
  location: UserLocation | null;
  error: string | null;
  requestLocation: () => void;
}

export function useLocation(): UseLocationReturn {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError("Geolocation is not supported by your browser");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        setStatus("denied");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please allow location access and try again."
            : "Could not determine your location. Please try again."
        );
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { status, location, error, requestLocation };
}
