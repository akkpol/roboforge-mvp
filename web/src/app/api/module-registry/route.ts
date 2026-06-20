import { getModuleRegistry } from "@/lib/roboforge-contracts";

export const runtime = "nodejs";

export function GET() {
  return Response.json(getModuleRegistry(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
