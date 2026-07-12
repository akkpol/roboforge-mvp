export function readTextDelta(line: string) {
  if (!line.startsWith("data: ")) return "";
  try {
    const event = JSON.parse(line.slice(6)) as { delta?: string; type?: string };
    return event.type === "text-delta" && typeof event.delta === "string" ? event.delta : "";
  } catch {
    return "";
  }
}
