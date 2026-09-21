"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { credentialsSchema, emailSchema, loginSchema, updatePasswordSchema, type ActionState } from "./schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { originFromHeaders } from "@/lib/app-url";
import { destinationFor } from "./destination";
const validation = (result: { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } }): ActionState => ({ fieldErrors: result.error.flatten().fieldErrors, error: "Vérifiez les informations saisies." });
export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const displayName = String(formData.get("displayName") ?? "");
  const email = String(formData.get("email") ?? "");
  const result = credentialsSchema.safeParse({displayName,email,password:formData.get("password")});
  // Name and email travel back so a mistake never makes her retype everything on a phone.
  if(!result.success)return {...validation(result),displayName,email};
  let hasSession = false;
  try {
    const supabase=await createSupabaseServerClient();
    const origin=originFromHeaders(await headers());
    const { data, error }=await supabase.auth.signUp({email:result.data.email,password:result.data.password,options:{data:{display_name:result.data.displayName},emailRedirectTo:`${origin}/auth/callback`}});
    if(error){
      if(error.code==="user_already_exists"||/already/i.test(error.message))return {error:"Un compte existe déjà avec cette adresse. Connectez-vous.",displayName,email};
      if(error.code==="weak_password")return {error:"Ce mot de passe est trop facile à deviner. Choisissez-en un autre (8 caractères minimum).",displayName,email};
      return {error:"Impossible de créer le compte. Vérifiez l’adresse ou réessayez dans quelques minutes.",displayName,email};
    }
    hasSession = Boolean(data.session);
  } catch {
    return {error:"Le service est momentanément indisponible. Vérifiez votre connexion puis réessayez.",displayName,email};
  }
  if(hasSession)redirect("/onboarding");
  return {success:"Compte créé. Un email de confirmation vient d’être envoyé — ouvrez-le et touchez le lien pour activer votre espace.",email:result.data.email};
}
export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const result=loginSchema.safeParse({email,password:formData.get("password")});
  if(!result.success)return {...validation(result),email};
  let destination: string = "/onboarding";
  try {
    const supabase=await createSupabaseServerClient();
    const { error }=await supabase.auth.signInWithPassword(result.data);
    if(error){
      if(error.code==="email_not_confirmed")return {error:"Votre adresse n’est pas encore confirmée. Vérifiez votre boîte mail.",reason:"email_not_confirmed",email:result.data.email};
      if(error.status===429)return {error:"Trop de tentatives. Patientez une minute puis réessayez.",email};
      return {error:"Email ou mot de passe incorrect.",email};
    }
    const { data: { user } }=await supabase.auth.getUser();
    if(!user)return {error:"Session introuvable. Réessayez.",email};
    destination = await destinationFor(supabase, user);
  } catch {
    return {error:"Le service est momentanément indisponible. Vérifiez votre connexion puis réessayez.",email};
  }
  redirect(destination);
}
export async function resendConfirmation(_: ActionState, formData: FormData): Promise<ActionState> {
  const email=String(formData.get("email")||"");
  const parsed=credentialsSchema.pick({email:true}).safeParse({email});
  if(!parsed.success)return {error:"Adresse email invalide."};
  const supabase=await createSupabaseServerClient();
  const origin=originFromHeaders(await headers());
  const { error }=await supabase.auth.resend({type:"signup",email:parsed.data.email,options:{emailRedirectTo:`${origin}/auth/callback`}});
  if(error)return {error:"Impossible de renvoyer l’email pour le moment. Réessayez dans quelques minutes."};
  return {success:"Email de confirmation renvoyé. Vérifiez votre boîte mail (pensez aux courriers indésirables)."};
}
export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed=emailSchema.safeParse({email:String(formData.get("email")||"")});
  if(!parsed.success)return validation(parsed);
  try {
    const supabase=await createSupabaseServerClient();
    const origin=originFromHeaders(await headers());
    const redirectTo=`${origin}/auth/callback?next=/reset-password`;
    const { error }=await supabase.auth.resetPasswordForEmail(parsed.data.email,{redirectTo});
    if(error)return {error:"Impossible d’envoyer le lien pour le moment. Vérifiez l’adresse et réessayez."};
    return {success:"Si un compte existe avec cette adresse, un email de récupération vient d’être envoyé — vérifiez votre boîte mail (pensez aux courriers indésirables)."};
  } catch {
    return {error:"Le service est momentanément indisponible. Réessayez dans quelques minutes."};
  }
}
export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const result=updatePasswordSchema.safeParse({password:String(formData.get("password")||""),confirmPassword:String(formData.get("confirmPassword")||"")});
  if(!result.success)return validation(result);
  try {
    const supabase=await createSupabaseServerClient();
    const { error }=await supabase.auth.updateUser({password:result.data.password});
    if(error)return {error:"Le lien de récupération est invalide ou a expiré. Relancez une demande de mot de passe oublié."};
    await supabase.auth.signOut();
  } catch {
    return {error:"Le lien de récupération est invalide ou a expiré. Relancez une demande de mot de passe oublié."};
  }
  redirect("/login?reset=success");
}
export async function logout(){const supabase=await createSupabaseServerClient(); await supabase.auth.signOut(); redirect("/login?bye=1");}
