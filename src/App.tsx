import React, { useCallback, useEffect, useState } from 'react';
import {
  Briefcase,
  Compass,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Mic,
  SearchCheck,
  Settings,
  X,
} from 'lucide-react';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { AuthModal } from './components/AuthModal';
import { DashboardHome, type DashboardTab } from './components/DashboardHome';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InterviewCenter } from './components/InterviewCenter';
import { JobPrep } from './components/JobPrep';
import { LandingPage } from './components/LandingPage';
import { ProfileSettings } from './components/ProfileSettings';
import { ResumeAnalyzer } from './components/ResumeAnalyzer';
import { ResumeBuilder } from './components/ResumeBuilder';
import { ToastProvider, useToast } from './components/ToastProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  listUserInterviews,
  listUserJobPreps,
  listUserResumes,
} from './lib/firestore-helpers';
import type { InterviewRecord, JobPrepRecord, ResumeRecord } from './types/career';

const NAV_ITEMS: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'builder', label: 'Resume Builder', icon: FileText },
  { id: 'analyzer', label: 'Resume Analyzer', icon: SearchCheck },
  { id: 'interview', label: 'AI Interview', icon: Mic },
  { id: 'jobprep', label: 'Job Prep', icon: Briefcase },
  { id: 'profile', label: 'Profile & Settings', icon: Settings },
];

function AppShell() {
  const { user, profile, loading, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [jobPreps, setJobPreps] = useState<JobPrepRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [autoOpenUpload, setAutoOpenUpload] = useState(false);
  const [initialReportInterview, setInitialReportInterview] = useState<InterviewRecord | null>(null);
  const [presetJobRole, setPresetJobRole] = useState<string | undefined>(undefined);

  const loadUserData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [resList, intList, prepList] = await Promise.all([
        listUserResumes(user.uid),
        listUserInterviews(user.uid),
        listUserJobPreps(user.uid),
      ]);
      setResumes(resList);
      setInterviews(intList);
      setJobPreps(prepList);
      setActiveResumeId((prev) => prev || resList[0]?.id || null);
    } catch (err) {
      console.error('Failed loading user records:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setViewMode('workspace');
      void loadUserData();
    } else {
      setResumes([]);
      setInterviews([]);
      setJobPreps([]);
      setActiveResumeId(null);
      setViewMode('landing');
    }
  }, [user, loadUserData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm font-medium text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          Loading CareerPilot AI...
        </div>
      </div>
    );
  }

  // Landing Page or Auth Gate
  if (!user || viewMode === 'landing') {
    return (
      <>
        <LandingPage
          isAuthenticated={Boolean(user)}
          onOpenAuth={(mode) => setAuthModalMode(mode || 'login')}
          onNavigateApp={(target) => {
            setViewMode('workspace');
            setActiveTab(target === 'resume' ? 'builder' : 'interview');
          }}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
            onSuccess={() => {
              setAuthModalMode(null);
              setViewMode('workspace');
            }}
          />
        )}
      </>
    );
  }

  const displayName =
    profile?.name || user.displayName || user.email?.split('@')[0] || 'Candidate';

  const activeResume = resumes.find((r) => r.id === activeResumeId) || resumes[0] || null;
  const latestCompletedInterview = interviews.find((i) => i.status === 'completed') || null;
  const currentNavLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Dashboard';

  const handleLogout = async () => {
    await logout();
    showToast('Signed out.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            className="flex items-center gap-2.5 text-base font-bold text-slate-900 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </span>
            <span>CareerPilot AI</span>
          </button>
        </div>

        <nav className="flex-1 p-3.5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="px-2">
            <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden bg-slate-950/40 flex">
          <div className="w-64 bg-white h-full p-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-200">
                <span className="font-bold text-slate-900">CareerPilot AI</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer ${
                        active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="no-print sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="font-semibold text-slate-900">{currentNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dataLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            <button
              type="button"
              onClick={() => setActiveTab('interview')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              New AI Interview
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <DashboardHome
              profile={profile}
              displayName={displayName}
              resumes={resumes}
              interviews={interviews}
              onNavigate={setActiveTab}
              onOpenResume={(id) => {
                setActiveResumeId(id);
                setActiveTab('builder');
              }}
              onTriggerUpload={() => {
                setAutoOpenUpload(true);
                setActiveTab('builder');
              }}
              onOpenInterviewReport={(iv) => {
                setInitialReportInterview(iv);
                setActiveTab('interview');
              }}
            />
          )}

          {activeTab === 'builder' && (
            <ResumeBuilder
              userId={user.uid}
              userEmail={user.email || ''}
              userName={displayName}
              resumes={resumes}
              activeResumeId={activeResumeId}
              onSelectResume={setActiveResumeId}
              onResumesChanged={loadUserData}
              autoOpenUpload={autoOpenUpload}
              onConsumeAutoUpload={() => setAutoOpenUpload(false)}
              onGoToAnalyzer={() => setActiveTab('analyzer')}
            />
          )}

          {activeTab === 'analyzer' && (
            <ResumeAnalyzer
              resumes={resumes}
              activeResumeId={activeResumeId}
              onSelectResume={(id) => setActiveResumeId(id)}
              onResumesChanged={loadUserData}
              onGoToBuilder={() => setActiveTab('builder')}
            />
          )}

          {activeTab === 'interview' && (
            <InterviewCenter
              userId={user.uid}
              resumes={resumes}
              interviews={interviews}
              initialReportInterview={initialReportInterview}
              onClearInitialReport={() => setInitialReportInterview(null)}
              onInterviewsChanged={loadUserData}
              onBackToDashboard={() => setActiveTab('overview')}
              onGoToResumeBuilder={() => setActiveTab('builder')}
              presetJobRole={presetJobRole}
            />
          )}

          {activeTab === 'jobprep' && (
            <JobPrep
              userId={user.uid}
              resumes={resumes}
              jobPreps={jobPreps}
              onJobPrepsChanged={loadUserData}
              onStartInterviewForRole={(role) => {
                setPresetJobRole(role);
                setActiveTab('interview');
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileSettings
              uid={user.uid}
              profile={profile}
              fallbackEmail={user.email || ''}
              resumes={resumes}
              interviews={interviews}
              jobPreps={jobPreps}
              onRefreshAll={loadUserData}
              onRefreshProfile={refreshProfile}
            />
          )}
        </main>
      </div>

      <AiAssistantWidget
        activeResume={activeResume}
        latestInterview={latestCompletedInterview}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
