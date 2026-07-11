import { useEffect, useState } from "react";
import {
  loadCachedRemoteConfig,
  refreshRemoteConfig,
  type RuntimeConfig,
} from "../lib/remoteConfig";

/** Render immediately from bundled/cached controls, then refresh in place. */
export function useRemoteConfig(): RuntimeConfig {
  const [config, setConfig] = useState(loadCachedRemoteConfig);

  useEffect(() => {
    let cancelled = false;
    void refreshRemoteConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
