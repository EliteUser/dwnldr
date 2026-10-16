import { z } from 'zod';

const idSchema = z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]);

export const soundCloudUserSchema = z
  .object({
    avatar_url: z.string().url().nullable().optional(),
    full_name: z.string().nullable().optional(),
    id: idSchema,
    kind: z.string().optional(),
    permalink_url: z.string().url().optional(),
    username: z.string().min(1),
  })
  .passthrough();

export const soundCloudTrackSchema = z
  .object({
    artwork_url: z.string().url().nullable().optional(),
    duration: z.number().nonnegative(),
    id: idSchema,
    kind: z.string().optional(),
    permalink_url: z.string().url(),
    title: z.string().min(1),
    user: z
      .object({
        avatar_url: z.string().url().nullable().optional(),
        username: z.string().min(1),
      })
      .passthrough(),
  })
  .passthrough();

export const soundCloudLikesPageSchema = z
  .object({
    collection: z.array(z.unknown()),
    next_href: z.string().url().nullable().optional(),
  })
  .passthrough();

export type SoundCloudTrack = z.infer<typeof soundCloudTrackSchema>;
export type SoundCloudUser = z.infer<typeof soundCloudUserSchema>;
