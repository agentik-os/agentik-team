import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { billingApi, type SubscriptionInfo } from "@/api/billing";

const PLANS = [
  {
    name: "Free",
    tier: "free" as const,
    price: "$0",
    period: "forever",
    priceId: null,
    features: ["3 agents", "10 runs/day", "Community support"],
  },
  {
    name: "Pro",
    tier: "pro" as const,
    price: "$29",
    period: "/month",
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID ?? "price_pro_monthly",
    features: ["10 agents", "Unlimited runs", "Priority support", "Advanced analytics"],
    popular: true,
  },
  {
    name: "Enterprise",
    tier: "enterprise" as const,
    price: "$99",
    period: "/month",
    priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID ?? "price_enterprise_monthly",
    features: [
      "Unlimited agents",
      "Unlimited runs",
      "Dedicated support",
      "Custom integrations",
      "SSO & audit logs",
    ],
  },
];

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  const { data: subscription } = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => billingApi.getSubscription(),
  });

  async function handleSubscribe(priceId: string | null) {
    if (!priceId) return;
    setLoading(priceId);
    try {
      const { url } = await billingApi.createCheckout(
        priceId,
        `${window.location.origin}/billing?success=true`,
        `${window.location.origin}/pricing`,
      );
      if (url) window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-10 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold">Choose your plan</h1>
        <p className="mt-2 text-muted-foreground">
          Scale your AI agent workforce with the right plan for your team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = subscription?.tier === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`relative rounded-lg border p-6 flex flex-col ${
                plan.popular ? "border-primary shadow-md" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.priceId ? (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.priceId)}
                    disabled={loading === plan.priceId}
                  >
                    {loading === plan.priceId ? "Redirecting..." : "Subscribe"}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Free Forever
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
