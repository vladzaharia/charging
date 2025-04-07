import { defineCollection, z } from 'astro:content';

const jobs = defineCollection({
  type: 'content',
  schema: z.object({
    position: z.string(),
    positionShort: z.string().optional(),
    company: z.object({
      name: z.string(),
      nameShort: z.string().optional(),
      logo: z.string().optional(),
      url: z.string().url().optional(),
    }),
    location: z.string(),
    dates: z.object({
      from: z.string().transform((str) => new Date(str)),
      to: z
        .string()
        .optional()
        .transform((str) => (str ? new Date(str) : null)),
    }),
    tags: z.array(z.string()).optional(),
    type: z.enum(['language', 'framework', 'tool', 'other']).default('other'),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    githubUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional(),
    images: z.array(z.string()),
    tags: z.array(z.string()).optional(),
  }),
});

const tags = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    color: z.string(),
    icon: z.object({
      discriminant: z.enum(['none', 'icon', 'image']),
      value: z.string().optional(),
    }),
  }),
});

export const collections = {
  jobs,
  projects,
  tags,
};
