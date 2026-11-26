import type { ResumeContent, ResumeSectionKey } from '../types/career';

export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'achievements',
  'languages',
];

export const SECTION_LABELS: Record<ResumeSectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  projects: 'Projects',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
  achievements: 'Achievements',
  languages: 'Languages',
};

export function createEmptyResumeContent(seed?: { name?: string; email?: string }): ResumeContent {
  return {
    personalInfo: {
      fullName: seed?.name ?? '',
      headline: '',
      email: seed?.email ?? '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
    summary: '',
    technicalSkills: [],
    softSkills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: [],
    languages: ['English'],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

export function normalizeParsedResume(raw: Record<string, unknown>): ResumeContent {
  const pi = (raw.personalInfo as Record<string, unknown>) || {};
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strArr = (v: unknown) => arr(v).map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean);

  return {
    personalInfo: {
      fullName: str(pi.fullName),
      headline: str(pi.headline),
      email: str(pi.email),
      phone: str(pi.phone),
      location: str(pi.location),
      linkedin: str(pi.linkedin),
      github: str(pi.github),
      portfolio: str(pi.portfolio),
    },
    summary: str(raw.summary),
    technicalSkills: strArr(raw.technicalSkills),
    softSkills: strArr(raw.softSkills),
    education: arr(raw.education).map((item, idx) => {
      const e = (item as Record<string, unknown>) || {};
      return {
        id: `edu_${Date.now()}_${idx}`,
        institution: str(e.institution),
        degree: str(e.degree),
        field: str(e.field),
        startDate: str(e.startDate),
        endDate: str(e.endDate),
        grade: str(e.grade),
        highlights: str(e.highlights),
      };
    }),
    experience: arr(raw.experience).map((item, idx) => {
      const e = (item as Record<string, unknown>) || {};
      return {
        id: `exp_${Date.now()}_${idx}`,
        company: str(e.company),
        role: str(e.role),
        location: str(e.location),
        startDate: str(e.startDate),
        endDate: str(e.endDate),
        current: Boolean(e.current),
        bullets: strArr(e.bullets),
      };
    }),
    projects: arr(raw.projects).map((item, idx) => {
      const p = (item as Record<string, unknown>) || {};
      return {
        id: `proj_${Date.now()}_${idx}`,
        name: str(p.name),
        techStack: strArr(p.techStack),
        link: str(p.link),
        description: str(p.description),
        highlights: strArr(p.highlights),
      };
    }),
    certifications: arr(raw.certifications).map((item, idx) => {
      const c = (item as Record<string, unknown>) || {};
      return {
        id: `cert_${Date.now()}_${idx}`,
        name: str(c.name),
        issuer: str(c.issuer),
        date: str(c.date),
        credentialUrl: str(c.credentialUrl),
      };
    }),
    achievements: strArr(raw.achievements),
    languages: strArr(raw.languages),
    sectionOrder: [...DEFAULT_SECTION_ORDER],
  };
}

export function calculateCompletenessScore(content: ResumeContent): number {
  let points = 0;
  if (content.personalInfo.fullName.trim()) points += 10;
  if (content.personalInfo.email.trim()) points += 8;
  if (content.personalInfo.phone.trim()) points += 5;
  if (content.personalInfo.headline.trim()) points += 7;
  if (content.personalInfo.linkedin.trim() || content.personalInfo.github.trim()) points += 5;
  if (content.summary.trim().length >= 40) points += 15;
  if (content.technicalSkills.length >= 4) points += 15;
  else if (content.technicalSkills.length > 0) points += 8;
  if (content.education.length > 0) points += 15;
  if (content.experience.length > 0) points += 10;
  if (content.projects.length > 0) points += 10;
  return Math.min(100, points);
}

export function estimateBaselineAtsScore(content: ResumeContent): number {
  let score = Math.round(calculateCompletenessScore(content) * 0.65);
  const bulletCount =
    content.experience.reduce((acc, e) => acc + e.bullets.filter((b) => b.trim().length > 15).length, 0) +
    content.projects.reduce((acc, p) => acc + p.highlights.filter((h) => h.trim().length > 15).length, 0);
  if (bulletCount >= 4) score += 15;
  else if (bulletCount >= 1) score += 8;
  if (content.technicalSkills.length >= 6) score += 10;
  if (content.certifications.length > 0 || content.achievements.length > 0) score += 5;
  if (content.softSkills.length >= 2) score += 5;
  return Math.min(100, score);
}
