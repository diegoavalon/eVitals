/** Merge class names, filtering falsy values. Accepts strings only. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter((c): c is string => typeof c === "string" && c.length > 0).join(" ");
}
