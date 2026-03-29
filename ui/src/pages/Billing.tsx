import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { billingApi } from "@/api/billing";

export function Billing() {
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => billingApi.getSubscription(),
  });

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { url } = await billingApi.createPortal(`${window.location.origin}/billing`);
      if (url) window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">Loading billing...</div>
    );
  }

  const tier = subscription?.tier ?? "free";
  const status = subscription?.subscriptionStatus ?? "none";
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div className="mx-auto max-w-xl py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Current Plan</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="text-sm font-medium capitalize">{tier}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <span
              className={`text-sm font-medium ${
                status === "active"
                  ? "text-green-600"
                  : status === "past_due"
                    ? "text-yellow-600"
                    : "text-muted-foreground"
              }`}
            >
              {status === "none" ? "No subscription" : status}
            </span>
          </div>

          {periodEnd && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current period ends</span>
              <span className="text-sm font-medium">{periodEnd}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Agents</span>
            <span className="text-sm font-medium">
              {subscription?.limits.maxAgents === Infinity
                ? "Unlimited"
                : subscription?.limits.maxAgents ?? 3}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Runs/day</span>
            <span className="text-sm font-medium">
              {subscription?.limits.maxRunsPerDay === Infinity
                ? "Unlimited"
                : subscription?.limits.maxRunsPerDay ?? 10}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {tier === "free" ? (
            <Button asChild>
              <Link to="/pricing">
                Upgrade Plan
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          ) : (
            <Button onClick={handleManageBilling} disabled={portalLoading}>
              {portalLoading ? "Redirecting..." : "Manage Subscription"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
