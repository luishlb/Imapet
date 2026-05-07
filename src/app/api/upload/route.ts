import { NextRequest, NextResponse } from "next/server";
import { uploadR2, buildKey } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const prefix = (form.get("prefix") as string | null) || "uploads";

    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = buildKey(prefix, file.name);
    const url = await uploadR2(buffer, key, file.type || "application/octet-stream");

    return NextResponse.json({ url, key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    console.error("upload error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
