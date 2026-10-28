import { NextResponse } from "next/server";
import { generateRealAndroidKeystore } from "@/lib/keystore-generator";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const alias = body.alias || "apkbuilder-release-key";
    const password = body.password || undefined;
    const organization = body.organization || "Personal";

    // Generate real PKCS#12 Android Keystore with real RSA 2048-bit keys & X.509 cert
    const result = generateRealAndroidKeystore({
      alias,
      password,
      organization,
    });

    return NextResponse.json({
      success: true,
      alias: result.alias,
      suggestedPassword: result.password,
      sha256Fingerprint: result.sha256Fingerprint,
      fullKeystoreBase64: result.keystoreBase64,
      keystoreBase64Preview: result.keystoreBase64.substring(0, 120) + "...",
      validFrom: result.validFrom,
      validUntil: result.validUntil,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Failed to generate keystore" }, { status: 500 });
  }
}
