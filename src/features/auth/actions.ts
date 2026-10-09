"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { credentialsSchema, emailSchema, loginSchema, updatePasswordSchema, type ActionState } from "./schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { originFromHeaders } from "@/lib/app-url";
import { destinationFor } from "./destination";
import { ALREADY_REGISTERED, isUnreachable, SERVICE_UNREACHABLE, signUpErrorMessage } from "./auth-errors";
const validation = (result: { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } }): ActionState => ({ fieldErrors: result.error.flatten().fieldErrors, error: "Vérifiez les informations saisies." });
/**
 * Une inscription ou une connexion refusée laissait zéro trace : l'erreur était
 * attrapée, donc `onRequestError` de src/instrumentation.ts ne la voyait jamais, et
 * on ne pouvait pas dire à une vendeuse bloquée ce qui s'était passé. Même préfixe
 * que l'instrumentation, donc le même filtre les retrouve dans les logs Vercel.
 *
 * L'adresse email n'y figure pas : le code, le statut et le message de Supabase
 * suffisent à trancher entre un mot de passe refusé, un quota et une panne d'envoi.
 */
function logAuthFailure(step: string, failure: { code?: string; status?: number; message: string }) {
  console.error("[mystorey-error]", JSON.stringify({ step, code: failure.code, status: failure.status, message: failure.message, at: new Date().toISOString() }));
}
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
      logAuthFailure("register",error);
      return {error:signUpErrorMessage(error),displayName,email};
    }
    // Confirmation d'email activée : pour ne pas révéler qui possède un compte,
    // Supabase renvoie un utilisateur leurre sans identité au lieu de « déjà
    // inscrit ». Sans ce test la personne croyait son compte créé, attendait un
    // email qui ne partait jamais, puis se heurtait à « mot de passe incorrect ».
    if(data.user&&(data.user.identities?.length??0)===0)return {error:ALREADY_REGISTERED,displayName,email};
    hasSession = Boolean(data.session);
  } catch (cause) {
    logAuthFailure("register",{message:cause instanceof Error?cause.message:String(cause)});
    return {error:SERVICE_UNREACHABLE,displayName,email};
  }
  // La confirmation d'email est désactivée sur ce projet Supabase : signUp renvoie
  // toujours une session et la vendeuse arrive directement sur l'onboarding, sans
  // rien à ouvrir dans sa boîte mail. Le message ci-dessous reste le comportement
  // juste si la case « Confirm email » est un jour recochée dans le tableau de bord,
  // et le bouton de renvoi de l'interface ne s'affiche qu'avec lui.
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
      // Un mot de passe mal tapé est la vie normale d'un formulaire : on ne logue
      // que ce qui vient de la plateforme, sinon le filtre se noie dans le bruit.
      if(error.code!=="invalid_credentials")logAuthFailure("login",error);
      // Le piège qui a coûté le plus cher : sans ce test, une base injoignable
      // répondait « mot de passe incorrect » et la vendeuse se croyait fautive.
      if(isUnreachable(error))return {error:SERVICE_UNREACHABLE,email};
      if(error.code==="email_not_confirmed")return {error:"Votre adresse n’est pas encore confirmée. Vérifiez votre boîte mail.",reason:"email_not_confirmed",email:result.data.email};
      if(error.status===429)return {error:"Trop de tentatives. Patientez une minute puis réessayez.",email};
      return {error:"Email ou mot de passe incorrect.",email};
    }
    const { data: { user } }=await supabase.auth.getUser();
    if(!user)return {error:"Session introuvable. Réessayez.",email};
    destination = await destinationFor(supabase, user);
  } catch (cause) {
    logAuthFailure("login",{message:cause instanceof Error?cause.message:String(cause)});
    return {error:SERVICE_UNREACHABLE,email};
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
  if(error){
    logAuthFailure("resend-confirmation",error);
    if(isUnreachable(error))return {error:SERVICE_UNREACHABLE};
    return {error:"Impossible de renvoyer l’email pour le moment. Réessayez dans quelques minutes."};
  }
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
    // Email delivery is not guaranteed: the way back in is a link the team sends on WhatsApp.
    if(error){
      logAuthFailure("password-reset",error);
      if(isUnreachable(error))return {error:SERVICE_UNREACHABLE};
      return {error:"L’envoi par email ne fonctionne pas pour le moment. Écrivez à l’équipe MYSTOREY (page Contact) : elle vous enverra un lien sur WhatsApp pour choisir un nouveau mot de passe."};
    }
    return {success:"Si un compte existe avec cette adresse, un email de récupération vient d’être envoyé — vérifiez votre boîte mail (pensez aux courriers indésirables)."};
  } catch (cause) {
    logAuthFailure("password-reset",{message:cause instanceof Error?cause.message:String(cause)});
    return {error:SERVICE_UNREACHABLE};
  }
}
export async function updatePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const result=updatePasswordSchema.safeParse({password:String(formData.get("password")||""),confirmPassword:String(formData.get("confirmPassword")||"")});
  if(!result.success)return validation(result);
  try {
    const supabase=await createSupabaseServerClient();
    const { error }=await supabase.auth.updateUser({password:result.data.password});
    if(error){
      logAuthFailure("update-password",error);
      // Un lien parfaitement valide ne doit pas être déclaré expiré parce que la
      // requête n'est jamais arrivée : elle relancerait une demande pour rien.
      if(isUnreachable(error))return {error:SERVICE_UNREACHABLE};
      return {error:"Le lien de récupération est invalide ou a expiré. Relancez une demande de mot de passe oublié."};
    }
    await supabase.auth.signOut();
  } catch (cause) {
    logAuthFailure("update-password",{message:cause instanceof Error?cause.message:String(cause)});
    return {error:"Le lien de récupération est invalide ou a expiré. Relancez une demande de mot de passe oublié."};
  }
  redirect("/login?reset=success");
}
export async function logout(){const supabase=await createSupabaseServerClient(); await supabase.auth.signOut(); redirect("/login?bye=1");}
