import type { ReactNode } from "react";
import { Brand } from "./brand";
import { LogoutButton } from "./auth/logout-button";
export function WorkspaceShell({ title, name, context, children }: { title: string; name: string; context: string; children: ReactNode }) {
  return <div className="min-h-screen lg:flex"><aside className="flex flex-col gap-8 bg-sidebar p-6 text-white lg:fixed lg:inset-y-0 lg:w-64"><Brand /><p className="text-sm font-medium text-gray-300">{context}</p><div className="mt-auto"><p className="mb-4 break-words text-sm">{name}</p><LogoutButton /></div></aside><main className="min-w-0 flex-1 p-6 lg:ml-64 lg:p-10"><p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{context}</p><h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>{children}</main></div>;
}
