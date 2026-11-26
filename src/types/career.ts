export type ResumeTemplateId = 'modern' | 'ats' | 'developer' | 'minimal' | 'student';

export type ResumeSectionKey =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'achievements'
  | 'languages';

export interface PersonalInfo {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  grade: string;
  highlights: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  techStack: string[];
  link: string;
  description: string;
  highlights: string[];
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

export interface ResumeContent {
  personalInfo: PersonalInfo;
  summary: string;
  technicalSkills: string[];
  softSkills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  achievements: string[];
  languages: string[];
  sectionOrder: ResumeSectionKey[];
}

export interface ResumeAnalysisScores {
  atsScore: number;
  structureScore: number;
  skillsScore: number;
  experienceScore: number;
  projectScore: number;
  keywordMatchScore: number;
}

export interface JobMatchAnalysis {
  jobTitle: string;
  matchPercentage: number;
  matchingSkills: string[];
  missingSkills: string[];
  relevantKeywords: string[];
  recommendedChanges: string[];
  optimizedSummary: string;
  suggestedKeywordAdditions: string[];
}

export interface ResumeAnalysis {
  scores: ResumeAnalysisScores;
  strengths: string[];
  weaknesses: string[];
  missingInfo: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  suggestions: string[];
  recommendedSkills: string[];
  jobMatch?: JobMatchAnalysis;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  title: string;
  template: ResumeTemplateId;
  atsScore: number;
  completenessScore: number;
  content: ResumeContent;
  analysis?: ResumeAnalysis;
  rawText?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ExperienceLevel =
  | 'Student'
  | 'Fresher'
  | 'Internship'
  | '0-2 years'
  | '2-5 years'
  | 'Experienced';

export type InterviewType =
  | 'Technical Interview'
  | 'HR Interview'
  | 'Behavioral Interview'
  | 'Resume-Based Interview'
  | 'Project Interview'
  | 'Mixed Interview';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface InterviewConfig {
  resumeId?: string;
  resumeTitle?: string;
  jobRole: string;
  companyName?: string;
  experienceLevel: ExperienceLevel;
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  durationMinutes?: number;
  language: string;
}

export interface AnswerEvaluation {
  score: number;
  accuracy: number;
  relevance: number;
  clarity: number;
  completeness: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  feedback: string;
  whatWasGood: string;
  whatWasMissing: string;
  improvedSampleAnswer: string;
  studyTopics: string[];
}

export interface InterviewTurn {
  order: number;
  question: string;
  category: string;
  difficulty: DifficultyLevel;
  isFollowUp: boolean;
  userAnswer: string;
  skipped: boolean;
  evaluation?: AnswerEvaluation;
}

export interface CategoryScores {
  technicalKnowledge: number;
  communication: number;
  problemSolving: number;
  confidence: number;
  answerRelevance: number;
  resumeKnowledge: number;
  behavioralResponses: number;
}

export interface ImprovementPlanDay {
  day: string;
  focus: string;
  tasks: string[];
}

export interface InterviewReport {
  overallScore: number;
  performanceLevel: string;
  completionPercentage: number;
  categoryScores: CategoryScores;
  strengths: string[];
  weaknesses: string[];
  struggledQuestions: string[];
  skillsToImprove: string[];
  communicationIssues: string[];
  missingConcepts: string[];
  recommendations: string[];
  improvementPlan: ImprovementPlanDay[];
}

export interface InterviewRecord {
  id: string;
  userId: string;
  resumeId?: string;
  resumeTitle?: string;
  jobRole: string;
  companyName?: string;
  experienceLevel: string;
  interviewType: string;
  difficulty: DifficultyLevel;
  language: string;
  totalQuestions: number;
  status: 'in_progress' | 'completed';
  overallScore: number;
  turns: InterviewTurn[];
  report?: InterviewReport;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface JobPrepQuestion {
  question: string;
  focusArea: string;
  tip: string;
}

export interface JobPrepData {
  requiredSkills: string[];
  interviewTopics: string[];
  technicalQuestions: JobPrepQuestion[];
  hrQuestions: JobPrepQuestion[];
  studyPlan: ImprovementPlanDay[];
  resumeKeywords: string[];
  skillsGap: {
    matchingSkills: string[];
    missingSkills: string[];
    priorityActions: string[];
  };
}

export interface JobPrepRecord {
  id: string;
  userId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
  prepData: JobPrepData;
  createdAt?: unknown;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
  preferredLanguage?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
