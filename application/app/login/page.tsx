import { redirect } from "next/navigation";
import { Brand } from "../../components/brand";
import { readIdentity } from "../../lib/auth/identity";
import { landingPath } from "../../lib/auth/policy";
import { getEnvironment } from "../../lib/env";
import { LoginForm } from "./login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const identity = await readIdentity();
  if (identity.kind === "authenticated") redirect(landingPath(identity.profile.role));
  if (identity.kind === "denied") redirect("/access-denied");
  return <main className="flex min-h-screen"><aside className="hidden w-[420px] shrink-0 flex-col justify-between bg-sidebar p-10 text-white lg:flex"><div><Brand /><h1 className="mb-3 mt-12 text-3xl font-bold leading-tight">Serious recruiting,<br />at your pace.</h1><p className="text-sm leading-relaxed text-gray-400">A focused recruitment workspace for your team.</p></div><p className="text-xs leading-relaxed text-gray-400">Your organisation. Your workspace.</p></aside><section aria-labelledby="login-title" className="flex flex-1 items-center justify-center p-6"><div className="w-full max-w-sm"><div className="mb-8 lg:hidden"><Brand /></div><h2 id="login-title" className="text-xl font-bold">Sign in to your account</h2><p className="mt-1 text-sm text-muted">Enter your credentials to access your workspace.</p><LoginForm available={getEnvironment() !== null} /></div></section></main>;
}
