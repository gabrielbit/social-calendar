export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

export const authCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: AUTH_COOKIE_MAX_AGE,
};
