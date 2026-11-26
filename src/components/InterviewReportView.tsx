import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { exportInterviewReportToPdf } from '../lib/exportResume';
import type { InterviewRecord } from '../types/career';

interface InterviewReportViewProps {
  interview: InterviewRecord;
  onRetry: () => void;
  onPracticeWeakTopics: (weakTopics: string[]) => void;
  onBackToDashboard: () => void;
  onBackToHistory: () => void;
}

export function InterviewReportView({
  interview,
  onRetry,
  onPracticeWeakTopics,
  onBackToDashboard,
  onBackToHistory,
}: InterviewReportViewProps) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(0);
  const report = interview.report;

  if (!report) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">This interview report is not available yet.</p>
        <button
          type="button"
          onClick={onBackToHistory}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
        >
          Back to Interviews
        </button>
      </div>
    );
  }

  const cs = report.categoryScores;
  const categories: [string, number][] = [
    ['Technical Knowledge', cs.technicalKnowledge],
    ['Communication', cs.communication],
    ['Problem Solving', cs.problemSolving],
    ['Confidence', cs.confidence],
    ['Answer Relevance', cs.answerRelevance],
    ['Resume Knowledge', cs.resumeKnowledge],
    ['Behavioral (STAR)', cs.behavioralResponses],
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToHistory}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Interviews
          </button>
          <h2 className="text-2xl font-bold text-slate-900">
            Interview Report: {interview.jobRole}
          </h2>
          <p className="text-xs text-slate-500">
            {interview.interviewType} · {interview.difficulty} · {interview.language}
            {interview.companyName ? ` · ${interview.companyName}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry Interview
          </button>
          <button
            type="button"
            onClick={() => onPracticeWeakTopics(report.skillsToImprove || [])}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer whitespace-nowrap"
          >
            <Target className="w-3.5 h-3.5" /> Practice Weak Topics
          </button>
          <button
            type="button"
            onClick={() => exportInterviewReportToPdf(interview)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Download Report
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-semibold hover:from-indigo-700 hover:to-blue-700 cursor-pointer whitespace-nowrap"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Overall Score & Category Breakdown */}
      <div className="grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Overall Interview Score</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-bold font-mono tabular-nums text-indigo-600">
                {Math.round(report.overallScore)}
              </span>
              <span className="text-base text-slate-400 font-mono">/ 100</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-2">{report.performanceLevel}</p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Completion</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {Math.round(report.completionPercentage)}% ({interview.turns.length} questions)
            </span>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Category Performance</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5">
            {categories.map(([label, score]) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{label}</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {Math.round(score)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-indigo-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Strengths, Weaknesses, Skills & Communication */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" /> What You Did Well
          </div>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700 leading-relaxed">
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" /> Weak Areas & Missing Concepts
          </div>
          <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-700 leading-relaxed">
            {[...report.weaknesses, ...report.missingConcepts].map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">Skills & Communication Focus</h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Skills to Improve:</strong> {report.skillsToImprove.join(' · ') || 'Maintain depth across core skills'}
          </p>
          {report.communicationIssues.length > 0 && (
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
              {report.communicationIssues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-900">Key Recommendations</h3>
          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 leading-relaxed">
            {report.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Personalized Multi-Day Improvement Plan */}
      {report.improvementPlan.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Personalized Improvement Plan</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {report.improvementPlan.map((day, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-xs font-mono font-semibold text-indigo-600">{day.day}</p>
                <p className="text-sm font-semibold text-slate-900">{day.focus}</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                  {day.tasks.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Question Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-base font-semibold text-slate-900">Question-by-Question Review</h3>
        <div className="divide-y divide-slate-100">
          {interview.turns.map((turn, idx) => {
            const isOpen = expandedTurn === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  type="button"
                  onClick={() => setExpandedTurn(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      Question {idx + 1} · {turn.category} · {turn.difficulty}
                      {turn.isFollowUp ? ' · Follow-up' : ''}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{turn.question}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono tabular-nums text-sm font-bold text-indigo-600">
                      {turn.evaluation ? `${turn.evaluation.score}/100` : '—'}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="font-semibold text-slate-700 mb-1">Your Answer</p>
                      <p className="text-slate-700 whitespace-pre-line">
                        {turn.skipped ? 'Question skipped' : turn.userAnswer || 'No response recorded'}
                      </p>
                    </div>

                    {turn.evaluation && (
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                          <p className="font-semibold text-emerald-800 mb-1">What Was Good</p>
                          <p className="text-emerald-900">{turn.evaluation.whatWasGood}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                          <p className="font-semibold text-amber-800 mb-1">What Was Missing</p>
                          <p className="text-amber-900">{turn.evaluation.whatWasMissing}</p>
                        </div>
                        <div className="md:col-span-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200">
                          <p className="font-semibold text-indigo-900 mb-1">Improved Sample Answer</p>
                          <p className="text-slate-800 leading-relaxed">
                            {turn.evaluation.improvedSampleAnswer}
                          </p>
                          {turn.evaluation.studyTopics.length > 0 && (
                            <p className="mt-2 text-indigo-700 font-medium">
                              Topics to Study: {turn.evaluation.studyTopics.join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
