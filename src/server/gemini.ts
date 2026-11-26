import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { InterviewConfig, InterviewTurn, ResumeContent } from '../types/career';

const MODEL = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Do not retry auth or bad request errors
      if (msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED') || msg.includes('400')) {
        throw err;
      }
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
      }
    }
  }
  throw lastErr;
}

function safeJsonParse<T>(raw: string | undefined, context: string): T {
  if (!raw || !raw.trim()) {
    throw new Error(`AI returned an empty response while ${context}.`);
  }
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned) as T;
  }
}

const INTERVIEWER_SYSTEM_PROMPT = `You are a professional, intelligent, adaptive job interviewer.

Your task is to conduct a realistic interview for the candidate's selected job role.

You have access to the candidate's resume, skills, projects, experience, target role, interview type, difficulty level, and previous conversation.

Conduct the interview one question at a time.

After every user answer:
1. Analyze the answer.
2. Evaluate its accuracy, relevance, clarity, completeness, and depth.
3. Identify missing points.
4. Decide whether a follow-up question is needed.
5. If a follow-up is needed, ask it based on the user's previous answer.
6. Otherwise move to a new topic relevant to the target role.
7. Adapt difficulty to the candidate's performance.
8. Avoid repetitive questions.
9. Do not reveal the ideal answer before the candidate attempts the question.
10. Keep the interview natural, realistic, professional, and encouraging.

Never ask multiple interview questions in one message.

Never invent experience or skills that the candidate does not have.

Ask challenging but fair questions.

For technical interviews, prioritize the candidate's resume skills and target job requirements.

For HR interviews, evaluate communication, motivation, teamwork, behavior, and career goals.

For resume-based interviews, ask detailed questions about the candidate's projects and experience.

Keep track of all questions and answers.

When the interview is complete, produce a structured report containing scores, strengths, weaknesses, feedback, sample improved answers, and a personalized learning plan.`;

export async function parseResumeWithGemini(params: {
  pdfBase64?: string;
  extractedText?: string;
  fileName: string;
}) {
  const ai = getAiClient();

  const promptText = `You are an expert ATS resume parser. Extract every detail present in this resume (${params.fileName}).
STRICT GROUNDING RULES:
- Extract ONLY information explicitly stated in the resume.
- NEVER invent skills, metrics, projects, companies, degrees, dates, or achievements.
- If a section or field is missing or unclear, leave it empty and list it in "missingOrUncertainFields" so the user can confirm or fill it in.
- Also provide the complete extracted plain text in "rawText".`;

  const contents = params.pdfBase64
    ? {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: params.pdfBase64,
            },
          },
          { text: promptText },
        ],
      }
    : `${promptText}\n\nRESUME TEXT:\n${params.extractedText ?? ''}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rawText: { type: Type.STRING },
            suggestedTitle: { type: Type.STRING },
            personalInfo: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                headline: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
                linkedin: { type: Type.STRING },
                github: { type: Type.STRING },
                portfolio: { type: Type.STRING },
              },
            },
            summary: { type: Type.STRING },
            technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            softSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  field: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  grade: { type: Type.STRING },
                  highlights: { type: Type.STRING },
                },
              },
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  location: { type: Type.STRING },
                  startDate: { type: Type.STRING },
                  endDate: { type: Type.STRING },
                  current: { type: Type.BOOLEAN },
                  bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                  link: { type: Type.STRING },
                  description: { type: Type.STRING },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            certifications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  issuer: { type: Type.STRING },
                  date: { type: Type.STRING },
                  credentialUrl: { type: Type.STRING },
                },
              },
            },
            achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
            languages: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingOrUncertainFields: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'rawText',
            'suggestedTitle',
            'personalInfo',
            'summary',
            'technicalSkills',
            'softSkills',
            'education',
            'experience',
            'projects',
            'certifications',
            'achievements',
            'languages',
            'missingOrUncertainFields',
          ],
        },
      },
    })
  );

  return safeJsonParse<Record<string, unknown>>(response.text, 'parsing resume');
}

export async function improveResumeSectionWithGemini(params: {
  mode:
    | 'improve_section'
    | 'rewrite_professional'
    | 'make_concise'
    | 'add_action_verbs'
    | 'improve_ats_keywords'
    | 'generate_summary'
    | 'improve_project';
  section: string;
  currentText: string;
  resumeContext: ResumeContent;
  targetRole?: string;
}) {
  const ai = getAiClient();

  const prompt = `Improve the candidate's "${params.section}" content using the "${params.mode}" strategy.
Target role (if provided): ${params.targetRole || 'Not specified'}

CRITICAL ACCURACY RULES:
1. NEVER invent skills, achievements, metrics, numbers, company names, tools, or qualifications that are not in the candidate's resume context.
2. Only polish, clarify, tighten, and restructure what the candidate has actually provided.
3. If adding specific metrics or additional tools would strengthen the bullet, put them in "suggestedConfirmations" as questions/placeholders for the user to confirm (e.g. "Did you measure latency or user impact on this project?"), NEVER silently insert fabricated numbers into "improvedText".

Candidate's full resume context:
${JSON.stringify(params.resumeContext)}

Current text for "${params.section}":
${params.currentText || '(Currently empty — generate strictly from the resume context above)'}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            improvedText: { type: Type.STRING },
            improvedBullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedConfirmations: { type: Type.ARRAY, items: { type: Type.STRING } },
            explanation: { type: Type.STRING },
          },
          required: [
            'improvedText',
            'improvedBullets',
            'suggestedKeywords',
            'suggestedConfirmations',
            'explanation',
          ],
        },
      },
    })
  );

  return safeJsonParse<{
    improvedText: string;
    improvedBullets: string[];
    suggestedKeywords: string[];
    suggestedConfirmations: string[];
    explanation: string;
  }>(response.text, 'improving resume section');
}

export async function analyzeResumeWithGemini(params: {
  resumeContent: ResumeContent;
  jobDescription?: string;
}) {
  const ai = getAiClient();
  const hasJd = Boolean(params.jobDescription && params.jobDescription.trim().length > 10);

  const prompt = `Analyze this candidate's resume thoroughly for ATS compatibility, structure, skills depth, experience clarity, project impact, and keyword alignment.
${hasJd ? `\nAlso compare the resume against this specific Target Job Description:\n${params.jobDescription}\n` : ''}
NEVER invent skills or metrics the candidate did not include. Be honest, actionable, and specific.

RESUME DATA:
${JSON.stringify(params.resumeContent)}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                atsScore: { type: Type.NUMBER },
                structureScore: { type: Type.NUMBER },
                skillsScore: { type: Type.NUMBER },
                experienceScore: { type: Type.NUMBER },
                projectScore: { type: Type.NUMBER },
                keywordMatchScore: { type: Type.NUMBER },
              },
              required: [
                'atsScore',
                'structureScore',
                'skillsScore',
                'experienceScore',
                'projectScore',
                'keywordMatchScore',
              ],
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            formattingIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            jobMatch: {
              type: Type.OBJECT,
              properties: {
                jobTitle: { type: Type.STRING },
                matchPercentage: { type: Type.NUMBER },
                matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                relevantKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
                optimizedSummary: { type: Type.STRING },
                suggestedKeywordAdditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
          required: [
            'scores',
            'strengths',
            'weaknesses',
            'missingInfo',
            'missingKeywords',
            'formattingIssues',
            'suggestions',
            'recommendedSkills',
          ],
        },
      },
    })
  );

  return safeJsonParse<Record<string, unknown>>(response.text, 'analyzing resume');
}

export async function startInterviewWithGemini(params: {
  config: InterviewConfig;
  resumeContent?: ResumeContent | null;
}) {
  const ai = getAiClient();

  const prompt = `Begin a realistic mock interview in ${params.config.language}.
Interview Setup:
- Target Job Role: ${params.config.jobRole}
- Company Name: ${params.config.companyName || 'Not specified'}
- Candidate Experience Level: ${params.config.experienceLevel}
- Interview Type: ${params.config.interviewType}
- Starting Difficulty: ${params.config.difficulty}
- Planned Questions: ${params.config.totalQuestions}

Candidate Resume:
${params.resumeContent ? JSON.stringify(params.resumeContent) : 'No resume provided — base questions on the target role and experience level.'}

Generate the opening greeting and FIRST single interview question.
Keep it warm, concise, and tailored to the candidate's resume (if provided) and target role. Ask ONLY ONE question.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            question: { type: Type.STRING },
            category: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            is_follow_up: { type: Type.BOOLEAN },
            interview_complete: { type: Type.BOOLEAN },
          },
          required: ['action', 'question', 'category', 'difficulty', 'is_follow_up', 'interview_complete'],
        },
      },
    })
  );

  return safeJsonParse<{
    action: string;
    question: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    is_follow_up: boolean;
    interview_complete: boolean;
  }>(response.text, 'starting interview');
}

export async function respondInterviewWithGemini(params: {
  config: InterviewConfig;
  resumeContent?: ResumeContent | null;
  history: InterviewTurn[];
  currentQuestion: string;
  currentCategory: string;
  userAnswer: string;
  skipped: boolean;
  questionIndex: number;
  endEarly?: boolean;
}) {
  const ai = getAiClient();
  const isFinalQuestion = params.endEarly || params.questionIndex >= params.config.totalQuestions;

  const transcript = params.history
    .map(
      (t, i) =>
        `Q${i + 1} [${t.category} | ${t.difficulty}]: ${t.question}\nCandidate Answer: ${
          t.skipped ? '[Skipped]' : t.userAnswer
        }`
    )
    .join('\n\n');

  const prompt = `Continue this mock interview in ${params.config.language}.
Interview Setup:
- Target Job Role: ${params.config.jobRole}
- Company Name: ${params.config.companyName || 'Not specified'}
- Experience Level: ${params.config.experienceLevel}
- Interview Type: ${params.config.interviewType}
- Current Difficulty: ${params.config.difficulty}
- Question ${params.questionIndex} of ${params.config.totalQuestions}

Candidate Resume:
${params.resumeContent ? JSON.stringify(params.resumeContent) : 'No resume provided.'}

Prior Interview Conversation:
${transcript || 'None yet.'}

CURRENT QUESTION JUST ASKED [${params.currentCategory}]:
${params.currentQuestion}

CANDIDATE'S RESPONSE:
${params.skipped ? '[Candidate skipped this question]' : params.userAnswer}

TASKS:
1. Evaluate the candidate's response thoroughly (if skipped or "I don't know", score low fairly and provide supportive feedback + the ideal sample answer for the final report).
2. ${
    isFinalQuestion
      ? 'This was the final question. Set interview_complete = true, action = "complete_interview", and question = "".'
      : `Decide adaptively whether to:
   - Option A: Ask a probing follow-up based directly on their previous answer (if vague, incomplete, or worth exploring deeper)
   - Option B: Move to a new topic/skill relevant to ${params.config.jobRole} and ${params.config.interviewType}
   - Option C: Challenge deeper (if they answered strongly and difficulty is Intermediate/Advanced)
   - Option D: Ask a specific question grounded in their resume projects/experience
   Adjust difficulty up or down naturally based on performance. Do NOT repeat any previously asked question. Ask ONLY ONE question.`
  }`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            question: { type: Type.STRING },
            category: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            is_follow_up: { type: Type.BOOLEAN },
            interview_complete: { type: Type.BOOLEAN },
            answer_evaluation: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                accuracy: { type: Type.NUMBER },
                relevance: { type: Type.NUMBER },
                clarity: { type: Type.NUMBER },
                completeness: { type: Type.NUMBER },
                communication: { type: Type.NUMBER },
                problemSolving: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                feedback: { type: Type.STRING },
                whatWasGood: { type: Type.STRING },
                whatWasMissing: { type: Type.STRING },
                improvedSampleAnswer: { type: Type.STRING },
                studyTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'score',
                'accuracy',
                'relevance',
                'clarity',
                'completeness',
                'communication',
                'problemSolving',
                'confidence',
                'feedback',
                'whatWasGood',
                'whatWasMissing',
                'improvedSampleAnswer',
                'studyTopics',
              ],
            },
          },
          required: [
            'action',
            'question',
            'category',
            'difficulty',
            'is_follow_up',
            'interview_complete',
            'answer_evaluation',
          ],
        },
      },
    })
  );

  return safeJsonParse<{
    action: string;
    question: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    is_follow_up: boolean;
    interview_complete: boolean;
    answer_evaluation: {
      score: number;
      accuracy: number;
      relevance: number;
      clarity: number;
      completeness: number;
      communication: number;
      problemSolving: number;
      confidence: number;
      feedback: string;
      whatWasGood: string;
      whatWasMissing: string;
      improvedSampleAnswer: string;
      studyTopics: string[];
    };
  }>(response.text, 'evaluating answer and generating next question');
}

export async function generateInterviewReportWithGemini(params: {
  config: InterviewConfig;
  resumeContent?: ResumeContent | null;
  turns: InterviewTurn[];
}) {
  const ai = getAiClient();

  const prompt = `Generate a comprehensive, honest, structured final interview evaluation report for this candidate.

Interview Setup:
${JSON.stringify(params.config)}

Candidate Resume Summary:
${params.resumeContent ? JSON.stringify({
  headline: params.resumeContent.personalInfo?.headline,
  skills: params.resumeContent.technicalSkills,
  projects: params.resumeContent.projects?.map((p) => p.name),
}) : 'None'}

Completed Turns & Per-Question Evaluations:
${JSON.stringify(params.turns)}

Generate:
- overallScore (0-100, weighted realistically by their answers and skipped questions)
- performanceLevel ("Needs Improvement" | "Developing" | "Competent" | "Strong" | "Interview-Ready")
- completionPercentage (0-100)
- categoryScores (7 metrics 0-100)
- strengths, weaknesses, struggledQuestions, skillsToImprove, communicationIssues, missingConcepts, recommendations
- improvementPlan: a concrete 5-day personalized plan (Day 1 through Day 5) referencing the exact weak areas from this interview.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            performanceLevel: { type: Type.STRING },
            completionPercentage: { type: Type.NUMBER },
            categoryScores: {
              type: Type.OBJECT,
              properties: {
                technicalKnowledge: { type: Type.NUMBER },
                communication: { type: Type.NUMBER },
                problemSolving: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                answerRelevance: { type: Type.NUMBER },
                resumeKnowledge: { type: Type.NUMBER },
                behavioralResponses: { type: Type.NUMBER },
              },
              required: [
                'technicalKnowledge',
                'communication',
                'problemSolving',
                'confidence',
                'answerRelevance',
                'resumeKnowledge',
                'behavioralResponses',
              ],
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            struggledQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillsToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
            communicationIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['day', 'focus', 'tasks'],
              },
            },
          },
          required: [
            'overallScore',
            'performanceLevel',
            'completionPercentage',
            'categoryScores',
            'strengths',
            'weaknesses',
            'struggledQuestions',
            'skillsToImprove',
            'communicationIssues',
            'missingConcepts',
            'recommendations',
            'improvementPlan',
          ],
        },
      },
    })
  );

  return safeJsonParse<Record<string, unknown>>(response.text, 'generating interview report');
}

export async function generateJobPrepWithGemini(params: {
  jobTitle: string;
  companyName?: string;
  jobDescription: string;
  resumeContent?: ResumeContent | null;
}) {
  const ai = getAiClient();

  const prompt = `Build a complete, role-specific job preparation package.
Target Job Title: ${params.jobTitle}
Company: ${params.companyName || 'Not specified'}
Job Description:
${params.jobDescription}

Candidate Resume (if available):
${params.resumeContent ? JSON.stringify(params.resumeContent) : 'No resume selected.'}

Provide:
- requiredSkills
- interviewTopics
- technicalQuestions (5 targeted technical/role questions with focusArea & tip)
- hrQuestions (4 behavioral/HR questions with focusArea & tip)
- studyPlan (5-day structured preparation roadmap)
- resumeKeywords (high-value ATS terms from the job description)
- skillsGap (matchingSkills, missingSkills, priorityActions)`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            interviewTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            technicalQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  focusArea: { type: Type.STRING },
                  tip: { type: Type.STRING },
                },
                required: ['question', 'focusArea', 'tip'],
              },
            },
            hrQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  focusArea: { type: Type.STRING },
                  tip: { type: Type.STRING },
                },
                required: ['question', 'focusArea', 'tip'],
              },
            },
            studyPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['day', 'focus', 'tasks'],
              },
            },
            resumeKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            skillsGap: {
              type: Type.OBJECT,
              properties: {
                matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                priorityActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['matchingSkills', 'missingSkills', 'priorityActions'],
            },
          },
          required: [
            'requiredSkills',
            'interviewTopics',
            'technicalQuestions',
            'hrQuestions',
            'studyPlan',
            'resumeKeywords',
            'skillsGap',
          ],
        },
      },
    })
  );

  return safeJsonParse<Record<string, unknown>>(response.text, 'generating job preparation guide');
}

export async function assistantChatWithGemini(params: {
  message: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  userContext?: unknown;
}) {
  const ai = getAiClient();

  const conversationStr = params.history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'Candidate' : 'CareerPilot Coach'}: ${m.text}`)
    .join('\n');

  const systemInstruction = `You are CareerPilot AI Coach, a concise, practical career and interview mentor.
Help with resume improvements, project explanations, STAR behavioral answers, technical interview preparation, and learning plans.
NEVER invent fake experience, skills, or numbers on the candidate's behalf.
Keep responses clear, structured with short bullet points, and directly actionable.`;

  const prompt = `${params.userContext ? `Candidate Context (shared with permission):\n${JSON.stringify(params.userContext)}\n\n` : ''}${
    conversationStr ? `Recent Conversation:\n${conversationStr}\n\n` : ''
  }Candidate Question: ${params.message}`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })
  );

  return { reply: response.text ?? 'I could not generate a response. Please try again.' };
}
