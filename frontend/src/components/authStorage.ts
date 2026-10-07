import Cookies from "js-cookie";

const AUTH_COOKIE = "is_auth";
const SEVEN_DAYS = 7;

export function readIsAuthed(): boolean {
  return Cookies.get(AUTH_COOKIE) === "true";
}

export function writeIsAuthed(): void {
  Cookies.set(AUTH_COOKIE, "true", { expires: SEVEN_DAYS, path: "/", sameSite: "Lax" });
}

export function clearIsAuthed(): void {
  Cookies.remove(AUTH_COOKIE, { path: "/" });
}
