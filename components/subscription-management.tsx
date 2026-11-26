"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/lib/supabase";

type CustomerSubscription = {
  id: string;
  product: "starter_node" | "ai_copilot";
  status: string;
  paidThrough: string | null;
};

type SubscriptionResponse = {
  subscription?: CustomerSubscription | null;
  error?: string;
};

const productNames = {
  starter_node: "Starter Node",
  ai_copilot: "AI Co-Pilot",
} as const;

export default function SubscriptionManagement() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<CustomerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetchWithAuth("/api/payments/subscriptions/manage");
    const data = (await response.json().catch(() => null)) as SubscriptionResponse | null;
    if (response.status === 401) {
      setSubscription(null);
      return;
    }
    if (!response.ok) {
      throw new Error(data?.error || "Unable to load subscription details.");
    }
    setSubscription(data?.subscription || null);
  }, []);

  const recover = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetchWithAuth("/api/payments/subscriptions/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json().catch(() => null)) as
        | { activated?: boolean; results?: Array<{ outcome: string; reason?: string }>; error?: string }
        | null;
      if (response.status === 401) {
        throw new Error("Your session has expired. Please sign in again to re-sync your subscription.");
      }
      if (!response.ok) {
        throw new Error(data?.error || "Unable to re-sync subscription.");
      }
      const hasPaidAccess =
        Boolean(data?.activated) ||
        Boolean(data?.results?.some((r) => r.outcome === "activated" || r.outcome === "already_paid"));
      if (data?.activated) {
        setMessage("Access re-synced. Subscription is now active.");
      } else {
        const details = data?.results
          ?.map((r) => `${r.outcome}${r.reason ? `: ${r.reason}` : ""}`)
          .join("; ");
        setMessage(`Re-sync completed. ${details || "No subscription activated."}`);
      }
      await refresh();
      if (hasPaidAccess) {
        window.dispatchEvent(new Event("aos_plan_changed"));
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to re-sync subscription.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void refresh()
        .catch((cause: unknown) => {
          if (active) {
            setError(cause instanceof Error ? cause.message : "Unable to load subscription details.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refresh]);

  const manage = async (action: "cancel" | "pause" | "resume") => {
    if (!subscription) return;
    const paidPeriodRemains = Boolean(
      subscription.paidThrough &&
      Date.parse(subscription.paidThrough) > Date.now(),
    );
    if (
      action === "cancel" &&
      !window.confirm(
        paidPeriodRemains
          ? "Cancel this subscription at the end of its paid period?"
          : "Cancel this subscription? Any already-paid period remains accessible.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetchWithAuth("/api/payments/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id, action }),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update the subscription.");
      }
      setMessage(data?.message || "Subscription request sent. Access changes after provider confirmation.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update the subscription.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!subscription && !error)) return null;

  if (!subscription) {
    return (
      <section className="mx-auto mt-8 w-full max-w-2xl rounded-lg border border-slate-800 bg-[#0b0f19] p-5">
        <p role="status" className="text-sm text-rose-300">{error}</p>
      </section>
    );
  }

  const terminal = ["cancelled", "completed", "expired"].includes(subscription.status);
  const paused = subscription.status === "paused" || subscription.status === "halted";
  const paidThrough = subscription.paidThrough
    ? new Date(subscription.paidThrough).toLocaleDateString()
    : null;
  const cancelLabel = "Cancel subscription";
  const needsRecovery = !terminal && !paidThrough;

  return (
    <section
      aria-label="Manage subscription"
      className="mx-auto mt-8 w-full max-w-2xl rounded-lg border border-[#00f0ff]/20 bg-[#0b0f19] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Subscription management</h2>
          <p className="mt-1 text-xs text-slate-400">
            {productNames[subscription.product]} · {subscription.status}
            {paidThrough ? ` · paid through ${paidThrough}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!terminal && (
            <>
              {paused ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void manage("resume")}
                  className="rounded border border-[#00f0ff]/30 px-3 py-2 text-xs text-[#00f0ff] disabled:opacity-50"
                >
                  {busy ? "Working..." : "Resume"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void manage("pause")}
                  className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
                >
                  {busy ? "Working..." : "Pause"}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void manage("cancel")}
                className="rounded border border-rose-900 px-3 py-2 text-xs text-rose-300 disabled:opacity-50"
              >
                {busy ? "Working..." : cancelLabel}
              </button>
            </>
          )}
          {needsRecovery && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void recover()}
              className="rounded border border-emerald-900 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"
            >
              {busy ? "Re-syncing..." : "Recover / re-sync access"}
            </button>
          )}
        </div>
      </div>
      {message && <p role="status" className="mt-3 text-xs text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      <p className="mt-3 text-[11px] text-slate-500">
        Requests are confirmed by Razorpay webhooks. Cancellation and pause do not erase already-paid access. The
        re-sync re-verifies your subscription directly with Razorpay and activates any confirmed captured payment.
      </p>
    </section>
  );
}
