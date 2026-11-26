import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import mammoth from 'mammoth';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, type AuthRequest } from './src/server/auth.ts';
import {
  analyzeResumeWithGemini,
  assistantChatWithGemini,
  generateInterviewReportWithGemini,
  generateJobPrepWithGemini,
  improveResumeSectionWithGemini,
  parseResumeWithGemini,
  respondInterviewWithGemini,
  startInterviewWithGemini,
} from './src/server/gemini.ts';

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a few minutes and try again.' },
});

app.use('/api', apiLimiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (ext === '.pdf' || ext === '.docx' || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload a PDF or DOCX resume.'));
    }
  },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/resume/parse', requireAuth, (req: AuthRequest, res) => {
  upload.single('resume')(req, res, async (uploadErr) => {
    if (uploadErr) {
      res.status(400).json({ error: uploadErr.message || 'Invalid resume file upload.' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please attach a PDF or DOCX resume file.' });
      return;
    }

    try {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.pdf' || file.mimetype === 'application/pdf') {
        const pdfBase64 = file.buffer.toString('base64');
        const parsed = await parseResumeWithGemini({
          pdfBase64,
          fileName: file.originalname,
        });
        res.json(parsed);
        return;
      }

      // DOCX extraction
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      const extractedText = (result.value || '').trim();
      if (!extractedText) {
        res.status(400).json({
          error: 'Could not extract readable text from this DOCX file. Please verify the file is not empty.',
        });
        return;
      }

      const parsed = await parseResumeWithGemini({
        extractedText,
        fileName: file.originalname,
      });
      res.json(parsed);
    } catch (error: unknown) {
      console.error('Resume parse error:', error);
      const message = error instanceof Error ? error.message : 'Failed to parse resume.';
      res.status(500).json({ error: message });
    }
  });
});

app.post('/api/resume/improve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { mode, section, currentText, resumeContext, targetRole } = req.body ?? {};
    if (!mode || !section || !resumeContext) {
      res.status(400).json({ error: 'Missing required fields for resume improvement.' });
      return;
    }
    const result = await improveResumeSectionWithGemini({
      mode,
      section,
      currentText: typeof currentText === 'string' ? currentText : '',
      resumeContext,
      targetRole: typeof targetRole === 'string' ? targetRole : undefined,
    });
    res.json(result);
  } catch (error: unknown) {
    console.error('Resume improve error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to improve resume section.',
    });
  }
});

app.post('/api/resume/analyze', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { resumeContent, jobDescription } = req.body ?? {};
    if (!resumeContent) {
      res.status(400).json({ error: 'Resume content is required for analysis.' });
      return;
    }
    const result = await analyzeResumeWithGemini({
      resumeContent,
      jobDescription: typeof jobDescription === 'string' ? jobDescription : undefined,
    });
    res.json(result);
  } catch (error: unknown) {
    console.error('Resume analyze error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to analyze resume.',
    });
  }
});

app.post('/api/interview/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { config, resumeContent } = req.body ?? {};
    if (!config || !config.jobRole) {
      res.status(400).json({ error: 'Target job role and interview configuration are required.' });
      return;
    }
    const result = await startInterviewWithGemini({ config, resumeContent });
    res.json(result);
  } catch (error: unknown) {
    console.error('Interview start error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start AI interview.',
    });
  }
});

app.post('/api/interview/respond', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      config,
      resumeContent,
      history,
      currentQuestion,
      currentCategory,
      userAnswer,
      skipped,
      questionIndex,
      endEarly,
    } = req.body ?? {};

    if (!config || !currentQuestion) {
      res.status(400).json({ error: 'Missing interview context or current question.' });
      return;
    }

    const result = await respondInterviewWithGemini({
      config,
      resumeContent,
      history: Array.isArray(history) ? history : [],
      currentQuestion,
      currentCategory: currentCategory || config.interviewType || 'General',
      userAnswer: typeof userAnswer === 'string' ? userAnswer : '',
      skipped: Boolean(skipped),
      questionIndex: Number(questionIndex) || 1,
      endEarly: Boolean(endEarly),
    });
    res.json(result);
  } catch (error: unknown) {
    console.error('Interview respond error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to evaluate answer.',
    });
  }
});

app.post('/api/interview/report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { config, resumeContent, turns } = req.body ?? {};
    if (!config || !Array.isArray(turns)) {
      res.status(400).json({ error: 'Interview configuration and completed turns are required.' });
      return;
    }
    const result = await generateInterviewReportWithGemini({ config, resumeContent, turns });
    res.json(result);
  } catch (error: unknown) {
    console.error('Interview report error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate interview report.',
    });
  }
});

app.post('/api/job-prep/generate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { jobTitle, companyName, jobDescription, resumeContent } = req.body ?? {};
    if (!jobTitle || !jobDescription) {
      res.status(400).json({ error: 'Target job title and job description are required.' });
      return;
    }
    const result = await generateJobPrepWithGemini({
      jobTitle,
      companyName,
      jobDescription,
      resumeContent,
    });
    res.json(result);
  } catch (error: unknown) {
    console.error('Job prep error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate job preparation plan.',
    });
  }
});

app.post('/api/assistant/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { message, history, userContext } = req.body ?? {};
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }
    const result = await assistantChatWithGemini({
      message,
      history: Array.isArray(history) ? history : [],
      userContext,
    });
    res.json(result);
  } catch (error: unknown) {
    console.error('Assistant chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to respond to chat message.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CareerPilot AI server listening on port ${PORT}`);
  });
}

void startServer();
