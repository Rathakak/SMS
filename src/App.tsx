import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  BrainCircuit,
  FileText,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Award,
  Search,
  Layers,
  Check,
  X,
  Eye,
  RefreshCw,
  Calculator,
  Languages,
  Gamepad2,
} from 'lucide-react';
import {
  GRADE5_CURRICULUM,
  LessonData,
  SubjectId,
  QuizQuestion,
  FlashcardItem,
  LessonStep,
  LessonExample,
  MATH_PDF_PATH,
  KHMER_PDF_PATH,
} from './data/curriculum';
import QuizGameArena from './components/QuizGameArena';

type ActiveTab = 'planner' | 'lessons' | 'quiz' | 'game';

interface StudyTask {
  id: string;
  title: string;
  subject: SubjectId;
  lessonId: string;
  scheduledTime: string;
  durationMinutes: number;
  completed: boolean;
  taskType: 'summary' | 'quiz' | 'textbook';
}

interface CustomAISummary {
  coreSummary: string;
  keyPoints: string[];
  stepByStepExplanation: LessonStep[];
  examples: LessonExample[];
  memoryTip: string;
}

const DEFAULT_DAILY_TASKS: StudyTask[] = [
  {
    id: 'task-1',
    title: 'អានសង្ខេបមេរៀនទី ១៖ ចំនួនធំជាង ១ ០០០ ០០០ និងមធ្យមនព្វន្ត',
    subject: 'math',
    lessonId: 'math-1',
    scheduledTime: '07:30 ព្រឹក',
    durationMinutes: 35,
    completed: true,
    taskType: 'summary',
  },
  {
    id: 'task-2',
    title: 'រំលឹកសំណួរ-ចម្លើយស្វ័យប្រវត្តិ៖ វីរជនឆ្នើម និងគុណនាម',
    subject: 'khmer',
    lessonId: 'khmer-1',
    scheduledTime: '09:00 ព្រឹក',
    durationMinutes: 25,
    completed: false,
    taskType: 'quiz',
  },
  {
    id: 'task-3',
    title: 'សិក្សារូបមន្ត និងលំហាត់គំរូ៖ ផលធៀប និងភាគរយ (%)',
    subject: 'math',
    lessonId: 'math-5',
    scheduledTime: '02:00 រសៀល',
    durationMinutes: 40,
    completed: false,
    taskType: 'summary',
  },
  {
    id: 'task-4',
    title: 'អានសង្ខេប និងធ្វើតេស្តរំលឹក៖ កំណាព្យខ្មែរ (បទកាកគតិ និងបទពាក្យ ៧)',
    subject: 'khmer',
    lessonId: 'khmer-3',
    scheduledTime: '04:00 រសៀល',
    durationMinutes: 30,
    completed: false,
    taskType: 'quiz',
  },
  {
    id: 'task-5',
    title: 'រំលឹករូបមន្តធរណីមាត្រ៖ មុំ ត្រីកោណ និងបរិមាត្ររង្វង់',
    subject: 'math',
    lessonId: 'math-17',
    scheduledTime: '07:00 យប់',
    durationMinutes: 30,
    completed: false,
    taskType: 'quiz',
  },
];

const KHMER_OPTIONS_LABELS = ['ក', 'ខ', 'គ', 'ឃ'];

export default function App() {
  // Navigation & Primary State
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>('math');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('math-1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showPdfDrawer, setShowPdfDrawer] = useState<boolean>(false);

  // Persistent Student Progress State
  const [tasks, setTasks] = useState<StudyTask[]>(() => {
    try {
      const saved = localStorage.getItem('g5_daily_tasks');
      return saved ? JSON.parse(saved) : DEFAULT_DAILY_TASKS;
    } catch {
      return DEFAULT_DAILY_TASKS;
    }
  });

  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('g5_completed_lessons');
      return saved ? JSON.parse(saved) : ['math-1', 'khmer-1'];
    } catch {
      return ['math-1', 'khmer-1'];
    }
  });

  const [quizScores, setQuizScores] = useState<Record<string, { score: number; total: number }>>(() => {
    try {
      const saved = localStorage.getItem('g5_quiz_scores');
      return saved ? JSON.parse(saved) : { 'math-1': { score: 3, total: 3 } };
    } catch {
      return { 'math-1': { score: 3, total: 3 } };
    }
  });

  const [studiedMinutesToday, setStudiedMinutesToday] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('g5_studied_minutes');
      return saved ? Number(saved) : 45;
    } catch {
      return 45;
    }
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('g5_daily_tasks', JSON.stringify(tasks));
    } catch {
      // ignore storage errors
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('g5_completed_lessons', JSON.stringify(completedLessons));
    } catch {
      // ignore
    }
  }, [completedLessons]);

  useEffect(() => {
    try {
      localStorage.setItem('g5_quiz_scores', JSON.stringify(quizScores));
    } catch {
      // ignore
    }
  }, [quizScores]);

  useEffect(() => {
    try {
      localStorage.setItem('g5_studied_minutes', String(studiedMinutesToday));
    } catch {
      // ignore
    }
  }, [studiedMinutesToday]);

  // Add Task Modal / Form State
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [newTaskSubject, setNewTaskSubject] = useState<SubjectId>('math');
  const [newTaskLessonId, setNewTaskLessonId] = useState<string>('math-2');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskTime, setNewTaskTime] = useState<string>('08:00 ព្រឹក');
  const [newTaskDuration, setNewTaskDuration] = useState<number>(30);
  const [newTaskType, setNewTaskType] = useState<'summary' | 'quiz' | 'textbook'>('summary');
  const [taskFilter, setTaskFilter] = useState<'all' | 'math' | 'khmer' | 'pending'>('all');

  // Focus Study Timer State
  const [timerPresetMinutes, setTimerPresetMinutes] = useState<number>(25);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(25 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          setStudiedMinutesToday((m) => m + timerPresetMinutes);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerPresetMinutes]);

  const handleSelectTimerPreset = (mins: number) => {
    setTimerRunning(false);
    setTimerPresetMinutes(mins);
    setTimerSecondsLeft(mins * 60);
  };

  // AI Custom Summarizer State
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [explainFocusMode, setExplainFocusMode] = useState<'detailed' | 'simple' | 'exam'>('detailed');
  const [aiSummarizing, setAiSummarizing] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummariesByLesson, setAiSummariesByLesson] = useState<Record<string, CustomAISummary>>({});

  // Quiz & Flashcard State
  const [quizViewMode, setQuizViewMode] = useState<'mcq' | 'flashcards' | 'sheet'>('mcq');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState<number>(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState<boolean>(false);
  const [showFlashcardHint, setShowFlashcardHint] = useState<boolean>(false);

  // AI Quiz Generator State
  const [customQuestionsByLesson, setCustomQuestionsByLesson] = useState<Record<string, QuizQuestion[]>>({});
  const [customFlashcardsByLesson, setCustomFlashcardsByLesson] = useState<Record<string, FlashcardItem[]>>({});
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizCount, setQuizCount] = useState<number>(5);
  const [customQuizFocusNote, setCustomQuizFocusNote] = useState<string>('');
  const [generatingQuiz, setGeneratingQuiz] = useState<boolean>(false);
  const [quizGenError, setQuizGenError] = useState<string | null>(null);

  // Current Lesson Derived Data
  const currentLesson: LessonData = useMemo(() => {
    return (
      GRADE5_CURRICULUM.find((l) => l.id === selectedLessonId) ||
      GRADE5_CURRICULUM[0]
    );
  }, [selectedLessonId]);

  const filteredLessons = useMemo(() => {
    return GRADE5_CURRICULUM.filter((lesson) => {
      const matchesSubject = lesson.subject === selectedSubject;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesSubject;
      return (
        matchesSubject &&
        (lesson.title.toLowerCase().includes(q) ||
          lesson.subtitle.toLowerCase().includes(q) ||
          lesson.coreSummary.toLowerCase().includes(q) ||
          String(lesson.lessonNumber).includes(q))
      );
    });
  }, [selectedSubject, searchQuery]);

  // Active Questions & Flashcards for Current Lesson (Pre-built + AI generated)
  const activeQuestions: QuizQuestion[] = useMemo(() => {
    const custom = customQuestionsByLesson[currentLesson.id] || [];
    return [...custom, ...currentLesson.questions];
  }, [currentLesson, customQuestionsByLesson]);

  const activeFlashcards: FlashcardItem[] = useMemo(() => {
    const custom = customFlashcardsByLesson[currentLesson.id] || [];
    return [...custom, ...currentLesson.flashcards];
  }, [currentLesson, customFlashcardsByLesson]);

  // Reset question/flashcard index when lesson changes
  useEffect(() => {
    setCurrentQuestionIdx(0);
    setCurrentFlashcardIdx(0);
    setIsFlashcardFlipped(false);
    setShowFlashcardHint(false);
  }, [selectedLessonId]);

  // Helper: Select Lesson and Switch Tab
  const openLessonInTab = (lessonId: string, tab: ActiveTab) => {
    const found = GRADE5_CURRICULUM.find((l) => l.id === lessonId);
    if (found) {
      setSelectedSubject(found.subject);
      setSelectedLessonId(found.id);
    }
    setActiveTab(tab);
  };

  // Toggle task completion
  const toggleTaskCompleted = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextState = !t.completed;
          if (nextState) {
            setStudiedMinutesToday((m) => m + t.durationMinutes);
          }
          return { ...t, completed: nextState };
        }
        return t;
      })
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleAddDailyTask = (e: React.FormEvent) => {
    e.preventDefault();
    const lessonObj = GRADE5_CURRICULUM.find((l) => l.id === newTaskLessonId) || GRADE5_CURRICULUM[0];
    const defaultTitle =
      newTaskType === 'summary'
        ? `សិក្សាសង្ខេបមេរៀនទី ${lessonObj.lessonNumber}៖ ${lessonObj.title}`
        : newTaskType === 'quiz'
        ? `រំលឹកសំណួរ-ចម្លើយមេរៀនទី ${lessonObj.lessonNumber}៖ ${lessonObj.title}`
        : `អានសៀវភៅពុម្ពទំព័រទី ${lessonObj.pageStart}៖ ${lessonObj.title}`;

    const created: StudyTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim() || defaultTitle,
      subject: newTaskSubject,
      lessonId: lessonObj.id,
      scheduledTime: newTaskTime,
      durationMinutes: Number(newTaskDuration) || 30,
      completed: false,
      taskType: newTaskType,
    };

    setTasks((prev) => [created, ...prev]);
    setNewTaskTitle('');
    setShowAddTaskModal(false);
  };

  // Toggle lesson completion
  const toggleLessonMastered = (lessonId: string) => {
    setCompletedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  };

  // Call Server-Side Gemini API for Lesson Explanation / Summary
  const handleGenerateAISummary = async () => {
    setAiSummarizing(true);
    setAiSummaryError(null);
    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentLesson.subject,
          lessonTitle: `មេរៀនទី ${currentLesson.lessonNumber}៖ ${currentLesson.title} (${currentLesson.subtitle})`,
          contentOrTopic:
            customTopicInput.trim() ||
            `${currentLesson.coreSummary} ចំណុចសំខាន់ៗ៖ ${currentLesson.keyPoints.join(' | ')}`,
          focusMode: explainFocusMode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'មានបញ្ហាក្នុងការភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ។');
      }

      const data: CustomAISummary = await response.json();
      setAiSummariesByLesson((prev) => ({
        ...prev,
        [currentLesson.id]: data,
      }));
    } catch (err: unknown) {
      setAiSummaryError(
        err instanceof Error ? err.message : 'មិនអាចបង្កើតការពន្យល់សង្ខេបបានទេ។ សូមព្យាយាមម្ដងទៀត។'
      );
    } finally {
      setAiSummarizing(false);
    }
  };

  // Call Server-Side Gemini API for Auto Review Q&A & Flashcards
  const handleGenerateAutoQuiz = async () => {
    setGeneratingQuiz(true);
    setQuizGenError(null);
    try {
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: currentLesson.subject,
          lessonTitle: `មេរៀនទី ${currentLesson.lessonNumber}៖ ${currentLesson.title}`,
          lessonSummary:
            customQuizFocusNote.trim() ||
            `${currentLesson.coreSummary}\nចំណុចគន្លឹះ៖ ${currentLesson.keyPoints.join('\n')}`,
          difficulty: quizDifficulty,
          count: quizCount,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'មិនអាចបង្កើតសំណួររំលឹកបានទេ។');
      }

      const data = await response.json();
      const timestamp = Date.now();

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const formattedQuestions: QuizQuestion[] = data.questions.map(
          (q: { question: string; options: string[]; correctIndex: number; explanation: string }, idx: number) => ({
            id: `ai-q-${timestamp}-${idx}`,
            question: q.question,
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['ចម្លើយ ក', 'ចម្លើយ ខ', 'ចម្លើយ គ', 'ចម្លើយ ឃ'],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: q.explanation || '',
          })
        );
        setCustomQuestionsByLesson((prev) => ({
          ...prev,
          [currentLesson.id]: [...formattedQuestions, ...(prev[currentLesson.id] || [])],
        }));
        setCurrentQuestionIdx(0);
      }

      if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
        const formattedCards: FlashcardItem[] = data.flashcards.map(
          (f: { front: string; back: string; hint: string }, idx: number) => ({
            id: `ai-f-${timestamp}-${idx}`,
            front: f.front,
            back: f.back,
            hint: f.hint || 'គិតពីវិធានសំខាន់ក្នុងមេរៀន',
          })
        );
        setCustomFlashcardsByLesson((prev) => ({
          ...prev,
          [currentLesson.id]: [...formattedCards, ...(prev[currentLesson.id] || [])],
        }));
        setCurrentFlashcardIdx(0);
      }
    } catch (err: unknown) {
      setQuizGenError(
        err instanceof Error ? err.message : 'មិនអាចបង្កើតសំណួររំលឹកដោយស្វ័យប្រវត្តិបានទេ។'
      );
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Handle selecting an answer in MCQ mode
  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (selectedAnswers[questionId] !== undefined) return; // already answered
    const updated = { ...selectedAnswers, [questionId]: optionIdx };
    setSelectedAnswers(updated);

    // Update lesson quiz score tally
    const answeredForLesson = activeQuestions.filter((q) => updated[q.id] !== undefined);
    const correctCount = answeredForLesson.filter((q) => updated[q.id] === q.correctIndex).length;
    setQuizScores((prev) => ({
      ...prev,
      [currentLesson.id]: {
        score: correctCount,
        total: activeQuestions.length,
      },
    }));
  };

  const handleResetLessonQuiz = () => {
    const nextAnswers = { ...selectedAnswers };
    activeQuestions.forEach((q) => {
      delete nextAnswers[q.id];
    });
    setSelectedAnswers(nextAnswers);
    setCurrentQuestionIdx(0);
  };

  // KPI Metrics Calculations
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalMathLessons = GRADE5_CURRICULUM.filter((l) => l.subject === 'math').length;
  const completedMathLessons = completedLessons.filter((id) => id.startsWith('math-')).length;
  const totalKhmerLessons = GRADE5_CURRICULUM.filter((l) => l.subject === 'khmer').length;
  const completedKhmerLessons = completedLessons.filter((id) => id.startsWith('khmer-')).length;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilter === 'math') return t.subject === 'math';
      if (taskFilter === 'khmer') return t.subject === 'khmer';
      if (taskFilter === 'pending') return !t.completed;
      return true;
    });
  }, [tasks, taskFilter]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQuestion = activeQuestions[currentQuestionIdx] || activeQuestions[0];
  const currentFlashcard = activeFlashcards[currentFlashcardIdx] || activeFlashcards[0];
  const activeAiSummary = aiSummariesByLesson[currentLesson.id];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* =================================================================
          TOP BAR CONTRACT: 3 Distinct Zones (Brand | 3-View Nav | Action)
      ================================================================= */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="text-base font-bold tracking-tight text-slate-900 truncate">
              ស្វ័យសិក្សា ថ្នាក់ទី៥
            </div>
            <div className="text-xs text-slate-500 truncate">
              គណិតវិទ្យា (១៨ មេរៀន) · ភាសាខ្មែរ (១០ មេរៀន)
            </div>
          </div>
        </div>

        {/* Zone 2: Primary View Switcher */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-white text-[#0284C7] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>ផែនការរៀនប្រចាំថ្ងៃ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'lessons'
                ? 'bg-white text-[#0284C7] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>ពន្យល់សង្ខេបមេរៀន</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-white text-[#0284C7] shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-4 h-4 shrink-0" />
            <span>សំណួរ-ចម្លើយរំលឹក</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'game'
                ? 'bg-slate-900 text-amber-400 shadow-xs font-semibold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Gamepad2 className="w-4 h-4 shrink-0" />
            <span>ហ្គេមល្បងប្រាជ្ញា</span>
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('planner');
              setShowAddTaskModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">បន្ថែមផែនការរៀន</span>
          </button>
        </div>
      </header>

      {/* =================================================================
          MAIN WORKSPACE CONTAINER
      ================================================================= */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 lg:px-8 py-6">
        {/* ===============================================================
            VIEW 1: DAILY STUDY PLANNER & PROGRESS MANAGER
        =============================================================== */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            {/* Top KPI Summary Row (3 Cards Max in Row, Clean Academic Hierarchy) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    កិច្ចការរៀនប្រចាំថ្ងៃនេះ
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono-num">
                      {completedTasksCount} / {tasks.length}
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      ✓ សម្រេចបាន{' '}
                      {tasks.length > 0
                        ? Math.round((completedTasksCount / tasks.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    ពេលវេលារៀនសរុបថ្ងៃនេះ៖{' '}
                    <span className="font-semibold text-slate-700 font-mono-num">
                      {studiedMinutesToday} នាទី
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    មេរៀនសិក្សាចប់សរុប (ថ្នាក់ទី៥)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono-num">
                      {completedLessons.length} / {GRADE5_CURRICULUM.length}
                    </span>
                    <span className="text-xs text-[#0284C7] font-medium">
                      មេរៀនទាំងអស់
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    គណិតវិទ្យា {completedMathLessons}/{totalMathLessons} · ភាសាខ្មែរ{' '}
                    {completedKhmerLessons}/{totalKhmerLessons}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    ឃ្លាំងមេរៀនសង្ខេប និងសំណួររំលឹក
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900 font-mono-num">
                      28 មេរៀន
                    </span>
                    <span className="text-xs text-amber-700 font-medium">
                      + AI បង្កើតស្វ័យប្រវត្តិ
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    ភ្ជាប់ជាមួយសៀវភៅពុម្ពផ្លូវការក្រសួងអប់រំ យុវជន និងកីឡា
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <BrainCircuit className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Two-Column Balanced Workspace (65% Schedule Checklist | 35% Timer & Curriculum Mastery) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 cols): Daily Study Schedule & Task Checklist */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      កាលវិភាគ និងកិច្ចការរៀនប្រចាំថ្ងៃ
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ចុចធីកពេលរៀនចប់ ឬចុចប៊ូតុងខាងស្ដាំដើម្បីបើកការពន្យល់សង្ខេបមេរៀន និងសំណួររំលឹកភ្លាមៗ
                    </p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                    {[
                      { id: 'all', label: 'ទាំងអស់' },
                      { id: 'pending', label: 'មិនទាន់រួច' },
                      { id: 'math', label: 'គណិតវិទ្យា' },
                      { id: 'khmer', label: 'ភាសាខ្មែរ' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTaskFilter(f.id as typeof taskFilter)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                          taskFilter === f.id
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add New Task Inline Drawer when showAddTaskModal is true */}
                {showAddTaskModal && (
                  <form
                    onSubmit={handleAddDailyTask}
                    className="p-5 bg-slate-50 border-b border-slate-200 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        បង្កើតផែនការរៀនថ្មីសម្រាប់ថ្ងៃនេះ
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddTaskModal(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        បិទ ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          មុខវិជ្ជា
                        </label>
                        <select
                          value={newTaskSubject}
                          onChange={(e) => {
                            const subj = e.target.value as SubjectId;
                            setNewTaskSubject(subj);
                            const firstLesson = GRADE5_CURRICULUM.find(
                              (l) => l.subject === subj
                            );
                            if (firstLesson) setNewTaskLessonId(firstLesson.id);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0284C7]"
                        >
                          <option value="math">គណិតវិទ្យា ថ្នាក់ទី៥</option>
                          <option value="khmer">ភាសាខ្មែរ ថ្នាក់ទី៥</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ជ្រើសរើសមេរៀនពីសៀវភៅពុម្ព
                        </label>
                        <select
                          value={newTaskLessonId}
                          onChange={(e) => setNewTaskLessonId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0284C7]"
                        >
                          {GRADE5_CURRICULUM.filter(
                            (l) => l.subject === newTaskSubject
                          ).map((l) => (
                            <option key={l.id} value={l.id}>
                              មេរៀនទី {l.lessonNumber}៖ {l.title} (ទំព័រ {l.pageStart})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ប្រភេទសកម្មភាពរៀន
                        </label>
                        <select
                          value={newTaskType}
                          onChange={(e) =>
                            setNewTaskType(
                              e.target.value as 'summary' | 'quiz' | 'textbook'
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0284C7]"
                        >
                          <option value="summary">អានការពន្យល់សង្ខេបមេរៀន</option>
                          <option value="quiz">ធ្វើសំណួរ-ចម្លើយរំលឹកស្វ័យប្រវត្តិ</option>
                          <option value="textbook">អានសៀវភៅពុម្ព PDF</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          ម៉ោងសិក្សា
                        </label>
                        <input
                          type="text"
                          value={newTaskTime}
                          onChange={(e) => setNewTaskTime(e.target.value)}
                          placeholder="ឧ. 07:30 ព្រឹក"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0284C7]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          រយៈពេល (នាទី)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={120}
                          step={5}
                          value={newTaskDuration}
                          onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-mono-num focus:outline-none focus:border-[#0284C7]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ចំណាំបន្ថែម ឬចំណងជើងកិច្ចការ (ទុកទទេដើម្បីបង្កើតស្វ័យប្រវត្តិ)
                      </label>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="ឧ. ធ្វើលំហាត់គណនាមធ្យមនព្វន្តទំព័រទី ៤..."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#0284C7]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddTaskModal(false)}
                        className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
                      >
                        បោះបង់
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
                      >
                        រក្សាទុកផែនការរៀន
                      </button>
                    </div>
                  </form>
                )}

                {/* Task Rows */}
                <div className="divide-y divide-slate-200">
                  {filteredTasks.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm text-slate-500">
                        មិនមានកិច្ចការរៀនក្នុងបញ្ជីនេះទេ។ ចុចប៊ូតុង «បន្ថែមផែនការរៀន» ដើម្បីកំណត់មេរៀនប្រចាំថ្ងៃ។
                      </p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const linkedLesson = GRADE5_CURRICULUM.find(
                        (l) => l.id === task.lessonId
                      );
                      return (
                        <div
                          key={task.id}
                          className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            task.completed ? 'bg-slate-50/70' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleTaskCompleted(task.id)}
                              className="mt-0.5 text-slate-400 hover:text-[#0284C7] transition-colors cursor-pointer shrink-0"
                              title={
                                task.completed
                                  ? 'សម្គាល់ថាមិនទាន់រួច'
                                  : 'សម្គាល់ថារៀនរួចរាល់'
                              }
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div
                                className={`text-sm font-semibold leading-snug ${
                                  task.completed
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-900'
                                }`}
                              >
                                {task.title}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                <span
                                  className={`font-medium ${
                                    task.subject === 'math'
                                      ? 'text-[#0284C7]'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {task.subject === 'math'
                                    ? 'គណិតវិទ្យា'
                                    : 'ភាសាខ្មែរ'}
                                </span>
                                <span>·</span>
                                <span className="font-mono-num">
                                  {task.scheduledTime}
                                </span>
                                <span>·</span>
                                <span className="font-mono-num">
                                  {task.durationMinutes} នាទី
                                </span>
                                {linkedLesson && (
                                  <>
                                    <span>·</span>
                                    <span>ទំព័រទី {linkedLesson.pageStart}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Launch Actions for Task */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => openLessonInTab(task.lessonId, 'lessons')}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                            >
                              មើលសង្ខេប
                            </button>
                            <button
                              type="button"
                              onClick={() => openLessonInTab(task.lessonId, 'quiz')}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              សំណួររំលឹក
                            </button>
                            <button
                              type="button"
                              onClick={() => openLessonInTab(task.lessonId, 'game')}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Gamepad2 className="w-3.5 h-3.5" />
                              <span>លេងហ្គេម</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="លុបកិច្ចការ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column (4 cols): Study Timer & Official Textbooks Quick Access */}
              <div className="lg:col-span-4 space-y-6">
                {/* Focus Study Timer Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#0284C7]" />
                      <h3 className="text-sm font-bold text-slate-900">
                        នាឡិកាកំណត់ម៉ោងរៀនផ្ដោតអារម្មណ៍
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono-num">
                      {timerRunning ? '● កំពុងរាប់ម៉ោង' : 'រួចរាល់'}
                    </span>
                  </div>

                  {/* Preset Selector */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    {[
                      { mins: 25, label: '២៥ នាទី (រៀន)' },
                      { mins: 15, label: '១៥ នាទី (រំលឹក)' },
                      { mins: 5, label: '៥ នាទី (សម្រាក)' },
                    ].map((preset) => (
                      <button
                        key={preset.mins}
                        type="button"
                        onClick={() => handleSelectTimerPreset(preset.mins)}
                        className={`py-1.5 px-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                          timerPresetMinutes === preset.mins
                            ? 'border-[#0284C7] bg-sky-50 text-[#0284C7]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Timer Display */}
                  <div className="my-5 py-4 rounded-xl bg-slate-900 text-white text-center">
                    <div className="text-4xl font-bold tracking-wider font-mono-num">
                      {formatTimer(timerSecondsLeft)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      ពេលចប់ម៉ោង នឹងបូកបញ្ចូលក្នុងម៉ោងរៀនប្រចាំថ្ងៃដោយស្វ័យប្រវត្តិ
                    </div>
                  </div>

                  {/* Timer Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTimerRunning((r) => !r)}
                      className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        timerRunning
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                      }`}
                    >
                      {timerRunning ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>ផ្អាកម៉ោង</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>ចាប់ផ្ដើមរៀន</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTimerPreset(timerPresetMinutes)}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      title="កំណត់ឡើងវិញ"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subject Progress & Official Textbooks Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    វឌ្ឍនភាពមេរៀន និងសៀវភៅពុម្ពថ្នាក់ទី៥
                  </h3>

                  {/* Math Progress */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-[#0284C7]" />
                        គណិតវិទ្យា ថ្នាក់ទី៥
                      </span>
                      <span className="font-mono-num text-slate-600 font-medium">
                        {completedMathLessons} / {totalMathLessons} មេរៀន
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0284C7] transition-all"
                        style={{
                          width: `${Math.round(
                            (completedMathLessons / totalMathLessons) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubject('math');
                          setSelectedLessonId('math-1');
                          setActiveTab('lessons');
                        }}
                        className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
                      >
                        មើលមេរៀនទាំង ១៨ →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubject('math');
                          setSelectedLessonId('math-1');
                          setShowPdfDrawer(true);
                          setActiveTab('lessons');
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>បើកសៀវភៅ PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Khmer Progress */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Languages className="w-4 h-4 text-emerald-600" />
                        ភាសាខ្មែរ ថ្នាក់ទី៥
                      </span>
                      <span className="font-mono-num text-slate-600 font-medium">
                        {completedKhmerLessons} / {totalKhmerLessons} មេរៀន
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{
                          width: `${Math.round(
                            (completedKhmerLessons / totalKhmerLessons) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubject('khmer');
                          setSelectedLessonId('khmer-1');
                          setActiveTab('lessons');
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        មើលមេរៀនទាំង ១០ →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubject('khmer');
                          setSelectedLessonId('khmer-1');
                          setShowPdfDrawer(true);
                          setActiveTab('lessons');
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>បើកសៀវភៅ PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            VIEW 2: LESSON SUMMARIES, AI EXPLAINER & OFFICIAL TEXTBOOK PDF
        =============================================================== */}
        {activeTab === 'lessons' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar (4 cols): Curriculum Navigator */}
            <aside className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Subject Toggle */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('math');
                    setSelectedLessonId('math-1');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    selectedSubject === 'math'
                      ? 'bg-[#0284C7] text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>គណិតវិទ្យា (១៨)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('khmer');
                    setSelectedLessonId('khmer-1');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    selectedSubject === 'khmer'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Languages className="w-4 h-4" />
                  <span>ភាសាខ្មែរ (១០)</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="p-3 border-b border-slate-200">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ស្វែងរកចំណងជើង ឬខ្លឹមសារមេរៀន..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-[#0284C7]"
                  />
                </div>
              </div>

              {/* Lesson List */}
              <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100">
                {filteredLessons.map((lesson) => {
                  const isSelected = lesson.id === currentLesson.id;
                  const isDone = completedLessons.includes(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/90 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold font-mono-num shrink-0 ${
                          isSelected
                            ? 'bg-[#0284C7] text-white'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lesson.lessonNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">
                            {lesson.title}
                          </span>
                          {isDone && (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {lesson.subtitle}
                        </p>
                        <div className="text-[11px] text-slate-400 mt-1 font-mono-num">
                          ទំព័រទី {lesson.pageStart} · ~{lesson.estimatedMinutes} នាទី
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right Main Stage (8 cols): Structured Explanation + Embedded PDF + AI Summarizer */}
            <div className="lg:col-span-8 space-y-6">
              {/* Lesson Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-[#0284C7]">
                      {currentLesson.subject === 'math'
                        ? 'គណិតវិទ្យា ថ្នាក់ទី៥'
                        : 'ភាសាខ្មែរ ថ្នាក់ទី៥'}{' '}
                      · មេរៀនទី {currentLesson.lessonNumber} · សៀវភៅពុម្ពទំព័រទី{' '}
                      {currentLesson.pageStart}
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-1">
                      {currentLesson.title}
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                      {currentLesson.subtitle}
                    </p>
                  </div>

                  {/* Lesson Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPdfDrawer((prev) => !prev)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        showPdfDrawer
                          ? 'border-[#0284C7] bg-sky-50 text-[#0284C7]'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>
                        {showPdfDrawer
                          ? 'បិទសៀវភៅពុម្ព PDF'
                          : `បើកសៀវភៅពុម្ព (ទំព័រ ${currentLesson.pageStart})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleLessonMastered(currentLesson.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        completedLessons.includes(currentLesson.id)
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {completedLessons.includes(currentLesson.id)
                          ? 'បានរៀនចប់ហើយ'
                          : 'សម្គាល់ថារៀនចប់'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('quiz')}
                      className="px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>ធ្វើសំណួររំលឹកមេរៀននេះ</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Embedded Official Textbook PDF Viewer (Toggleable) */}
                {showPdfDrawer && (
                  <div className="mt-5 pt-5 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-semibold text-slate-700">
                        សៀវភៅពុម្ពផ្លូវការ៖{' '}
                        {currentLesson.subject === 'math'
                          ? 'គណិតវិទ្យា ថ្នាក់ទី៥'
                          : 'ភាសាខ្មែរ ថ្នាក់ទី៥'}{' '}
                        (បើកនៅទំព័រទី {currentLesson.pageStart})
                      </div>
                      <a
                        href={`${
                          currentLesson.subject === 'math'
                            ? MATH_PDF_PATH
                            : KHMER_PDF_PATH
                        }#page=${currentLesson.pageStart}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#0284C7] hover:underline"
                      >
                        បើកពេញអេក្រង់ក្នុងផ្ទាំងថ្មី ↗
                      </a>
                    </div>
                    <div className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-300 bg-slate-100">
                      <iframe
                        key={`${currentLesson.id}-${currentLesson.pageStart}`}
                        src={`${
                          currentLesson.subject === 'math'
                            ? MATH_PDF_PATH
                            : KHMER_PDF_PATH
                        }#page=${currentLesson.pageStart}`}
                        title={currentLesson.title}
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Structured Lesson Summary & Step-by-Step Guide */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                {/* 1. Core Summary */}
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#0284C7]" />
                    <span>១. សេចក្ដីសង្ខេបខ្លឹមសារមេរៀន</span>
                  </h2>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    {currentLesson.coreSummary}
                  </p>
                </div>

                {/* 2. Key Rules / Formulas */}
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0284C7]" />
                    <span>២. ចំណុចគន្លឹះ និងរូបមន្ត/វិធានត្រូវចងចាំ</span>
                  </h2>
                  <ul className="mt-2.5 space-y-2">
                    {currentLesson.keyPoints.map((pt, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-slate-700 p-3 rounded-lg bg-white border border-slate-200"
                      >
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-[#0284C7] font-mono-num text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Step-by-step explanation */}
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ៣. ការពន្យល់ជាជំហានៗ
                  </h2>
                  <div className="mt-2.5 grid grid-cols-1 gap-3">
                    {currentLesson.stepByStepExplanation.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="text-sm font-bold text-slate-900">
                          {st.stepTitle}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {st.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Worked Examples */}
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ៤. ឧទាហរណ៍ និងដំណោះស្រាយគំរូ
                  </h2>
                  <div className="mt-2.5 space-y-3">
                    {currentLesson.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          លំហាត់គំរូ៖ {ex.problem}
                        </div>
                        <div className="text-sm text-emerald-950 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80">
                          <span className="font-bold text-emerald-800">
                            ដំណោះស្រាយ៖{' '}
                          </span>
                          {ex.solution}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Memory Tip */}
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-950">
                    <span className="font-bold">គន្លឹះចងចាំឆាប់៖ </span>
                    {currentLesson.memoryTip}
                  </div>
                </div>
              </div>

              {/* AI Custom Lesson Explainer & Summarizer Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0284C7]" />
                      <span>
                        មុខងារពន្យល់សង្ខេបបន្ថែមដោយស្វ័យប្រវត្តិ (AI គ្រូជំនួយការ)
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      សិស្សអាចឱ្យកម្មវិធីពន្យល់មេរៀននេះឱ្យកាន់តែលម្អិត ឬបញ្ចូលអត្ថបទ/លំហាត់ដែលមិនទាន់យល់ដើម្បីសង្ខេបភ្លាមៗ
                    </p>
                  </div>

                  {/* Explanation Focus Mode */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                    {[
                      { id: 'simple', label: 'ពន្យល់ងាយៗ' },
                      { id: 'detailed', label: 'ជាជំហានៗ' },
                      { id: 'exam', label: 'ត្រៀមប្រឡង' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setExplainFocusMode(m.id as typeof explainFocusMode)
                        }
                        className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                          explainFocusMode === m.id
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    placeholder={`វាយបញ្ចូលចំណុចដែលចង់ឱ្យពន្យល់បន្ថែម ឬទុកទទេដើម្បីពន្យល់សង្ខេប «${currentLesson.title}» ឡើងវិញ...`}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    ជ្រើសរើសកម្រិតពន្យល់ រួចចុចប៊ូតុងខាងស្ដាំ
                  </span>
                  <button
                    type="button"
                    disabled={aiSummarizing}
                    onClick={handleGenerateAISummary}
                    className="px-4 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${aiSummarizing ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {aiSummarizing
                        ? 'កំពុងរៀបចំការពន្យល់សង្ខេប...'
                        : 'ពន្យល់ និងសង្ខេបមេរៀនឥឡូវនេះ'}
                    </span>
                  </button>
                </div>

                {aiSummaryError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {aiSummaryError}
                  </div>
                )}

                {activeAiSummary && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                    <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200">
                      <div className="text-xs font-bold text-[#0284C7] mb-1">
                        ការពន្យល់សង្ខេបថ្មី៖
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">
                        {activeAiSummary.coreSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="text-xs font-bold text-slate-900 mb-2">
                          ចំណុចគន្លឹះសំខាន់ៗ៖
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                          {activeAiSummary.keyPoints?.map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="text-xs font-bold text-slate-900 mb-2">
                          ឧទាហរណ៍អនុវត្ត៖
                        </div>
                        <div className="space-y-2">
                          {activeAiSummary.examples?.map((ex, i) => (
                            <div key={i} className="text-xs text-slate-700">
                              <div className="font-semibold text-slate-900">
                                • {ex.problem}
                              </div>
                              <div className="text-emerald-800 mt-0.5">
                                → {ex.solution}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===============================================================
            VIEW 3: AUTOMATIC REVIEW Q&A & ACTIVE RECALL FLASHCARDS
        =============================================================== */}
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {/* Control Deck: Lesson Selector + Auto-Generator */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-bold text-slate-900">
                    សំណួរ-ចម្លើយរំលឹកមេរៀនដោយស្វ័យប្រវត្តិ
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ជ្រើសរើសមេរៀនដើម្បីធ្វើតេស្តរំលឹក ឬចុច «បង្កើតសំណួររំលឹកថ្មី» ដើម្បីឱ្យកម្មវិធីរៀបចំសំណួរ-ចម្លើយបន្ថែមដោយស្វ័យប្រវត្តិ
                  </p>
                </div>

                {/* Quiz View Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setQuizViewMode('mcq')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                      quizViewMode === 'mcq'
                        ? 'bg-white text-[#0284C7] shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    តេស្តជ្រើសរើសចម្លើយ ({activeQuestions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizViewMode('flashcards')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                      quizViewMode === 'flashcards'
                        ? 'bg-white text-[#0284C7] shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ប័ណ្ណរំលឹកចងចាំ ({activeFlashcards.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizViewMode('sheet')}
                    className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                      quizViewMode === 'sheet'
                        ? 'bg-white text-[#0284C7] shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    តារាងសំណួរ-ចម្លើយទាំងអស់
                  </button>
                </div>
              </div>

              {/* Subject & Lesson Selector + Auto-Generate Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    មុខវិជ្ជា
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      const subj = e.target.value as SubjectId;
                      setSelectedSubject(subj);
                      const first = GRADE5_CURRICULUM.find(
                        (l) => l.subject === subj
                      );
                      if (first) setSelectedLessonId(first.id);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  >
                    <option value="math">គណិតវិទ្យា ថ្នាក់ទី៥ (១៨ មេរៀន)</option>
                    <option value="khmer">ភាសាខ្មែរ ថ្នាក់ទី៥ (១០ មេរៀន)</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    មេរៀនដែលត្រូវរំលឹក
                  </label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  >
                    {GRADE5_CURRICULUM.filter(
                      (l) => l.subject === selectedSubject
                    ).map((l) => (
                      <option key={l.id} value={l.id}>
                        មេរៀនទី {l.lessonNumber}៖ {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    កម្រិតសំណួរស្វ័យប្រវត្តិ
                  </label>
                  <select
                    value={quizDifficulty}
                    onChange={(e) =>
                      setQuizDifficulty(
                        e.target.value as 'easy' | 'medium' | 'hard'
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0284C7]"
                  >
                    <option value="easy">កម្រិតងាយ (មូលដ្ឋាន)</option>
                    <option value="medium">កម្រិតមធ្យម (សៀវភៅពុម្ព)</option>
                    <option value="hard">កម្រិតខ្ពស់ (គិតវិភាគ)</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button
                    type="button"
                    disabled={generatingQuiz}
                    onClick={handleGenerateAutoQuiz}
                    className="w-full py-2 px-3.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles
                      className={`w-4 h-4 ${
                        generatingQuiz ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {generatingQuiz
                        ? 'កំពុងបង្កើតសំណួរ...'
                        : 'បង្កើតសំណួររំលឹកថ្មីស្វ័យប្រវត្តិ'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Optional Custom Note Input for Auto-Generating Q&A from student's own lesson note */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={customQuizFocusNote}
                  onChange={(e) => setCustomQuizFocusNote(e.target.value)}
                  placeholder="បញ្ចូលខ្លឹមសារមេរៀន ឬចំណុចពិសេសដែលចង់ឱ្យបង្កើតសំណួររំលឹក (ឧ. ការប្ដូរប្រភាគលើសទៅជាចំនួនចម្រុះ)..."
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-[#0284C7]"
                />
                <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                  <span>ចំនួនសំណួរថ្មី៖</span>
                  {[3, 5, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuizCount(n)}
                      className={`px-2 py-1 rounded border font-mono-num cursor-pointer ${
                        quizCount === n
                          ? 'border-[#0284C7] bg-sky-50 text-[#0284C7] font-bold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {quizGenError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {quizGenError}
                </div>
              )}
            </div>

            {/* MODE 1: INTERACTIVE MULTIPLE-CHOICE QUIZ */}
            {quizViewMode === 'mcq' && currentQuestion && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Question Stage (8 cols) */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="text-xs font-semibold text-[#0284C7]">
                      សំណួរទី {currentQuestionIdx + 1} នៃ {activeQuestions.length}{' '}
                      · មេរៀនទី {currentLesson.lessonNumber} ({currentLesson.title})
                    </div>
                    <button
                      type="button"
                      onClick={handleResetLessonQuiz}
                      className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ធ្វើតេស្តឡើងវិញ</span>
                    </button>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-lg font-bold text-slate-900 leading-relaxed">
                    {currentQuestion.question}
                  </div>

                  {/* 4 Options */}
                  <div className="space-y-3">
                    {currentQuestion.options.map((optionText, idx) => {
                      const chosenIdx = selectedAnswers[currentQuestion.id];
                      const isAnswered = chosenIdx !== undefined;
                      const isThisSelected = chosenIdx === idx;
                      const isCorrectOption = currentQuestion.correctIndex === idx;

                      let btnStyle =
                        'border-slate-200 bg-white hover:border-[#0284C7] hover:bg-sky-50/40 text-slate-800';
                      if (isAnswered) {
                        if (isCorrectOption) {
                          btnStyle =
                            'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-semibold';
                        } else if (isThisSelected && !isCorrectOption) {
                          btnStyle =
                            'border-red-400 bg-red-50/90 text-red-900';
                        } else {
                          btnStyle =
                            'border-slate-200 bg-slate-50/60 text-slate-400';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isAnswered}
                          onClick={() =>
                            handleSelectOption(currentQuestion.id, idx)
                          }
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                              {KHMER_OPTIONS_LABELS[idx] || idx + 1}
                            </span>
                            <span className="text-sm">{optionText}</span>
                          </div>

                          {isAnswered && isCorrectOption && (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 shrink-0">
                              <Check className="w-4 h-4" /> ត្រឹមត្រូវ
                            </span>
                          )}
                          {isAnswered && isThisSelected && !isCorrectOption && (
                            <span className="text-xs font-bold text-red-600 flex items-center gap-1 shrink-0">
                              <X className="w-4 h-4" /> ខុស
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Instant Explanation Box when Answered */}
                  {selectedAnswers[currentQuestion.id] !== undefined && (
                    <div
                      className={`p-4 rounded-xl border text-sm ${
                        selectedAnswers[currentQuestion.id] ===
                        currentQuestion.correctIndex
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/80 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="font-bold mb-1">
                        {selectedAnswers[currentQuestion.id] ===
                        currentQuestion.correctIndex
                          ? '✓ អបអរសាទរ! ចម្លើយរបស់អ្នកត្រឹមត្រូវ៖'
                          : '✕ ចម្លើយមិនទាន់ត្រឹមត្រូវទេ — សូមមើលការពន្យល់ខាងក្រោម៖'}
                      </div>
                      <p className="leading-relaxed">
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}

                  {/* Prev / Next Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentQuestionIdx === 0}
                      onClick={() =>
                        setCurrentQuestionIdx((i) => Math.max(0, i - 1))
                      }
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>សំណួរមុន</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {activeQuestions.map((q, idx) => {
                        const ans = selectedAnswers[q.id];
                        const isDone = ans !== undefined;
                        const isRight = ans === q.correctIndex;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setCurrentQuestionIdx(idx)}
                            className={`w-7 h-7 rounded-md text-xs font-mono-num font-bold transition-colors cursor-pointer ${
                              idx === currentQuestionIdx
                                ? 'ring-2 ring-[#0284C7] bg-sky-50 text-[#0284C7]'
                                : isDone
                                ? isRight
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={
                        currentQuestionIdx === activeQuestions.length - 1
                      }
                      onClick={() =>
                        setCurrentQuestionIdx((i) =>
                          Math.min(activeQuestions.length - 1, i + 1)
                        )
                      }
                      className="px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>សំណួរបន្ទាប់</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right Score & Summary Deck (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      លទ្ធផលរំលឹកមេរៀននេះ
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-xs text-slate-500">ពិន្ទុបច្ចុប្បន្ន</div>
                      <div className="text-3xl font-bold text-slate-900 font-mono-num mt-1">
                        {
                          activeQuestions.filter(
                            (q) => selectedAnswers[q.id] === q.correctIndex
                          ).length
                        }{' '}
                        / {activeQuestions.length}
                      </div>
                      <div className="text-xs text-emerald-700 font-medium mt-1">
                        ឆ្លើយរួច{' '}
                        {
                          activeQuestions.filter(
                            (q) => selectedAnswers[q.id] !== undefined
                          ).length
                        }{' '}
                        សំណួរ
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-2">
                      <div className="font-semibold text-slate-900">
                        គន្លឹះមេរៀនទី {currentLesson.lessonNumber}៖
                      </div>
                      <p className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-950">
                        {currentLesson.memoryTip}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('lessons')}
                      className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      ← ត្រឡប់ទៅអានការពន្យល់សង្ខេបមេរៀន
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: ACTIVE RECALL FLASHCARDS */}
            {quizViewMode === 'flashcards' && currentFlashcard && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs min-h-[280px] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      ប័ណ្ណរំលឹកទី {currentFlashcardIdx + 1} នៃ{' '}
                      {activeFlashcards.length} · {currentLesson.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFlashcardHint((h) => !h)}
                      className="text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showFlashcardHint ? 'លាក់តម្រុយ' : 'មើលតម្រុយ'}</span>
                    </button>
                  </div>

                  <div
                    onClick={() => setIsFlashcardFlipped((f) => !f)}
                    className="my-6 py-6 text-center cursor-pointer select-none"
                  >
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">
                      {isFlashcardFlipped
                        ? 'ចម្លើយ / ការពន្យល់ខាងក្រោយប័ណ្ណ'
                        : 'សំណួរ / រូបមន្តខាងមុខប័ណ្ណ (ចុចដើម្បីត្រឡប់)'}
                    </div>
                    <div
                      className={`text-xl font-bold leading-relaxed ${
                        isFlashcardFlipped ? 'text-emerald-800' : 'text-slate-900'
                      }`}
                    >
                      {isFlashcardFlipped
                        ? currentFlashcard.back
                        : currentFlashcard.front}
                    </div>

                    {showFlashcardHint && !isFlashcardFlipped && (
                      <div className="mt-4 inline-block px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        តម្រុយ៖ {currentFlashcard.hint}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentFlashcardIdx === 0}
                      onClick={() => {
                        setCurrentFlashcardIdx((i) => Math.max(0, i - 1));
                        setIsFlashcardFlipped(false);
                        setShowFlashcardHint(false);
                      }}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      ← ប័ណ្ណមុន
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFlashcardFlipped((f) => !f)}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      {isFlashcardFlipped ? 'ត្រឡប់ទៅសំណួរវិញ' : 'បង្ហាញចម្លើយ'}
                    </button>

                    <button
                      type="button"
                      disabled={
                        currentFlashcardIdx === activeFlashcards.length - 1
                      }
                      onClick={() => {
                        setCurrentFlashcardIdx((i) =>
                          Math.min(activeFlashcards.length - 1, i + 1)
                        );
                        setIsFlashcardFlipped(false);
                        setShowFlashcardHint(false);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      ប័ណ្ណបន្ទាប់ →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: ALL Q&A STUDY SHEET */}
            {quizViewMode === 'sheet' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      បញ្ជីសំណួរ-ចម្លើយរំលឹកទាំងអស់ — មេរៀនទី{' '}
                      {currentLesson.lessonNumber}៖ {currentLesson.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      សម្រាប់អានរំលឹកមុនពេលប្រឡង ឬកត់ត្រាចូលសៀវភៅសរសេរ
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-200">
                  {activeQuestions.map((q, idx) => (
                    <div key={q.id} className="p-5 space-y-2">
                      <div className="text-sm font-bold text-slate-900">
                        សំណួរទី {idx + 1}៖ {q.question}
                      </div>
                      <div className="text-sm text-emerald-800 font-semibold">
                        ចម្លើយត្រឹមត្រូវ៖ ({KHMER_OPTIONS_LABELS[q.correctIndex]}){' '}
                        {q.options[q.correctIndex]}
                      </div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <span className="font-semibold text-slate-800">
                          ការពន្យល់៖{' '}
                        </span>
                        {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===============================================================
            VIEW 4: INTERACTIVE QUIZ GAME ARENA (ហ្គេមល្បងប្រាជ្ញា)
        =============================================================== */}
        {activeTab === 'game' && (
          <QuizGameArena
            currentLesson={currentLesson}
            customQuestionsByLesson={customQuestionsByLesson}
            customFlashcardsByLesson={customFlashcardsByLesson}
            onGenerateMoreQuestions={handleGenerateAutoQuiz}
            generatingQuiz={generatingQuiz}
            onGameComplete={(_xp, correctCount) => {
              if (correctCount > 0) {
                setStudiedMinutesToday((m) => m + 10);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
