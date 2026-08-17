"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { removeSubscription, saveSubscription } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed" | "denied";

export default function NotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "unsubscribed");
    }
    checkStatus();
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Assinatura de push inválida");
      }
      await saveSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setStatus("subscribed");
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (error) {
      console.error("Erro ao desativar notificações:", error);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <p className="mb-4 text-xs text-navy/50 dark:text-white/50">
        Seu navegador não suporta notificações push.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="mb-4 text-xs text-navy/50 dark:text-white/50">
        Notificações bloqueadas — libere nas configurações do navegador pra
        receber lembretes.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={status === "subscribed" ? handleDisable : handleEnable}
      className={`mb-4 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        status === "subscribed"
          ? "bg-mint/15 text-mint"
          : "bg-navy text-white dark:bg-white dark:text-navy"
      }`}
    >
      {status === "subscribed" ? (
        <>
          <Bell className="h-4 w-4" />
          Notificações ativadas
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Ativar notificações
        </>
      )}
    </button>
  );
}
