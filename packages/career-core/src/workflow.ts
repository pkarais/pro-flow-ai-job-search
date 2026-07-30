import { z } from "zod";
import {
  applicationStatusSchema,
  readinessCheckSchema,
} from "./application.ts";
import {
  isoDateTimeSchema,
  recordIdSchema,
} from "./common.ts";

export const workflowStateSchema = z
  .object({
    applicationId: recordIdSchema,
    status: applicationStatusSchema,
    readinessChecks: z.array(readinessCheckSchema),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

const transitions = {
  discovered: ["shortlisted", "withdrawn"],
  shortlisted: ["drafting", "withdrawn"],
  drafting: ["factual_review", "withdrawn"],
  factual_review: ["drafting", "document_verification", "withdrawn"],
  document_verification: ["drafting", "factual_review", "ready", "withdrawn"],
  ready: ["applied", "drafting", "withdrawn"],
  applied: ["interviewing", "offer", "rejected", "withdrawn"],
  interviewing: ["offer", "rejected", "withdrawn"],
  offer: ["withdrawn"],
  rejected: [],
  withdrawn: [],
} as const satisfies Record<
  z.infer<typeof applicationStatusSchema>,
  readonly z.infer<typeof applicationStatusSchema>[]
>;

export function canTransition(
  from: z.infer<typeof applicationStatusSchema>,
  to: z.infer<typeof applicationStatusSchema>,
): boolean {
  return (transitions[from] as readonly string[]).includes(to);
}

export function isReadyForSubmission(
  checks: readonly z.infer<typeof readinessCheckSchema>[],
): boolean {
  return checks
    .filter((check) => check.required)
    .every((check) => check.status === "passed");
}

export type WorkflowState = z.infer<typeof workflowStateSchema>;
