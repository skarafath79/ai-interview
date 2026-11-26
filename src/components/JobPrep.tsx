import React, { useState } from 'react';
import { Briefcase, Loader2, Mic, Sparkles, Trash2 } from 'lucide-react';
import { apiPost } from '../lib/api';
import { createJobPrepRecord, deleteJobPrepRecord } from '../lib/firestore-helpers';
import type { JobPrepData, JobPrepRecord, ResumeContent, ResumeRecord } from '../types/career';
import { useToast } from './ToastProvider';

interface JobPrepProps {
  userId: string;
  resumes: ResumeRecord[];
  jobPreps: JobPrepRecord[];
  onJobPrepsChanged: () => Promise<void>;
  onStartInterviewForRole: (role: string) => void;
}

export function JobPrep({
  userId,
  resumes,
  jobPreps,
  onJobPrepsChanged,
  onStartInterviewForRole,
}: JobPrepProps) {
  const { showToast } = useToast();
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState(resumes[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [activePrep, setActivePrep] = useState<JobPrepRecord | null>(jobPreps[0] || null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !jobDescription.trim()) {
      showToast('Please enter both the target job title and job description.', 'error');
      return;
    }

    const resumeContent = resumes.find((r) => r.id === selectedResumeId)?.content || null;
    setBusy(true);
    try {
      const prepData = await apiPost<
        {
          jobTitle: string;
          companyName?: string;
          jobDescription: string;
          resumeContent?: ResumeContent | null;
        },
        JobPrepData
      >('/api/job-prep/generate', {
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim() || undefined,
        jobDescription: jobDescription.trim(),
        resumeContent,
      });

      const saved = await createJobPrepRecord({
        userId,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        prepData,
      });
      await onJobPrepsChanged();
      setActivePrep(saved);
      showToast('Job preparation roadmap generated and saved.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to generate job prep.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteJobPrepRecord(id);
      if (activePrep?.id === id) setActivePrep(null);
      await onJobPrepsChanged();
      showToast('Job preparation guide deleted.', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Form */}
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">AI Job Role Preparation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter a target job description to build a skills gap audit, likely interview questions, and a 5-day study plan.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Job Title</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Junior Full-Stack Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company Name (optional)</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Razorpay, Acme Corp"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Compare Against Resume (optional)
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="">General prep without resume</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Job Description</label>
            <textarea
              rows={5}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job requirements, tech stack, and responsibilities..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? 'Generating Preparation Roadmap...' : 'Generate Job Prep Plan'}
          </button>
        </form>

        {/* Saved Job Preps */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-base font-semibold text-slate-900">Saved Role Guides</h3>
          {jobPreps.length === 0 ? (
            <div className="py-10 text-center">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No job guides yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Submit a job description on the left to save a tailored prep kit.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobPreps.map((jp) => (
                <div key={jp.id} className="py-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActivePrep(jp)}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="text-sm font-semibold text-slate-900 truncate">{jp.jobTitle}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {jp.companyName || 'Target Role'} · {jp.prepData.requiredSkills.length} key skills
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(jp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label="Delete job prep guide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Prep Display */}
      {activePrep && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold text-indigo-600">Role Preparation Blueprint</p>
              <h3 className="text-xl font-bold text-slate-900">
                {activePrep.jobTitle}
                {activePrep.companyName ? ` · ${activePrep.companyName}` : ''}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onStartInterviewForRole(activePrep.jobTitle)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <Mic className="w-3.5 h-3.5" /> Start Mock Interview for This Role
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900 mb-1.5">Required Skills</p>
              <p className="text-slate-700 leading-relaxed">
                {activePrep.prepData.requiredSkills.join(' · ')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="font-semibold text-slate-900 mb-1.5">ATS Resume Keywords</p>
              <p className="text-slate-700 leading-relaxed">
                {activePrep.prepData.resumeKeywords.join(' · ')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <p className="font-semibold text-amber-900 mb-1.5">Skills Gap Analysis</p>
              <p className="text-amber-900 leading-relaxed">
                <strong>Missing:</strong>{' '}
                {activePrep.prepData.skillsGap.missingSkills.join(' · ') || 'No critical gaps'}
              </p>
              <p className="text-emerald-800 mt-1">
                <strong>Matched:</strong>{' '}
                {activePrep.prepData.skillsGap.matchingSkills.join(' · ') || 'Attach a resume to compare'}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Likely Technical Questions</h4>
              {activePrep.prepData.technicalQuestions.map((q, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                  <p className="font-semibold text-slate-900">{q.question}</p>
                  <p className="text-indigo-600 font-medium">Focus: {q.focusArea}</p>
                  <p className="text-slate-600">{q.tip}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Likely HR & Behavioral Questions</h4>
              {activePrep.prepData.hrQuestions.map((q, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                  <p className="font-semibold text-slate-900">{q.question}</p>
                  <p className="text-indigo-600 font-medium">Focus: {q.focusArea}</p>
                  <p className="text-slate-600">{q.tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-3">5-Day Study Plan</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {activePrep.prepData.studyPlan.map((d, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <p className="font-mono font-semibold text-indigo-600">{d.day}</p>
                  <p className="font-semibold text-slate-900">{d.focus}</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {d.tasks.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
