// Limitador em memória. No Workers cada isolate tem o seu, então é um freio de uso pessoal, não uma defesa forte.
const hits = new Map<string, number[]>();

export function checkRate(key: string, max: number, perSeconds: number): boolean {
  const now = Date.now();
  const window = (hits.get(key) ?? []).filter((t) => now - t < perSeconds * 1000);
  if (window.length >= max) {
    hits.set(key, window);
    return false;
  }
  window.push(now);
  hits.set(key, window);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1]! > 120_000) hits.delete(k);
  return true;
}

export const resetRateLimits = () => hits.clear();
