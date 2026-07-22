import { useEffect, useRef, useState } from "react";
import {
  loadCachedRemoteConfig,
  refreshRemoteConfig,
  type RuntimeConfig,
} from "../lib/remoteConfig";

/** Render immediately from bundled/cached controls, then refresh in place. */
export function useRemoteConfig(): RuntimeConfig {
  const [config, setConfig] = useState(loadCachedRemoteConfig);
  const refreshInFlightRef = useRef<Promise<RuntimeConfig> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      let request = refreshInFlightRef.current;
      if (!request) {
        request = refreshRemoteConfig();
        refreshInFlightRef.current = request;
        void request.then(
          () => {
            if (refreshInFlightRef.current === request) {
              refreshInFlightRef.current = null;
            }
          },
          () => {
            if (refreshInFlightRef.current === request) {
              refreshInFlightRef.current = null;
            }
          },
        );
      }

      void request.then(
        (next) => {
          if (!cancelled) {
            setConfig((current) =>
              next.revision >= current.revision ? next : current,
            );
          }
        },
        () => undefined,
      );
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    document.addEventListener("resume", refresh);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      document.removeEventListener("resume", refresh);
    };
  }, []);

  return config;
}
