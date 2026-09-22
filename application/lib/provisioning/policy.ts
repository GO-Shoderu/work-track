// `assigned` must be the result of a fresh, actor-scoped database query.
export function mayProvision(role: string, kind: string, assigned: boolean) {
  return (role === "platform_owner" && ["organisation", "customer", "admin"].includes(kind)) ||
    (role === "admin" && kind === "customer" && assigned);
}

export function managementReturnPath(role: string) {
  return role === "platform_owner" ? "/platform" : role === "admin" ? "/admin" : "/workspace";
}
