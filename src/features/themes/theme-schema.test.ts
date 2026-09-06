import { describe, expect, it } from "vitest";
import { resolveStoreTheme } from "./resolve-theme";
import { storeThemeSchema } from "./theme-schema";
describe("store themes",()=>{it("rejects arbitrary CSS and invalid colours",()=>{expect(storeThemeSchema.safeParse({preset_id:"modern",version:1,overrides:{colors:{primary:"red;position:fixed"}}}).success).toBe(false);});it("falls back to a valid preset",()=>{expect(resolveStoreTheme({preset_id:"unknown",version:1}).preset.id).toBe("modern");});it("applies a valid token override",()=>{expect(resolveStoreTheme({preset_id:"modern",version:1,overrides:{colors:{primary:"#123456"}}}).tokens.colors.primary).toBe("#123456");});});
