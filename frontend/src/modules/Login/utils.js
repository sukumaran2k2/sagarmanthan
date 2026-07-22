import forge from "node-forge";
import { PUBLIC_KEY_PEM } from "./constants";

export function encryptPassword(password) {
  const publicKey = forge.pki.publicKeyFromPem(PUBLIC_KEY_PEM);
  const bytes = forge.util.encodeUtf8(password);
  const encrypted = publicKey.encrypt(bytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });
  return forge.util.encode64(encrypted);
}
