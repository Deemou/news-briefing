export const isValidHttpUrl = (raw: unknown): raw is string => {
  if (typeof raw !== "string") return false;
  const v = raw.trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.host;
  } catch {
    return false;
  }
};
