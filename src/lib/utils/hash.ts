import { createHash } from "crypto";

export function hashText(input: string): string {
  const h = createHash("sha256");
  h.update(input, "utf8");
  return h.digest("hex");
}
