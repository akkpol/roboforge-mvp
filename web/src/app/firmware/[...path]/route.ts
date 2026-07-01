import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const FIRMWARE_DIR = join(process.cwd(), "public", "firmware", "micropython");

const MIME_TYPES: Record<string, string> = {
  ".bin": "application/octet-stream",
  ".json": "application/json",
  ".py": "text/x-python",
  ".txt": "text/plain",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "missing path" }, { status: 400 });
  }

  const relativePath = path.join("/");
  const filePath = join(FIRMWARE_DIR, relativePath);

  // Prevent directory traversal
  if (!filePath.startsWith(FIRMWARE_DIR)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const buffer = readFileSync(filePath);
    const ext = "." + relativePath.split(".").pop();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
