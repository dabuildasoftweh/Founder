import { supabase } from "./supabase";

export type AuthUser = { id: string; email?: string };
export type OrgRow   = { id: string; name: string; slug: string; owner_id: string };
export type Member   = { id: string; user_id: string; role: string; status: string; invited_email?: string; profile?: { name: string; avatar_color: string } };

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getOrg(userId: string): Promise<OrgRow | null> {
  const { data } = await supabase
    .from("org_members")
    .select("organisations(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return (data?.organisations as unknown as OrgRow) ?? null;
}

export async function getMembers(orgId: string): Promise<Member[]> {
  const { data } = await supabase
    .from("org_members")
    .select("*, profiles(name, avatar_color)")
    .eq("org_id", orgId)
    .order("created_at");
  return (data ?? []).map((m: Record<string, unknown>) => ({ ...m, profile: m.profiles as Member["profile"] })) as Member[];
}

export async function createOrg(name: string, userId: string): Promise<OrgRow | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
  const { data } = await supabase.from("organisations").insert({ name, slug, owner_id: userId }).select().single();
  if (!data) return null;
  await supabase.from("org_members").insert({ org_id: data.id, user_id: userId, role: "owner", status: "active" });
  return data as OrgRow;
}

export async function inviteMember(orgId: string, email: string) {
  await supabase.from("org_members").insert({ org_id: orgId, invited_email: email, status: "pending" });
}

export async function joinOrgByInvite(orgId: string, userId: string, email: string) {
  const { data: pending } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("invited_email", email)
    .eq("status", "pending")
    .maybeSingle();
  if (pending) {
    await supabase.from("org_members").update({ user_id: userId, status: "active" }).eq("id", pending.id);
  } else {
    await supabase.from("org_members").insert({ org_id: orgId, user_id: userId, status: "active" });
  }
}

export async function logActivity(orgId: string, userId: string, type: string, entityType: string, metadata: Record<string, unknown>) {
  await supabase.from("activity_log").insert({ org_id: orgId, user_id: userId, type, entity_type: entityType, metadata });
}

export async function getActivity(orgId: string, limit = 40) {
  const { data } = await supabase
    .from("activity_log")
    .select("*, profiles(name, avatar_color)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export function signOut() {
  return supabase.auth.signOut();
}
