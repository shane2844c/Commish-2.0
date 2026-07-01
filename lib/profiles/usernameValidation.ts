export const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,20}$/;

export const USERNAME_VALIDATION_ERROR =
  "Username must be 3-20 characters and can only include letters, numbers, dots, and underscores.";

export function cleanUsername(raw: string): string {
  return raw.trim();
}

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = cleanUsername(raw);

  if (!username) {
    return { ok: false, error: "Username is required." };
  }

  if (!USERNAME_REGEX.test(username)) {
    return { ok: false, error: USERNAME_VALIDATION_ERROR };
  }

  return { ok: true, username };
}

export function hasUsername(username: string | null | undefined): boolean {
  return Boolean(username?.trim());
}
