import { z } from "zod";

export const roleChangeSchema = z.object({
  userId: z.string().min(1, "Identifiant manquant."),
  role: z.enum(["seller", "admin"], { message: "Rôle invalide." }),
});

export type RoleChangeInput = z.infer<typeof roleChangeSchema>;