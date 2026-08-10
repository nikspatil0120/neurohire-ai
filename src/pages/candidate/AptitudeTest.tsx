import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Clock, ArrowRight, Brain, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  text: string;
  isCorrect: boolean;
}

interface AptitudeQuestion {
  id: string;
  serialNumber: number;
  question: string;
  options: Option[];
  explanation: string;
  category: "Verbal" | "Quantitative" | "Reasoning" | "Technical";
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
}

const API_BASE_URL = "http://localhost:5000/api/aptitude-questions";

const AptitudeTest = () => {
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selected: number; correct: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [testCompleted, setTestCompleted] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && !testCompleted) {
      const timer = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !testCompleted) {
      completeTest();
    }
  }, [timeLeft, testCompleted]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.options[selectedOption].isCorrect;

    if (isCorrect) {
      setScore(score + 1);
    }

    setAnswers([...answers, {
      questionId: currentQuestion.id,
      selected: selectedOption,
      correct: isCorrect
    }]);

    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      completeTest();
    }
  };

  const completeTest = () => {
    setTestCompleted(true);
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setTimeLeft(30 * 60);
    setTestCompleted(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground mb-2">No questions available</p>
          <Link to="/candidate/practice" className="text-primary hover:underline">
            ← Back to Practice
          </Link>
        </div>
      </div>
    );
  }

  if (testCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <GlassCard variant="neon" className="text-center py-12">
            <Brain className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-display text-foreground mb-4">Test Completed!</h2>
            
            <div className="mb-8">
              <div className="text-6xl font-bold text-primary mb-2">{score}/{questions.length}</div>
              <p className="text-muted-foreground">Questions Correct</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-green-500">{percentage}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-foreground">{formatTime(30 * 60 - timeLeft)}</div>
                <div className="text-xs text-muted-foreground">Time Taken</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Test
              </button>
              <Link
                to="/candidate/practice"
                className="px-6 py-3 border border-border/50 rounded-lg text-foreground hover:bg-muted/30 transition-colors"
              >
                Back to Practice
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/candidate/practice" className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Link>
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-display text-sm tracking-widest text-foreground">APTITUDE TEST</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="font-display text-sm text-primary">Q{currentQuestionIndex + 1}</span>
            <span className="text-xs text-muted-foreground">/ {questions.length}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 rounded-full bg-muted/30 mb-8">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto">
        <GlassCard variant="neon" hover={false} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-foreground">
              #{currentQuestion.serialNumber}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              currentQuestion.category === 'Verbal' ? 'bg-blue-500/10 text-blue-500' :
              currentQuestion.category === 'Quantitative' ? 'bg-purple-500/10 text-purple-500' :
              currentQuestion.category === 'Reasoning' ? 'bg-orange-500/10 text-orange-500' :
              'bg-green-500/10 text-green-500'
            }`}>
              {currentQuestion.category}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              currentQuestion.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
              currentQuestion.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-red-500/10 text-red-500'
            }`}>
              {currentQuestion.difficulty}
            </span>
          </div>
          <p className="text-foreground text-lg">{currentQuestion.question}</p>
        </GlassCard>

        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleOptionSelect(i)}
              disabled={showExplanation}
              className={cn(
                "w-full p-4 rounded-lg text-left transition-all duration-300 border",
                showExplanation && option.isCorrect
                  ? "bg-green-500/10 border-green-500/40 text-green-500"
                  : showExplanation && selectedOption === i && !option.isCorrect
                  ? "bg-red-500/10 border-red-500/40 text-red-500"
                  : selectedOption === i
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/20 border-border/30 text-foreground hover:border-primary/20 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="font-mono text-sm mr-3 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                  {option.text}
                </div>
                {showExplanation && option.isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                {showExplanation && selectedOption === i && !option.isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
              </div>
            </button>
          ))}
        </div>

        {showExplanation && currentQuestion.explanation && (
          <GlassCard variant="neon" hover={false} className="mb-6 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Explanation:</h4>
            <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
          </GlassCard>
        )}

        <div className="flex gap-4">
          {!showExplanation ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              {currentQuestionIndex < questions.length - 1 ? (
                <>Next Question <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Complete Test <CheckCircle className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AptitudeTest;
