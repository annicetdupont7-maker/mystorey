import { z } from "zod";
import { PRESET_IDS } from "@/features/themes/theme-schema";
export const slugSchema = z.string().trim().min(3,"Au moins 3 caractères.").max(60,"60 caractères maximum.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/,"Utilisez des minuscules, chiffres et tirets.");
export const whatsappPattern = /^\+[1-9][0-9\s().-]{7,24}$/;
export const whatsappOptionalSchema = z.string().trim().refine((value)=>{
	if (value === "") return true;
	if (!whatsappPattern.test(value)) return false;
	const digits = value.replace(/\D/g, "");
	return digits.length >= 8 && digits.length <= 15;
},"Numéro invalide — utilisez le format international, ex. +237 6 00 00 00 00.");
export const onboardingSchema = z.object({ name:z.string().trim().min(2,"Le nom est trop court.").max(80,"80 caractères maximum."), slug:slugSchema, presetId:z.enum(PRESET_IDS), whatsapp:whatsappOptionalSchema });
export const storeSettingsSchema = z.object({ name:z.string().trim().min(2,"Le nom est trop court.").max(80,"80 caractères maximum."), description:z.string().trim().max(500,"500 caractères maximum."), whatsapp:whatsappOptionalSchema });
export const storeIdentitySchema = z.object({ name:z.string().trim().min(2,"Le nom est trop court.").max(80,"80 caractères maximum."), slogan:z.string().trim().max(120,"120 caractères maximum.").optional().default(""), description:z.string().trim().max(500,"500 caractères maximum.").optional().default(""), whatsapp:whatsappOptionalSchema });
