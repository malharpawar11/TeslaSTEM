const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const crypto = require("./load-message-crypto.cjs");
const random = (size) => new Uint8Array(randomBytes(size));
async function main() {
  const a = await crypto.createVault(
    "sample unique random passphrase A",
    random,
  );
  const b = await crypto.createVault(
    "sample unique random passphrase B",
    random,
  );
  const recovered = await crypto.unlockVault(
    "sample unique random passphrase A",
    a.vault,
  );
  assert.deepEqual(recovered, a.secretKey, "Same key on a second device");
  await assert.rejects(crypto.unlockVault("incorrect", a.vault));
  await assert.rejects(crypto.createVault("short", random));
  const binding = {
    club_id: "club-a",
    sender_id: "member-a",
    recipient_id: "member-b",
  };
  const envelope = crypto.encryptMessage(
    "Hello 👋 secret meeting details",
    binding,
    a.secretKey,
    b.vault.public_key,
    random,
  );
  assert.equal(
    crypto.decryptMessage(envelope, binding, "member-b", b.secretKey),
    "Hello 👋 secret meeting details",
  );
  assert.equal(
    crypto.decryptMessage(envelope, binding, "member-a", recovered),
    "Hello 👋 secret meeting details",
  );
  assert(!JSON.stringify(envelope).includes("secret meeting"));
  assert.throws(() =>
    crypto.decryptMessage(envelope, binding, "outsider", a.secretKey),
  );
  assert.throws(() =>
    crypto.decryptMessage(envelope, binding, "member-b", a.secretKey),
  );
  assert.throws(() =>
    crypto.decryptMessage(
      envelope,
      { ...binding, club_id: "club-b" },
      "member-b",
      b.secretKey,
    ),
  );
  const changed = crypto.decode(envelope.ciphertext);
  changed[10] ^= 1;
  assert.throws(() =>
    crypto.decryptMessage(
      { ...envelope, ciphertext: crypto.encode(changed) },
      binding,
      "member-b",
      b.secretKey,
    ),
  );
  assert.notEqual(
    envelope.nonce,
    crypto.encryptMessage(
      "Hello",
      binding,
      a.secretKey,
      b.vault.public_key,
      random,
    ).nonce,
  );
  assert.equal(
    crypto.safetyNumber("a", a.vault.public_key, "b", b.vault.public_key),
    crypto.safetyNumber("b", b.vault.public_key, "a", a.vault.public_key),
  );
  assert.notEqual(
    crypto.safetyNumber("a", a.vault.public_key, "b", b.vault.public_key),
    crypto.safetyNumber("a", b.vault.public_key, "b", b.vault.public_key),
  );
  console.log(
    "Message crypto passed: two-way decryption, second-device recovery, wrong-passphrase rejection, tampering, participant and conversation binding, random nonces and safety numbers.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
