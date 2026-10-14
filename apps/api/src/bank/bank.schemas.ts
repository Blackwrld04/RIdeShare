import { z } from "zod";

export const resolveBankAccountSchema = z
  .object({
    accountNumber: z.string().regex(/^\d{10}$/),
    bankCode: z.string().regex(/^\d{2,10}$/),
  })
  .strict();

export type ResolveBankAccountInput = z.infer<typeof resolveBankAccountSchema>;
