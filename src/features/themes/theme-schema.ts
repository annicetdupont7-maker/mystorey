import { z } from "zod";
export const PRESET_IDS = ["elegant","minimal","luxury","modern","bold","natural","colorful"] as const;
export type PresetId = (typeof PRESET_IDS)[number];
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/,"Couleur hexadécimale requise");
export const themeTokensSchema = z.object({ colors:z.object({primary:hex,secondary:hex,accent:hex,background:hex,surface:hex,text:hex}), typography:z.object({headingFont:z.string().min(1).max(80),bodyFont:z.string().min(1).max(80),headingTracking:z.string().regex(/^-?\d+(\.\d+)?em$/)}), components:z.object({buttonStyle:z.enum(["soft","sharp","pill"]),cardStyle:z.enum(["flat","outlined","elevated"]),radius:z.number().min(0).max(32),shadow:z.string().max(100)}), layout:z.object({catalogLayout:z.enum(["grid","list"]),columns:z.number().int().min(2).max(4),headerStyle:z.enum(["classic","centered","editorial"]),heroVariant:z.enum(["banner","editorial","split","featured","compact"]),spacing:z.enum(["compact","comfortable","airy"])}) });
export type ThemeTokens = z.infer<typeof themeTokensSchema>;
const themeOverridesSchema = z.object({ colors: themeTokensSchema.shape.colors.partial().optional(), typography: themeTokensSchema.shape.typography.partial().optional(), components: themeTokensSchema.shape.components.partial().optional(), layout: themeTokensSchema.shape.layout.partial().optional() });
export const storeThemeSchema = z.object({preset_id:z.enum(PRESET_IDS),overrides:themeOverridesSchema.optional(),layout:themeTokensSchema.shape.layout.partial().optional(),version:z.literal(1)});
export type StoreTheme = z.infer<typeof storeThemeSchema>;
