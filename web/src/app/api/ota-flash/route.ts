import { getOtaFlashStatus } from "@/lib/roboforge-contracts";

export const runtime = "nodejs";

export function GET() {
  return Response.json(getOtaFlashStatus(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export function POST() {
  return Response.json(getOtaFlashStatus(), {
    headers: {
      "Cache-Control": "no-store",
    },
    status: 423,
  });
}
