const ACCESS_SESSION_KEY = "san-record-access-unlocked-v1";
const dialog = document.querySelector("#account-dialog");
const form = document.querySelector("#auth-form");
const passwordInput = document.querySelector("#password-input");
const message = document.querySelector("#account-message");

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toBase64(value) {
  let binary = "";
  value.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function derivePasswordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function unlockPassword() {
  try {
    const response = await fetch("access-hash.json", { cache: "no-store" });
    if (!response.ok) throw new Error("암호 해시 파일을 읽지 못했습니다.");
    const config = await response.json();
    const hash = await derivePasswordHash(passwordInput.value, fromBase64(config.salt), config.iterations);
    if (toBase64(hash) !== config.hash) {
      message.textContent = "비밀번호가 올바르지 않습니다.";
      passwordInput.select();
      return;
    }
    sessionStorage.setItem(ACCESS_SESSION_KEY, "unlocked");
    document.body.classList.remove("auth-locked");
    dialog.close();
  } catch (error) {
    console.error(error);
    message.textContent = "잠금 파일을 확인하지 못했습니다.";
  }
}

document.body.classList.add("auth-locked");
if (!sessionStorage.getItem(ACCESS_SESSION_KEY)) {
  if (!dialog.open) dialog.showModal();
  dialog.addEventListener("cancel", (event) => event.preventDefault());
} else {
  document.body.classList.remove("auth-locked");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  unlockPassword();
});
