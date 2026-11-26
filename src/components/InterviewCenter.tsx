import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  Send,
  SkipForward,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { apiPost } from '../lib/api';
import {
  completeInterviewRecord,
  createInterviewRecord,
  deleteInterviewRecord,
  updateInterviewProgress,
} from '../lib/firestore-helpers';
import type {
  DifficultyLevel,
  ExperienceLevel,
  InterviewConfig,
  InterviewRecord,
  InterviewReport,
  InterviewTurn,
  InterviewType,
  ResumeContent,
  ResumeRecord,
} from '../types/career';
import { InterviewReportView } from './InterviewReportView';
import { useToast } from './ToastProvider';

interface InterviewCenterProps {
  userId: string;
  resumes: ResumeRecord[];
  interviews: InterviewRecord[];
  initialReportInterview: InterviewRecord | null;
  onClearInitialReport: () => void;
  onInterviewsChanged: () => Promise<void>;
  onBackToDashboard: () => void;
  onGoToResumeBuilder: () => void;
  presetJobRole?: string;
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Student',
  'Fresher',
  'Internship',
  '0-2 years',
  '2-5 years',
  'Experienced',
];

const INTERVIEW_TYPES: InterviewType[] = [
  'Technical Interview',
  'HR Interview',
  'Behavioral Interview',
  'Resume-Based Interview',
  'Project Interview',
  'Mixed Interview',
];

const DIFFICULTIES: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

const DURATIONS: { label: string; questions: number; minutes?: number }[] = [
  { label: '5 questions', questions: 5 },
  { label: '10 questions', questions: 10 },
  { label: '15 questions', questions: 15 },
  { label: '30 minutes', questions: 15, minutes: 30 },
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Portuguese'];

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function InterviewCenter({
  userId,
  resumes,
  interviews,
  initialReportInterview,
  onClearInitialReport,
  onInterviewsChanged,
  onBackToDashboard,
  onGoToResumeBuilder,
  presetJobRole,
}: InterviewCenterProps) {
  const { showToast } = useToast();

  // Mode: 'setup' | 'room' | 'report'
  const [stage, setStage] = useState<'setup' | 'room' | 'report'>(
    initialReportInterview?.status === 'completed' ? 'report' : 'setup'
  );
  const [viewingReport, setViewingReport] = useState<InterviewRecord | null>(
    initialReportInterview?.status === 'completed' ? initialReportInterview : null
  );

  // Setup state
  const [selectedResumeId, setSelectedResumeId] = useState<string>(resumes[0]?.id || '');
  const [jobRole, setJobRole] = useState(presetJobRole || 'Software Developer');
  const [companyName, setCompanyName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Fresher');
  const [interviewType, setInterviewType] = useState<InterviewType>('Mixed Interview');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Intermediate');
  const [durationIdx, setDurationIdx] = useState(0);
  const [language, setLanguage] = useState('English');

  // Active interview room state
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<InterviewConfig | null>(null);
  const [completedTurns, setCompletedTurns] = useState<InterviewTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('Intermediate');
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Voice / TTS & STT
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (presetJobRole) {
      setJobRole(presetJobRole);
    }
  }, [presetJobRole]);

  useEffect(() => {
    if (initialReportInterview) {
      if (initialReportInterview.status === 'completed') {
        setViewingReport(initialReportInterview);
        setStage('report');
      } else {
        resumeInProgressInterview(initialReportInterview);
      }
      onClearInitialReport();
    }
  }, [initialReportInterview]);

  useEffect(() => {
    if (stage === 'room') {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const speakQuestion = (text: string, force = false) => {
    if ((!voiceOutputEnabled && !force) || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.onstart = () => setAiSpeaking(true);
    utter.onend = () => setAiSpeaking(false);
    utter.onerror = () => setAiSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  const toggleMic = () => {
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
      return;
    }
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast(
        'Voice speech-to-text is not supported in this browser. Please type your answer below.',
        'info'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = language === 'Hindi' ? 'hi-IN' : language === 'Spanish' ? 'es-ES' : 'en-US';
      rec.onresult = (event) => {
        let added = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            added += `${event.results[i][0].transcript} `;
          }
        }
        if (added.trim()) {
          setAnswerText((prev) => `${prev ? `${prev.trim()} ` : ''}${added.trim()}`);
        }
      };
      rec.onerror = (ev) => {
        if (ev.error === 'not-allowed') {
          showToast('Microphone permission denied. Allow mic access or type your answer.', 'error');
        }
        setMicActive(false);
      };
      rec.onend = () => setMicActive(false);
      recognitionRef.current = rec;
      rec.start();
      setMicActive(true);
    } catch {
      showToast('Could not start microphone capture. Please type your answer.', 'error');
      setMicActive(false);
    }
  };

  const getResumeById = (id?: string): ResumeContent | null => {
    if (!id) return null;
    return resumes.find((r) => r.id === id)?.content || null;
  };

  const startNewInterview = async (overrideType?: InterviewType, overrideRole?: string) => {
    const role = (overrideRole || jobRole).trim();
    if (!role) {
      showToast('Please enter a target job role.', 'error');
      return;
    }

    const dur = DURATIONS[durationIdx];
    const selectedResume = resumes.find((r) => r.id === selectedResumeId);
    const config: InterviewConfig = {
      resumeId: selectedResume?.id || '',
      resumeTitle: selectedResume?.title || 'No Resume Attached',
      jobRole: role,
      companyName: companyName.trim(),
      experienceLevel,
      interviewType: overrideType || interviewType,
      difficulty,
      totalQuestions: dur.questions,
      durationMinutes: dur.minutes,
      language,
    };

    setBusy(true);
    setBusyLabel('Reviewing your resume & preparing your first interview question...');
    try {
      const first = await apiPost<
        { config: InterviewConfig; resumeContent?: ResumeContent | null },
        {
          action: string;
          question: string;
          category: string;
          difficulty: DifficultyLevel;
          is_follow_up: boolean;
        }
      >('/api/interview/start', {
        config,
        resumeContent: selectedResume?.content || null,
      });

      const firstTurn: InterviewTurn = {
        order: 1,
        question: first.question,
        category: first.category || config.interviewType,
        difficulty: first.difficulty || config.difficulty,
        isFollowUp: false,
        userAnswer: '',
        skipped: false,
      };

      const created = await createInterviewRecord(userId, config, firstTurn);
      await onInterviewsChanged();

      setActiveInterviewId(created.id);
      setActiveConfig(config);
      setCompletedTurns([]);
      setCurrentQuestion(first.question);
      setCurrentCategory(first.category || config.interviewType);
      setCurrentDifficulty(first.difficulty || config.difficulty);
      setIsFollowUp(false);
      setAnswerText('');
      setElapsedSeconds(0);
      setStage('room');
      speakQuestion(first.question);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not start AI interview.', 'error');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const resumeInProgressInterview = (iv: InterviewRecord) => {
    const answered = iv.turns.filter((t) => t.evaluation || t.skipped || t.userAnswer);
    const pending = iv.turns.find((t) => !t.evaluation && !t.skipped && !t.userAnswer);
    setActiveInterviewId(iv.id);
    setActiveConfig({
      resumeId: iv.resumeId,
      resumeTitle: iv.resumeTitle,
      jobRole: iv.jobRole,
      companyName: iv.companyName,
      experienceLevel: iv.experienceLevel as ExperienceLevel,
      interviewType: iv.interviewType as InterviewType,
      difficulty: iv.difficulty,
      totalQuestions: iv.totalQuestions,
      language: iv.language,
    });
    setCompletedTurns(answered);
    setCurrentQuestion(pending?.question || iv.turns[iv.turns.length - 1]?.question || '');
    setCurrentCategory(pending?.category || iv.interviewType);
    setCurrentDifficulty(pending?.difficulty || iv.difficulty);
    setIsFollowUp(Boolean(pending?.isFollowUp));
    setAnswerText('');
    setElapsedSeconds(0);
    setStage('room');
  };

  const finalizeInterview = async (turnsToScore: InterviewTurn[], latestDifficulty: DifficultyLevel) => {
    if (!activeConfig || !activeInterviewId) return;
    setBusyLabel('Compiling your detailed score breakdown & 5-day improvement plan...');
    const report = await apiPost<
      { config: InterviewConfig; resumeContent?: ResumeContent | null; turns: InterviewTurn[] },
      InterviewReport
    >('/api/interview/report', {
      config: activeConfig,
      resumeContent: getResumeById(activeConfig.resumeId),
      turns: turnsToScore,
    });

    await completeInterviewRecord(activeInterviewId, turnsToScore, report, latestDifficulty);
    await onInterviewsChanged();

    const completedRecord: InterviewRecord = {
      id: activeInterviewId,
      userId,
      resumeId: activeConfig.resumeId,
      resumeTitle: activeConfig.resumeTitle,
      jobRole: activeConfig.jobRole,
      companyName: activeConfig.companyName,
      experienceLevel: activeConfig.experienceLevel,
      interviewType: activeConfig.interviewType,
      difficulty: latestDifficulty,
      language: activeConfig.language,
      totalQuestions: activeConfig.totalQuestions,
      status: 'completed',
      overallScore: report.overallScore,
      turns: turnsToScore,
      report,
    };

    window.speechSynthesis?.cancel();
    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
    }

    setViewingReport(completedRecord);
    setStage('report');
    showToast('Interview completed! Your report is ready.', 'success');
  };

  const submitCurrentAnswer = async (opts: { skipped?: boolean; endEarly?: boolean; customAnswer?: string } = {}) => {
    if (!activeConfig || !activeInterviewId || !currentQuestion) return;
    const finalAnswer = (opts.customAnswer ?? answerText).trim();
    if (!opts.skipped && !opts.endEarly && !finalAnswer) {
      showToast('Please enter or speak your answer before submitting.', 'error');
      return;
    }

    if (micActive) {
      recognitionRef.current?.stop();
      setMicActive(false);
    }
    window.speechSynthesis?.cancel();

    const qNum = completedTurns.length + 1;
    setBusy(true);
    setBusyLabel(
      opts.endEarly
        ? 'Evaluating your final responses...'
        : 'Evaluating your answer & adapting the next question...'
    );

    try {
      const res = await apiPost<
        {
          config: InterviewConfig;
          resumeContent?: ResumeContent | null;
          history: InterviewTurn[];
          currentQuestion: string;
          currentCategory: string;
          userAnswer: string;
          skipped: boolean;
          questionIndex: number;
          endEarly: boolean;
        },
        {
          action: string;
          question: string;
          category: string;
          difficulty: DifficultyLevel;
          is_follow_up: boolean;
          interview_complete: boolean;
          answer_evaluation: InterviewTurn['evaluation'];
        }
      >('/api/interview/respond', {
        config: { ...activeConfig, difficulty: currentDifficulty },
        resumeContent: getResumeById(activeConfig.resumeId),
        history: completedTurns,
        currentQuestion,
        currentCategory,
        userAnswer: finalAnswer,
        skipped: Boolean(opts.skipped),
        questionIndex: qNum,
        endEarly: Boolean(opts.endEarly),
      });

      const finishedTurn: InterviewTurn = {
        order: qNum,
        question: currentQuestion,
        category: currentCategory,
        difficulty: currentDifficulty,
        isFollowUp,
        userAnswer: opts.skipped ? '' : finalAnswer,
        skipped: Boolean(opts.skipped),
        evaluation: res.answer_evaluation,
      };

      const nextHistory = [...completedTurns, finishedTurn];
      const runningAvg = Math.round(
        nextHistory.reduce((acc, t) => acc + (t.evaluation?.score ?? 0), 0) / nextHistory.length
      );
      const nextDiff: DifficultyLevel =
        res.difficulty === 'Beginner' || res.difficulty === 'Intermediate' || res.difficulty === 'Advanced'
          ? res.difficulty
          : currentDifficulty;

      if (res.interview_complete || opts.endEarly || qNum >= activeConfig.totalQuestions || !res.question) {
        await finalizeInterview(nextHistory, nextDiff);
        return;
      }

      const nextPendingTurn: InterviewTurn = {
        order: qNum + 1,
        question: res.question,
        category: res.category || activeConfig.interviewType,
        difficulty: nextDiff,
        isFollowUp: Boolean(res.is_follow_up),
        userAnswer: '',
        skipped: false,
      };

      await updateInterviewProgress(
        activeInterviewId,
        [...nextHistory, nextPendingTurn],
        runningAvg,
        nextDiff
      );

      setCompletedTurns(nextHistory);
      setCurrentQuestion(res.question);
      setCurrentCategory(res.category || activeConfig.interviewType);
      setCurrentDifficulty(nextDiff);
      setIsFollowUp(Boolean(res.is_follow_up));
      setAnswerText('');
      speakQuestion(res.question);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to process interview turn.', 'error');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const handleEndEarly = async () => {
    if (completedTurns.length === 0 && !answerText.trim()) {
      setStage('setup');
      showToast('Interview ended before any answers were submitted.', 'info');
      return;
    }
    if (answerText.trim()) {
      await submitCurrentAnswer({ endEarly: true });
    } else {
      setBusy(true);
      try {
        await finalizeInterview(completedTurns, currentDifficulty);
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to finalize interview.', 'error');
      } finally {
        setBusy(false);
        setBusyLabel('');
      }
    }
  };

  const handleDeleteInterview = async (id: string) => {
    try {
      await deleteInterviewRecord(id);
      await onInterviewsChanged();
      showToast('Interview deleted.', 'info');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to delete interview.', 'error');
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // REPORT STAGE
  if (stage === 'report' && viewingReport) {
    return (
      <InterviewReportView
        interview={viewingReport}
        onRetry={() => {
          setJobRole(viewingReport.jobRole);
          setInterviewType(viewingReport.interviewType as InterviewType);
          setDifficulty(viewingReport.difficulty);
          setStage('setup');
        }}
        onPracticeWeakTopics={(weakTopics) => {
          const topicStr = weakTopics.slice(0, 2).join(' & ');
          setJobRole(
            topicStr ? `${viewingReport.jobRole} (Focus: ${topicStr})` : viewingReport.jobRole
          );
          setInterviewType('Technical Interview');
          setStage('setup');
          showToast('Pre-filled interview setup targeting your weak topics.', 'info');
        }}
        onBackToDashboard={onBackToDashboard}
        onBackToHistory={() => setStage('setup')}
      />
    );
  }

  // INTERVIEW ROOM STAGE
  if (stage === 'room' && activeConfig) {
    const currentIndex = completedTurns.length + 1;
    const progressPct = Math.round((completedTurns.length / activeConfig.totalQuestions) * 100);
    const remaining = Math.max(0, activeConfig.totalQuestions - completedTurns.length);
    const durationLimitSec = activeConfig.durationMinutes ? activeConfig.durationMinutes * 60 : null;
    const displayClock = durationLimitSec
      ? formatTimer(Math.max(0, durationLimitSec - elapsedSeconds))
      : formatTimer(elapsedSeconds);

    return (
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Progress Panel */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-indigo-600 mb-1">Active Interview Session</p>
            <h2 className="text-lg font-bold text-slate-900">{activeConfig.jobRole}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeConfig.interviewType}
              {activeConfig.companyName ? ` · ${activeConfig.companyName}` : ''}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700">
                Question {currentIndex} of {activeConfig.totalQuestions}
              </span>
              <span className="font-mono tabular-nums text-slate-500">{progressPct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(6, progressPct)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Category</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{currentCategory}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Difficulty</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{currentDifficulty}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">
                {durationLimitSec ? 'Time Remaining' : 'Elapsed Time'}
              </span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {displayClock}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Remaining</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5 block">
                {remaining} {remaining === 1 ? 'question' : 'questions'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">AI Voice Playback</span>
            <button
              type="button"
              onClick={() => {
                const next = !voiceOutputEnabled;
                setVoiceOutputEnabled(next);
                if (!next) {
                  window.speechSynthesis?.cancel();
                  setAiSpeaking(false);
                } else if (currentQuestion) {
                  speakQuestion(currentQuestion, true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                voiceOutputEnabled
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {voiceOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {voiceOutputEnabled ? 'Voice On' : 'Muted'}
            </button>
          </div>
        </aside>

        {/* Main Interview Panel */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          {/* Interviewer Identity */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src="/src/assets/images/ai_interviewer_avatar_1795667469722.jpg"
                  alt="CareerPilot AI Interviewer"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover bg-slate-100"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">CareerPilot AI Interviewer</p>
                <p className="text-xs text-slate-500">
                  {aiSpeaking
                    ? 'Speaking question aloud...'
                    : isFollowUp
                      ? 'Adaptive Follow-Up Question'
                      : `${currentCategory} · ${activeConfig.language}`}
                </p>
              </div>
            </div>

            {aiSpeaking && (
              <div className="flex items-center gap-1" aria-label="AI speaking animation">
                <span className="w-1 h-3 bg-indigo-600 rounded-full animate-bounce" />
                <span className="w-1 h-5 bg-indigo-600 rounded-full animate-bounce [animation-delay:120ms]" />
                <span className="w-1 h-3.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:240ms]" />
              </div>
            )}
          </div>

          {/* Current Question */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
            {busy ? (
              <div className="flex items-center gap-3 py-4 text-sm text-indigo-700 font-medium">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>{busyLabel || 'Thinking...'}</span>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-indigo-600 mb-2">
                  {isFollowUp ? 'Follow-Up Based on Your Answer' : `Question ${currentIndex}`}
                </p>
                <p className="text-lg font-medium text-slate-900 leading-relaxed">
                  {currentQuestion}
                </p>
              </>
            )}
          </div>

          {/* User Answer Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Your Response {micActive ? '(Listening — edit transcript before submitting)' : ''}
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={toggleMic}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  micActive
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {micActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {micActive ? 'Stop Recording' : 'Speak Answer'}
              </button>
            </div>

            <textarea
              rows={6}
              disabled={busy}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your response clearly (use concrete examples, architecture choices, or STAR framing)..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 disabled:bg-slate-50"
            />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => submitCurrentAnswer({ customAnswer: "I don't know the exact answer to this yet." })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                <HelpCircle className="w-3.5 h-3.5" /> I don&apos;t know
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => submitCurrentAnswer({ skipped: true })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                <SkipForward className="w-3.5 h-3.5" /> Skip Question
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleEndEarly}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" /> End Interview
              </button>
            </div>

            <button
              type="button"
              disabled={busy || !answerText.trim()}
              onClick={() => submitCurrentAnswer()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Answer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SETUP + HISTORY STAGE
  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Interview Setup Form */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Configure Your Adaptive AI Interview</h2>
          <p className="text-xs text-slate-500 mt-1">
            Questions are generated dynamically one at a time based on your resume, target role, and each answer you give.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">Select Resume</label>
              <button
                type="button"
                onClick={onGoToResumeBuilder}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                + Upload or Create Resume
              </button>
            </div>
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="">No resume attached (role-based only)</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.atsScore}% ATS)
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Job Role</label>
              <input
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Frontend Engineer, Java Developer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company Name (optional)</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Stripe, Infosys, Startup"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Interview Type</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Duration</label>
              <select
                value={durationIdx}
                onChange={(e) => setDurationIdx(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {DURATIONS.map((d, i) => (
                  <option key={d.label} value={i}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void startNewInterview()}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 shadow-sm cursor-pointer disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {busy ? busyLabel || 'Starting Interview...' : 'Start My AI Interview'}
          </button>
        </div>
      </div>

      {/* Past Interviews History */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Interview History</h3>
        {interviews.length === 0 ? (
          <div className="py-10 text-center">
            <Mic className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No mock interviews yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Configure your role on the left and start your first adaptive round.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {interviews.map((iv) => (
              <div key={iv.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{iv.jobRole}</p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {iv.interviewType} ·{' '}
                    {iv.status === 'completed' ? `${iv.overallScore}/100` : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (iv.status === 'completed') {
                        setViewingReport(iv);
                        setStage('report');
                      } else {
                        resumeInProgressInterview(iv);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 cursor-pointer"
                  >
                    {iv.status === 'completed' ? 'View Report' : 'Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteInterview(iv.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    aria-label="Delete interview"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
