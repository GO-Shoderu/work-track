import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Health and static assets never depend on Supabase. Include future app routes.
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
