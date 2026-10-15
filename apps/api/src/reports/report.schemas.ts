import { z } from "zod";

export const reportBookingIdSchema = z.uuid();
export const reportIdSchema = z.uuid();

export const createReportSchema = z
  .object({
    category: z.enum(["SAFETY", "HARASSMENT", "FRAUD", "NO_SHOW", "OTHER"]),
    details: z.string().trim().min(10).max(1000),
  })
  .strict();

export const listMyReportsSchema = z
  .object({
    status: z
      .enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"])
      .optional(),
    cursor: z.uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const listAdminReportsSchema = listMyReportsSchema.extend({
  category: z
    .enum(["SAFETY", "HARASSMENT", "FRAUD", "NO_SHOW", "OTHER"])
    .optional(),
});

export const reviewReportSchema = z
  .object({
    status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"]),
    note: z.string().trim().min(10).max(1000).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.status !== "UNDER_REVIEW" && !input.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "A resolution note is required",
      });
    }
  });

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListMyReportsInput = z.infer<typeof listMyReportsSchema>;
export type ListAdminReportsInput = z.infer<typeof listAdminReportsSchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
