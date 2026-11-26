import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import type { InterviewRecord, ResumeContent } from '../types/career';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFileSlug(name: string): string {
  return (name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function exportResumeToPdf(content: ResumeContent, title: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = 52;
    }
  };

  const addSectionHeading = (label: string) => {
    ensureSpace(34);
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(label.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  };

  const addWrapped = (text: string, fontSize = 10, bold = false, indent = 0) => {
    if (!text.trim()) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, maxWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(16);
      doc.text(line, margin + indent, y);
      y += fontSize + 4;
    }
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(content.personalInfo.fullName || 'Candidate Name', margin, y);
  y += 18;

  if (content.personalInfo.headline) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229);
    doc.text(content.personalInfo.headline, margin, y);
    y += 15;
  }

  const contactParts = [
    content.personalInfo.email,
    content.personalInfo.phone,
    content.personalInfo.location,
    content.personalInfo.linkedin,
    content.personalInfo.github,
    content.personalInfo.portfolio,
  ].filter(Boolean);

  if (contactParts.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const contactLines = doc.splitTextToSize(contactParts.join('  |  '), maxWidth) as string[];
    for (const line of contactLines) {
      doc.text(line, margin, y);
      y += 13;
    }
  }

  for (const section of content.sectionOrder) {
    if (section === 'summary' && content.summary.trim()) {
      addSectionHeading('Professional Summary');
      addWrapped(content.summary, 10);
    }

    if (section === 'experience' && content.experience.length > 0) {
      addSectionHeading('Work Experience');
      for (const exp of content.experience) {
        ensureSpace(30);
        addWrapped(
          `${exp.role}${exp.company ? ` — ${exp.company}` : ''}${exp.location ? ` (${exp.location})` : ''}`,
          10.5,
          true
        );
        const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' - ');
        if (dates) addWrapped(dates, 9, false);
        for (const bullet of exp.bullets.filter(Boolean)) {
          addWrapped(`• ${bullet}`, 9.5, false, 10);
        }
        y += 4;
      }
    }

    if (section === 'projects' && content.projects.length > 0) {
      addSectionHeading('Projects');
      for (const proj of content.projects) {
        ensureSpace(28);
        const titleLine = `${proj.name}${proj.techStack.length ? `  [${proj.techStack.join(', ')}]` : ''}`;
        addWrapped(titleLine, 10.5, true);
        if (proj.description) addWrapped(proj.description, 9.5);
        for (const h of proj.highlights.filter(Boolean)) {
          addWrapped(`• ${h}`, 9.5, false, 10);
        }
        y += 4;
      }
    }

    if (section === 'education' && content.education.length > 0) {
      addSectionHeading('Education');
      for (const edu of content.education) {
        ensureSpace(26);
        addWrapped(`${edu.degree}${edu.field ? ` in ${edu.field}` : ''} — ${edu.institution}`, 10, true);
        const meta = [
          [edu.startDate, edu.endDate].filter(Boolean).join(' - '),
          edu.grade ? `Score: ${edu.grade}` : '',
        ]
          .filter(Boolean)
          .join('  |  ');
        if (meta) addWrapped(meta, 9);
        if (edu.highlights) addWrapped(edu.highlights, 9.5);
        y += 3;
      }
    }

    if (section === 'skills' && (content.technicalSkills.length > 0 || content.softSkills.length > 0)) {
      addSectionHeading('Skills');
      if (content.technicalSkills.length > 0) {
        addWrapped(`Technical: ${content.technicalSkills.join(', ')}`, 9.5);
      }
      if (content.softSkills.length > 0) {
        addWrapped(`Core Competencies: ${content.softSkills.join(', ')}`, 9.5);
      }
    }

    if (section === 'certifications' && content.certifications.length > 0) {
      addSectionHeading('Certifications');
      for (const cert of content.certifications) {
        addWrapped(`• ${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.date ? ` (${cert.date})` : ''}`, 9.5);
      }
    }

    if (section === 'achievements' && content.achievements.filter(Boolean).length > 0) {
      addSectionHeading('Achievements');
      for (const ach of content.achievements.filter(Boolean)) {
        addWrapped(`• ${ach}`, 9.5);
      }
    }

    if (section === 'languages' && content.languages.filter(Boolean).length > 0) {
      addSectionHeading('Languages');
      addWrapped(content.languages.filter(Boolean).join(', '), 9.5);
    }
  }

  doc.save(`${safeFileSlug(title || content.personalInfo.fullName)}.pdf`);
}

export async function exportResumeToDocx(content: ResumeContent, title: string) {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: content.personalInfo.fullName || 'Candidate Name',
      heading: HeadingLevel.TITLE,
    })
  );

  if (content.personalInfo.headline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: content.personalInfo.headline, bold: true, color: '4F46E5' })],
      })
    );
  }

  const contactParts = [
    content.personalInfo.email,
    content.personalInfo.phone,
    content.personalInfo.location,
    content.personalInfo.linkedin,
    content.personalInfo.github,
    content.personalInfo.portfolio,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join(' | '), size: 20, color: '475569' })],
        spacing: { after: 200 },
      })
    );
  }

  const addHeading = (headingText: string) => {
    children.push(
      new Paragraph({
        text: headingText,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      })
    );
  };

  for (const section of content.sectionOrder) {
    if (section === 'summary' && content.summary.trim()) {
      addHeading('Professional Summary');
      children.push(new Paragraph({ text: content.summary }));
    }

    if (section === 'experience' && content.experience.length > 0) {
      addHeading('Work Experience');
      for (const exp of content.experience) {
        const dates = [exp.startDate, exp.current ? 'Present' : exp.endDate].filter(Boolean).join(' - ');
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${exp.role} — ${exp.company}`, bold: true }),
              ...(dates ? [new TextRun({ text: ` (${dates})`, italics: true })] : []),
            ],
            spacing: { before: 100 },
          })
        );
        for (const bullet of exp.bullets.filter(Boolean)) {
          children.push(new Paragraph({ text: bullet, bullet: { level: 0 } }));
        }
      }
    }

    if (section === 'projects' && content.projects.length > 0) {
      addHeading('Projects');
      for (const proj of content.projects) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: proj.name, bold: true }),
              ...(proj.techStack.length ? [new TextRun({ text: ` [${proj.techStack.join(', ')}]` })] : []),
            ],
            spacing: { before: 100 },
          })
        );
        if (proj.description) children.push(new Paragraph({ text: proj.description }));
        for (const h of proj.highlights.filter(Boolean)) {
          children.push(new Paragraph({ text: h, bullet: { level: 0 } }));
        }
      }
    }

    if (section === 'education' && content.education.length > 0) {
      addHeading('Education');
      for (const edu of content.education) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${edu.degree}${edu.field ? ` in ${edu.field}` : ''} — ${edu.institution}`, bold: true }),
            ],
          })
        );
        const meta = [[edu.startDate, edu.endDate].filter(Boolean).join(' - '), edu.grade].filter(Boolean).join(' | ');
        if (meta) children.push(new Paragraph({ text: meta }));
      }
    }

    if (section === 'skills' && (content.technicalSkills.length > 0 || content.softSkills.length > 0)) {
      addHeading('Skills');
      if (content.technicalSkills.length > 0) {
        children.push(new Paragraph({ text: `Technical: ${content.technicalSkills.join(', ')}` }));
      }
      if (content.softSkills.length > 0) {
        children.push(new Paragraph({ text: `Soft Skills: ${content.softSkills.join(', ')}` }));
      }
    }

    if (section === 'certifications' && content.certifications.length > 0) {
      addHeading('Certifications');
      for (const cert of content.certifications) {
        children.push(
          new Paragraph({
            text: `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.date ? ` (${cert.date})` : ''}`,
            bullet: { level: 0 },
          })
        );
      }
    }

    if (section === 'achievements' && content.achievements.filter(Boolean).length > 0) {
      addHeading('Achievements');
      for (const ach of content.achievements.filter(Boolean)) {
        children.push(new Paragraph({ text: ach, bullet: { level: 0 } }));
      }
    }

    if (section === 'languages' && content.languages.filter(Boolean).length > 0) {
      addHeading('Languages');
      children.push(new Paragraph({ text: content.languages.filter(Boolean).join(', ') }));
    }
  }

  const wordDoc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(wordDoc);
  downloadBlob(blob, `${safeFileSlug(title || content.personalInfo.fullName)}.docx`);
}

export function exportInterviewReportToPdf(interview: InterviewRecord) {
  if (!interview.report) return;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = 52;
    }
  };

  const writeLine = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(18);
      doc.text(line, margin, y);
      y += size + 5;
    }
  };

  writeLine('CareerPilot AI — Interview Evaluation Report', 18, true, [15, 23, 42]);
  writeLine(
    `${interview.jobRole}${interview.companyName ? ` at ${interview.companyName}` : ''} | ${interview.interviewType} (${interview.difficulty})`,
    11,
    false,
    [79, 70, 229]
  );
  y += 6;
  writeLine(
    `Overall Score: ${interview.report.overallScore}/100  |  Performance Level: ${interview.report.performanceLevel}  |  Completion: ${interview.report.completionPercentage}%`,
    11,
    true
  );
  y += 10;

  writeLine('Category Breakdown', 12, true, [15, 23, 42]);
  const cs = interview.report.categoryScores;
  writeLine(
    `Technical: ${cs.technicalKnowledge} | Communication: ${cs.communication} | Problem Solving: ${cs.problemSolving} | Confidence: ${cs.confidence} | Relevance: ${cs.answerRelevance} | Resume Knowledge: ${cs.resumeKnowledge} | Behavioral: ${cs.behavioralResponses}`,
    10
  );
  y += 8;

  if (interview.report.strengths.length > 0) {
    writeLine('Key Strengths', 12, true, [15, 23, 42]);
    interview.report.strengths.forEach((s) => writeLine(`• ${s}`, 10));
    y += 6;
  }

  if (interview.report.weaknesses.length > 0) {
    writeLine('Areas for Improvement', 12, true, [15, 23, 42]);
    interview.report.weaknesses.forEach((w) => writeLine(`• ${w}`, 10));
    y += 6;
  }

  if (interview.report.improvementPlan.length > 0) {
    writeLine('Personalized Improvement Plan', 12, true, [15, 23, 42]);
    interview.report.improvementPlan.forEach((day) => {
      writeLine(`${day.day}: ${day.focus}`, 10.5, true);
      day.tasks.forEach((t) => writeLine(`  - ${t}`, 9.5));
    });
    y += 6;
  }

  writeLine('Question-by-Question Review', 12, true, [15, 23, 42]);
  interview.turns.forEach((t, idx) => {
    y += 4;
    writeLine(`Q${idx + 1} (${t.category}): ${t.question}`, 10.5, true);
    writeLine(`Your Answer: ${t.skipped ? 'Skipped' : t.userAnswer || 'No response'}`, 9.5);
    if (t.evaluation) {
      writeLine(`Score: ${t.evaluation.score}/100 — ${t.evaluation.feedback}`, 9.5, false, [79, 70, 229]);
      writeLine(`Improved Sample Answer: ${t.evaluation.improvedSampleAnswer}`, 9.5);
    }
  });

  doc.save(`${safeFileSlug(interview.jobRole)}-interview-report.pdf`);
}
