import speakeasy from "speakeasy";

const secret = speakeasy.generateSecret({
  length: 20,
});
console.log("Secret:", secret.base32);

const token = speakeasy.totp({
  secret: secret.base32,
  encoding: "base32",
  time: Math.floor(Date.now() / 1000),
  window: 1,
  digits: 6,
} as any);

console.log("Token:", token);

const verifyToken = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: "base32",
  token: token,
  window: 6,
} as any);
console.log("Token verified:", verifyToken);

export { secret, token, verifyToken };
