import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Save, 
  CheckCircle, ChevronDown, ChevronUp, Plus, Trash2, Code, BookOpen, XCircle, Briefcase 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Jobs Created", href: "/recruiter/jobs-created", icon: Briefcase },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

interface AptitudeQuestion {
  id: string;
  question: string;
  type: "MCQ" | "MSQ" | "NAT";
  options: string[];
  correctAnswer: number | number[] | string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
}

interface CodingProblem {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  testCases: { inputs: any[]; expectedOutput: string; visibility: "visible" | "hidden" }[];
  codeTemplates: {
    python: string;
    java: string;
    cpp: string;
    c: string;
  };
}

const EditJob = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    minExperience: "",
    requiredSkills: [] as string[],
    keyResponsibilities: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Aptitude and Coding round states
  const [showAptitudeRound, setShowAptitudeRound] = useState(false);
  const [showCodingRound, setShowCodingRound] = useState(false);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([]);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
  
  // Expanded sections
  const [expandedAptitude, setExpandedAptitude] = useState(false);
  const [expandedCoding, setExpandedCoding] = useState(false);

  // Load existing job data
  useEffect(() => {
    loadJobData();
  }, [jobId]);

  const loadJobData = async () => {
    if (!jobId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load job');
      }
      
      const data = await response.json();
      console.log('[EditJob] Job data:', data);
      
      // Parse experience to extract number
      const experienceMatch = data.experience?.match(/(\d+(\.\d+)?)/);
      const minExperience = experienceMatch ? experienceMatch[1] : "";
      
      setFormData({
        title: data.title || "",
        minExperience: minExperience,
        requiredSkills: data.required_skills || [],
        keyResponsibilities: (data.key_responsibilities || []).join(", ")
      });
      
      setAptitudeQuestions(data.aptitude_questions || []);
      setCodingProblems(data.coding_problems || []);
      
      if (data.aptitude_questions && data.aptitude_questions.length > 0) {
        setShowAptitudeRound(true);
      }
      if (data.coding_problems && data.coding_problems.length > 0) {
        setShowCodingRound(true);
      }
      
    } catch (error) {
      console.error('[EditJob] Error loading job:', error);
      toast({
        title: "Error",
        description: "Failed to load job data",
        variant: "destructive"
      });
      navigate('/recruiter/jobs-created');
    } finally {
      setIsLoading(false);
    }
  };

  // Get recruiter info from localStorage
  const getRecruiterInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return {
          id: user.id || '',
          email: user.email || '',
          name: user.name || user.full_name || '',
          organization: user.organization_name || ''
        };
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return {
      id: '',
      email: '',
      name: '',
      organization: ''
    };
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.minExperience.trim()) {
      toast({
        title: "Validation Error",
        description: "Minimum experience is required",
        variant: "destructive"
      });
      return;
    }

    if (formData.requiredSkills.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one skill is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.keyResponsibilities.trim()) {
      toast({
        title: "Validation Error",
        description: "Key responsibilities are required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const recruiterInfo = getRecruiterInfo();

      // Parse responsibilities
      const responsibilitiesArray = formData.keyResponsibilities
        .split(/[,\n]/)
        .map(resp => resp.trim())
        .filter(resp => resp.length > 0);

      // Prepare request payload
      const payload = {
        title: formData.title.trim(),
        experience: `${formData.minExperience}+ years`,
        required_skills: formData.requiredSkills,
        key_responsibilities: responsibilitiesArray,
        recruiter_id: recruiterInfo.id,
        recruiter_email: recruiterInfo.email,
        recruiter_name: recruiterInfo.name,
        organization_name: recruiterInfo.organization,
        aptitude_questions: aptitudeQuestions,
        coding_problems: codingProblems,
        status: "draft"
      };

      console.log('[EditJob] Updating job:', payload);

      // Make API call
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      console.log('[EditJob] Response:', data);

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Job updated successfully",
          duration: 3000
        });

        // Navigate to Jobs Created page
        setTimeout(() => {
          navigate('/recruiter/jobs-created');
        }, 2000);
      } else {
        throw new Error(data.detail || 'Failed to update job');
      }
    } catch (error) {
      console.error('[EditJob] Error updating job:', error);
      
      let displayMessage = 'Failed to update job';
      if (error instanceof Error) {
        displayMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: displayMessage,
        variant: "destructive",
        duration: 10000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="EDIT JOB">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="EDIT JOB">
      <div className="max-w-3xl space-y-6">
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-6">Job Details</h3>
          <div className="space-y-4">
            {/* Job Title */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Senior Frontend Developer" 
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" 
              />
            </div>

            {/* Minimum Experience Required */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Minimum Experience Required (Years) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                name="minExperience"
                value={formData.minExperience}
                onChange={handleChange}
                placeholder="e.g., 3" 
                min="0"
                step="0.5"
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" 
              />
            </div>

            {/* Required Skills */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Required Skills <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {/* Skills Tags Display */}
                {formData.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.requiredSkills.map((skill, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-full text-sm"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              requiredSkills: prev.requiredSkills.filter((_, i) => i !== index)
                            }));
                          }}
                          className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Skill Input */}
                <input 
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      e.preventDefault();
                      if (!formData.requiredSkills.includes(skillInput.trim())) {
                        setFormData(prev => ({
                          ...prev,
                          requiredSkills: [...prev.requiredSkills, skillInput.trim()]
                        }));
                      }
                      setSkillInput("");
                    }
                  }}
                  placeholder="Type a skill and press Enter (e.g., React.js)" 
                  className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" 
                />
                <p className="text-xs text-muted-foreground">Press Enter after typing each skill to add it</p>
              </div>
            </div>

            {/* Key Responsibilities */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Key Responsibilities <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="keyResponsibilities"
                value={formData.keyResponsibilities}
                onChange={handleChange}
                placeholder="e.g., Develop and maintain frontend applications, Collaborate with design team, Write clean and maintainable code, Conduct code reviews"
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all resize-none" 
              />
              <p className="text-xs text-muted-foreground mt-1">Enter responsibilities separated by commas or new lines</p>
            </div>

            {/* Aptitude Round Toggle */}
            <div className="pt-4 border-t border-border/30">
              <button
                type="button"
                onClick={() => {
                  setShowAptitudeRound(!showAptitudeRound);
                  if (!showAptitudeRound) setExpandedAptitude(true);
                }}
                className={`w-full px-4 py-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-between ${
                  showAptitudeRound 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium">Add Aptitude Round</span>
                  {showAptitudeRound && aptitudeQuestions.length > 0 && (
                    <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                      {aptitudeQuestions.length} question{aptitudeQuestions.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {showAptitudeRound ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Technical Coding Round Toggle */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowCodingRound(!showCodingRound);
                  if (!showCodingRound) setExpandedCoding(true);
                }}
                className={`w-full px-4 py-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-between ${
                  showCodingRound 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  <span className="font-medium">Add Technical Coding Round</span>
                  {showCodingRound && codingProblems.length > 0 && (
                    <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                      {codingProblems.length} problem{codingProblems.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {showCodingRound ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Aptitude Round Section */}
        {showAptitudeRound && (
          <GlassCard variant="neon" hover={false}>
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedAptitude(!expandedAptitude)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-semibold">Aptitude Round Questions</h3>
                <span className="text-xs text-muted-foreground">
                  ({aptitudeQuestions.length} questions)
                </span>
              </div>
              {expandedAptitude ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {expandedAptitude && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add aptitude questions for this job's screening test.
                </p>
                
                <button
                  type="button"
                  onClick={() => {
                    const newQuestion: AptitudeQuestion = {
                      id: Date.now().toString(),
                      question: "",
                      type: "MCQ",
                      options: ["", ""],
                      correctAnswer: 0,
                      difficulty: "Easy",
                      topic: ""
                    };
                    setAptitudeQuestions([...aptitudeQuestions, newQuestion]);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>

                {/* Questions List */}
                <div className="space-y-4">
                  {aptitudeQuestions.map((question, index) => (
                    <div key={question.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Question {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAptitudeQuestions(aptitudeQuestions.filter(q => q.id !== question.id));
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question Type */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-muted-foreground">Question Type:</label>
                        <select
                          value={question.type}
                          onChange={(e) => {
                            const updated = [...aptitudeQuestions];
                            const newType = e.target.value as "MCQ" | "MSQ" | "NAT";
                            updated[index].type = newType;
                            
                            if (newType === "NAT") {
                              updated[index].options = [];
                              updated[index].correctAnswer = "";
                            } else if (newType === "MCQ") {
                              updated[index].options = question.options.length > 0 ? question.options : ["", ""];
                              updated[index].correctAnswer = 0;
                            } else if (newType === "MSQ") {
                              updated[index].options = question.options.length > 0 ? question.options : ["", ""];
                              updated[index].correctAnswer = [];
                            }
                            setAptitudeQuestions(updated);
                          }}
                          className="px-3 py-1.5 rounded bg-background/50 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50"
                        >
                          <option value="MCQ">MCQ (Single Answer)</option>
                          <option value="MSQ">MSQ (Multiple Answers)</option>
                          <option value="NAT">NAT (Numerical Answer)</option>
                        </select>
                      </div>

                      {/* Question Text */}
                      <textarea
                        placeholder="Enter question"
                        value={question.question}
                        onChange={(e) => {
                          const updated = [...aptitudeQuestions];
                          updated[index].question = e.target.value;
                          setAptitudeQuestions(updated);
                        }}
                        className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50"
                        rows={2}
                      />

                      {/* Options for MCQ/MSQ */}
                      {(question.type === "MCQ" || question.type === "MSQ") && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">Options:</label>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...aptitudeQuestions];
                                updated[index].options.push("");
                                setAptitudeQuestions(updated);
                              }}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add Option
                            </button>
                          </div>
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              {question.type === "MCQ" ? (
                                <input
                                  type="radio"
                                  checked={question.correctAnswer === optIndex}
                                  onChange={() => {
                                    const updated = [...aptitudeQuestions];
                                    updated[index].correctAnswer = optIndex;
                                    setAptitudeQuestions(updated);
                                  }}
                                  className="w-4 h-4 accent-primary"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(question.correctAnswer) && question.correctAnswer.includes(optIndex)}
                                  onChange={(e) => {
                                    const updated = [...aptitudeQuestions];
                                    let correctAnswers = Array.isArray(updated[index].correctAnswer) 
                                      ? [...updated[index].correctAnswer as number[]] 
                                      : [];
                                    
                                    if (e.target.checked) {
                                      correctAnswers.push(optIndex);
                                    } else {
                                      correctAnswers = correctAnswers.filter(idx => idx !== optIndex);
                                    }
                                    updated[index].correctAnswer = correctAnswers;
                                    setAptitudeQuestions(updated);
                                  }}
                                  className="w-4 h-4 accent-primary"
                                />
                              )}
                              <input
                                type="text"
                                placeholder={`Option ${optIndex + 1}`}
                                value={option}
                                onChange={(e) => {
                                  const updated = [...aptitudeQuestions];
                                  updated[index].options[optIndex] = e.target.value;
                                  setAptitudeQuestions(updated);
                                }}
                                className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                              />
                              {question.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...aptitudeQuestions];
                                    updated[index].options.splice(optIndex, 1);
                                    if (question.type === "MCQ" && question.correctAnswer === optIndex) {
                                      updated[index].correctAnswer = 0;
                                    } else if (question.type === "MSQ" && Array.isArray(question.correctAnswer)) {
                                      updated[index].correctAnswer = (question.correctAnswer as number[])
                                        .filter(idx => idx !== optIndex)
                                        .map(idx => idx > optIndex ? idx - 1 : idx);
                                    }
                                    setAptitudeQuestions(updated);
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Numerical Answer for NAT */}
                      {question.type === "NAT" && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Correct Answer:</label>
                          <input
                            type="text"
                            placeholder="Enter numerical answer (e.g., 42 or 3.14)"
                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                            onChange={(e) => {
                              const updated = [...aptitudeQuestions];
                              updated[index].correctAnswer = e.target.value;
                              setAptitudeQuestions(updated);
                            }}
                            className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      )}

                      {/* Difficulty and Topic */}
                      <div className="flex gap-3">
                        <select
                          value={question.difficulty}
                          onChange={(e) => {
                            const updated = [...aptitudeQuestions];
                            updated[index].difficulty = e.target.value as "Easy" | "Medium" | "Hard";
                            setAptitudeQuestions(updated);
                          }}
                          className="px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Topic (e.g., Logical Reasoning)"
                          value={question.topic}
                          onChange={(e) => {
                            const updated = [...aptitudeQuestions];
                            updated[index].topic = e.target.value;
                            setAptitudeQuestions(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Technical Coding Round Section */}
        {showCodingRound && (
          <GlassCard variant="neon" hover={false}>
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedCoding(!expandedCoding)}
            >
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-semibold">Technical Coding Round Problems</h3>
                <span className="text-xs text-muted-foreground">
                  ({codingProblems.length} problems)
                </span>
              </div>
              {expandedCoding ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {expandedCoding && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add coding problems for this job's technical assessment.
                </p>
                
                <button
                  type="button"
                  onClick={() => {
                    const newProblem: CodingProblem = {
                      id: Date.now().toString(),
                      title: "",
                      description: "",
                      difficulty: "Easy",
                      tags: [],
                      testCases: [{ inputs: [], expectedOutput: "", visibility: "visible" }],
                      codeTemplates: {
                        python: "def solution():\n    # Write your code here\n    pass",
                        java: "class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}",
                        cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}",
                        c: "#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}"
                      }
                    };
                    setCodingProblems([...codingProblems, newProblem]);
                  }}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Problem
                </button>

                {/* Problems List */}
                <div className="space-y-4">
                  {codingProblems.map((problem, index) => (
                    <div key={problem.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Problem {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCodingProblems(codingProblems.filter(p => p.id !== problem.id));
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Problem Title"
                        value={problem.title}
                        onChange={(e) => {
                          const updated = [...codingProblems];
                          updated[index].title = e.target.value;
                          setCodingProblems(updated);
                        }}
                        className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                      />

                      <textarea
                        placeholder="Problem Description"
                        value={problem.description}
                        onChange={(e) => {
                          const updated = [...codingProblems];
                          updated[index].description = e.target.value;
                          setCodingProblems(updated);
                        }}
                        className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50"
                        rows={3}
                      />

                      <div className="flex gap-3">
                        <select
                          value={problem.difficulty}
                          onChange={(e) => {
                            const updated = [...codingProblems];
                            updated[index].difficulty = e.target.value as "Easy" | "Medium" | "Hard";
                            setCodingProblems(updated);
                          }}
                          className="px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Tags (comma separated)"
                          value={problem.tags.join(", ")}
                          onChange={(e) => {
                            const updated = [...codingProblems];
                            updated[index].tags = e.target.value.split(",").map(t => t.trim()).filter(t => t);
                            setCodingProblems(updated);
                          }}
                          className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
          <button
            onClick={() => navigate('/recruiter/jobs-created')}
            className="px-6 py-3 rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditJob;
