import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, Shield, Users, Building2, Brain, Code, Plus, 
  Edit, Trash2, Save, X, CheckCircle, XCircle, AlertCircle, BookOpen
} from "lucide-react";

interface Option {
  text: string;
  isCorrect: boolean;
}

interface AptitudeQuestion {
  id?: string;
  serialNumber?: number;
  question: string;
  options: Option[];
  explanation: string;
  category: "Verbal" | "Quantitative" | "Reasoning" | "Technical";
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
}

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance", href: "/admin/ai-performance", icon: Brain },
];

const API_BASE_URL = "http://localhost:8000/api/v1/aptitude-questions";

const AptitudeQuestions = () => {
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<"All" | "Verbal" | "Quantitative" | "Reasoning" | "Technical">("All");
  const [filterDifficulty, setFilterDifficulty] = useState<"All" | "Easy" | "Medium" | "Hard">("All");
  const [tagsInput, setTagsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

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
      alert('Failed to load questions. Please check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const [formData, setFormData] = useState<Partial<AptitudeQuestion>>({
    question: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false }
    ],
    explanation: "",
    category: "Verbal",
    difficulty: "Easy",
    tags: []
  });

  const handleEdit = (question: AptitudeQuestion) => {
    setEditingId(question.id!);
    setFormData(question);
    setTagsInput(question.tags.join(", "));
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          loadQuestions();
        }
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Failed to delete question');
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      question: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
      ],
      explanation: "",
      category: "Verbal",
      difficulty: "Easy",
      tags: []
    });
    setTagsInput("");
    setIsAddingNew(true);
    setEditingId(null);
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({
      question: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false }
      ],
      explanation: "",
      category: "Verbal",
      difficulty: "Easy",
      tags: []
    });
    setTagsInput("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const questionData = {
        ...formData,
        tags: tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag)
      };

      const url = isAddingNew ? API_BASE_URL : `${API_BASE_URL}/${editingId}`;
      const method = isAddingNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });

      if (response.ok) {
        loadQuestions();
        handleCancel();
      } else {
        const errorData = await response.json();
        alert(`Failed to save question: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionChange = (index: number, field: keyof Option, value: string | boolean) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };
    
    // If setting isCorrect to true, set all others to false
    if (field === 'isCorrect' && value === true) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }
    
    setFormData({ ...formData, options: newOptions });
  };

  const filteredQuestions = questions.filter(q => {
    const matchesCategory = filterCategory === "All" || q.category === filterCategory;
    const matchesDifficulty = filterDifficulty === "All" || q.difficulty === filterDifficulty;
    return matchesCategory && matchesDifficulty;
  });

  return (
    <DashboardLayout navItems={navItems} title="APTITUDE QUESTIONS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-2">Aptitude Questions</h2>
            <p className="text-sm text-muted-foreground">
              Manage verbal, quantitative, reasoning, and technical aptitude questions
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        {/* Filters */}
        <GlassCard variant="neon">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="px-3 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground"
              >
                <option value="All">All</option>
                <option value="Verbal">Verbal</option>
                <option value="Quantitative">Quantitative</option>
                <option value="Reasoning">Reasoning</option>
                <option value="Technical">Technical</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Difficulty:</label>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value as any)}
                className="px-3 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground"
              >
                <option value="All">All</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Add/Edit Form */}
        {(isAddingNew || editingId) && (
          <GlassCard variant="neon">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {isAddingNew ? 'Add New Question' : 'Edit Question'}
                </h3>
                <button onClick={handleCancel} className="p-1 hover:bg-muted/50 rounded">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground"
                  >
                    <option value="Verbal">Verbal</option>
                    <option value="Quantitative">Quantitative</option>
                    <option value="Reasoning">Reasoning</option>
                    <option value="Technical">Technical</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Question</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground resize-none"
                  rows={3}
                  placeholder="Enter the question..."
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Options</label>
                <div className="space-y-2">
                  {formData.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        className="flex-1 px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground"
                        placeholder={`Option ${index + 1}`}
                      />
                      {option.isCorrect && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground resize-none"
                  rows={2}
                  placeholder="Explain the correct answer..."
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground"
                  placeholder="e.g., algebra, grammar, logic"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-border/50 rounded text-sm text-foreground hover:bg-muted/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Questions List */}
        <GlassCard variant="neon">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading questions...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No questions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-4 border border-border/30 rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-foreground">
                          #{question.serialNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          question.category === 'Verbal' ? 'bg-blue-500/10 text-blue-500' :
                          question.category === 'Quantitative' ? 'bg-purple-500/10 text-purple-500' :
                          question.category === 'Reasoning' ? 'bg-orange-500/10 text-orange-500' :
                          'bg-green-500/10 text-green-500'
                        }`}>
                          {question.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          question.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                          question.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {question.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-2">{question.question}</p>
                      <div className="flex flex-wrap gap-1">
                        {question.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-muted/50 rounded text-xs text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(question)}
                        className="p-2 hover:bg-muted/50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id!)}
                        className="p-2 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default AptitudeQuestions;
