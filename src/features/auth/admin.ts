import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function requireUser(){const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user};}
export async function requireAdmin(){
  const {supabase,user}=await requireUser();
  const {data:profile}=await supabase.from("profiles").select("role").eq("user_id",user.id).maybeSingle();
  if(profile?.role!=="admin")notFound();
  return {supabase,user};
}