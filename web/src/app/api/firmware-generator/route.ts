import { generateFirmwareConfigPackage } from "@/lib/roboforge-contracts";

export const runtime = "nodejs";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const unitCode = readString(body.unitCode);
  const apPassword = readString(body.apPassword);
  const robotType = readString(body.robotType) || "rover";
  const firmwareVersion = readString(body.firmwareVersion) || "0.1.0";
  const batteryCells = Number(body.batteryCells ?? 2);

  if (!unitCode || !apPassword || ![1, 2].includes(batteryCells)) {
    return Response.json(
      {
        error: "invalid_firmware_config_request",
        message: "unitCode, apPassword, and batteryCells 1 or 2 are required.",
      },
      { status: 400 },
    );
  }

  return Response.json(
    generateFirmwareConfigPackage({
      apPassword,
      batteryCells,
      firmwareVersion,
      robotType,
      unitCode,
    }),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
