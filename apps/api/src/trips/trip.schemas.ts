import { z } from "zod";

export const tripTrackerQuerySchema = z
  .object({
    view: z.enum(["upcoming", "past", "cancelled"]).default("upcoming"),
  })
  .strict();

export type TripTrackerQuery = z.infer<typeof tripTrackerQuerySchema>;
