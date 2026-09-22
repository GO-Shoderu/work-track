import "server-only";
import { execFile } from "node:child_process";
import { validatePdfBytes } from "./validation";

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  validatePdfBytes(bytes);
  // No shell, filenames, links, scripts or inherited credentials. prlimit already
  // exists in the base image. Native parser runs as the non-root application user.
  return new Promise((resolve, reject) => {
    const child = execFile("/usr/bin/prlimit", ["--as=268435456", "--cpu=5", "--nofile=32", "--", "/usr/bin/pdftotext", "-enc", "UTF-8", "-nopgbrk", "-", "-"],
      { timeout: 8000, killSignal: "SIGKILL", maxBuffer: 128 * 1024, encoding: "utf8", env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8", NODE_ENV: "production" } },
      (error, stdout) => {
        if (error) { reject(new Error("The PDF cannot be read. Upload a text-based, unlocked PDF.")); return; }
        const text = stdout.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
        if (text.length < 20 || text.length > 40000) { reject(new Error("The PDF must contain readable text within the assessment size limit.")); return; }
        resolve(text);
      });
    child.stdin?.on("error", () => { /* execFile callback handles unreadable/terminated input */ });
    child.stdin?.end(bytes);
  });
}
