"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reconcile, type Execution } from "@/lib/tabata/engine";
import {
  activeExecution,
  AUDIO_LOCK,
  DATA_LOCK,
  emptyData,
  readData,
  STORAGE_KEY,
  writeData,
  type SavedData,
} from "@/lib/tabata/storage";

export function useTabata() {
  const [data, setData] = useState<SavedData>(emptyData);
  const current = useRef(data);
  const healthy = useRef(true);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(0);
  const [audioOwner, setAudioOwner] = useState(false);
  const owner = useRef(false);
  const [wake, setWake] = useState<"off" | "active" | "unavailable">("off");
  const apply = useCallback((next: SavedData) => {
    current.current = next;
    setData(next);
  }, []);
  const mutate = useCallback(
    async (change: (latest: SavedData) => SavedData) => {
      const commit = () => {
        const loaded = healthy.current ? readData() : { data: current.current };
        if (loaded.error) {
          healthy.current = false;
          setNotice(loaded.error);
        }
        const next = change(loaded.error ? current.current : loaded.data);
        try {
          // Preserve an unreadable original before the user starts saving new data.
          if (!healthy.current) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && readData().error)
              localStorage.setItem(`${STORAGE_KEY}.unreadable`, raw);
          }
          apply(writeData(next));
          healthy.current = true;
        } catch {
          healthy.current = false;
          apply(next);
          setNotice(
            "O navegador não conseguiu salvar. O timer continua funcionando nesta aba; seus últimos ajustes podem não permanecer ao fechar.",
          );
        }
      };
      try {
        if (navigator.locks) await navigator.locks.request(DATA_LOCK, commit);
        else commit();
      } catch {
        setNotice("Não foi possível atualizar os dados. Tente novamente.");
      }
    },
    [apply],
  );

  useEffect(() => {
    const loaded = readData();
    healthy.current = !loaded.error;
    apply(loaded.data);
    if (loaded.error) setNotice(loaded.error);
    setNow(Date.now());
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const latest = readData();
      if (!latest.error) {
        healthy.current = true;
        apply(latest.data);
      }
    };
    const clock = () => setNow(Date.now());
    const interval = window.setInterval(clock, 100);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", clock);
    window.addEventListener("pageshow", clock);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", clock);
      window.removeEventListener("pageshow", clock);
    };
  }, [apply]);

  // Keep one alert owner; a visible tab can take over from a hidden owner.
  useEffect(() => {
    let disposed = false;
    let pending = false;
    let release: (() => void) | undefined;
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(AUDIO_LOCK)
        : null;
    if (channel)
      channel.onmessage = () => {
        if (document.visibilityState !== "visible") release?.();
      };
    const elect = () => {
      if (document.visibilityState !== "visible") return;
      channel?.postMessage("visible");
      if (disposed || pending || owner.current) return;
      if (!navigator.locks) {
        owner.current = true;
        setAudioOwner(true);
        return;
      }
      pending = true;
      void navigator.locks
        .request(AUDIO_LOCK, { ifAvailable: true }, async (lock) => {
          if (!lock || disposed || document.visibilityState !== "visible")
            return;
          owner.current = true;
          setAudioOwner(true);
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          owner.current = false;
          if (!disposed) setAudioOwner(false);
        })
        .catch(() => {})
        .finally(() => {
          pending = false;
        });
    };
    const visibility = () => {
      if (document.visibilityState !== "visible" && !navigator.locks) {
        owner.current = false;
        setAudioOwner(false);
      }
      elect();
    };
    elect();
    const interval = setInterval(elect, 1000);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      owner.current = false;
      release?.();
      channel?.close();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const active = activeExecution(data);
  useEffect(() => {
    if (!ready || !active || active.status !== "running") return;
    if (reconcile(active, now).status !== "completed") return;
    void mutate((latest) => ({
      ...latest,
      executions: latest.executions.map((e) => reconcile(e, Date.now())),
    }));
  }, [active, now, ready, mutate]);

  useEffect(() => {
    let disposed = false;
    let sentinel: WakeLockSentinel | undefined;
    const shouldHold =
      active?.status === "running" && data.preferences.keepAwake && audioOwner;
    const acquire = async () => {
      if (!shouldHold || document.visibilityState !== "visible") {
        setWake("off");
        return;
      }
      if (!navigator.wakeLock) {
        setWake("unavailable");
        return;
      }
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed) {
          await next.release();
          return;
        }
        sentinel = next;
        setWake("active");
        next.addEventListener("release", () => {
          if (!disposed)
            setWake(
              document.visibilityState === "visible" ? "unavailable" : "off",
            );
        });
      } catch {
        if (!disposed) setWake("unavailable");
      }
    };
    void acquire();
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        (!sentinel || sentinel.released)
      )
        void acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      void sentinel?.release().catch(() => {});
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active?.status, data.preferences.keepAwake, audioOwner]);

  const updateExecution = useCallback(
    (id: string, update: (execution: Execution) => Execution) =>
      mutate((latest) => ({
        ...latest,
        executions: latest.executions.map((e) => (e.id === id ? update(e) : e)),
      })),
    [mutate],
  );
  return {
    data,
    ready,
    notice,
    setNotice,
    now,
    mutate,
    updateExecution,
    active,
    audioOwner,
    wake,
  };
}
