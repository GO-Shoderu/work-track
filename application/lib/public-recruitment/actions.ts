"use server";
import { headers } from "next/headers";
import { getEnvironment } from "../env";
import { submitPublicApplication } from "./submission";

export async function applyToPublicJob(input: unknown, formData: FormData) {
  const env = getEnvironment();
  if (!env || (await headers()).get("origin") !== new URL(env.APP_URL).origin
    || !(formData instanceof FormData) || [...formData.keys()].length !== 1 || !formData.has("file")) {
    return { ok: false, error: "Application submission is unavailable." } as const;
  }
  return submitPublicApplication(input, formData.get("file") as File);
}
