/** Show a short, nonblocking application notice. */
export function showToastNotice(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message } }));
}
