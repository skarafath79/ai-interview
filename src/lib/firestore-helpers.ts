import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type {
  InterviewConfig,
  InterviewRecord,
  InterviewReport,
  InterviewTurn,
  JobPrepData,
  JobPrepRecord,
  ResumeAnalysis,
  ResumeContent,
  ResumeRecord,
  ResumeTemplateId,
  UserProfile,
} from '../types/career';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

export async function ensureUserProfile(
  uid: string,
  name: string,
  email: string
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const profilePayload = {
      uid,
      name: (name || email.split('@')[0] || 'Candidate').slice(0, 120),
      email: email.slice(0, 200),
      targetRole: 'Software Developer',
      experienceLevel: 'Fresher',
      preferredLanguage: 'English',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profilePayload);
    return {
      ...profilePayload,
      experienceLevel: 'Fresher',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    name: string;
    email: string;
    targetRole?: string;
    experienceLevel?: string;
    preferredLanguage?: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, {
      name: updates.name.slice(0, 120),
      email: updates.email.slice(0, 200),
      targetRole: (updates.targetRole ?? '').slice(0, 120),
      experienceLevel: (updates.experienceLevel ?? 'Fresher').slice(0, 40),
      preferredLanguage: (updates.preferredLanguage ?? 'English').slice(0, 40),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listUserResumes(userId: string): Promise<ResumeRecord[]> {
  const path = 'resumes';
  try {
    const q = query(
      collection(db, 'resumes'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ResumeRecord, 'id'>),
    }));
  } catch (error) {
    // Fallback without orderBy if composite index isn't created yet
    try {
      const qFallback = query(collection(db, 'resumes'), where('userId', '==', userId));
      const snap = await getDocs(qFallback);
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ResumeRecord, 'id'>),
      }));
      return items.sort((a, b) => {
        const ta = (a.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
        const tb = (b.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
        return tb - ta;
      });
    } catch (innerErr) {
      handleFirestoreError(innerErr, OperationType.LIST, path);
    }
  }
}

export async function createResumeRecord(params: {
  userId: string;
  title: string;
  template: ResumeTemplateId;
  atsScore: number;
  completenessScore: number;
  content: ResumeContent;
  analysis?: ResumeAnalysis;
  rawText?: string;
}): Promise<ResumeRecord> {
  const id = generateId('res');
  const path = `resumes/${id}`;
  try {
    const payload: Record<string, unknown> = {
      userId: params.userId,
      title: params.title.slice(0, 140),
      template: params.template,
      atsScore: Math.max(0, Math.min(100, Math.round(params.atsScore))),
      completenessScore: Math.max(0, Math.min(100, Math.round(params.completenessScore))),
      content: params.content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (params.analysis) {
      payload.analysis = params.analysis;
    }
    if (params.rawText) {
      payload.rawText = params.rawText.slice(0, 40000);
    }
    await setDoc(doc(db, 'resumes', id), payload);
    return {
      id,
      userId: params.userId,
      title: params.title,
      template: params.template,
      atsScore: payload.atsScore as number,
      completenessScore: payload.completenessScore as number,
      content: params.content,
      analysis: params.analysis,
      rawText: params.rawText,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateResumeRecord(
  id: string,
  updates: {
    title: string;
    template: ResumeTemplateId;
    atsScore: number;
    completenessScore: number;
    content: ResumeContent;
    analysis?: ResumeAnalysis;
    rawText?: string;
  }
): Promise<void> {
  const path = `resumes/${id}`;
  try {
    const payload: Record<string, unknown> = {
      title: updates.title.slice(0, 140),
      template: updates.template,
      atsScore: Math.max(0, Math.min(100, Math.round(updates.atsScore))),
      completenessScore: Math.max(0, Math.min(100, Math.round(updates.completenessScore))),
      content: updates.content,
      updatedAt: serverTimestamp(),
    };
    if (updates.analysis !== undefined) {
      payload.analysis = updates.analysis;
    }
    if (updates.rawText !== undefined) {
      payload.rawText = updates.rawText.slice(0, 40000);
    }
    await updateDoc(doc(db, 'resumes', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteResumeRecord(id: string): Promise<void> {
  const path = `resumes/${id}`;
  try {
    await deleteDoc(doc(db, 'resumes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listUserInterviews(userId: string): Promise<InterviewRecord[]> {
  const path = 'interviews';
  try {
    const q = query(collection(db, 'interviews'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<InterviewRecord, 'id'>),
    }));
    return items.sort((a, b) => {
      const ta = (a.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
      const tb = (b.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
      return tb - ta;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createInterviewRecord(
  userId: string,
  config: InterviewConfig,
  firstTurn: InterviewTurn
): Promise<InterviewRecord> {
  const id = generateId('int');
  const path = `interviews/${id}`;
  try {
    const payload: Record<string, unknown> = {
      userId,
      resumeId: (config.resumeId ?? '').slice(0, 128),
      resumeTitle: (config.resumeTitle ?? 'General Profile').slice(0, 140),
      jobRole: config.jobRole.slice(0, 120),
      companyName: (config.companyName ?? '').slice(0, 120),
      experienceLevel: config.experienceLevel.slice(0, 40),
      interviewType: config.interviewType.slice(0, 60),
      difficulty: config.difficulty,
      language: config.language.slice(0, 40),
      totalQuestions: config.totalQuestions,
      status: 'in_progress',
      overallScore: 0,
      turns: [firstTurn],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'interviews', id), payload);
    return {
      id,
      userId,
      resumeId: config.resumeId,
      resumeTitle: config.resumeTitle,
      jobRole: config.jobRole,
      companyName: config.companyName,
      experienceLevel: config.experienceLevel,
      interviewType: config.interviewType,
      difficulty: config.difficulty,
      language: config.language,
      totalQuestions: config.totalQuestions,
      status: 'in_progress',
      overallScore: 0,
      turns: [firstTurn],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInterviewProgress(
  id: string,
  turns: InterviewTurn[],
  overallScore: number,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
): Promise<void> {
  const path = `interviews/${id}`;
  try {
    await updateDoc(doc(db, 'interviews', id), {
      turns: turns.slice(0, 30),
      overallScore: Math.max(0, Math.min(100, Math.round(overallScore))),
      difficulty,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeInterviewRecord(
  id: string,
  turns: InterviewTurn[],
  report: InterviewReport,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
): Promise<void> {
  const path = `interviews/${id}`;
  try {
    await updateDoc(doc(db, 'interviews', id), {
      turns: turns.slice(0, 30),
      overallScore: Math.max(0, Math.min(100, Math.round(report.overallScore))),
      difficulty,
      status: 'completed',
      report,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInterviewRecord(id: string): Promise<void> {
  const path = `interviews/${id}`;
  try {
    await deleteDoc(doc(db, 'interviews', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listUserJobPreps(userId: string): Promise<JobPrepRecord[]> {
  const path = 'jobPreps';
  try {
    const q = query(collection(db, 'jobPreps'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<JobPrepRecord, 'id'>),
    }));
    return items.sort((a, b) => {
      const ta = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      const tb = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
      return tb - ta;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createJobPrepRecord(params: {
  userId: string;
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
  prepData: JobPrepData;
}): Promise<JobPrepRecord> {
  const id = generateId('prep');
  const path = `jobPreps/${id}`;
  try {
    const payload = {
      userId: params.userId,
      jobTitle: params.jobTitle.slice(0, 140),
      companyName: (params.companyName ?? '').slice(0, 120),
      jobDescription: params.jobDescription.slice(0, 20000),
      prepData: params.prepData,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'jobPreps', id), payload);
    return {
      id,
      userId: params.userId,
      jobTitle: params.jobTitle,
      companyName: params.companyName,
      jobDescription: params.jobDescription,
      prepData: params.prepData,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteJobPrepRecord(id: string): Promise<void> {
  const path = `jobPreps/${id}`;
  try {
    await deleteDoc(doc(db, 'jobPreps', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
