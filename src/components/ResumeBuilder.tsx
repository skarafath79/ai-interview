import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FilePlus2,
  Loader2,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiPost, apiUploadResume } from '../lib/api';
import { exportResumeToDocx, exportResumeToPdf } from '../lib/exportResume';
import {
  createResumeRecord,
  deleteResumeRecord,
  updateResumeRecord,
} from '../lib/firestore-helpers';
import {
  calculateCompletenessScore,
  createEmptyResumeContent,
  DEFAULT_SECTION_ORDER,
  estimateBaselineAtsScore,
  normalizeParsedResume,
  SECTION_LABELS,
} from '../lib/resumeUtils';
import type {
  ResumeContent,
  ResumeRecord,
  ResumeSectionKey,
  ResumeTemplateId,
} from '../types/career';
import { ResumePreview } from './ResumePreview';
import { useToast } from './ToastProvider';

interface ResumeBuilderProps {
  userId: string;
  userEmail: string;
  userName: string;
  resumes: ResumeRecord[];
  activeResumeId: string | null;
  onSelectResume: (id: string | null) => void;
  onResumesChanged: () => Promise<void>;
  autoOpenUpload?: boolean;
  onConsumeAutoUpload?: () => void;
  onGoToAnalyzer: () => void;
}

const TEMPLATES: { id: ResumeTemplateId; label: string }[] = [
  { id: 'modern', label: 'Modern Professional' },
  { id: 'ats', label: 'ATS-Friendly' },
  { id: 'developer', label: 'Software Developer' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'student', label: 'Student / Fresher' },
];

type ImproveMode =
  | 'improve_section'
  | 'rewrite_professional'
  | 'make_concise'
  | 'add_action_verbs'
  | 'improve_ats_keywords'
  | 'generate_summary'
  | 'improve_project';

interface AiImprovementResult {
  targetType: 'summary' | 'experience' | 'project';
  entryId?: string;
  improvedText: string;
  improvedBullets: string[];
  suggestedKeywords: string[];
  suggestedConfirmations: string[];
  explanation: string;
}

export function ResumeBuilder({
  userId,
  userEmail,
  userName,
  resumes,
  activeResumeId,
  onSelectResume,
  onResumesChanged,
  autoOpenUpload,
  onConsumeAutoUpload,
  onGoToAnalyzer,
}: ResumeBuilderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeRecord = resumes.find((r) => r.id === activeResumeId) || null;

  const [title, setTitle] = useState('My Professional Resume');
  const [template, setTemplate] = useState<ResumeTemplateId>('modern');
  const [content, setContent] = useState<ResumeContent>(() =>
    createEmptyResumeContent({ name: userName, email: userEmail })
  );
  const [rawText, setRawText] = useState<string>('');
  const [missingConfirmations, setMissingConfirmations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [improvingKey, setImprovingKey] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<AiImprovementResult | null>(null);

  const [techSkillInput, setTechSkillInput] = useState('');
  const [softSkillInput, setSoftSkillInput] = useState('');
  const [achievementInput, setAchievementInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');

  useEffect(() => {
    if (activeRecord) {
      setTitle(activeRecord.title);
      setTemplate(activeRecord.template);
      setContent({
        ...createEmptyResumeContent({ name: userName, email: userEmail }),
        ...activeRecord.content,
        sectionOrder: activeRecord.content.sectionOrder?.length
          ? activeRecord.content.sectionOrder
          : [...DEFAULT_SECTION_ORDER],
      });
      setRawText(activeRecord.rawText || '');
      setMissingConfirmations([]);
      setAiDraft(null);
    }
  }, [activeRecord?.id]);

  useEffect(() => {
    if (autoOpenUpload) {
      fileInputRef.current?.click();
      onConsumeAutoUpload?.();
    }
  }, [autoOpenUpload, onConsumeAutoUpload]);

  const completenessScore = calculateCompletenessScore(content);
  const baselineAts = activeRecord?.analysis?.scores?.atsScore ?? estimateBaselineAtsScore(content);

  const handleStartFresh = () => {
    onSelectResume(null);
    setTitle('Untitled Resume');
    setTemplate('modern');
    setContent(createEmptyResumeContent({ name: userName, email: userEmail }));
    setRawText('');
    setMissingConfirmations([]);
    setAiDraft(null);
    showToast('Started a clean resume draft.', 'info');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx')) {
      showToast('Please upload a PDF or DOCX file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5 MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const parsed = await apiUploadResume<Record<string, unknown>>('/api/resume/parse', file);
      const normalized = normalizeParsedResume(parsed);
      const suggestedTitle =
        typeof parsed.suggestedTitle === 'string' && parsed.suggestedTitle.trim()
          ? parsed.suggestedTitle.trim()
          : file.name.replace(/\.(pdf|docx)$/i, '');

      setContent(normalized);
      setTitle(suggestedTitle);
      setRawText(typeof parsed.rawText === 'string' ? parsed.rawText : '');
      const missing = Array.isArray(parsed.missingOrUncertainFields)
        ? parsed.missingOrUncertainFields.map(String).filter(Boolean)
        : [];
      setMissingConfirmations(missing);
      onSelectResume(null);
      showToast('Resume parsed! Review any flagged details and save.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to parse resume.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Please give your resume a title before saving.', 'error');
      return;
    }
    setSaving(true);
    try {
      const ats = activeRecord?.analysis?.scores?.atsScore ?? estimateBaselineAtsScore(content);
      const comp = calculateCompletenessScore(content);
      if (activeRecord) {
        await updateResumeRecord(activeRecord.id, {
          title: title.trim(),
          template,
          atsScore: ats,
          completenessScore: comp,
          content,
          rawText,
        });
        await onResumesChanged();
        showToast('Resume saved.', 'success');
      } else {
        const created = await createResumeRecord({
          userId,
          title: title.trim(),
          template,
          atsScore: ats,
          completenessScore: comp,
          content,
          rawText,
        });
        await onResumesChanged();
        onSelectResume(created.id);
        showToast('Resume saved to your account.', 'success');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save resume.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResumeRecord(id);
      if (activeResumeId === id) {
        handleStartFresh();
      }
      await onResumesChanged();
      showToast('Resume deleted.', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete resume.', 'error');
    }
  };

  const runAiImprove = async (
    targetType: 'summary' | 'experience' | 'project',
    mode: ImproveMode,
    currentText: string,
    entryId?: string
  ) => {
    const key = `${targetType}_${entryId || 'main'}_${mode}`;
    setImprovingKey(key);
    try {
      const res = await apiPost<
        {
          mode: ImproveMode;
          section: string;
          currentText: string;
          resumeContext: ResumeContent;
          targetRole?: string;
        },
        {
          improvedText: string;
          improvedBullets: string[];
          suggestedKeywords: string[];
          suggestedConfirmations: string[];
          explanation: string;
        }
      >('/api/resume/improve', {
        mode,
        section:
          targetType === 'summary'
            ? 'Professional Summary'
            : targetType === 'experience'
              ? 'Work Experience Bullets'
              : 'Project Description & Highlights',
        currentText,
        resumeContext: content,
        targetRole: content.personalInfo.headline,
      });

      setAiDraft({
        targetType,
        entryId,
        ...res,
      });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'AI improvement failed.', 'error');
    } finally {
      setImprovingKey(null);
    }
  };

  const applyAiDraft = () => {
    if (!aiDraft) return;
    if (aiDraft.targetType === 'summary') {
      setContent((prev) => ({ ...prev, summary: aiDraft.improvedText }));
    } else if (aiDraft.targetType === 'experience' && aiDraft.entryId) {
      const bullets =
        aiDraft.improvedBullets.length > 0
          ? aiDraft.improvedBullets
          : aiDraft.improvedText.split('\n').map((s) => s.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
      setContent((prev) => ({
        ...prev,
        experience: prev.experience.map((e) =>
          e.id === aiDraft.entryId ? { ...e, bullets } : e
        ),
      }));
    } else if (aiDraft.targetType === 'project' && aiDraft.entryId) {
      setContent((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === aiDraft.entryId
            ? {
                ...p,
                description: aiDraft.improvedText || p.description,
                highlights:
                  aiDraft.improvedBullets.length > 0 ? aiDraft.improvedBullets : p.highlights,
              }
            : p
        ),
      }));
    }
    setAiDraft(null);
    showToast('AI improvement applied. Remember to save your resume.', 'success');
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= content.sectionOrder.length) return;
    const copy = [...content.sectionOrder];
    const [moved] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, moved);
    setContent((prev) => ({ ...prev, sectionOrder: copy }));
  };

  const moveArrayItem = <T,>(list: T[], idx: number, dir: -1 | 1): T[] => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= list.length) return list;
    const copy = [...list];
    const [moved] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, moved);
    return copy;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Select saved resume"
            value={activeResumeId || ''}
            onChange={(e) => onSelectResume(e.target.value || null)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium bg-white text-slate-800 max-w-xs"
          >
            <option value="">Draft / New Resume</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.atsScore}% ATS)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleStartFresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            New Blank
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Parsing Resume...' : 'Upload PDF / DOCX'}
          </button>

          {activeRecord && (
            <button
              type="button"
              onClick={() => handleDelete(activeRecord.id)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
              title="Delete saved resume"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500">
              Completeness{' '}
              <strong className="font-mono tabular-nums text-slate-900">{completenessScore}%</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              ATS Estimate{' '}
              <strong className="font-mono tabular-nums text-indigo-600">{baselineAts}%</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={onGoToAnalyzer}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            Full ATS Report
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-sm cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save Resume'}
          </button>
        </div>
      </div>

      {/* Confirmation Banner after Upload */}
      {missingConfirmations.length > 0 && (
        <div className="no-print rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Please verify missing or unclear details from your uploaded resume
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs text-amber-800 space-y-0.5">
                {missingConfirmations.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMissingConfirmations([])}
            className="text-xs font-semibold text-amber-800 hover:underline whitespace-nowrap cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* AI Draft Review Modal / Drawer */}
      {aiDraft && (
        <div className="no-print rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-800 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              AI Improvement Suggestion — Review Before Applying
            </div>
            <button
              type="button"
              onClick={() => setAiDraft(null)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-600">{aiDraft.explanation}</p>
          <div className="bg-white rounded-xl border border-indigo-100 p-3.5 text-sm text-slate-800 whitespace-pre-line">
            {aiDraft.improvedText && <p>{aiDraft.improvedText}</p>}
            {aiDraft.improvedBullets.length > 0 && (
              <ul className="list-disc pl-4 space-y-1 mt-1">
                {aiDraft.improvedBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </div>
          {aiDraft.suggestedConfirmations.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <p className="font-semibold mb-1">Optional details to confirm yourself (never auto-invented):</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {aiDraft.suggestedConfirmations.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={applyAiDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Apply to Resume
            </button>
            <button
              type="button"
              onClick={() => setAiDraft(null)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main Split Workspace: Editor Left | Live Preview Right */}
      <div className="grid xl:grid-cols-12 gap-6 items-start">
        {/* Editor Column */}
        <div className="no-print xl:col-span-6 space-y-5">
          {/* Resume Title & Template */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Resume Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="Backend Engineer Resume"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Template Style</label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value as ResumeTemplateId)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section Order */}
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">Section Order (click arrows to reorder)</p>
              <div className="flex flex-wrap gap-1.5">
                {content.sectionOrder.map((sec, idx) => (
                  <div
                    key={sec}
                    className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1 text-xs text-slate-700"
                  >
                    <span>{SECTION_LABELS[sec]}</span>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, -1)}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                      aria-label={`Move ${SECTION_LABELS[sec]} up`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 1)}
                      disabled={idx === content.sectionOrder.length - 1}
                      className="p-0.5 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                      aria-label={`Move ${SECTION_LABELS[sec]} down`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Personal Information & Links</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={content.personalInfo.fullName}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, fullName: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Target Headline (e.g. Full-Stack Developer)"
                value={content.personalInfo.headline}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, headline: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={content.personalInfo.email}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, email: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Phone"
                value={content.personalInfo.phone}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, phone: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Location (City, Country)"
                value={content.personalInfo.location}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, location: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="LinkedIn URL"
                value={content.personalInfo.linkedin}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, linkedin: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="GitHub URL"
                value={content.personalInfo.github}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, github: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              <input
                type="text"
                placeholder="Portfolio URL"
                value={content.personalInfo.portfolio}
                onChange={(e) =>
                  setContent((p) => ({
                    ...p,
                    personalInfo: { ...p.personalInfo, portfolio: e.target.value },
                  }))
                }
                className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Career Objective / Professional Summary</h3>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['generate_summary', 'Generate Summary'],
                    ['rewrite_professional', 'Rewrite Professionally'],
                    ['make_concise', 'Make Concise'],
                    ['improve_ats_keywords', 'ATS Keywords'],
                  ] as [ImproveMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={improvingKey !== null}
                    onClick={() => runAiImprove('summary', mode, content.summary)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer disabled:opacity-50"
                  >
                    {improvingKey === `summary_main_${mode}` ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={content.summary}
              onChange={(e) => setContent((p) => ({ ...p, summary: e.target.value }))}
              placeholder="Summarize your skills, projects, and career focus..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Skills</h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Technical Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={techSkillInput}
                  onChange={(e) => setTechSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && techSkillInput.trim()) {
                      e.preventDefault();
                      const parts = techSkillInput.split(',').map((s) => s.trim()).filter(Boolean);
                      setContent((p) => ({
                        ...p,
                        technicalSkills: Array.from(new Set([...p.technicalSkills, ...parts])),
                      }));
                      setTechSkillInput('');
                    }
                  }}
                  placeholder="Type skills (e.g. TypeScript, Python, SQL) and press Enter"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!techSkillInput.trim()) return;
                    const parts = techSkillInput.split(',').map((s) => s.trim()).filter(Boolean);
                    setContent((p) => ({
                      ...p,
                      technicalSkills: Array.from(new Set([...p.technicalSkills, ...parts])),
                    }));
                    setTechSkillInput('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {content.technicalSkills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setContent((p) => ({
                        ...p,
                        technicalSkills: p.technicalSkills.filter((x) => x !== s),
                      }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-xs text-slate-800 cursor-pointer"
                    title="Click to remove"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Soft Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={softSkillInput}
                  onChange={(e) => setSoftSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && softSkillInput.trim()) {
                      e.preventDefault();
                      const parts = softSkillInput.split(',').map((s) => s.trim()).filter(Boolean);
                      setContent((p) => ({
                        ...p,
                        softSkills: Array.from(new Set([...p.softSkills, ...parts])),
                      }));
                      setSoftSkillInput('');
                    }
                  }}
                  placeholder="Communication, Team Leadership, Problem Solving"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!softSkillInput.trim()) return;
                    const parts = softSkillInput.split(',').map((s) => s.trim()).filter(Boolean);
                    setContent((p) => ({
                      ...p,
                      softSkills: Array.from(new Set([...p.softSkills, ...parts])),
                    }));
                    setSoftSkillInput('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {content.softSkills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setContent((p) => ({
                        ...p,
                        softSkills: p.softSkills.filter((x) => x !== s),
                      }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-700 text-xs text-slate-800 cursor-pointer"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Work Experience</h3>
              <button
                type="button"
                onClick={() =>
                  setContent((p) => ({
                    ...p,
                    experience: [
                      ...p.experience,
                      {
                        id: `exp_${Date.now()}`,
                        company: '',
                        role: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        current: false,
                        bullets: [''],
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            {content.experience.map((exp, idx) => (
              <div key={exp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Role #{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setContent((p) => ({ ...p, experience: moveArrayItem(p.experience, idx, -1) }))
                      }
                      disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setContent((p) => ({ ...p, experience: moveArrayItem(p.experience, idx, 1) }))
                      }
                      disabled={idx === content.experience.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setContent((p) => ({
                          ...p,
                          experience: p.experience.filter((x) => x.id !== exp.id),
                        }))
                      }
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Role / Job Title"
                    value={exp.role}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        experience: p.experience.map((x) =>
                          x.id === exp.id ? { ...x, role: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        experience: p.experience.map((x) =>
                          x.id === exp.id ? { ...x, company: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Start Date (e.g. May 2024)"
                    value={exp.startDate}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        experience: p.experience.map((x) =>
                          x.id === exp.id ? { ...x, startDate: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="End Date (or Present)"
                    value={exp.current ? 'Present' : exp.endDate}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        experience: p.experience.map((x) =>
                          x.id === exp.id
                            ? {
                                ...x,
                                current: e.target.value.toLowerCase() === 'present',
                                endDate: e.target.value,
                              }
                            : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-slate-600">Achievement Bullets (one per line)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ['add_action_verbs', 'Action Verbs'],
                          ['improve_section', 'Improve with AI'],
                          ['make_concise', 'Concise'],
                        ] as [ImproveMode, string][]
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          disabled={improvingKey !== null}
                          onClick={() =>
                            runAiImprove(
                              'experience',
                              mode,
                              `${exp.role} at ${exp.company}:\n${exp.bullets.join('\n')}`,
                              exp.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={exp.bullets.join('\n')}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        experience: p.experience.map((x) =>
                          x.id === exp.id ? { ...x, bullets: e.target.value.split('\n') } : x
                        ),
                      }))
                    }
                    placeholder="Developed REST API endpoints for user onboarding..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
              <button
                type="button"
                onClick={() =>
                  setContent((p) => ({
                    ...p,
                    projects: [
                      ...p.projects,
                      {
                        id: `proj_${Date.now()}`,
                        name: '',
                        techStack: [],
                        link: '',
                        description: '',
                        highlights: [],
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            {content.projects.map((proj, idx) => (
              <div key={proj.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Project #{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        runAiImprove(
                          'project',
                          'improve_project',
                          `Project: ${proj.name}\nTech: ${proj.techStack.join(', ')}\nDescription: ${proj.description}\nHighlights:\n${proj.highlights.join('\n')}`,
                          proj.id
                        )
                      }
                      disabled={improvingKey !== null}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold hover:bg-indigo-100 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Improve Project
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setContent((p) => ({
                          ...p,
                          projects: p.projects.filter((x) => x.id !== proj.id),
                        }))
                      }
                      className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Project Name"
                    value={proj.name}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        projects: p.projects.map((x) =>
                          x.id === proj.id ? { ...x, name: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Tech Stack (comma separated)"
                    value={proj.techStack.join(', ')}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        projects: p.projects.map((x) =>
                          x.id === proj.id
                            ? {
                                ...x,
                                techStack: e.target.value
                                  .split(',')
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              }
                            : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Project URL / Repo Link (optional)"
                  value={proj.link}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      projects: p.projects.map((x) =>
                        x.id === proj.id ? { ...x, link: e.target.value } : x
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <textarea
                  rows={2}
                  placeholder="Short project description..."
                  value={proj.description}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      projects: p.projects.map((x) =>
                        x.id === proj.id ? { ...x, description: e.target.value } : x
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <textarea
                  rows={2}
                  placeholder="Key highlights (one bullet per line)"
                  value={proj.highlights.join('\n')}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      projects: p.projects.map((x) =>
                        x.id === proj.id ? { ...x, highlights: e.target.value.split('\n') } : x
                      ),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Education</h3>
              <button
                type="button"
                onClick={() =>
                  setContent((p) => ({
                    ...p,
                    education: [
                      ...p.education,
                      {
                        id: `edu_${Date.now()}`,
                        institution: '',
                        degree: '',
                        field: '',
                        startDate: '',
                        endDate: '',
                        grade: '',
                        highlights: '',
                      },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Education
              </button>
            </div>
            {content.education.map((edu) => (
              <div key={edu.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.filter((x) => x.id !== edu.id),
                      }))
                    }
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Institution / University"
                    value={edu.institution}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, institution: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Degree (e.g. B.Tech, B.Sc)"
                    value={edu.degree}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, degree: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Field of Study"
                    value={edu.field}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, field: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="GPA / Percentage"
                    value={edu.grade}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, grade: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Start Year"
                    value={edu.startDate}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, startDate: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Graduation Year"
                    value={edu.endDate}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        education: p.education.map((x) =>
                          x.id === edu.id ? { ...x, endDate: e.target.value } : x
                        ),
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Certifications, Achievements, Languages */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Certifications, Achievements & Languages</h3>
              <button
                type="button"
                onClick={() =>
                  setContent((p) => ({
                    ...p,
                    certifications: [
                      ...p.certifications,
                      { id: `cert_${Date.now()}`, name: '', issuer: '', date: '', credentialUrl: '' },
                    ],
                  }))
                }
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                + Add Certification
              </button>
            </div>

            {content.certifications.map((cert) => (
              <div key={cert.id} className="grid sm:grid-cols-3 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Certification Name"
                  value={cert.name}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      certifications: p.certifications.map((x) =>
                        x.id === cert.id ? { ...x, name: e.target.value } : x
                      ),
                    }))
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  placeholder="Issuer"
                  value={cert.issuer}
                  onChange={(e) =>
                    setContent((p) => ({
                      ...p,
                      certifications: p.certifications.map((x) =>
                        x.id === cert.id ? { ...x, issuer: e.target.value } : x
                      ),
                    }))
                  }
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Year"
                    value={cert.date}
                    onChange={(e) =>
                      setContent((p) => ({
                        ...p,
                        certifications: p.certifications.map((x) =>
                          x.id === cert.id ? { ...x, date: e.target.value } : x
                        ),
                      }))
                    }
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent((p) => ({
                        ...p,
                        certifications: p.certifications.filter((x) => x.id !== cert.id),
                      }))
                    }
                    className="text-red-500 p-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Achievements */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Achievements</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={achievementInput}
                  onChange={(e) => setAchievementInput(e.target.value)}
                  placeholder="e.g. Winner at Smart India Hackathon 2025"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!achievementInput.trim()) return;
                    setContent((p) => ({
                      ...p,
                      achievements: [...p.achievements, achievementInput.trim()],
                    }));
                    setAchievementInput('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
              <ul className="space-y-1">
                {content.achievements.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-lg">
                    <span>{a}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setContent((p) => ({
                          ...p,
                          achievements: p.achievements.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="text-red-500 cursor-pointer"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Languages</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={languageInput}
                  onChange={(e) => setLanguageInput(e.target.value)}
                  placeholder="e.g. English, Hindi"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!languageInput.trim()) return;
                    const parts = languageInput.split(',').map((s) => s.trim()).filter(Boolean);
                    setContent((p) => ({
                      ...p,
                      languages: Array.from(new Set([...p.languages, ...parts])),
                    }));
                    setLanguageInput('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {content.languages.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() =>
                      setContent((p) => ({
                        ...p,
                        languages: p.languages.filter((x) => x !== l),
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700 cursor-pointer"
                  >
                    {l} ×
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="xl:col-span-6 xl:sticky xl:top-20 space-y-3">
          <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Live Preview · {TEMPLATES.find((t) => t.id === template)?.label}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportResumeToPdf(content, title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                type="button"
                onClick={() => void exportResumeToDocx(content, title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> DOCX
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>

          <ResumePreview content={content} template={template} />
        </div>
      </div>
    </div>
  );
}
