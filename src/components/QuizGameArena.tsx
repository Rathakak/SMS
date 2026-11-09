import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  Heart,
  Zap,
  Shield,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Play,
  Check,
  X,
  Award,
  Flame,
  HelpCircle,
  Swords,
  Grid,
  Timer,
  ArrowRight,
} from 'lucide-react';
import {
  GRADE5_CURRICULUM,
  LessonData,
  QuizQuestion,
  FlashcardItem,
} from '../data/curriculum';

export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'ROUND_SUMMARY'
  | 'VICTORY'
  | 'GAME_OVER';

export type GameMode = 'BATTLE_ARENA' | 'SPEED_BLITZ' | 'MEMORY_MATCH';
export type DeckScope = 'current_lesson' | 'all_math' | 'all_khmer' | 'mixed_all';

interface QuizGameArenaProps {
  currentLesson: LessonData;
  customQuestionsByLesson: Record<string, QuizQuestion[]>;
  customFlashcardsByLesson: Record<string, FlashcardItem[]>;
  onGenerateMoreQuestions: () => Promise<void>;
  generatingQuiz: boolean;
  onGameComplete?: (earnedXp: number, correctCount: number) => void;
}

interface MemoryCard {
  uid: string;
  pairId: string;
  content: string;
  cardType: 'question' | 'answer';
  isFlipped: boolean;
  isMatched: boolean;
}

const KHMER_LABELS = ['ក', 'ខ', 'គ', 'ឃ'];

export default function QuizGameArena({
  currentLesson,
  customQuestionsByLesson,
  customFlashcardsByLesson,
  onGenerateMoreQuestions,
  generatingQuiz,
  onGameComplete,
}: QuizGameArenaProps) {
  // Game Configuration & State Machine
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [gameMode, setGameMode] = useState<GameMode>('BATTLE_ARENA');
  const [deckScope, setDeckScope] = useState<DeckScope>('mixed_all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Player Persistent High Score & Badges
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('g5_game_highscore')) || 1250;
    } catch {
      return 1250;
    }
  });

  const [totalXp, setTotalXp] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('g5_game_total_xp')) || 450;
    } catch {
      return 450;
    }
  });

  // Active Gameplay State (Battle & Speed Blitz)
  const [playDeck, setPlayDeck] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(3);
  const [bossHp, setBossHp] = useState<number>(100);
  const [maxBossHp, setMaxBossHp] = useState<number>(100);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [showHintClue, setShowHintClue] = useState<boolean>(false);
  const [battleFeedback, setBattleFeedback] = useState<string>(
    'ត្រៀមខ្លួនឆ្លើយសំណួរដើម្បីវាយប្រហារយក្សល្បងប្រាជ្ញា!'
  );
  const [correctTotal, setCorrectTotal] = useState<number>(0);
  const [answeredHistory, setAnsweredHistory] = useState<
    Array<{ question: QuizQuestion; chosenIdx: number; isCorrect: boolean }>
  >([]);

  // Lifelines Inventory (per game)
  const [lifeline5050, setLifeline5050] = useState<number>(2);
  const [lifelineTime, setLifelineTime] = useState<number>(2);
  const [lifelineShield, setLifelineShield] = useState<number>(2);

  // Memory Match Mode State
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [memoryMoves, setMemoryMoves] = useState<number>(0);
  const [memoryMatches, setMemoryMatches] = useState<number>(0);

  // Web Audio Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(
    (type: 'correct' | 'wrong' | 'powerup' | 'flip' | 'victory' | 'gameover') => {
      if (!soundEnabled) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'correct') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === 'wrong') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(160, now + 0.12);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'powerup') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === 'flip') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === 'victory') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.1);
          osc.frequency.setValueAtTime(783.99, now + 0.2);
          osc.frequency.setValueAtTime(1046.5, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
        } else if (type === 'gameover') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(140, now + 0.4);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        }
      } catch {
        // Ignore audio errors if browser blocks autoplay
      }
    },
    [soundEnabled]
  );

  // Build Question Pool based on selected DeckScope
  const availableQuestions = useMemo(() => {
    let lessons: LessonData[] = [];
    if (deckScope === 'current_lesson') {
      lessons = [currentLesson];
    } else if (deckScope === 'all_math') {
      lessons = GRADE5_CURRICULUM.filter((l) => l.subject === 'math');
    } else if (deckScope === 'all_khmer') {
      lessons = GRADE5_CURRICULUM.filter((l) => l.subject === 'khmer');
    } else {
      lessons = GRADE5_CURRICULUM;
    }

    const pool: QuizQuestion[] = [];
    lessons.forEach((l) => {
      const custom = customQuestionsByLesson[l.id] || [];
      pool.push(...custom, ...l.questions);
    });

    // If current_lesson has fewer than 6 questions, pad with same-subject questions so the game is rich
    if (pool.length < 6) {
      const fallbackLessons = GRADE5_CURRICULUM.filter(
        (l) => l.subject === currentLesson.subject && l.id !== currentLesson.id
      );
      fallbackLessons.forEach((l) => pool.push(...l.questions));
    }

    return pool;
  }, [deckScope, currentLesson, customQuestionsByLesson]);

  // Build Flashcard Pool for Memory Match Mode
  const availableFlashcards = useMemo(() => {
    let lessons: LessonData[] = [];
    if (deckScope === 'current_lesson') {
      lessons = GRADE5_CURRICULUM.filter(
        (l) => l.subject === currentLesson.subject
      );
    } else if (deckScope === 'all_math') {
      lessons = GRADE5_CURRICULUM.filter((l) => l.subject === 'math');
    } else if (deckScope === 'all_khmer') {
      lessons = GRADE5_CURRICULUM.filter((l) => l.subject === 'khmer');
    } else {
      lessons = GRADE5_CURRICULUM;
    }

    const cards: FlashcardItem[] = [];
    // Prioritize current lesson cards first
    const currentCustom = customFlashcardsByLesson[currentLesson.id] || [];
    cards.push(...currentCustom, ...currentLesson.flashcards);

    lessons.forEach((l) => {
      if (l.id !== currentLesson.id) {
        const custom = customFlashcardsByLesson[l.id] || [];
        cards.push(...custom, ...l.flashcards);
      }
    });
    return cards;
  }, [deckScope, currentLesson, customFlashcardsByLesson]);

  // Finish Game Helper
  const finishGame = useCallback(
    (finalState: 'VICTORY' | 'GAME_OVER', finalScore: number, finalCorrect: number) => {
      setGameState(finalState);
      playSound(finalState === 'VICTORY' ? 'victory' : 'gameover');

      setTotalXp((prev) => {
        const next = prev + finalScore;
        try {
          localStorage.setItem('g5_game_total_xp', String(next));
        } catch {
          // ignore
        }
        return next;
      });

      setHighScore((prev) => {
        const best = Math.max(prev, finalScore);
        try {
          localStorage.setItem('g5_game_highscore', String(best));
        } catch {
          // ignore
        }
        return best;
      });

      if (onGameComplete) {
        onGameComplete(finalScore, finalCorrect);
      }
    },
    [playSound, onGameComplete]
  );

  // Start / Restart Game
  const startGame = () => {
    playSound('powerup');
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setHearts(3);
    setCorrectTotal(0);
    setAnsweredHistory([]);
    setSelectedOpt(null);
    setHiddenOptions([]);
    setShieldActive(false);
    setShowHintClue(false);
    setLifeline5050(2);
    setLifelineTime(2);
    setLifelineShield(2);

    if (gameMode === 'MEMORY_MATCH') {
      // Pick 6 pairs (12 cards)
      const selectedPairs = [...availableFlashcards]
        .slice(0, 10)
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);

      const deck: MemoryCard[] = [];
      selectedPairs.forEach((item, idx) => {
        const pairId = `pair-${idx}`;
        deck.push({
          uid: `q-${idx}`,
          pairId,
          content: item.front,
          cardType: 'question',
          isFlipped: false,
          isMatched: false,
        });
        deck.push({
          uid: `a-${idx}`,
          pairId,
          content: item.back,
          cardType: 'answer',
          isFlipped: false,
          isMatched: false,
        });
      });

      setMemoryCards(deck.sort(() => Math.random() - 0.5));
      setFlippedUids([]);
      setMemoryMoves(0);
      setMemoryMatches(0);
      setTimeLeft(90);
      setGameState('PLAYING');
      return;
    }

    // Shuffle questions for Battle Arena or Speed Blitz
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const questionLimit = gameMode === 'BATTLE_ARENA' ? Math.min(shuffled.length, 8) : shuffled.length;
    const activeSet = shuffled.slice(0, Math.max(questionLimit, 5));

    setPlayDeck(activeSet);
    setCurrentIdx(0);
    const totalHp = activeSet.length * 20;
    setBossHp(totalHp);
    setMaxBossHp(totalHp);
    setTimeLeft(gameMode === 'SPEED_BLITZ' ? 60 : 25);
    setBattleFeedback(
      gameMode === 'BATTLE_ARENA'
        ? 'ជ្រើសរើសចម្លើយត្រឹមត្រូវដើម្បីបញ្ចេញថាមពលវាយប្រហារ!'
        : 'ឆ្លើយឱ្យលឿនបំផុតមុនអស់ម៉ោង! រាល់ចម្លើយត្រូវថែមម៉ោង +៣ វិនាទី!'
    );
    setGameState('PLAYING');
  };

  // Handle Answer Selection in Battle Arena & Speed Blitz
  const handleSelectAnswer = useCallback(
    (optIndex: number) => {
      if (gameState !== 'PLAYING' || selectedOpt !== null) return;
      const currentQ = playDeck[currentIdx];
      if (!currentQ) return;

      setSelectedOpt(optIndex);
      const isCorrect = optIndex === currentQ.correctIndex;

      setAnsweredHistory((prev) => [
        ...prev,
        { question: currentQ, chosenIdx: optIndex, isCorrect },
      ]);

      if (isCorrect) {
        playSound('correct');
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        setMaxStreak((m) => Math.max(m, nextStreak));
        const nextCorrect = correctTotal + 1;
        setCorrectTotal(nextCorrect);

        const multiplier = Math.min(nextStreak, 4);
        const pointsEarned = 100 * multiplier + (gameMode === 'BATTLE_ARENA' ? timeLeft * 2 : 25);
        const nextScore = score + pointsEarned;
        setScore(nextScore);

        if (gameMode === 'SPEED_BLITZ') {
          setTimeLeft((t) => t + 3);
          setBattleFeedback(`✓ ត្រឹមត្រូវ! +${pointsEarned} XP និងថែមម៉ោង +3 វិនាទី!`);
        } else {
          const damage = 20 + (nextStreak >= 3 ? 10 : 0);
          const nextBossHp = Math.max(0, bossHp - damage);
          setBossHp(nextBossHp);
          setBattleFeedback(
            `✓ វាយប្រហារចំគោលដៅ! -${damage} HP លើយក្សល្បងប្រាជ្ញា (+${pointsEarned} XP · Combo x${multiplier})`
          );

          if (nextBossHp <= 0) {
            setTimeout(() => {
              finishGame('VICTORY', nextScore + hearts * 100, nextCorrect);
            }, 900);
            return;
          }
        }
      } else {
        playSound('wrong');
        setStreak(0);
        if (shieldActive) {
          setBattleFeedback(
            '🛡️ ខែលការពារបានជួយសង្គ្រោះអ្នកមិនឱ្យបាត់បង់ជីវិតនៅវគ្គនេះ!'
          );
          setShieldActive(false);
        } else {
          const nextHearts = hearts - 1;
          setHearts(nextHearts);
          setBattleFeedback(
            `✕ ចម្លើយមិនត្រឹមត្រូវ! បាត់បង់ជីវិត ១ (នៅសល់ ${nextHearts}/3)`
          );
          if (nextHearts <= 0) {
            setTimeout(() => {
              finishGame('GAME_OVER', score, correctTotal);
            }, 950);
            return;
          }
        }
      }

      // Advance to next question after brief visual confirmation
      setTimeout(() => {
        if (currentIdx + 1 < playDeck.length) {
          setCurrentIdx((i) => i + 1);
          setSelectedOpt(null);
          setHiddenOptions([]);
          setShowHintClue(false);
          if (gameMode === 'BATTLE_ARENA') {
            setTimeLeft(25);
          }
        } else {
          // Completed all questions in deck
          finishGame('VICTORY', score + (isCorrect ? 150 : 0), correctTotal + (isCorrect ? 1 : 0));
        }
      }, 1100);
    },
    [
      gameState,
      selectedOpt,
      playDeck,
      currentIdx,
      streak,
      correctTotal,
      timeLeft,
      score,
      gameMode,
      bossHp,
      hearts,
      shieldActive,
      playSound,
      finishGame,
    ]
  );

  // Timer Countdown Effect
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    if (selectedOpt !== null && gameMode === 'BATTLE_ARENA') return; // pause per-question timer during answer reveal

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (gameMode === 'SPEED_BLITZ' || gameMode === 'MEMORY_MATCH') {
            finishGame(
              correctTotal >= 3 || memoryMatches >= 3 ? 'VICTORY' : 'GAME_OVER',
              score,
              correctTotal
            );
            return 0;
          }
          // In Battle Arena, timeout on a question costs 1 heart and moves on
          playSound('wrong');
          setStreak(0);
          setHearts((h) => {
            const nextH = h - 1;
            if (nextH <= 0) {
              finishGame('GAME_OVER', score, correctTotal);
            }
            return nextH;
          });
          setBattleFeedback('⏰ អស់ម៉ោងសម្រាប់សំណួរនេះ! បាត់បង់ជីវិត ១។');
          if (currentIdx + 1 < playDeck.length) {
            setCurrentIdx((i) => i + 1);
            setSelectedOpt(null);
            setHiddenOptions([]);
            setShowHintClue(false);
            return 25;
          } else {
            finishGame('VICTORY', score, correctTotal);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    gameState,
    selectedOpt,
    gameMode,
    currentIdx,
    playDeck.length,
    score,
    correctTotal,
    memoryMatches,
    playSound,
    finishGame,
  ]);

  // Keyboard shortcuts (1, 2, 3, 4) for snappy gameplay
  useEffect(() => {
    if (gameState !== 'PLAYING' || gameMode === 'MEMORY_MATCH') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (!hiddenOptions.includes(idx)) {
          handleSelectAnswer(idx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, gameMode, hiddenOptions, handleSelectAnswer]);

  // Lifeline 1: 50/50 Remove 2 wrong options
  const handleUse5050 = () => {
    const currentQ = playDeck[currentIdx];
    if (
      !currentQ ||
      lifeline5050 <= 0 ||
      hiddenOptions.length > 0 ||
      selectedOpt !== null
    )
      return;
    playSound('powerup');
    const wrongIndices = [0, 1, 2, 3].filter(
      (i) => i !== currentQ.correctIndex
    );
    const toHide = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(toHide);
    setLifeline5050((c) => c - 1);
    setBattleFeedback('⚡ បានប្រើជំនួយ 50/50៖ លុបជម្រើសខុសចំនួន ២ ចេញ!');
  };

  // Lifeline 2: +15 Seconds Time Boost
  const handleUseExtraTime = () => {
    if (lifelineTime <= 0 || selectedOpt !== null) return;
    playSound('powerup');
    setTimeLeft((t) => t + 15);
    setLifelineTime((c) => c - 1);
    setBattleFeedback('⏳ បានប្រើជំនួយបន្ថែមម៉ោង +១៥ វិនាទី!');
  };

  // Lifeline 3: Shield + Explanation Hint
  const handleUseShieldHint = () => {
    if (lifelineShield <= 0 || selectedOpt !== null) return;
    playSound('powerup');
    setShieldActive(true);
    setShowHintClue(true);
    setLifelineShield((c) => c - 1);
    setBattleFeedback('🛡️ បានបើកខែលការពារ និងបង្ហាញតម្រុយពិសេស!');
  };

  // Handle Memory Match Card Click
  const handleFlipMemoryCard = (uid: string) => {
    if (gameState !== 'PLAYING' || flippedUids.length >= 2) return;
    const targetCard = memoryCards.find((c) => c.uid === uid);
    if (!targetCard || targetCard.isFlipped || targetCard.isMatched) return;

    playSound('flip');
    const nextFlipped = [...flippedUids, uid];
    setFlippedUids(nextFlipped);
    setMemoryCards((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, isFlipped: true } : c))
    );

    if (nextFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [firstUid, secondUid] = nextFlipped;
      const firstCard = memoryCards.find((c) => c.uid === firstUid);
      const secondCard = memoryCards.find((c) => c.uid === secondUid);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match!
        setTimeout(() => {
          playSound('correct');
          const nextMatches = memoryMatches + 1;
          setMemoryMatches(nextMatches);
          const nextScore = score + 200;
          setScore(nextScore);
          setCorrectTotal(nextMatches);
          setMemoryCards((prev) =>
            prev.map((c) =>
              c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
            )
          );
          setFlippedUids([]);

          if (nextMatches >= 6) {
            finishGame('VICTORY', nextScore + timeLeft * 5, nextMatches);
          }
        }, 350);
      } else {
        // Mismatch
        setTimeout(() => {
          playSound('wrong');
          setMemoryCards((prev) =>
            prev.map((c) =>
              nextFlipped.includes(c.uid) ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedUids([]);
        }, 850);
      }
    }
  };

  const currentQuestion = playDeck[currentIdx];

  return (
    <div className="space-y-6">
      {/* =================================================================
          TOP PLAYER PROFILE & ARENA HEADER BAR
      ================================================================= */}
      <div className="bg-[#0F172A] text-white rounded-2xl border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">
                សង្វៀនល្បងប្រាជ្ញា ថ្នាក់ទី៥
              </h1>
              <span className="text-xs text-amber-400 font-semibold">
                · កម្រិតសិស្សឆ្នើម
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              រៀនបណ្ដើរ លេងហ្គេមបណ្ដើរ ដើម្បីចងចាំមេរៀនគណិតវិទ្យា និងភាសាខ្មែរបានយ៉ាងស្ទាត់ជំនាញ
            </p>
          </div>
        </div>

        {/* Player Stats & Audio Control */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">ពិន្ទុខ្ពស់បំផុត៖</span>
            <span className="font-bold text-white font-mono-num">
              {highScore} XP
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300">XP សន្សំសរុប៖</span>
            <span className="font-bold text-sky-300 font-mono-num">
              {totalXp} XP
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>សំឡេង៖ បើក</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>សំឡេង៖ បិទ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =================================================================
          STATE 1: TITLE_MENU (Choose Game Mode, Subject Deck & Start)
      ================================================================= */}
      {gameState === 'TITLE_MENU' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: 3 Interactive Game Modes */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ១. ជ្រើសរើសទម្រង់ហ្គេមដែលចង់លេង
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ទម្រង់នីមួយៗជួយហ្វឹកហាត់ការគិតរហ័ស ការចងចាំរូបមន្ត និងការដោះស្រាយចំណោទ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mode 1: Battle Arena */}
              <button
                type="button"
                onClick={() => setGameMode('BATTLE_ARENA')}
                className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  gameMode === 'BATTLE_ARENA'
                    ? 'border-[#0284C7] bg-sky-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-[#0284C7] text-white flex items-center justify-center mb-3">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    ការពារប្រាសាទចំណេះដឹង
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    ឆ្លើយសំណួរឱ្យត្រូវដើម្បីបញ្ចេញថាមពលវាយបំបាក់ «យក្សល្បងប្រាជ្ញា» និងប្រើជំនួយពិសេស ៣ ប្រភេទ។
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-[#0284C7]">
                  {gameMode === 'BATTLE_ARENA' ? '✓ កំពុងជ្រើសរើស' : 'ចុចជ្រើសរើស'}
                </div>
              </button>

              {/* Mode 2: 60s Speed Blitz */}
              <button
                type="button"
                onClick={() => setGameMode('SPEED_BLITZ')}
                className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  gameMode === 'SPEED_BLITZ'
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center mb-3">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    ប្រណាំងល្បឿន ៦០ វិនាទី
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    ប្រកួតប្រជែងជាមួយនាឡិកា! រាល់ចម្លើយត្រឹមត្រូវទទួលបានម៉ោងបន្ថែម +៣ វិនាទី និងពិន្ទុគុណបន្តបន្ទាប់។
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-amber-700">
                  {gameMode === 'SPEED_BLITZ' ? '✓ កំពុងជ្រើសរើស' : 'ចុចជ្រើសរើស'}
                </div>
              </button>

              {/* Mode 3: Memory Match Board */}
              <button
                type="button"
                onClick={() => setGameMode('MEMORY_MATCH')}
                className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  gameMode === 'MEMORY_MATCH'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    ផ្គូផ្គងប័ណ្ណអាថ៌កំបាំង
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    បើកប័ណ្ណស្វែងរកគូរូបមន្តគណិតវិទ្យា និងនិយមន័យវេយ្យាករណ៍ខ្មែរឱ្យត្រូវគូគ្នាក្នុងរយៈពេលខ្លីបំផុត។
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-semibold text-emerald-700">
                  {gameMode === 'MEMORY_MATCH' ? '✓ កំពុងជ្រើសរើស' : 'ចុចជ្រើសរើស'}
                </div>
              </button>
            </div>

            {/* Deck Selection */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                ២. ជ្រើសរើសវិញ្ញាសាសំណួរសម្រាប់ប្រកួត
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'mixed_all',
                    title: 'ចម្រុះ គណិតវិទ្យា + ភាសាខ្មែរ (គ្រប់មេរៀន)',
                    desc: 'សំណួរជ្រើសរើសពីគ្រប់មេរៀនទាំង ២៨ នៃថ្នាក់ទី៥',
                  },
                  {
                    id: 'current_lesson',
                    title: `មេរៀនកំពុងរៀន៖ ${currentLesson.title}`,
                    desc: `ផ្ដោតលើមេរៀនទី ${currentLesson.lessonNumber} និងសំណួរ AI បង្កើតថ្មី`,
                  },
                  {
                    id: 'all_math',
                    title: 'គណិតវិទ្យា ថ្នាក់ទី៥ សុទ្ធ (១៨ មេរៀន)',
                    desc: 'ចំនួន ប្រភាគ ទសភាគ ភាគរយ រង្វាស់ និងធរណីមាត្រ',
                  },
                  {
                    id: 'all_khmer',
                    title: 'ភាសាខ្មែរ ថ្នាក់ទី៥ សុទ្ធ (១០ មេរៀន)',
                    desc: 'វេយ្យាករណ៍ អក្សរសិល្ប៍ កំណាព្យ និងចំណេះដឹងទូទៅ',
                  },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDeckScope(d.id as DeckScope)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      deckScope === d.id
                        ? 'border-[#0284C7] bg-sky-50/60 text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{d.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {d.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Game CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                disabled={generatingQuiz}
                onClick={onGenerateMoreQuestions}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Sparkles
                  className={`w-4 h-4 text-[#0284C7] ${
                    generatingQuiz ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {generatingQuiz
                    ? 'កំពុងបង្កើតសំណួរថ្មីបញ្ចូលហ្គេម...'
                    : '+ បង្កើតសំណួរ AI ថ្មីបន្ថែមចូលហ្គេម'}
                </span>
              </button>

              <button
                type="button"
                onClick={startGame}
                className="px-6 py-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>ចាប់ផ្ដើមលេងហ្គេមឥឡូវនេះ</span>
              </button>
            </div>
          </div>

          {/* Right 4 Cols: Game Rules & Lifelines Guide */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              ក្បួនលេង និងជំនួយពិសេសក្នុងហ្គេម
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    ជំនួយ 50/50 (កាត់ជម្រើសខុស ២)
                  </div>
                  <p className="mt-0.5">
                    ជួយដកចម្លើយខុសចំនួន ២ ចេញ ធ្វើឱ្យសិស្សងាយជ្រើសរើសចម្លើយដែលត្រឹមត្រូវ។
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    ជំនួយបន្ថែមម៉ោង (+១៥ វិនាទី)
                  </div>
                  <p className="mt-0.5">
                    បន្ថែមម៉ោងគិត ១៥ វិនាទី សម្រាប់លំហាត់គណនាលេខ ឬចំណោទវែងៗ។
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    ខែលការពារ និងមើលតម្រុយ
                  </div>
                  <p className="mt-0.5">
                    បើកមើលតម្រុយការពន្យល់មុនឆ្លើយ និងការពារមិនឱ្យបាត់បង់ជីវិតប្រសិនបើឆ្លើយខុស។
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              <span className="font-bold">គន្លឹះបញ្ជារហ័ស៖ </span>
              ពេលកំពុងលេង សិស្សអាចចុចគ្រាប់ចុចលេខ <kbd className="px-1.5 py-0.5 bg-white rounded border border-amber-300 font-mono-num">1</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-amber-300 font-mono-num">2</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-amber-300 font-mono-num">3</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-amber-300 font-mono-num">4</kbd>{' '}
              នៅលើក្ដារចុចដើម្បីជ្រើសរើសចម្លើយ ក ខ គ ឃ បានយ៉ាងរហ័ស!
            </div>
          </div>
        </div>
      )}

      {/* =================================================================
          STATE 2A: PLAYING (BATTLE_ARENA or SPEED_BLITZ)
      ================================================================= */}
      {gameState === 'PLAYING' &&
        (gameMode === 'BATTLE_ARENA' || gameMode === 'SPEED_BLITZ') &&
        currentQuestion && (
          <div className="bg-[#0F172A] text-white rounded-2xl border border-slate-800 overflow-hidden shadow-md">
            {/* Top Unobtrusive HUD Bar */}
            <div className="p-4 sm:px-6 bg-[#1E293B] border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
              {/* Left HUD: Player Hearts & Shield */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-300 font-medium">
                    ជីវិត៖
                  </span>
                  {[1, 2, 3].map((i) => (
                    <Heart
                      key={i}
                      className={`w-5 h-5 transition-transform ${
                        i <= hearts
                          ? 'text-red-500 fill-red-500 scale-100'
                          : 'text-slate-600 scale-90'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-mono-num text-slate-300 ml-1">
                    ({hearts}/3)
                  </span>
                </div>

                {shieldActive && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <Shield className="w-4 h-4" /> ខែលការពារសកម្ម
                  </span>
                )}
              </div>

              {/* Center HUD: Score & Streak Multiplier */}
              <div className="flex items-center gap-5">
                <div className="text-xs">
                  <span className="text-slate-400">ពិន្ទុ៖ </span>
                  <span className="text-base font-bold text-amber-400 font-mono-num">
                    {score} XP
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-orange-400">
                  <Flame className="w-4 h-4 fill-orange-400" />
                  <span className="font-mono-num">
                    Combo x{Math.max(1, Math.min(streak, 4))}
                  </span>
                </div>
              </div>

              {/* Right HUD: Timer & Quit */}
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1.5 rounded-lg border font-mono-num text-xs font-bold flex items-center gap-1.5 ${
                    timeLeft <= 7
                      ? 'bg-red-950/90 border-red-500 text-red-300'
                      : 'bg-slate-800 border-slate-600 text-sky-300'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>នៅសល់ {timeLeft} វិនាទី</span>
                </div>

                <button
                  type="button"
                  onClick={() => setGameState('TITLE_MENU')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  ចាកចេញ
                </button>
              </div>
            </div>

            {/* Battle Stage Visual Banner (Hero vs Guardian HP Bar in BATTLE_ARENA) */}
            {gameMode === 'BATTLE_ARENA' && (
              <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center font-bold text-sm shrink-0">
                    សិស្ស
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed">
                    {battleFeedback}
                  </div>
                </div>

                <div className="md:col-span-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-400 flex items-center gap-1.5">
                      <Swords className="w-4 h-4" />
                      យក្សល្បងប្រាជ្ញា (សំណួរទី {currentIdx + 1}/{playDeck.length})
                    </span>
                    <span className="font-mono-num text-slate-300">
                      HP: {bossHp}/{maxBossHp}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.round((bossHp / maxBossHp) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Main Question & 4 Interactive Choice Cards */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6">
                <div className="text-xs font-semibold text-sky-400 mb-2">
                  សំណួរល្បងប្រាជ្ញាទី {currentIdx + 1} · ចុចជ្រើសរើសចម្លើយ ឬចុចលេខ 1-4
                </div>
                <div className="text-xl font-bold text-white leading-relaxed">
                  {currentQuestion.question}
                </div>

                {showHintClue && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs text-amber-200">
                    <span className="font-bold">💡 តម្រុយពិសេស៖ </span>
                    {currentQuestion.explanation.slice(0, 95)}...
                  </div>
                )}
              </div>

              {/* 2x2 Option Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {currentQuestion.options.map((opt, idx) => {
                  const isHidden = hiddenOptions.includes(idx);
                  const isAnswered = selectedOpt !== null;
                  const isSelected = selectedOpt === idx;
                  const isCorrect = currentQuestion.correctIndex === idx;

                  if (isHidden) {
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600 text-sm flex items-center justify-center min-h-[60px]"
                      >
                        ត្រូវបានដកចេញដោយជំនួយ 50/50
                      </div>
                    );
                  }

                  let cardClass =
                    'border-slate-700 bg-slate-800/90 hover:border-sky-400 hover:bg-slate-800 text-white';
                  if (isAnswered) {
                    if (isCorrect) {
                      cardClass =
                        'border-emerald-400 bg-emerald-950/90 text-emerald-200 font-bold';
                    } else if (isSelected && !isCorrect) {
                      cardClass =
                        'border-red-400 bg-red-950/90 text-red-200';
                    } else {
                      cardClass =
                        'border-slate-800 bg-slate-900/50 text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectAnswer(idx)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-3 min-h-[64px] cursor-pointer ${cardClass}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-600 text-sky-300 text-xs font-bold flex items-center justify-center shrink-0">
                          {KHMER_LABELS[idx]}
                        </span>
                        <span className="text-sm sm:text-base">{opt}</span>
                      </div>

                      {isAnswered && isCorrect && (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                          <Check className="w-4 h-4" /> ត្រូវ
                        </span>
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <span className="text-xs font-bold text-red-400 flex items-center gap-1 shrink-0">
                          <X className="w-4 h-4" /> ខុស
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Lifelines / Power-up Bar */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  ជំនួយពិសេស (ចុចប្រើពេលជួបសំណួរពិបាក)៖
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={
                      lifeline5050 <= 0 ||
                      hiddenOptions.length > 0 ||
                      selectedOpt !== null
                    }
                    onClick={handleUse5050}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>កាត់ខុស ២ (50/50) [{lifeline5050}]</span>
                  </button>

                  <button
                    type="button"
                    disabled={lifelineTime <= 0 || selectedOpt !== null}
                    onClick={handleUseExtraTime}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-sky-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>បន្ថែមម៉ោង +១៥ វិនាទី [{lifelineTime}]</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      lifelineShield <= 0 ||
                      shieldActive ||
                      selectedOpt !== null
                    }
                    onClick={handleUseShieldHint}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>ខែលការពារ + តម្រុយ [{lifelineShield}]</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =================================================================
          STATE 2B: PLAYING (MEMORY_MATCH BOARD)
      ================================================================= */}
      {gameState === 'PLAYING' && gameMode === 'MEMORY_MATCH' && (
        <div className="bg-[#0F172A] text-white rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white">
                ផ្គូផ្គងប័ណ្ណចំណេះដឹង (គូផ្គងរួច៖ {memoryMatches} / 6 គូ)
              </h2>
              <p className="text-xs text-slate-400">
                ចុចបើកប័ណ្ណពីរផ្ទាំងដើម្បីផ្គូផ្គងសំណួរ/រូបមន្ត ជាមួយចម្លើយដែលត្រឹមត្រូវ
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="font-mono-num text-amber-400 font-bold">
                ពិន្ទុ៖ {score} XP
              </span>
              <span className="font-mono-num text-slate-300">
                ចំនួនបើក៖ {memoryMoves} ដង
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono-num text-sky-300 font-bold">
                ម៉ោង៖ {timeLeft} វិនាទី
              </span>
              <button
                type="button"
                onClick={() => setGameState('TITLE_MENU')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                ចាកចេញ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {memoryCards.map((card) => {
              const revealed = card.isFlipped || card.isMatched;
              return (
                <button
                  key={card.uid}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleFlipMemoryCard(card.uid)}
                  className={`min-h-[125px] p-4 rounded-xl border-2 text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                    card.isMatched
                      ? 'border-emerald-500/80 bg-emerald-950/60 text-emerald-200'
                      : card.isFlipped
                      ? 'border-sky-400 bg-slate-800 text-white'
                      : 'border-slate-700 bg-slate-800/70 hover:border-slate-500 text-slate-400'
                  }`}
                >
                  {revealed ? (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-1">
                        {card.cardType === 'question'
                          ? 'សំណួរ / រូបមន្ត'
                          : 'ចម្លើយ / វិធាន'}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold leading-snug">
                        {card.content}
                      </span>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <HelpCircle className="w-6 h-6 text-slate-500" />
                      <span className="text-xs font-medium text-slate-400">
                        ចុចបើកប័ណ្ណ
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================
          STATE 3: VICTORY OR GAME_OVER SUMMARY MODAL
      ================================================================= */}
      {(gameState === 'VICTORY' || gameState === 'GAME_OVER') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  gameState === 'VICTORY'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">
                  {gameState === 'VICTORY'
                    ? '🎉 អបអរសាទរ! ជ័យជម្នះដ៏ត្រចះត្រចង់!'
                    : '💪 ការប្រកួតបានបញ្ចប់ — ព្យាយាមម្ដងទៀតដើម្បីឈ្នះ!'}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
                  ពិន្ទុសរុប៖ <span className="font-mono-num">{score} XP</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  ឆ្លើយត្រូវសរុប {correctTotal} សំណួរ/គូ · ចម្លើយត្រូវបន្តបន្ទាប់ខ្ពស់បំផុត{' '}
                  {maxStreak} ដង
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGameState('TITLE_MENU')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                ប្ដូរទម្រង់ហ្គេម
              </button>
              <button
                type="button"
                onClick={startGame}
                className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>លេងម្ដងទៀត (Play Again)</span>
              </button>
            </div>
          </div>

          {/* Review of Answered Questions in this Match */}
          {answeredHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                ពិនិត្យចម្លើយ និងការពន្យល់ពីការប្រកួតមុននេះ៖
              </h3>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {answeredHistory.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold text-slate-900">
                        {idx + 1}. {item.question.question}
                      </div>
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          item.isCorrect ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {item.isCorrect ? '✓ ត្រឹមត្រូវ' : '✕ ខុស'}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-800 font-semibold">
                      ចម្លើយត្រឹមត្រូវ៖ (
                      {KHMER_LABELS[item.question.correctIndex]}){' '}
                      {item.question.options[item.question.correctIndex]}
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                      {item.question.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
