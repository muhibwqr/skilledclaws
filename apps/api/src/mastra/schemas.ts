import { z } from "zod";

export const searchResponseSchema = z.object({
  trends: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
    })
  ),
  locations: z.array(
    z.object({
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
    })
  ),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
