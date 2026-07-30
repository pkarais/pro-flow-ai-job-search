import type {
  ApplicationPackage,
  ClaimReview,
  ReadinessCheck,
} from "./application.js";
import type { EvidenceImportResult } from "./evidence.js";
import type { CandidateProfile } from "./profile.js";
import type { FitAssessment, Opportunity } from "./opportunity.js";

export type GeneratedArtifact = {
  kind: "resume_source" | "resume_pdf" | "cover_letter_source" | "cover_letter_pdf" | "ats_text";
  path: string;
  mediaType: string;
};

export type DocumentResult = {
  artifacts: GeneratedArtifact[];
  checks: ReadinessCheck[];
};

export interface CareerProfileProvider {
  load(): Promise<CandidateProfile>;
  save(profile: CandidateProfile): Promise<void>;
}

export interface EvidenceImporter {
  preview(): Promise<EvidenceImportResult>;
}

export interface OpportunityRepository {
  save(opportunity: Opportunity): Promise<void>;
  get(id: string): Promise<Opportunity | null>;
  list(): Promise<Opportunity[]>;
}

export interface ApplicationRepository {
  save(application: ApplicationPackage): Promise<void>;
  get(id: string): Promise<ApplicationPackage | null>;
  saveClaimReview(applicationId: string, review: ClaimReview): Promise<void>;
}

export interface FitEvaluator {
  evaluate(profile: CandidateProfile, opportunity: Opportunity): Promise<FitAssessment>;
}

export interface ApplicationGenerator {
  generate(
    profile: CandidateProfile,
    opportunity: Opportunity,
    fit: FitAssessment,
  ): Promise<ApplicationPackage>;
}

export interface DocumentEngine {
  render(application: ApplicationPackage): Promise<DocumentResult>;
}

export interface JobSearchQuery {
  terms: string[];
  locations: string[];
  workModes: Array<"onsite" | "hybrid" | "remote">;
}

export interface JobSource {
  readonly id: string;
  search(query: JobSearchQuery): Promise<Opportunity[]>;
  get(externalId: string): Promise<Opportunity | null>;
}
