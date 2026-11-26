import React, { useState } from 'react';
import { CheckCircle2, Loader2, SearchCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { apiPost } from '../lib/api';
import { updateResumeRecord } from '../lib/firestore-helpers';
import { calculateCompletenessScore } from '../lib/resumeUtils';
import type { ResumeAnalysis, ResumeContent, ResumeRecord } from '../types/career';
import { useToast } from './ToastProvider';

interface ResumeAnalyzerProps {
  resumes: ResumeRecord[];
  activeResumeId: string | null;
  onSelectResume: (id: string) => void;
  onResumesChanged: () => Promise<void>;
  onGoToBuilder: () => void;
}

export function ResumeAnalyzer({
  resumes,
  activeResumeId,
  onSelectResume,
  onResumesChanged,
  onGoToBuilder,
}: ResumeAnalyzerProps) {
  const { showToast } = useToast();
  const selected = resumes.find((r) => r.id === activeResumeId) || resumes[0] || null;

  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(selected?.analysis ?? null);

  const currentAnalysis = analysis || selected?.analysis || null;

  const runAnalysis = async () => {
    if (!selected) {
      showToast('Please create or upload a resume first.', 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const res = await apiPost<
        { resumeContent: ResumeContent; jobDescription?: string },
        ResumeAnalysis
      >('/api/resume/analyze', {
        resumeContent: selected.content,
        jobDescription: jobDescription.trim() || undefined,
      });

      setAnalysis(res);
      await updateResumeRecord(selected.id, {
        title: selected.title,
        template: selected.template,
        atsScore: res.scores.atsScore,
        completenessScore: calculateCompletenessScore(selected.content),
        content: selected.content,
        analysis: res,
      });
      await onResumesChanged();
      showToast('ATS and Job Fit analysis updated.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleOptimizeForJob = async () => {
    if (!selected || !currentAnalysis?.jobMatch) return;
    setOptimizing(true);
    try {
      const optimizedSummary = currentAnalysis.jobMatch.optimizedSummary || selected.content.summary;
      const updatedContent: ResumeContent = {
        ...selected.content,
        summary: optimizedSummary,
      };
      await updateResumeRecord(selected.id, {
        title: selected.title,
        template: selected.template,
        atsScore: Math.max(selected.atsScore, currentAnalysis.scores.atsScore),
        completenessScore: calculateCompletenessScore(updatedContent),
        content: updatedContent,
        analysis: currentAnalysis,
      });
      await onResumesChanged();
      showToast('Applied job-optimized summary to your resume. Review keywords in Builder!', 'success');
      onGoToBuilder();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to apply optimization.', 'error');
    } finally {
      setOptimizing(false);
    }
  };

  if (resumes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto">
        <SearchCheck className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-900">No saved resumes to analyze</h2>
        <p className="text-sm text-slate-600 mt-1 mb-5">
          Upload an existing PDF/DOCX resume or build one in the Resume Builder first.
        </p>
        <button
          type="button"
          onClick={onGoToBuilder}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
        >
          Go to Resume Builder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector & JD Input */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">ATS & Job-Match Analyzer</h2>
            <p className="text-xs text-slate-500">
              Evaluate ATS readiness and compare your resume against a target job description.
            </p>
          </div>
          <select
            value={selected?.id || ''}
            onChange={(e) => {
              onSelectResume(e.target.value);
              const next = resumes.find((r) => r.id === e.target.value);
              setAnalysis(next?.analysis ?? null);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.atsScore}% ATS)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">
            Target Job Description (optional — paste to unlock Job Match % & keyword gap)
          </label>
          <textarea
            rows={4}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job responsibilities and required qualifications here..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={analyzing}
            onClick={runAnalysis}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analyzing Resume...' : 'Run AI Resume Analysis'}
          </button>
        </div>
      </div>

      {currentAnalysis && (
        <>
          {/* 6 Score Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {(
              [
                ['ATS Compatibility', currentAnalysis.scores.atsScore],
                ['Structure', currentAnalysis.scores.structureScore],
                ['Skills', currentAnalysis.scores.skillsScore],
                ['Experience', currentAnalysis.scores.experienceScore],
                ['Projects', currentAnalysis.scores.projectScore],
                ['Keyword Match', currentAnalysis.scores.keywordMatchScore],
              ] as [string, number][]
            ).map(([label, val]) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {Math.round(val)}
                  <span className="text-xs text-slate-400 font-normal">/100</span>
                </p>
                <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      val >= 80 ? 'bg-emerald-500' : val >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Job Match Block */}
          {currentAnalysis.jobMatch && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-indigo-600">Job-Specific Comparison</p>
                  <h3 className="text-lg font-bold text-slate-900">
                    {currentAnalysis.jobMatch.jobTitle || 'Target Role'} —{' '}
                    <span className="font-mono tabular-nums text-indigo-600">
                      {currentAnalysis.jobMatch.matchPercentage}% Match
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={optimizing}
                  onClick={handleOptimizeForJob}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer whitespace-nowrap"
                >
                  {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Optimize Resume for This Job
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">Matching Skills</p>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    {currentAnalysis.jobMatch.matchingSkills.join(' · ') || 'None detected yet'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 mb-2">Missing Skills / Gaps</p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {currentAnalysis.jobMatch.missingSkills.join(' · ') || 'Strong skill coverage'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1.5">Recommended Resume Changes</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
                  {currentAnalysis.jobMatch.recommendedChanges.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Detailed Insights */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                {currentAnalysis.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" /> Weaknesses & Formatting Issues
              </div>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                {[...currentAnalysis.weaknesses, ...currentAnalysis.formattingIssues].map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Missing Keywords & Recommended Skills</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Keywords: </strong>
                {currentAnalysis.missingKeywords.join(' · ') || 'Good coverage'}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Recommended Skills: </strong>
                {currentAnalysis.recommendedSkills.join(' · ') || '—'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Actionable Improvement Suggestions</h3>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700">
                {[...currentAnalysis.suggestions, ...currentAnalysis.missingInfo].map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
