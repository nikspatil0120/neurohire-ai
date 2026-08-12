import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, Shield, Users, Building2, Brain, Code, Plus, 
  Edit, Trash2, Save, X, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Globe, Lock, Wand2, BookOpen
} from "lucide-react";
import { 
  getAllProblems, 
  createProblem, 
  updateProblem, 
  deleteProblem, 
  togglePublishProblem, 
  Problem,
  Example,
  TestCase
} from "@/lib/problemStore";
import { generateBoilerplate, BoilerplateOptions } from "@/lib/boilerplateGenerator";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance", href: "/admin/ai-performance", icon: Brain },
];

// Initial problem data (will be replaced by database data)
const initialProblems: Problem[] = [];

const DSAProblems = () => {
  // Load problems from API on mount
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [tagsInput, setTagsInput] = useState("");
  const [companiesInput, setCompaniesInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load problems from API on component mount
  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    setIsLoading(true);
    try {
      const data = await getAllProblems();
      setProblems(data);
      console.log('Loaded problems from database:', data);
    } catch (error) {
      console.error('Error loading problems:', error);
      alert('Failed to load problems. Please check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };
  const [formData, setFormData] = useState<Partial<Problem>>({
    title: "",
    difficulty: "Easy",
    tags: [],
    companies: [],
    description: "",
    examples: [{ input: "", output: "", explanation: "" }],
    constraints: [""],
    testCases: [{ inputs: [{ value: "", type: "int", description: "" }], expectedOutput: "", visibility: "visible" }],
    codeTemplates: {
      python: "",
      java: "",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "", returnType: "", parameters: [] },
      java: { functionName: "", returnType: "", parameters: [] },
      cpp: { functionName: "", returnType: "", parameters: [] },
      c: { functionName: "", returnType: "", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: false
  });

  const handleEdit = (problem: Problem) => {
    setEditingId(problem.id!);
    setFormData(problem);
    setTagsInput(problem.tags.join(", "));
    setCompaniesInput(problem.companies.join(", "));
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this problem?")) {
      try {
        const success = await deleteProblem(id);
        if (success) {
          await loadProblems(); // Reload from database
        } else {
          alert('Failed to delete problem');
        }
      } catch (error) {
        console.error('Error deleting problem:', error);
        alert('Error deleting problem');
      }
    }
  };

  const togglePublish = async (id: string) => {
    try {
      await togglePublishProblem(id);
      await loadProblems(); // Reload from database
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert('Error toggling publish status');
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      // Parse tags and companies from input strings
      const parsedTags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const parsedCompanies = companiesInput.split(",").map(c => c.trim()).filter(Boolean);

      const problemToSave = {
        ...formData,
        tags: parsedTags,
        companies: parsedCompanies
      };

      if (editingId !== null) {
        // Update existing problem in database
        const updated = await updateProblem(editingId, problemToSave);
        if (updated) {
          console.log('Problem updated successfully:', updated);
          setEditingId(null);
        } else {
          alert('Failed to update problem');
          return;
        }
      } else {
        // Create new problem in database
        try {
          const created = await createProblem(problemToSave as Omit<Problem, 'id'>);
          if (created) {
            console.log('Problem created successfully:', created);
            setIsAddingNew(false);
          } else {
            alert('Failed to create problem');
            return;
          }
        } catch (error: any) {
          console.error('Error creating problem:', error);
          alert(`Failed to create problem: ${error.message}`);
          return;
        }
      }

      // Reload problems from database
      await loadProblems();

      // Reset form and inputs
      setTagsInput("");
      setCompaniesInput("");
      setFormData({
        title: "",
        difficulty: "Easy",
        tags: [],
        companies: [],
        description: "",
        examples: [{ input: "", output: "", explanation: "" }],
        constraints: [""],
        testCases: [{ inputs: [{ value: "", type: "int", description: "" }], expectedOutput: "", visibility: "visible" }],
        codeTemplates: {
          python: "",
          java: "",
          cpp: "",
          c: ""
        },
        functionSignatures: {
          python: { functionName: "", returnType: "", parameters: [] },
          java: { functionName: "", returnType: "", parameters: [] },
          cpp: { functionName: "", returnType: "", parameters: [] },
          c: { functionName: "", returnType: "", parameters: [] }
        },
        stats: {
          likes: 0,
          dislikes: 0,
          acceptance: "0%",
          submissions: "0"
        },
        published: false
      });
    } catch (error) {
      console.error('Error saving problem:', error);
      alert('Error saving problem. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setTagsInput("");
    setCompaniesInput("");
    setFormData({
      title: "",
      difficulty: "Easy",
      tags: [],
      companies: [],
      description: "",
      examples: [{ input: "", output: "", explanation: "" }],
      constraints: [""],
      testCases: [{ inputs: [{ value: "", type: "int", description: "" }], expectedOutput: "", visibility: "visible" }],
      codeTemplates: {
        python: "",
        java: "",
        cpp: "",
        c: ""
      },
      functionSignatures: {
        python: { functionName: "", returnType: "", parameters: [] },
        java: { functionName: "", returnType: "", parameters: [] },
        cpp: { functionName: "", returnType: "", parameters: [] },
        c: { functionName: "", returnType: "", parameters: [] }
      },
      stats: {
        likes: 0,
        dislikes: 0,
        acceptance: "0%",
        submissions: "0"
      },
      published: false
    });
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setTagsInput("");
    setCompaniesInput("");
  };

  const addExample = () => {
    setFormData({
      ...formData,
      examples: [...(formData.examples || []), { input: "", output: "", explanation: "" }]
    });
  };

  const addConstraint = () => {
    setFormData({
      ...formData,
      constraints: [...(formData.constraints || []), ""]
    });
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...(formData.testCases || []), { inputs: [{ value: "", type: "int", description: "" }], expectedOutput: "", visibility: "visible" }]
    });
  };

  const updateExample = (index: number, field: keyof Example, value: string) => {
    const newExamples = [...(formData.examples || [])];
    newExamples[index] = { ...newExamples[index], [field]: value };
    setFormData({ ...formData, examples: newExamples });
  };

  const updateConstraint = (index: number, value: string) => {
    const newConstraints = [...(formData.constraints || [])];
    newConstraints[index] = value;
    setFormData({ ...formData, constraints: newConstraints });
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const newTestCases = [...(formData.testCases || [])];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData({ ...formData, testCases: newTestCases });
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples?.filter((_, i) => i !== index)
    });
  };

  const removeConstraint = (index: number) => {
    setFormData({
      ...formData,
      constraints: formData.constraints?.filter((_, i) => i !== index)
    });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      testCases: formData.testCases?.filter((_, i) => i !== index)
    });
  };

  const addInputToTestCase = (testCaseIndex: number) => {
    const newTestCases = [...(formData.testCases || [])];
    newTestCases[testCaseIndex].inputs.push({ value: "", type: "int", description: "" });
    setFormData({ ...formData, testCases: newTestCases });
  };

  const removeInputFromTestCase = (testCaseIndex: number, inputIndex: number) => {
    const newTestCases = [...(formData.testCases || [])];
    newTestCases[testCaseIndex].inputs = newTestCases[testCaseIndex].inputs.filter((_, i) => i !== inputIndex);
    setFormData({ ...formData, testCases: newTestCases });
  };

  const updateTestCaseInput = (testCaseIndex: number, inputIndex: number, field: string, value: string) => {
    const newTestCases = [...(formData.testCases || [])];
    newTestCases[testCaseIndex].inputs[inputIndex] = { 
      ...newTestCases[testCaseIndex].inputs[inputIndex], 
      [field]: value 
    };
    setFormData({ ...formData, testCases: newTestCases });
  };

  const generateBoilerplateForLanguage = (language: "python" | "java" | "cpp" | "c") => {
    if (!formData.testCases || formData.testCases.length === 0) {
      alert("Please add at least one test case first to define the input structure.");
      return;
    }

    if (!formData.functionSignatures || !formData.functionSignatures[language]) {
      alert("Please define the function signature first.");
      return;
    }

    const firstTestCase = formData.testCases[0];
    const functionSig = formData.functionSignatures[language];

    const options: BoilerplateOptions = {
      functionName: functionSig.functionName,
      returnType: functionSig.returnType,
      parameters: functionSig.parameters,
      inputs: firstTestCase.inputs,
      language
    };

    const boilerplate = generateBoilerplate(options);
    
    setFormData({
      ...formData,
      codeTemplates: {
        ...formData.codeTemplates,
        [language]: boilerplate
      }
    });
  };

  const generateAllBoilerplates = () => {
    const languages: Array<"python" | "java" | "cpp" | "c"> = ["python", "java", "cpp", "c"];
    languages.forEach(lang => generateBoilerplateForLanguage(lang));
  };

  const isEditing = editingId !== null || isAddingNew;

  // Filter problems based on status
  const filteredProblems = problems.filter(problem => {
    if (filterStatus === "published") return problem.published;
    if (filterStatus === "draft") return !problem.published;
    return true; // "all"
  });

  return (
    <DashboardLayout navItems={navItems} title="DSA PROBLEMS MANAGEMENT">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground">Problem Statements</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage coding problem statements for candidates · {problems.filter(p => p.published).length} published, {problems.filter(p => !p.published).length} draft
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:shadow-[0_0_20px_hsl(185_100%_50%/0.4)] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Problem
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === "all"
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
              }`}
            >
              All Problems ({problems.length})
            </button>
            <button
              onClick={() => setFilterStatus("published")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filterStatus === "published"
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
              }`}
            >
              <Globe className="w-4 h-4" />
              Published ({problems.filter(p => p.published).length})
            </button>
            <button
              onClick={() => setFilterStatus("draft")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filterStatus === "draft"
                  ? "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
              }`}
            >
              <Lock className="w-4 h-4" />
              Draft ({problems.filter(p => !p.published).length})
            </button>
          </div>
        )}

        {/* Edit/Add Form */}
        {isEditing && (
          <GlassCard variant="neon" hover={false}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  {editingId !== null ? "Edit Problem" : "Add New Problem"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/40 rounded-lg font-medium flex items-center gap-2 hover:bg-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg font-medium flex items-center gap-2 hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="e.g., Two Sum"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Difficulty *</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as "Easy" | "Medium" | "Hard" })}
                    className="w-full px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="e.g., Array, Hash Table, Dynamic Programming"
                />
              </div>

              {/* Companies */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Companies (comma-separated)</label>
                <input
                  type="text"
                  value={companiesInput}
                  onChange={(e) => setCompaniesInput(e.target.value)}
                  className="w-full px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="e.g., Google, Amazon, Microsoft"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all resize-none"
                  rows={3}
                  placeholder="Describe the problem..."
                />
              </div>

              {/* Publish Status */}
              <div className="p-4 bg-muted/20 border border-border/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Publication Status</label>
                    <p className="text-xs text-muted-foreground">
                      {formData.published 
                        ? "This problem is visible to all candidates" 
                        : "This problem is in draft mode and not visible to candidates"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, published: !formData.published })}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                      formData.published
                        ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                        : "bg-gray-500/20 text-gray-400 border border-gray-500/40 hover:bg-gray-500/30"
                    }`}
                  >
                    {formData.published ? (
                      <>
                        <Globe className="w-4 h-4" />
                        Published
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Draft
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Examples */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-muted-foreground">Examples</label>
                  <button
                    onClick={addExample}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Example
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.examples?.map((example, index) => (
                    <div key={index} className="p-3 bg-muted/20 border border-border/30 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Example {index + 1}</span>
                        {(formData.examples?.length || 0) > 1 && (
                          <button
                            onClick={() => removeExample(index)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={example.input}
                        onChange={(e) => updateExample(index, "input", e.target.value)}
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50"
                        placeholder="Input"
                      />
                      <input
                        type="text"
                        value={example.output}
                        onChange={(e) => updateExample(index, "output", e.target.value)}
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50"
                        placeholder="Output"
                      />
                      <input
                        type="text"
                        value={example.explanation || ""}
                        onChange={(e) => updateExample(index, "explanation", e.target.value)}
                        className="w-full px-3 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50"
                        placeholder="Explanation (optional)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-muted-foreground">Constraints</label>
                  <button
                    onClick={addConstraint}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Constraint
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.constraints?.map((constraint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={constraint}
                        onChange={(e) => updateConstraint(index, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50"
                        placeholder="e.g., 1 <= n <= 1000"
                      />
                      {(formData.constraints?.length || 0) > 1 && (
                        <button
                          onClick={() => removeConstraint(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-sm text-muted-foreground font-semibold block">Test Cases</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add multiple test cases · Mark some as visible, others as hidden
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg text-sm font-medium hover:bg-primary/30 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Test Case
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.testCases?.map((testCase, testCaseIndex) => (
                    <div key={testCaseIndex} className="p-4 bg-muted/20 border-2 border-border/40 rounded-lg space-y-3 hover:border-primary/40 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">Test Case {testCaseIndex + 1}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            testCase.visibility === "visible" 
                              ? "bg-green-500/20 text-green-400 border border-green-500/40" 
                              : "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                          }`}>
                            {testCase.visibility === "visible" ? "👁️ Visible" : "🔒 Hidden"}
                          </span>
                        </div>
                        {(formData.testCases?.length || 0) > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTestCase(testCaseIndex)}
                            className="p-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded hover:bg-red-500/30 transition-all"
                            title="Remove this test case"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Multiple Inputs */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-muted-foreground">Inputs</label>
                          <button
                            type="button"
                            onClick={() => addInputToTestCase(testCaseIndex)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Input
                          </button>
                        </div>
                        <div className="space-y-3">
                          {testCase.inputs.map((input, inputIndex) => (
                            <div key={inputIndex} className="p-3 bg-muted/20 border border-border/30 rounded space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-primary">Input {inputIndex + 1}</span>
                                {testCase.inputs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeInputFromTestCase(testCaseIndex, inputIndex)}
                                    className="p-1 text-red-400 hover:text-red-300"
                                    title="Remove this input"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Value</label>
                                <input
                                  type="text"
                                  value={input.value}
                                  onChange={(e) => updateTestCaseInput(testCaseIndex, inputIndex, "value", e.target.value)}
                                  className="w-full px-2 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                                  placeholder={`e.g., ${inputIndex === 0 ? '2 7 11 15' : '9'}`}
                                />
                              </div>
                              
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                                <select
                                  value={input.type}
                                  onChange={(e) => updateTestCaseInput(testCaseIndex, inputIndex, "type", e.target.value)}
                                  className="w-full px-2 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                                >
                                  <option value="int">int</option>
                                  <option value="int[]">int[]</option>
                                  <option value="string">string</option>
                                  <option value="string[]">string[]</option>
                                  <option value="long">long</option>
                                  <option value="double">double</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                                <input
                                  type="text"
                                  value={input.description}
                                  onChange={(e) => updateTestCaseInput(testCaseIndex, inputIndex, "description", e.target.value)}
                                  className="w-full px-2 py-1.5 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                                  placeholder="e.g., Array of integers"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Expected Output</label>
                        <input
                          type="text"
                          value={testCase.expectedOutput}
                          onChange={(e) => updateTestCase(testCaseIndex, "expectedOutput", e.target.value)}
                          className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all"
                          placeholder="e.g., [0,1]"
                        />
                      </div>
                      
                      {/* Visibility Toggle */}
                      <div className="flex items-center gap-2 pt-2">
                        <label className="text-xs text-muted-foreground">Visibility:</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateTestCase(testCaseIndex, "visibility", "visible")}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                              testCase.visibility === "visible"
                                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                                : "bg-muted/30 text-muted-foreground border border-border/30 hover:border-border"
                            }`}
                          >
                            👁️ Visible to Candidates
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTestCase(testCaseIndex, "visibility", "hidden")}
                            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                              testCase.visibility === "hidden"
                                ? "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                                : "bg-muted/30 text-muted-foreground border border-border/30 hover:border-border"
                            }`}
                          >
                            🔒 Hidden (for evaluation)
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Templates */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground font-semibold">
                    Code Templates / Boilerplate Code
                  </label>
                  <button
                    type="button"
                    onClick={generateAllBoilerplates}
                    className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded text-xs font-medium flex items-center gap-2 hover:bg-primary/30 transition-all"
                  >
                    <Wand2 className="w-3 h-3" />
                    Auto-Generate All
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Provide starter code for each language. Candidates will see this as the initial code in the editor.
                  <span className="text-primary ml-2">Click "Auto-Generate All" to create boilerplates based on your test cases and function signatures.</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Python */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                      <span className="text-lg">🐍</span> Python Template
                    </label>
                    <textarea
                      value={formData.codeTemplates?.python || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        codeTemplates: {
                          ...formData.codeTemplates!,
                          python: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-all resize-none"
                      rows={8}
                      placeholder="# Python boilerplate code"
                    />
                  </div>

                  {/* Java */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                      <span className="text-lg">☕</span> Java Template
                    </label>
                    <textarea
                      value={formData.codeTemplates?.java || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        codeTemplates: {
                          ...formData.codeTemplates!,
                          java: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-all resize-none"
                      rows={8}
                      placeholder="// Java boilerplate code"
                    />
                  </div>

                  {/* C++ */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                      <span className="text-lg">🔷</span> C++ Template
                    </label>
                    <textarea
                      value={formData.codeTemplates?.cpp || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        codeTemplates: {
                          ...formData.codeTemplates!,
                          cpp: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-all resize-none"
                      rows={8}
                      placeholder="// C++ boilerplate code"
                    />
                  </div>

                  {/* C */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                      <span className="text-lg">⚡</span> C Template
                    </label>
                    <textarea
                      value={formData.codeTemplates?.c || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        codeTemplates: {
                          ...formData.codeTemplates!,
                          c: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground font-mono focus:outline-none focus:border-primary/50 transition-all resize-none"
                      rows={8}
                      placeholder="// C boilerplate code"
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Problems List */}
        {!isEditing && isLoading && (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading problems from database...</p>
            </div>
          </GlassCard>
        )}
        
        {!isEditing && !isLoading && (
          <div className="grid grid-cols-1 gap-4">
            {filteredProblems.map((problem) => (
              <GlassCard key={problem.id} variant="neon" hover>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-foreground">
                          {problem.id}. {problem.title}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                          problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {problem.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                          problem.published 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
                            : 'bg-gray-500/10 text-gray-500 border border-gray-500/30'
                        }`}>
                          {problem.published ? (
                            <>
                              <Globe className="w-3 h-3" />
                              Published
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              Draft
                            </>
                          )}
                        </span>
                      </div>
                      
                      {/* Tags & Companies */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {problem.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {problem.companies.slice(0, 3).map((company, i) => (
                          <span key={i} className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-xs">
                            {company}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-3">{problem.description}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>{problem.stats.acceptance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{problem.stats.submissions}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>👍 {(problem.stats.likes / 1000).toFixed(1)}k</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => togglePublish(problem.id!)}
                        className={`p-2 rounded-lg border transition-all ${
                          problem.published
                            ? "bg-gray-500/20 text-gray-400 border-gray-500/40 hover:bg-gray-500/30"
                            : "bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30"
                        }`}
                        title={problem.published ? "Unpublish" : "Publish"}
                      >
                        {problem.published ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(problem)}
                        className="p-2 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-lg hover:bg-blue-500/30 transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(problem.id!)}
                        className="p-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/30 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Examples Preview */}
                  <div className="border-t border-border/30 pt-3">
                    <span className="text-xs text-muted-foreground font-semibold">Examples:</span>
                    <div className="mt-2 space-y-2">
                      {problem.examples.slice(0, 2).map((example, i) => (
                        <div key={i} className="text-xs font-mono bg-muted/20 p-2 rounded">
                          <div><strong>Input:</strong> {example.input}</div>
                          <div><strong>Output:</strong> {example.output}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test Cases Count */}
                  <div className="border-t border-border/30 pt-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{problem.testCases.length} test cases total</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">
                          {problem.testCases.filter(tc => tc.visibility === "visible").length} visible
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400">
                          {problem.testCases.filter(tc => tc.visibility === "hidden").length} hidden
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProblems.length === 0 && !isEditing && (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {filterStatus === "published" && "No published problems yet"}
                {filterStatus === "draft" && "No draft problems"}
                {filterStatus === "all" && "No problems added yet"}
              </p>
              {filterStatus === "all" && (
                <button
                  onClick={handleAddNew}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-lg font-medium inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Problem
                </button>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DSAProblems;
