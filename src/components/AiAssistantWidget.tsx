import React, { useState } from 'react';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { apiPost } from '../lib/api';
import type { InterviewRecord, ResumeRecord } from '../types/career';
import { useToast } from './ToastProvider';

interface AiAssistantWidgetProps {
  activeResume: ResumeRecord | null;
  latestInterview: InterviewRecord | null;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS = [
  'How can I improve my resume?',
  'Explain my project for an interview',
  'Help me answer HR questions',
  'How can I improve my interview score?',
];

export function AiAssistantWidget({
  activeResume,
  latestInterview,
}: AiAssistantWidgetProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [shareContext, setShareContext] = useState(true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: 'Hi! I am your CareerPilot Coach. Ask me anything about improving your resume bullets, framing project stories, or preparing for technical and HR rounds.',
    },
  ]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || busy) return;

    const nextMessages: ChatMsg[] = [...messages, { role: 'user', text: query }];
    setMessages(nextMessages);
    if (!textToSend) setInput('');
    setBusy(true);

    try {
      const userContext = shareContext
        ? {
            resume: activeResume
              ? {
                  title: activeResume.title,
                  atsScore: activeResume.atsScore,
                  headline: activeResume.content.personalInfo.headline,
                  skills: activeResume.content.technicalSkills,
                  projects: activeResume.content.projects.map((p) => ({
                    name: p.name,
                    tech: p.techStack,
                    description: p.description,
                  })),
                }
              : null,
            latestInterview: latestInterview
              ? {
                  jobRole: latestInterview.jobRole,
                  overallScore: latestInterview.overallScore,
                  weaknesses: latestInterview.report?.weaknesses || [],
                  skillsToImprove: latestInterview.report?.skillsToImprove || [],
                }
              : null,
          }
        : undefined;

      const res = await apiPost<
        { message: string; history: ChatMsg[]; userContext?: unknown },
        { reply: string }
      >('/api/assistant/chat', {
        message: query,
        history: nextMessages,
        userContext,
      });

      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Assistant request failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="mb-3 w-[340px] sm:w-[390px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[540px]"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">CareerPilot AI Coach</p>
                <p className="text-[11px] text-indigo-100">Resume & Interview Mentor</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
                aria-label="Close AI assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Permission Toggle */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
              <input
                id="coach-context-toggle"
                type="checkbox"
                checked={shareContext}
                onChange={(e) => setShareContext(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600"
              />
              <label htmlFor="coach-context-toggle" className="cursor-pointer select-none">
                Include my active resume & interview history
              </label>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white ml-8'
                      : 'bg-slate-100 text-slate-800 mr-6'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {busy && (
                <div className="inline-flex items-center gap-2 text-slate-500 bg-slate-100 rounded-xl px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-2 border-t border-slate-100 flex gap-1.5 overflow-x-auto">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendMessage(q)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
              className="p-3 border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask CareerPilot Coach..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-lg hover:from-indigo-700 hover:to-blue-700 transition-all cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">AI Coach</span>
      </button>
    </div>
  );
}
