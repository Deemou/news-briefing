export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim());

  // scheme
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Unsupported URL scheme");
  }

  // host lower, drop default port
  const host = u.hostname.toLowerCase();
  const isDefaultPort =
    (u.protocol === "http:" && (u.port === "" || u.port === "80")) ||
    (u.protocol === "https:" && (u.port === "" || u.port === "443"));
  const port = isDefaultPort ? "" : `:${u.port}`;

  // path normalize
  let path = u.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  // query normalize: remove trackers, sort keys and values
  const params = new URLSearchParams(u.search);
  const dropKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "igshid",
    "mc_cid",
    "mc_eid",
    "spm",
    "ref",
    "ref_src",
  ];
  for (const k of dropKeys) params.delete(k);

  const sorted = new URLSearchParams();
  const keys = [...new Set([...params.keys()])].sort();
  for (const k of keys) {
    const vals = params.getAll(k).sort();
    for (const v of vals) sorted.append(k, v);
  }
  const query = sorted.toString();

  // no fragment
  return `${u.protocol}//${host}${port}${path}${query ? `?${query}` : ""}`;
}
