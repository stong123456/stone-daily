import assert from "node:assert/strict";
import test from "node:test";
import { verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage, parseSiweMessage } from "viem/siwe";

const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

test("verifies an exact domain-bound SIWE message", async () => {
  const expirationTime = new Date("2030-01-01T00:10:00.000Z");
  const message = createSiweMessage({ address: account.address, chainId: 1, domain: "stonedaily.xyz", nonce: "00112233445566778899aabbccddeeff", uri: "https://stonedaily.xyz", version: "1", issuedAt: new Date("2030-01-01T00:00:00.000Z"), expirationTime, statement: "Sign in to Stone Daily. This does not authorize transactions, token approvals, or asset access." });
  const signature = await account.signMessage({ message });
  assert.equal(await verifyMessage({ address: account.address, message, signature }), true);
  const parsed = parseSiweMessage(message);
  assert.equal(parsed.domain, "stonedaily.xyz");
  assert.equal(parsed.nonce, "00112233445566778899aabbccddeeff");
  assert.equal(parsed.expirationTime?.toISOString(), expirationTime.toISOString());
});

test("rejects a signature replayed against a changed domain", async () => {
  const message = createSiweMessage({ address: account.address, chainId: 1, domain: "stonedaily.xyz", nonce: "ffeeddccbbaa99887766554433221100", uri: "https://stonedaily.xyz", version: "1" });
  const signature = await account.signMessage({ message });
  assert.equal(await verifyMessage({ address: account.address, message: message.replace("stonedaily.xyz", "example.com"), signature }), false);
});
