export class AccessError extends Error {
  public code: "permission-denied" | "failed-precondition" | "invalid-argument" | "unauthenticated";
  constructor(code: "permission-denied" | "failed-precondition" | "invalid-argument" | "unauthenticated", message: string) { super(message); this.code = code; }
}
export function approvedEmail(input: unknown, configuredEmails: string): string {
  const emails = configuredEmails.split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) throw new AccessError("failed-precondition", "Cookbook access is not configured.");
  if (typeof input !== "string" || input.length > 254) throw new AccessError("invalid-argument", "Invalid email address.");
  const email = input.trim().toLowerCase();
  if (!emails.includes(email)) throw new AccessError("permission-denied", "This account cannot access the cookbook.");
  return email;
}
export async function emailFlow(input: unknown, configuredEmails: string, lookup: (email: string) => Promise<{ disabled: boolean; providerData: { providerId: string }[] }>): Promise<"create" | "login" | "set-password"> {
  const email = approvedEmail(input, configuredEmails);
  try {
    const user = await lookup(email);
    if (user.disabled) throw new AccessError("permission-denied", "This account is disabled.");
    return user.providerData.some(provider => provider.providerId === "password") ? "login" : "set-password";
  } catch (error) {
    if ((error as { code?: string }).code === "auth/user-not-found") return "create";
    throw error;
  }
}
export function validateEmailAccess(auth: { token: Record<string, unknown> } | undefined, configuredEmails: string): void {
  if (!auth) throw new AccessError("unauthenticated", "Sign in first.");
  approvedEmail(auth.token.email, configuredEmails);
  if (auth.token.email_verified !== true) throw new AccessError("permission-denied", "Verify your email address first.");
}
