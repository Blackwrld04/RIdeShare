import { DriverApplicationStatus } from "@commuteshare/database";
import { z } from "zod";

export const adminApplicationIdSchema = z.uuid();
export const adminDocumentIdSchema = z.uuid();

export const listAdminApplicationsSchema = z.object({
  status: z.enum(DriverApplicationStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "reject" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A rejection reason is required",
      });
    }
  });

export type ListAdminApplicationsInput = z.infer<
  typeof listAdminApplicationsSchema
>;
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;
