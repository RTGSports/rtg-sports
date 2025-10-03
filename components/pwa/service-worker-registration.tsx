"use client";

import { useEffect } from "react";

const isDev = process.env.NODE_ENV === "development";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (isDev || typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          if (process.env.NODE_ENV !== "production") {
            console.error("Service worker registration failed", error);
          }
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}