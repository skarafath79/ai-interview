import React from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  FilePlus2,
  FileText,
  Mic,
  SearchCheck,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type { InterviewRecord, ResumeRecord, UserProfile } from '../types/career';

export type DashboardTab =
  | 'overview'
  | 'builder'
  | 'analyzer'
  | 'interview'
  | 'jobprep'
  | 'profile';

interface DashboardHomeProps {
  profile: UserProfile | null;
  displayName: string;
  resumes: ResumeRecord[];
  interviews: InterviewRecord[];
  onNavigate: (tab: DashboardTab) => void;
  onOpenResume: (resumeId: string) => void;
  onTriggerUpload: () => void;
  onOpenInterviewReport: (interview: InterviewRecord) => void;
}

function formatDate(ts: unknown): string {
  if (!ts) return 'Just now';
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    const sec = (ts as { seconds: number }).seconds;
    return new Date(sec * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return 'Recent';
}

export function DashboardHome({
  profile,
  displayName,
  resumes,
  interviews,
  onNavigate,
  onOpenResume,
  onTriggerUpload,
  onOpenInterviewReport,
}: DashboardHomeProps) {
  const completedInterviews = interviews.filter((i) => i.status === 'completed');
  const latestResume = resumes[0];
  const highestAts = resumes.length
    ? Math.max(...resumes.map((r) => r.atsScore || 0))
    : 0;

  const avgInterviewScore = completedInterviews.length
    ? Math.round(
        completedInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) /
          completedInterviews.length
      )
    : 0;

  // Improvement progress compares latest completed interview vs earliest, or readiness composite
  let improvementDelta: number | null = null;
  if (completedInterviews.length >= 2) {
    const newest = completedInterviews[0].overallScore || 0;
    const oldest = completedInterviews[completedInterviews.length - 1].overallScore || 0;
    improvementDelta = newest - oldest;
  }

  const recommendations: { title: string; detail: string; actionLabel: string; tab: DashboardTab }[] = [];
  if (resumes.length === 0) {
    recommendations.push({
      title: 'Upload or build your first resume',
      detail: 'Your AI interviewer tailors technical and project questions directly to your resume.',
      actionLabel: 'Open Resume Builder',
      tab: 'builder',
    });
  } else {
    if (highestAts < 80) {
      recommendations.push({
        title: `Raise your ATS compatibility (${highestAts}/100)`,
        detail: 'Run a job description match in Resume Analyzer to uncover missing role keywords.',
        actionLabel: 'Analyze Resume',
        tab: 'analyzer',
      });
    }
    if (latestResume && latestResume.content.projects.length === 0) {
      recommendations.push({
        title: 'Add project highlights to your resume',
        detail: 'Projects give interviewers concrete systems and problem-solving stories to probe.',
        actionLabel: 'Edit Resume',
        tab: 'builder',
      });
    }
  }

  if (completedInterviews.length === 0) {
    recommendations.push({
      title: `Take a baseline mock interview for ${profile?.targetRole || 'your target role'}`,
      detail: 'Complete a 5-question adaptive interview to benchmark communication and technical depth.',
      actionLabel: 'Start Interview',
      tab: 'interview',
    });
  } else {
    const latestReport = completedInterviews[0]?.report;
    if (latestReport?.skillsToImprove?.[0]) {
      recommendations.push({
        title: `Focus on ${latestReport.skillsToImprove[0]}`,
        detail: `Flagged in your recent ${completedInterviews[0].jobRole} interview report.`,
        actionLabel: 'Practice Now',
        tab: 'interview',
      });
    }
    if (latestReport && latestReport.categoryScores.communication < 78) {
      recommendations.push({
        title: 'Strengthen answer structure with STAR',
        detail: 'Practice concise Situation, Task, Action, and Result framing in Behavioral mode.',
        actionLabel: 'Behavioral Interview',
        tab: 'interview',
      });
    }
  }

  if (recommendations.length < 3) {
    recommendations.push({
      title: 'Prepare for a specific job posting',
      detail: 'Paste a job description to generate a targeted skills gap analysis and 5-day study plan.',
      actionLabel: 'Open Job Prep',
      tab: 'jobprep',
    });
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Let&apos;s work on your career and get you interview-ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('interview')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          Start AI Interview
        </button>
      </div>

      {/* 5 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Resume ATS Score</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {resumes.length ? `${highestAts}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {resumes.length ? 'Best saved resume' : 'No resume yet'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Resumes Created</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {resumes.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Synced to cloud</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Interviews Completed</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {completedInterviews.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {interviews.length - completedInterviews.length > 0
              ? `${interviews.length - completedInterviews.length} in progress`
              : 'All sessions scored'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">Avg Interview Score</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-2">
            {completedInterviews.length ? `${avgInterviewScore}/100` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {completedInterviews.length ? 'Across finished rounds' : 'Complete 1st session'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-slate-500">Improvement Progress</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2 flex items-center gap-1.5">
            {improvementDelta !== null ? (
              <>
                <TrendingUp className={`w-5 h-5 ${improvementDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span>{improvementDelta >= 0 ? `+${improvementDelta}` : improvementDelta} pts</span>
              </>
            ) : completedInterviews.length === 1 ? (
              <span>Baseline Set</span>
            ) : (
              <span>0%</span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {improvementDelta !== null ? 'First vs latest score' : 'Track across rounds'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Upload Resume</p>
              <p className="text-xs text-slate-500">Parse PDF or DOCX with AI</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('builder')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Create New Resume</p>
              <p className="text-xs text-slate-500">Guided builder & 5 templates</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('interview')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Start AI Interview</p>
              <p className="text-xs text-slate-500">Adaptive Q&A with feedback</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('analyzer')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-400 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <SearchCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Analyze My Skills</p>
              <p className="text-xs text-slate-500">ATS & job description match</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity + Recommended Actions */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigate('interview')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
            >
              View Interviews
            </button>
          </div>

          {resumes.length === 0 && interviews.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No activity recorded yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Upload a resume or complete your first mock interview to track progress here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('builder')}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Create First Resume
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {resumes.slice(0, 3).map((res) => (
                <div key={res.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{res.title}</p>
                      <p className="text-xs text-slate-500">
                        Resume · {formatDate(res.updatedAt)} · ATS {res.atsScore}%
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenResume(res.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Edit <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {interviews.slice(0, 4).map((iv) => (
                <div key={iv.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {iv.jobRole} — {iv.interviewType}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {iv.status === 'completed' ? `Score ${iv.overallScore}/100` : 'In progress'} ·{' '}
                        {formatDate(iv.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenInterviewReport(iv)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {iv.status === 'completed' ? 'Report' : 'Resume'}
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Actions */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recommended Next Steps</h2>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{rec.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{rec.detail}</p>
                  </div>
                </div>
                <div className="pl-6">
                  <button
                    type="button"
                    onClick={() => onNavigate(rec.tab)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    {rec.actionLabel} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
