import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function requireUser(){const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user};}
export const getMyFirstStore = cache(async () => {const {supabase,user}=await requireUser();const {data,error}=await supabase.from("stores").select("*, store_themes(*)").eq("owner_id",user.id).order("created_at").limit(1).maybeSingle();if(error)throw new Error("Impossible de charger la boutique.");return {store:data,user,supabase};});
