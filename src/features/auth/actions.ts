"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { credentialsSchema, emailSchema, loginSchema, updatePasswordSchema, type ActionState } from "./schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const validation = (result: { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } }): ActionState => ({ fieldErrors: result.error.flatten().fieldErrors, error: "Vérifiez les informations saisies." });
export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const result = credentialsSchema.safeParse({displayName:formData.get("displayName"),email:formData.get("email"),password:formData.get("password")});
  if(!result.success)return validation(result);
  let hasSession = false;
  try {
    const supabase=await createSupabaseServerClient();
    const appUrl=process.env.NEXT_PUBLIC_APP_URL?.trim()||"https://mystorey-tau.vercel.app";
    const { data, error }=await supabase.auth.signUp({email:result.data.email,password:result.data.password,options:{data:{display_name:result.data.displayName},emailRedirectTo:`${appUrl}/auth/callback`}});
    if(error){
      if(error.code==="user_already_exists"||/already/i.test(error.message))return {error:"Un compte existe déjà avec cette adresse. Connectez-vous."};
      return {error:"Impossible de créer le compte. Vérifiez l’adresse ou réessayez dans quelques minutes."};
    }
    hasSession = Boolean(data.session);
  } catch {
    return {error:"Le service est momentanément indisponible. Vérifiez votre connexion puis réessayez."};
  }
  if(hasSession)redirect("/onboarding");
  return {success:"Compte créé. Un email de confirmation vient d’être envoyé — cliquez sur le lien pour activer votre espace vendeur.",email:result.data.email};
}
export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const result=loginSchema.safeParse({email:formData.get("email"),password:formData.get("password")});
  if(!result.success)return validation(result);
  let destination = "/onboarding";
  try {
    const supabase=await createSupabaseServerClient();
    const { error }=await supabase.auth.signInWithPassword(result.data);
    if(error){
      if(error.code==="email_not_confirmed")return {error:"Votre adresse n’est pas encore confirmée. Vérifiez votre boîte mail.",reason:"email_not_confirmed",email:result.data.email};
      return {error:"Email ou mot de passe incorrect."};
    }
    const { data: { user } }=await supabase.auth.getUser();
    if(!user)return {error:"Session introuvable. Réessayez."};
    const { count }=await supabase.from("stores").select("id",{count:"exact",head:true}).eq("owner_id",user.id);
    destination = count ? "/dashboard" : "/onboarding";
  } catch {
    return {error:"Le service est momentanément indisponible. Vérifiez votre connexion puis réessayez."};
  }
  redirect(destination);
}
export async function resendConfirmation(_: ActionState, formData: FormData): Promise<ActionState> {
  const email=String(formData.get("email")||"");
  const parsed=credentialsSchema.pick({email:true}).safeParse({email});
  if(!parsed.success)return {error:"Adresse email invalide."};
  const supabase=await createSupabaseServerClient();
  const { error }=await supabase.auth.resend({type:"signup",email:parsed.data.email});
  if(error)return {error:"Impossible de renvoyer l’email pour le moment. Réessayez dans quelques minutes."};
  return {success:"Email de confirmation renvoyé. Vérifiez votre boîte mail (pensez aux courriers indésirables)."};
}
export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed=emailSchema.safeParse({email:String(formData.get("email")||"")});
  if(!parsed.success)return validation(parsed);
  const requestHeaders=await headers();
  const host=requestHeaders.get("host");
  const proto=requestHeaders.get("x-forwarded-proto") ?? "http";
  const redirectTo=host?`${proto}://${host}/auth/callback?next=/reset-password`:undefined;
  const supabase=await createSupabaseServerClient();
  const { error }=await supabase.auth.resetPasswordForEmail(parsed.data.email, redirectTo?{redirectTo}:undefined);
  if(error)return {error:"Impossible d’envoyer le lien pour le moment. Réessayez dans quelques minutes."};
  return {success:"Si un compte existe avec cette adresse, un email de récupération vient d’être envoyé — vérifiez votre boîte mail (pensez aux courriers indésirables)."};
}
export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const result=updatePasswordSchema.safeParse({password:String(formData.get("password")||""),confirmPassword:String(formData.get("confirmPassword")||"")});
  if(!result.success)return validation(result);
  const supabase=await createSupabaseServerClient();
  const { error }=await supabase.auth.updateUser({password:result.data.password});
  if(error)return {error:"Le lien de récupération est invalide ou a expiré. Relancez une demande de mot de passe oublié."};
  await supabase.auth.signOut();
  redirect("/login?reset=success");
}
export async function logout(){const supabase=await createSupabaseServerClient(); await supabase.auth.signOut(); redirect("/login");}