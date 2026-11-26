import React from 'react';
import type { ResumeContent, ResumeSectionKey, ResumeTemplateId } from '../types/career';

interface ResumePreviewProps {
  content: ResumeContent;
  template: ResumeTemplateId;
}

export function ResumePreview({ content, template }: ResumePreviewProps) {
  const { personalInfo } = content;
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
    personalInfo.portfolio,
  ].filter(Boolean);

  const isDev = template === 'developer';
  const isModern = template === 'modern';
  const isMinimal = template === 'minimal';
  const isStudent = template === 'student';

  const sectionOrder: ResumeSectionKey[] =
    content.sectionOrder && content.sectionOrder.length > 0
      ? content.sectionOrder
      : ['summary', 'experience', 'projects', 'skills', 'education', 'certifications', 'achievements', 'languages'];

  const effectiveOrder = isStudent
    ? ([
        'summary',
        'education',
        'projects',
        'skills',
        'experience',
        'certifications',
        'achievements',
        'languages',
      ] as ResumeSectionKey[])
    : sectionOrder;

  const headingClass = isModern
    ? 'text-xs font-bold uppercase tracking-wider text-indigo-700 border-b border-indigo-200 pb-1 mb-2'
    : isDev
      ? 'text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-2'
      : isMinimal
        ? 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2'
        : isStudent
          ? 'text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-200 pb-1 mb-2'
          : 'text-xs font-bold uppercase tracking-wide text-slate-900 border-b border-slate-400 pb-0.5 mb-2';

  const renderSection = (key: ResumeSectionKey) => {
    switch (key) {
      case 'summary':
        if (!content.summary.trim()) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Professional Summary</h3>
            <p className="text-[11.5px] leading-relaxed text-slate-700 whitespace-pre-line">
              {content.summary}
            </p>
          </section>
        );

      case 'experience':
        if (content.experience.length === 0) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Work Experience</h3>
            <div className="space-y-3">
              {content.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[12px] font-bold text-slate-900">
                      {exp.role || 'Role Title'}
                      {exp.company ? <span className="font-semibold text-slate-700"> · {exp.company}</span> : null}
                    </p>
                    <p className="text-[10.5px] text-slate-500 font-mono tabular-nums">
                      {[exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' – ')}
                      {exp.location ? ` · ${exp.location}` : ''}
                    </p>
                  </div>
                  {exp.bullets.filter(Boolean).length > 0 && (
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 leading-snug">
                      {exp.bullets.filter(Boolean).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (content.projects.length === 0) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Projects</h3>
            <div className="space-y-2.5">
              {content.projects.map((proj) => (
                <div key={proj.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[12px] font-bold text-slate-900">
                      {proj.name || 'Project Name'}
                      {proj.link ? (
                        <span className="text-[10.5px] font-normal text-indigo-600 ml-1.5">
                          ({proj.link})
                        </span>
                      ) : null}
                    </p>
                    {proj.techStack.length > 0 && (
                      <p className={`text-[10.5px] text-slate-600 ${isDev ? 'font-mono' : ''}`}>
                        {proj.techStack.join(', ')}
                      </p>
                    )}
                  </div>
                  {proj.description && (
                    <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">{proj.description}</p>
                  )}
                  {proj.highlights.filter(Boolean).length > 0 && (
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 leading-snug">
                      {proj.highlights.filter(Boolean).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'education':
        if (content.education.length === 0) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Education</h3>
            <div className="space-y-2">
              {content.education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-bold text-slate-900">
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-700">{edu.institution}</p>
                    {edu.highlights && (
                      <p className="text-[10.5px] text-slate-600 mt-0.5">{edu.highlights}</p>
                    )}
                  </div>
                  <div className="text-right text-[10.5px] text-slate-500 font-mono tabular-nums">
                    <p>{[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}</p>
                    {edu.grade && <p className="font-semibold text-slate-700">{edu.grade}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (content.technicalSkills.length === 0 && content.softSkills.length === 0) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Skills</h3>
            <div className="space-y-1 text-[11px] text-slate-700">
              {content.technicalSkills.length > 0 && (
                <p>
                  <span className="font-semibold text-slate-900">Technical: </span>
                  <span className={isDev ? 'font-mono text-[10.5px]' : ''}>
                    {content.technicalSkills.join(' · ')}
                  </span>
                </p>
              )}
              {content.softSkills.length > 0 && (
                <p>
                  <span className="font-semibold text-slate-900">Competencies: </span>
                  {content.softSkills.join(' · ')}
                </p>
              )}
            </div>
          </section>
        );

      case 'certifications':
        if (content.certifications.length === 0) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Certifications</h3>
            <ul className="space-y-1 text-[11px] text-slate-700">
              {content.certifications.map((cert) => (
                <li key={cert.id} className="flex justify-between gap-2">
                  <span>
                    <span className="font-semibold text-slate-900">{cert.name}</span>
                    {cert.issuer ? ` — ${cert.issuer}` : ''}
                  </span>
                  {cert.date && <span className="text-[10.5px] text-slate-500 font-mono">{cert.date}</span>}
                </li>
              ))}
            </ul>
          </section>
        );

      case 'achievements':
        if (content.achievements.filter(Boolean).length === 0) return null;
        return (
          <section key={key} className="mb-4">
            <h3 className={headingClass}>Achievements</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
              {content.achievements.filter(Boolean).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        );

      case 'languages':
        if (content.languages.filter(Boolean).length === 0) return null;
        return (
          <section key={key} className="mb-2">
            <h3 className={headingClass}>Languages</h3>
            <p className="text-[11px] text-slate-700">{content.languages.filter(Boolean).join(' · ')}</p>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`print-only-sheet bg-white text-slate-900 w-full rounded-xl border border-slate-200 shadow-sm p-7 sm:p-9 min-h-[760px] ${
        isModern ? 'border-t-4 border-t-indigo-600' : isStudent ? 'border-t-4 border-t-blue-600' : ''
      }`}
    >
      {/* Header */}
      <header
        className={`pb-4 mb-4 ${
          isMinimal ? '' : 'border-b border-slate-200'
        } ${template === 'ats' ? 'text-center' : ''}`}
      >
        <h2 className={`text-2xl font-bold tracking-tight text-slate-900 ${isDev ? 'font-mono' : ''}`}>
          {personalInfo.fullName || 'Your Full Name'}
        </h2>
        {personalInfo.headline && (
          <p
            className={`text-sm font-medium mt-0.5 ${
              isModern ? 'text-indigo-600' : isStudent ? 'text-blue-700' : 'text-slate-700'
            }`}
          >
            {personalInfo.headline}
          </p>
        )}
        {contactItems.length > 0 && (
          <p
            className={`text-[10.5px] text-slate-600 mt-2 flex flex-wrap gap-x-2.5 gap-y-0.5 ${
              template === 'ats' ? 'justify-center' : ''
            }`}
          >
            {contactItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-300">|</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
        )}
      </header>

      {/* Body Sections */}
      <div>{effectiveOrder.map((key) => renderSection(key))}</div>
    </div>
  );
}
