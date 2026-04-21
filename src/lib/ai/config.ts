export type AiTier = "free" | "paid" | "auto";

export function resolveAiTier(value: string | undefined, fallback: AiTier = "free"): AiTier {
  const tier = String(value || "").toLowerCase();
  if (tier === "free" || tier === "paid" || tier === "auto") {
    return tier;
  }
  return fallback;
}

export function parseProviderList<T extends string>(
  value: string | undefined,
  fallback: readonly T[],
  allowed: readonly T[]
): T[] {
  const allowedSet = new Set(allowed);
  const parsed = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => allowedSet.has(item as T));

  return parsed.length > 0 ? parsed : [...fallback];
}

export function resolveProviderChain<T extends string>(options: {
  tier: AiTier;
  freeProviders: T[];
  paidProviders: T[];
  hasPaidCredentials?: boolean;
}): T[] {
  const { tier, freeProviders, paidProviders, hasPaidCredentials = false } = options;

  if (tier === "paid") {
    return paidProviders;
  }

  if (tier === "auto") {
    return hasPaidCredentials ? paidProviders : freeProviders;
  }

  return freeProviders;
}
