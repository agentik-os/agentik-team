import { api } from "./client";

export interface SubscriptionInfo {
  tier: "free" | "pro" | "enterprise";
  limits: {
    maxAgents: number;
    maxRunsPerDay: number;
  };
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
}

export const billingApi = {
  getSubscription: () => api.get<SubscriptionInfo>("/billing/subscription"),

  createCheckout: (priceId: string, successUrl: string, cancelUrl: string) =>
    api.post<{ url: string }>("/billing/checkout", { priceId, successUrl, cancelUrl }),

  createPortal: (returnUrl: string) =>
    api.post<{ url: string }>("/billing/portal", { returnUrl }),
};
