import { z } from "zod";
import {
  nonEmptyTextSchema,
  provenanceSchema,
  recordIdSchema,
} from "./common.js";

export const factSchema = <T extends z.ZodType>(valueSchema: T) =>
  z
    .object({
      value: valueSchema,
      provenance: provenanceSchema,
    })
    .strict();

const optionalContactSchema = z.string().trim().max(320);

export const identitySchema = z
  .object({
    fullName: factSchema(nonEmptyTextSchema.max(200)),
    preferredName: factSchema(z.string().trim().max(100)).optional(),
    location: factSchema(z.string().trim().max(300)).optional(),
    email: factSchema(optionalContactSchema).optional(),
    phone: factSchema(z.string().trim().max(80)).optional(),
    linkedInUrl: factSchema(z.url().max(500)).optional(),
    githubUrl: factSchema(z.url().max(500)).optional(),
    languages: z.array(factSchema(nonEmptyTextSchema.max(100))),
  })
  .strict();

export const datedRangeSchema = z
  .object({
    start: z.string().trim().min(1).max(80),
    end: z.string().trim().min(1).max(80).optional(),
    current: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.current && value.end) {
      context.addIssue({
        code: "custom",
        path: ["end"],
        message: "A current date range cannot also have an end date.",
      });
    }
  });

export const careerEntrySchema = z
  .object({
    id: recordIdSchema,
    employer: factSchema(nonEmptyTextSchema.max(200)),
    title: factSchema(nonEmptyTextSchema.max(200)),
    location: factSchema(z.string().trim().max(300)).optional(),
    dates: factSchema(datedRangeSchema),
    responsibilities: z.array(factSchema(nonEmptyTextSchema.max(2_000))),
    achievements: z.array(factSchema(nonEmptyTextSchema.max(2_000))),
  })
  .strict();

export const educationEntrySchema = z
  .object({
    id: recordIdSchema,
    institution: factSchema(nonEmptyTextSchema.max(200)),
    credential: factSchema(nonEmptyTextSchema.max(300)),
    dates: factSchema(datedRangeSchema).optional(),
    details: z.array(factSchema(nonEmptyTextSchema.max(1_000))),
  })
  .strict();

export const skillSchema = z
  .object({
    id: recordIdSchema,
    name: factSchema(nonEmptyTextSchema.max(160)),
    category: z.enum([
      "executive",
      "operational",
      "technical",
      "trade",
      "laboratory",
      "interpersonal",
      "other",
    ]),
    lastUsed: factSchema(z.string().trim().max(80)).optional(),
  })
  .strict();

export const projectSchema = z
  .object({
    id: recordIdSchema,
    name: factSchema(nonEmptyTextSchema.max(200)),
    summary: factSchema(nonEmptyTextSchema.max(3_000)),
    capabilities: z.array(factSchema(nonEmptyTextSchema.max(500))),
    technologies: z.array(factSchema(nonEmptyTextSchema.max(200))),
    metrics: z.array(factSchema(nonEmptyTextSchema.max(500))),
    prohibitedClaims: z.array(nonEmptyTextSchema.max(1_000)),
  })
  .strict();

export const searchPreferencesSchema = z
  .object({
    coreRoles: z.array(nonEmptyTextSchema.max(200)),
    adjacentRoles: z.array(nonEmptyTextSchema.max(200)),
    stretchRoles: z.array(nonEmptyTextSchema.max(200)),
    locations: z.array(nonEmptyTextSchema.max(200)),
    workModes: z.array(z.enum(["onsite", "hybrid", "remote"])),
    travelPreference: z.string().trim().max(500).optional(),
    compensationFloor: z.string().trim().max(200).optional(),
    dealBreakers: z.array(nonEmptyTextSchema.max(500)),
  })
  .strict();

export const candidateProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: recordIdSchema,
    identity: identitySchema,
    positioning: z
      .object({
        primary: factSchema(nonEmptyTextSchema.max(200)),
        supporting: z.array(factSchema(nonEmptyTextSchema.max(200))),
        biography: factSchema(z.string().trim().max(10_000)).optional(),
      })
      .strict(),
    careerHistory: z.array(careerEntrySchema),
    education: z.array(educationEntrySchema),
    skills: z.array(skillSchema),
    projects: z.array(projectSchema),
    voiceRules: z.array(factSchema(nonEmptyTextSchema.max(1_000))),
    prohibitedClaims: z.array(factSchema(nonEmptyTextSchema.max(1_000))),
    searchPreferences: searchPreferencesSchema,
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type Fact<T> = {
  value: T;
  provenance: import("./common.js").Provenance;
};
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type CareerEntry = z.infer<typeof careerEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SearchPreferences = z.infer<typeof searchPreferencesSchema>;
