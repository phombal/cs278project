import { formatDistanceToNowStrict } from "date-fns";

/** "3h", "2d", "5mo" — Reddit-style compact relative time. */
export function timeAgo(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const raw = formatDistanceToNowStrict(date, { addSuffix: false });
  return raw
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y");
}
