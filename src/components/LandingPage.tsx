import React, { useState } from 'react';
import {
  ArrowRight,
  Compass,
  FileText,
  Mic,
  CheckCircle2,
  BarChart3,
  Briefcase,
  BookOpen,
  Sparkles,
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onNavigateApp?: (tab: 'resume' | 'interview') => void;
  isAuthenticated: boolean;
}

const FEATURES = [
  {
    num: '01',
    title: 'AI Resume Builder',
    desc: 'Create structured, recruiter-ready resumes from scratch with guided section editors, instant reordering, and five clean templates.',
    icon: FileText,
    span: 'md:col-span-2',
  },
  {
    num: '02',
    title: 'Resume Upload & Analysis',
    desc: 'Upload an existing PDF or DOCX resume to extract experience, skills, projects, and education into editable fields.',
    icon: Upload,
    span: 'md:col-span-1',
  },
  {
    num: '03',
    title: 'ATS Score Checker',
    desc: 'Measure structure, keyword coverage, and job-description alignment before you submit an application.',
    icon: CheckCircle2,
    span: 'md:col-span-1',
  },
  {
    num: '04',
    title: 'AI Mock Interview',
    desc: 'Practice realistic technical, HR, behavioral, and resume-based interviews via text or live microphone speech-to-text.',
    icon: Mic,
    span: 'md:col-span-2',
  },
  {
    num: '05',
    title: 'Adaptive Interview Questions',
    desc: 'Every question adapts in real time to your previous answer—probing deeper when vague or advancing when strong.',
    icon: Sparkles,
    span: 'md:col-span-1',
  },
  {
    num: '06',
    title: 'Interview Performance Analytics',
    desc: 'Review scores across technical depth, clarity, confidence, and STAR structure with sample improved answers.',
    icon: BarChart3,
    span: 'md:col-span-1',
  },
  {
    num: '07',
    title: 'Job Role Preparation',
    desc: 'Paste any target job description to generate required skills, likely questions, and resume keyword matches.',
    icon: Briefcase,
    span: 'md:col-span-1',
  },
  {
    num: '08',
    title: 'Personalized Learning Recommendations',
    desc: 'Turn weak interview topics into a concrete multi-day study roadmap tailored to your target role.',
    icon: BookOpen,
    span: 'md:col-span-1',
  },
];

const STEPS = [
  {
    step: 'Step 01',
    title: 'Upload or create your resume.',
    detail: 'Import a PDF or DOCX resume for instant parsing, or build cleanly from scratch with live ATS scoring.',
  },
  {
    step: 'Step 02',
    title: 'Select your target job role.',
    detail: 'Choose your role, experience level, interview mode, difficulty, and language.',
  },
  {
    step: 'Step 03',
    title: 'Practice with your AI interviewer.',
    detail: 'Answer one adaptive question at a time via text or voice while the AI probes your real projects.',
  },
  {
    step: 'Step 04',
    title: 'Get personalized feedback and improve.',
    detail: 'Receive a per-question breakdown, sample answers, and a 5-day study plan.',
  },
];

export function LandingPage({
  onOpenAuth,
  onNavigateApp,
  isAuthenticated,
}: LandingPageProps) {
  const [previewTab, setPreviewTab] = useState<'interview' | 'resume'>('interview');

  const handleAction = (target: 'resume' | 'interview') => {
    if (isAuthenticated && onNavigateApp) {
      onNavigateApp(target);
    } else {
      onOpenAuth('signup');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#home"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </span>
            <span>CareerPilot AI</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#home" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Home
            </a>
            <button
              type="button"
              onClick={() => handleAction('resume')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Resume Builder
            </button>
            <button
              type="button"
              onClick={() => handleAction('interview')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI Interview
            </button>
            <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Login
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => (isAuthenticated && onNavigateApp ? onNavigateApp('interview') : onOpenAuth('signup'))}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAuthenticated ? 'Open Workspace' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-14 pb-20 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-semibold text-indigo-600 mb-3 tracking-tight">
              AI Resume Studio · Adaptive Interview Engine
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1] text-balance mb-5">
              Your Career. Your Skills. Your AI-Powered Future.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
              Build ATS-friendly resumes, practice intelligent AI interviews, and discover exactly what you need to improve to land your dream job.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => handleAction('resume')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                Build My Resume
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleAction('interview')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start AI Interview
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>PDF & DOCX Parsing</span>
              <span aria-hidden="true">·</span>
              <span>5 ATS Resume Templates</span>
              <span aria-hidden="true">·</span>
              <span>One-by-One Adaptive Follow-Ups</span>
            </div>
          </div>

          {/* Interactive Mock Dashboard Preview */}
          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('interview')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      previewTab === 'interview'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Adaptive Interview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('resume')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      previewTab === 'resume'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Resume ATS Check
                  </button>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {previewTab === 'interview' ? 'Question 03 / 10' : 'ATS Readiness 88 / 100'}
                </span>
              </div>

              {previewTab === 'interview' ? (
                <motion.div
                  key="interview-preview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-5 space-y-4 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-medium text-indigo-600 mb-1">
                        CareerPilot AI Interviewer · Follow-Up Probe
                      </p>
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        "You mentioned building an order-matching service in Node.js. How did you handle concurrent requests to avoid double-processing?"
                      </p>
                    </div>
                    <div className="bg-indigo-600 text-white rounded-xl p-4 ml-6">
                      <p className="text-xs text-indigo-100 mb-1">Candidate Response</p>
                      <p className="text-sm leading-relaxed">
                        "We wrapped stock updates inside database transactions and used an idempotency key per checkout request..."
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Technical Depth</p>
                      <p className="text-lg font-semibold font-mono tabular-nums text-slate-900">86%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Clarity</p>
                      <p className="text-lg font-semibold font-mono tabular-nums text-slate-900">91%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Next Action</p>
                      <p className="text-sm font-semibold text-indigo-600 mt-1">Deepen Edge Cases</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="resume-preview"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-5 space-y-4 flex-1 flex flex-col justify-between"
                >
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Full-Stack Engineer Resume</p>
                        <p className="text-xs text-slate-500">Template: Software Developer · 1 Page</p>
                      </div>
                      <span className="text-xl font-bold font-mono tabular-nums text-indigo-600">88%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[88%] bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-500 block">Matched Keywords</span>
                        <span className="font-semibold text-slate-800">TypeScript, React, REST API, SQL</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-slate-500 block">Suggested Focus</span>
                        <span className="font-semibold text-slate-800">Add CI/CD & test coverage scope</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Strict anti-fabrication mode active</span>
                    <span className="font-medium text-indigo-600">PDF & DOCX Ready</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-indigo-600 mb-2">Platform Capabilities</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 text-balance">
            Everything required from first draft to final interview round.
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-5">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.num}
                className={`${feat.span} bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono tabular-nums text-slate-400">{feat.num}</span>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-stretch">
          <div className="lg:col-span-6">
            <p className="text-sm font-semibold text-indigo-600 mb-2">How It Works</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-8 text-balance">
              Four focused steps from raw resume to confident answers.
            </h2>
            <div className="space-y-6">
              {STEPS.map((item) => (
                <div key={item.step} className="pb-5 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <p className="text-xs font-mono font-medium text-indigo-600 mb-1">{item.step}</p>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative min-h-[340px]">
              <img
                src="/src/assets/images/career_studio_workspace_1795667470539.jpg"
                alt="Focused candidate preparing resume and mock interviews at desk"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent text-white">
                <p className="text-sm font-semibold">Grounded in your actual projects and target role</p>
                <p className="text-xs text-slate-200 mt-1">
                  Practice technical, behavioral (STAR), and resume deep-dive rounds without static question scripts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes / Proof */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-semibold text-indigo-600 mb-2">Candidate Outcomes</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Measurable clarity before interview day.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-5 items-start">
            <img
              src="/src/assets/images/candidate_story_one_1795667470526.jpg"
              alt="Ananya Nair portrait"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
            />
            <div>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                "The resume analyzer flagged missing backend keywords against the job description, and three adaptive mock sessions helped me tighten my project explanations from rambling to crisp STAR answers."
              </p>
              <p className="text-sm font-semibold text-slate-900">Ananya Nair</p>
              <p className="text-xs text-slate-500">
                B.Tech CS Graduate · ATS score improved from 61 to 89 in 4 days
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-5 items-start">
            <img
              src="/src/assets/images/candidate_story_two_1795667471058.jpg"
              alt="Claire Bennett portrait"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100"
            />
            <div>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                "When I gave a surface-level answer on database indexing, the AI interviewer asked an immediate follow-up about composite key order—just like my real panel interview a week later."
              </p>
              <p className="text-sm font-semibold text-slate-900">Claire Bennett</p>
              <p className="text-xs text-slate-500">
                Full-Stack Developer (2 yrs) · Mock score rose from 68 to 91 over 5 rounds
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-10 sm:p-12 text-center text-white shadow-sm">
          <h2 className="text-3xl font-bold tracking-tight mb-3 text-balance">
            Ready to become interview-ready?
          </h2>
          <p className="text-indigo-100 text-base max-w-xl mx-auto mb-7">
            Upload your resume or start building from scratch, then run your first adaptive AI interview in minutes.
          </p>
          <button
            type="button"
            onClick={() => (isAuthenticated && onNavigateApp ? onNavigateApp('interview') : onOpenAuth('signup'))}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start Your Journey
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>CareerPilot AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#home" className="hover:text-slate-900">Home</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <button type="button" onClick={() => onOpenAuth('login')} className="hover:text-slate-900 cursor-pointer">
              Sign In
            </button>
          </div>
          <span>Built for focused job preparation.</span>
        </div>
      </footer>
    </div>
  );
}
