import React, { useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import {
  deleteInterviewRecord,
  deleteJobPrepRecord,
  deleteResumeRecord,
  updateUserProfile,
} from '../lib/firestore-helpers';
import type {
  ExperienceLevel,
  InterviewRecord,
  JobPrepRecord,
  ResumeRecord,
  UserProfile,
} from '../types/career';
import { useToast } from './ToastProvider';

interface ProfileSettingsProps {
  uid: string;
  profile: UserProfile | null;
  fallbackEmail: string;
  resumes: ResumeRecord[];
  interviews: InterviewRecord[];
  jobPreps: JobPrepRecord[];
  onRefreshAll: () => Promise<void>;
  onRefreshProfile: () => Promise<void>;
}

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Student',
  'Fresher',
  'Internship',
  '0-2 years',
  '2-5 years',
  'Experienced',
];

export function ProfileSettings({
  uid,
  profile,
  fallbackEmail,
  resumes,
  interviews,
  jobPreps,
  onRefreshAll,
  onRefreshProfile,
}: ProfileSettingsProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(profile?.name || '');
  const [targetRole, setTargetRole] = useState(profile?.targetRole || 'Software Developer');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    profile?.experienceLevel || 'Fresher'
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    profile?.preferredLanguage || 'English'
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(uid, {
        name: name.trim(),
        email: profile?.email || fallbackEmail,
        targetRole: targetRole.trim(),
        experienceLevel,
        preferredLanguage,
      });
      await onRefreshProfile();
      showToast('Profile settings saved.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">Profile & Preferences</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalize your default target job role, experience stage, and interview language.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={profile?.email || fallbackEmail}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Default Target Role</label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Interview Language</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {['English', 'Spanish', 'French', 'German', 'Hindi', 'Portuguese'].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 cursor-pointer disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Profile
        </button>
      </form>

      {/* Data Control */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Your Stored Data</h3>
          <p className="text-xs text-slate-500">
            Delete individual resumes, mock interviews, or job preparation guides anytime.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-900">Resumes ({resumes.length})</p>
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700">{r.title}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteResumeRecord(r.id);
                    await onRefreshAll();
                    showToast('Resume removed.', 'info');
                  }}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-900">Interviews ({interviews.length})</p>
            {interviews.map((iv) => (
              <div key={iv.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700">{iv.jobRole}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteInterviewRecord(iv.id);
                    await onRefreshAll();
                    showToast('Interview removed.', 'info');
                  }}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-900">Job Guides ({jobPreps.length})</p>
            {jobPreps.map((jp) => (
              <div key={jp.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700">{jp.jobTitle}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteJobPrepRecord(jp.id);
                    await onRefreshAll();
                    showToast('Job prep guide removed.', 'info');
                  }}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
