import forge from "node-forge";

export interface GenerateKeystoreOptions {
  alias?: string;
  password?: string;
  commonName?: string;
  organization?: string;
  validityYears?: number;
}

export interface GeneratedKeystoreResult {
  alias: string;
  password: string;
  sha256Fingerprint: string;
  keystoreBase64: string;
  validFrom: string;
  validUntil: string;
}

export function generateRealAndroidKeystore(
  options: GenerateKeystoreOptions = {}
): GeneratedKeystoreResult {
  const alias = options.alias || "apkbuilder-release-key";
  const password =
    options.password ||
    forge.util.bytesToHex(forge.random.getBytesSync(10));
  const commonName = options.commonName || "devs APK Builder";
  const organization = options.organization || "Personal";
  const validityYears = options.validityYears || 25;

  // 1. Generate real RSA 2048-bit keypair
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });

  // 2. Create valid X.509 v3 digital certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01" + forge.util.bytesToHex(forge.random.getBytesSync(16));

  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setFullYear(notBefore.getFullYear() + validityYears);

  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  const attrs = [
    { name: "commonName", value: commonName },
    { name: "organizationName", value: organization },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Self-sign with SHA-256
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // 3. Compute real SHA-256 fingerprint of the certificate DER
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const sha256Hex = forge.md.sha256.create().update(certDer).digest().toHex().toUpperCase();
  const formattedSha256 = "SHA256: " + (sha256Hex.match(/.{1,2}/g)?.join(":") || sha256Hex);

  // 4. Create real PKCS#12 / Android Keystore file
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, password, {
    algorithm: "3des",
    friendlyName: alias,
    generateLocalKeyId: true,
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Buffer = Buffer.from(p12Der, "binary");
  const keystoreBase64 = p12Buffer.toString("base64");

  return {
    alias,
    password,
    sha256Fingerprint: formattedSha256,
    keystoreBase64,
    validFrom: notBefore.toISOString(),
    validUntil: notAfter.toISOString(),
  };
}
