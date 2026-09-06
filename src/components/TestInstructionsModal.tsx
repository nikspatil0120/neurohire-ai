import { useState, useEffect, useRef } from "react";
import { X, BookOpen, Code2, Video, AlertTriangle, Shield, CheckCircle } from "lucide-react";

// ── Content config ─────────────────────────────────────────────────────────────

export type TestType = "aptitude" | "coding" | "interview";

interface RuleSection {
  title: string;
  rules: string[];
}

interface TestContent {
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
  intro: string;
  ruleSections: RuleSection[];
  ethicsTitle: string;
  ethicsText: string;
  warning: string;
  agreementText: string;
  ctaLabel: string;
}

const CONTENT: Record<TestType, TestContent> = {
  aptitude: {
    icon: <BookOpen className="w-6 h-6" />,
    iconColor: "text-orange-400",
    borderColor: "border-orange-500/40",
    title: "Aptitude Assessment",
    subtitle: "Aptitude Test — Instructions",
    intro:
      "This aptitude assessment is designed to evaluate logical reasoning, quantitative ability, verbal ability, and problem-solving skills.",
    ruleSections: [
      {
        title: "Test Rules",
        rules: [
          "Stay on the test window throughout the assessment.",
          "Tab switching is not allowed.",
          "Opening a new browser tab or window is not permitted.",
          "Do not copy, paste, screenshot, or share test questions.",
          "Do not seek help from another person or use unauthorized resources.",
          "The test session is strictly proctored and activity may be monitored.",
          "Attempting to bypass or interfere with the proctoring system may result in test termination or disqualification.",
          "Complete the test within the allotted time.",
          "Make sure you have a stable internet connection before starting.",
        ],
      },
    ],
    ethicsTitle: "Ethical Testing",
    ethicsText:
      "Please attempt the assessment honestly and independently. The purpose of this test is to evaluate your actual skills and abilities.",
    warning:
      "Leaving the test window, switching tabs, or attempting to bypass the proctoring system may result in termination or disqualification.",
    agreementText: "I have read and agree to follow the test rules.",
    ctaLabel: "Agree & Start Test",
  },
  coding: {
    icon: <Code2 className="w-6 h-6" />,
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/40",
    title: "Technical Coding Round",
    subtitle: "Technical Coding Round — Instructions",
    intro:
      "This coding assessment evaluates your programming skills, problem-solving ability, logical thinking, and understanding of technical concepts.",
    ruleSections: [
      {
        title: "Test Rules",
        rules: [
          "Remain on the coding test window for the entire assessment.",
          "Tab switching is strictly prohibited.",
          "Opening another browser tab or window is not allowed.",
          "Write and test your code only within the provided coding environment unless explicitly permitted otherwise.",
          "Do not copy code, questions, or solutions from external sources.",
          "Do not receive assistance from another person or external AI/code-generation tools unless explicitly permitted.",
          "Do not share or capture assessment questions or solutions.",
          "The coding session is strictly proctored and activity may be monitored.",
          "Repeated attempts to leave the assessment environment or bypass proctoring may lead to automatic termination or disqualification.",
          "Submit your solutions before the deadline.",
        ],
      },
    ],
    ethicsTitle: "Write Your Own Code",
    ethicsText:
      "Your submission should represent your own understanding and problem-solving ability.",
    warning:
      "Leaving the test window, switching tabs, or attempting to bypass the proctoring system may result in termination or disqualification.",
    agreementText: "I have read and agree to follow the coding assessment rules.",
    ctaLabel: "Agree & Start Test",
  },
  interview: {
    icon: <Video className="w-6 h-6" />,
    iconColor: "text-purple-400",
    borderColor: "border-purple-500/40",
    title: "Interview Round",
    subtitle: "Interview Round — Instructions",
    intro:
      "This interview is designed to evaluate technical knowledge, communication skills, problem-solving approach, and ability to explain your thoughts clearly.",
    ruleSections: [
      {
        title: "Interview Rules",
        rules: [
          "Ensure your camera and microphone are working if required.",
          "Stay on the interview window throughout the session.",
          "Tab switching is strictly prohibited.",
          "Do not open another browser tab or window during the interview.",
          "Do not receive assistance from another person.",
          "Do not use unauthorized external resources, search engines, or AI assistance unless explicitly permitted.",
          "The interview is strictly proctored and activity may be monitored.",
          "Do not record, screenshot, or share interview questions or content.",
          "Attempts to bypass the proctoring system may result in termination or disqualification.",
          "Remain attentive throughout the interview.",
        ],
      },
    ],
    ethicsTitle: "Be Yourself",
    ethicsText:
      "Answer questions honestly and explain your reasoning clearly. The goal is to understand how you think, communicate, and solve problems—not just the final answer.",
    warning:
      "Leaving the interview window, switching tabs, or attempting to bypass the proctoring system may result in termination or disqualification.",
    agreementText: "I have read and agree to follow the interview rules.",
    ctaLabel: "Agree & Start Interview",
  },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface TestInstructionsModalProps {
  testType: TestType;
  onClose: () => void;
  onStart: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

const TestInstructionsModal = ({ testType, onClose, onStart }: TestInstructionsModalProps) => {
  const [agreed, setAgreed] = useState(false);
  const content = CONTENT[testType];
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Trap focus inside modal
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${content.title} Instructions`}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`bg-background rounded-2xl border ${content.borderColor} shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-muted/20 flex items-center justify-center ${content.iconColor}`}>
              {content.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Before You Begin</p>
              <h2 className="text-lg font-semibold text-foreground leading-tight">{content.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close instructions"
            className="p-2 rounded-lg bg-muted/20 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Subtitle + intro */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-2">{content.subtitle}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.intro}</p>
          </div>

          {/* Rule sections */}
          {content.ruleSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Ethics */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              {content.ethicsTitle}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.ethicsText}</p>
          </div>

          {/* Warning */}
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" />
              Important Warning
            </h4>
            <p className="text-sm text-red-400/90 leading-relaxed">{content.warning}</p>
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer"
              aria-label={content.agreementText}
            />
            <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors select-none">
              {content.agreementText}
            </span>
          </label>
        </div>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-border/30 flex items-center justify-between gap-4 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/40 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            disabled={!agreed}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide transition-all
              hover:shadow-[0_0_24px_hsl(185_100%_50%/0.4)]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
            aria-disabled={!agreed}
          >
            {content.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestInstructionsModal;
