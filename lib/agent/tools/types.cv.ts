import { z } from 'zod';

export const isoDateSchema = z.string();

export const companySchema = z.object({
  name: z.string(),
  link: z.string().optional(),
  logo: z.string().optional(),
});

export const positionSchema = z.object({
  title: z.string(),
  start: isoDateSchema,
  end: isoDateSchema.nullable(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

export const experienceSchema = z.object({
  company: companySchema,
  positions: z.array(positionSchema),
});

export const educationSchema = z.object({
  title: z.string(),
  org: z.string(),
  start: isoDateSchema,
  end: isoDateSchema,
  summary: z.string().optional(),
});

export const cvSchema = z.object({
  experiences: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(z.string()),
  meta: z.object({
    highlightedExperiences: z.array(z.number()).optional(),
    highlightedEducations: z.array(z.number()).optional(),
    collapsedByDefault: z.boolean().optional(),
  }).optional(),
});

export type ISODate = string; // "YYYY-MM-DD"
export type Company = z.infer<typeof companySchema>;
export type Position = z.infer<typeof positionSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type EducationJSON = z.infer<typeof educationSchema>;
export type CVJSON = z.infer<typeof cvSchema>;


