// hooks/useFraudAlerts.ts
import { useEffect, useRef, useState, useCallback } from "react";

export interface FraudAlertMessage {
  type: "fraud_alert";
  transaction_id: number;
  fraud_probability: number;
  message: string;
  timestamp: string;
}

function buildWebSocketUrl(): string | null {
  const token = localStorage.getItem("fedxplain_access_token");
  if (!token) return null;

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";

  // Production: VITE_API_BASE_URL is a full origin like https://fedxplain.onrender.com
  // -- the backend's WS route lives at /ws/alerts directly on that origin (no /api prefix).
  if (apiBase.startsWith("http")) {
    const wsBase = apiBase.replace(/^http/, "ws");
    return `${wsBase}/ws/alerts?token=${encodeURIComponent(token)}`;
  }

  // Dev: VITE_API_BASE_URL is relative ("/api"), Vite's dev server proxies /ws -> backend.
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/alerts?token=${encodeURIComponent(token)}`;
}

/**
 * Connects to the backend's real-time fraud alert WebSocket whenever the
 * user is authenticated. Auto-reconnects with backoff on disconnect (e.g.
 * Render free-tier idling, network blips). Returns the live list of
 * received alerts plus a dismiss function for the UI to consume.
 */
export function useFraudAlerts(isAuthenticated: boolean) {
  const [alerts, setAlerts] = useState<FraudAlertMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  const dismissAlert = useCallback((transactionId: number) => {
    setAlerts((prev) => prev.filter((a) => a.transaction_id !== transactionId));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isUnmounted = false;

    function connect() {
      const url = buildWebSocketUrl();
      if (!url) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as FraudAlertMessage;
          if (data.type === "fraud_alert") {
            setAlerts((prev) => [data, ...prev].slice(0, 5)); // keep at most 5 visible
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        // Exponential backoff, capped at 15s -- handles Render free-tier
        // idle/wake cycles and transient network drops gracefully.
        const delay = Math.min(15000, 1000 * 2 ** reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated]);

  return { alerts, dismissAlert };
}
