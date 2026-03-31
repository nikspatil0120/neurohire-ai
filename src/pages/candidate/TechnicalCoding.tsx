import GlassCard from "@/components/GlassCard";
import { Clock, Play, Send, CheckCircle, XCircle, Brain, ChevronDown, Code, ArrowLeft, Settings, Maximize2, RotateCcw, ThumbsUp, ThumbsDown, Eye, Users, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const TechnicalCoding = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'testcase' | 'result'>('testcase');
  const [customInput, setCustomInput] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(45); // Percentage

  // Problem data
  const problemData = {
    id: 5,
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    tags: ["String", "Dynamic Programming"],
    companies: ["Amazon", "Microsoft", "Google"],
    description: "Given a string s, return the longest palindromic substring in s.",
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer.'
      },
      {
        input: 's = "cbbd"',
        output: '"bb"'
      }
    ],
    constraints: [
      "1 <= s.length <= 1000",
      "s consist of only digits and English letters."
    ],
    stats: {
      likes: 32500,
      dislikes: 587,
      acceptance: "32.1%",
      submissions: "4.2M"
    }
  };

  const languages = [
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'cpp', name: 'C++', icon: '🔷' },
    { id: 'c', name: 'C', icon: '⚡' }
  ];

  const codeTemplates = {
    python: `# Write your complete solution here
# Read input and print output

s = input().strip()

def longest_palindrome(s):
    # Write your code here
    return s  # placeholder

result = longest_palindrome(s)
print(result)`,
    java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.nextLine().trim();
        
        // Your solution logic here
        String result = longestPalindrome(s);
        System.out.println(result);
        
        scanner.close();
    }
    
    public static String longestPalindrome(String s) {
        // Write your code here
        return s; // placeholder
    }
}`,
    cpp: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

string longestPalindrome(string s) {
    // Write your code here
    return s; // placeholder
}

int main() {
    string s;
    getline(cin, s);
    
    string result = longestPalindrome(s);
    cout << result << endl;
    
    return 0;
}`,
    c: `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

char* longestPalindrome(char* s) {
    // Write your code here
    int len = strlen(s);
    char* result = (char*)malloc((len + 1) * sizeof(char));
    strcpy(result, s);
    return result; // placeholder
}

int main() {
    char s[1001];
    fgets(s, sizeof(s), stdin);
    
    // Remove newline if present
    s[strcspn(s, "\\n")] = 0;
    
    char* result = longestPalindrome(s);
    printf("%s\\n", result);
    
    free(result);
    return 0;
}`
  };

  // Initialize code when component mounts or language changes
  useEffect(() => {
    setCode(codeTemplates[selectedLanguage as keyof typeof codeTemplates]);
  }, [selectedLanguage]);

  // Test cases for Longest Palindromic Substring problem (Input/Output format)
  const testCases = [
    { input: "babad", expectedOutput: "bab" }, // or "aba"
    { input: "cbbd", expectedOutput: "bb" },
    { input: "a", expectedOutput: "a" },
    { input: "ac", expectedOutput: "a" }, // or "c"
    { input: "racecar", expectedOutput: "racecar" }
  ];

  // Execute complete programs with real API
  const executeCode = async (userCode: string, language: string) => {
    try {
      setExecutionError(null);
      setIsRunning(true);
      
      // Call real API
      const response = await fetch('/api/compiler/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: userCode,
          language,
          testCases,
          timeLimit: 5,
          memoryLimit: 128
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Execution failed');
      }

      if (data.success) {
        setTestResults(data.results);
        setActiveTab('result'); // Switch to results tab
      } else {
        throw new Error(data.message || 'Execution failed');
      }
      
    } catch (error: any) {
      setExecutionError(error.message || 'Failed to execute code');
      console.error('Execution error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Validate output (handles multiple correct answers for palindrome problem)
  const validateOutput = (actual: string, expected: string, input: string): boolean => {
    // For palindrome problem, check if the output is a valid palindrome substring
    if (actual === expected) return true;
    
    // Check if actual output is a palindrome and exists in input
    const isPalindrome = (str: string): boolean => {
      return str === str.split('').reverse().join('');
    };
    
    if (isPalindrome(actual) && input.includes(actual)) {
      // For "babad", both "bab" and "aba" are correct
      return true;
    }
    
    return false;
  };

  // JavaScript execution (simulated - in real implementation, this would call your Docker service)
  const executeJavaScriptProgram = async (userCode: string, input: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate program execution
          // In real implementation, this would:
          // 1. Write code to temporary file
          // 2. Execute: node program.js < input.txt
          // 3. Capture stdout
          
          // Mock execution for demo
          if (input === "babad") resolve("bab");
          else if (input === "cbbd") resolve("bb");
          else if (input === "a") resolve("a");
          else if (input === "ac") resolve("a");
          else if (input === "racecar") resolve("racecar");
          else resolve(input.charAt(0)); // fallback
        } catch (error: any) {
          reject(error);
        }
      }, 500);
    });
  };

  // Python execution (simulated)
  const executePythonProgram = async (userCode: string, input: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate: python3 program.py < input.txt
          if (input === "babad") resolve("bab");
          else if (input === "cbbd") resolve("bb");
          else if (input === "a") resolve("a");
          else if (input === "ac") resolve("a");
          else if (input === "racecar") resolve("racecar");
          else resolve(input.charAt(0));
        } catch (error: any) {
          reject(error);
        }
      }, 500);
    });
  };

  // Java execution (simulated)
  const executeJavaProgram = async (userCode: string, input: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate: javac Solution.java && echo "input" | java Solution
          if (input === "babad") resolve("bab");
          else if (input === "cbbd") resolve("bb");
          else if (input === "a") resolve("a");
          else if (input === "ac") resolve("a");
          else if (input === "racecar") resolve("racecar");
          else resolve(input.charAt(0));
        } catch (error: any) {
          reject(error);
        }
      }, 800);
    });
  };

  // C++ execution (simulated)
  const executeCppProgram = async (userCode: string, input: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate: g++ -o program program.cpp && echo "input" | ./program
          if (input === "babad") resolve("bab");
          else if (input === "cbbd") resolve("bb");
          else if (input === "a") resolve("a");
          else if (input === "ac") resolve("a");
          else if (input === "racecar") resolve("racecar");
          else resolve(input.charAt(0));
        } catch (error: any) {
          reject(error);
        }
      }, 1000);
    });
  };

  // C execution (simulated)
  const executeCProgram = async (userCode: string, input: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Simulate: gcc -o program program.c && echo "input" | ./program
          if (input === "babad") resolve("bab");
          else if (input === "cbbd") resolve("bb");
          else if (input === "a") resolve("a");
          else if (input === "ac") resolve("a");
          else if (input === "racecar") resolve("racecar");
          else resolve(input.charAt(0));
        } catch (error: any) {
          reject(error);
        }
      }, 1000);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="h-12 bg-card border-b border-border/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/candidate/practice" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Problem List</span>
          </Link>
          <div className="h-4 w-px bg-border/50" />
          <button className="p-1.5 rounded hover:bg-muted/50">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => executeCode(code, selectedLanguage)}
            disabled={isRunning || !code.trim()}
            className="px-4 py-1.5 rounded text-sm border border-border/50 text-foreground hover:bg-muted/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <div className="w-3 h-3 border border-foreground border-t-transparent rounded-full animate-spin"></div>
                Run
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Run
              </>
            )}
          </button>
          <button className="px-4 py-1.5 rounded text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-2">
            <Send className="w-3 h-3" /> Submit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left Panel - Problem Description */}
        <div 
          className="bg-card border-r border-border/50 overflow-hidden flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          {/* Problem Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-semibold text-foreground">
                {problemData.id}. {problemData.title}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                problemData.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                problemData.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-red-500/10 text-red-500'
              }`}>
                {problemData.difficulty}
              </span>
            </div>
            
            {/* Tags */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Topics:</span>
                {problemData.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-muted/50 rounded text-muted-foreground hover:bg-muted/70 cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">Companies:</span>
                {problemData.companies.slice(0, 2).map((company, i) => (
                  <span key={i} className="px-2 py-1 bg-muted/50 rounded text-muted-foreground hover:bg-muted/70 cursor-pointer">
                    {company}
                  </span>
                ))}
              </div>
              <button className="flex items-center gap-1 ml-4 text-muted-foreground hover:text-foreground">
                <Lightbulb className="w-3 h-3" />
                <span>Hint</span>
              </button>
            </div>
          </div>

          {/* Problem Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Description */}
              <div>
                <p className="text-foreground leading-relaxed">{problemData.description}</p>
              </div>

              {/* Examples */}
              {problemData.examples.map((example, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-semibold text-foreground">Example {i + 1}:</h4>
                  <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
                    <div className="text-foreground">
                      <strong>Input:</strong> {example.input}
                    </div>
                    <div className="text-foreground">
                      <strong>Output:</strong> {example.output}
                    </div>
                    {example.explanation && (
                      <div className="text-muted-foreground mt-2">
                        <strong>Explanation:</strong> {example.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Constraints */}
              <div>
                <h4 className="font-semibold text-foreground mb-2">Constraints:</h4>
                <ul className="space-y-1">
                  {problemData.constraints.map((constraint, i) => (
                    <li key={i} className="text-sm text-muted-foreground font-mono">
                      • {constraint}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 hover:text-foreground">
                <ThumbsUp className="w-3 h-3" />
                <span>{(problemData.stats.likes / 1000).toFixed(1)}k</span>
              </button>
              <button className="flex items-center gap-1 hover:text-foreground">
                <ThumbsDown className="w-3 h-3" />
                <span>{problemData.stats.dislikes}</span>
              </button>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{problemData.stats.submissions}</span>
              </div>
            </div>
            <div className="text-primary font-medium">
              Accepted: {problemData.stats.acceptance}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-border/50 cursor-col-resize hover:bg-border transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = leftPanelWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaX = e.clientX - startX;
              const containerWidth = window.innerWidth;
              const newWidth = startWidth + (deltaX / containerWidth) * 100;
              setLeftPanelWidth(Math.max(30, Math.min(70, newWidth)));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />

        {/* Right Panel - Code Editor */}
        <div className="flex-1 bg-card flex flex-col">
          {/* Code Editor Header */}
          <div className="h-12 border-b border-border/50 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Code</span>
            </div>
            
            {/* Language Selector */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-border/50 text-sm text-foreground hover:bg-muted/30 transition-all"
                >
                  <span>{languages.find(lang => lang.id === selectedLanguage)?.icon}</span>
                  <span>{languages.find(lang => lang.id === selectedLanguage)?.name}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showLanguageDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border/50 rounded shadow-lg z-10">
                    {languages.map((language) => (
                      <button
                        key={language.id}
                        onClick={() => {
                          setSelectedLanguage(language.id);
                          setShowLanguageDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30 transition-colors ${
                          selectedLanguage === language.id ? 'bg-primary/10 text-primary' : 'text-foreground'
                        }`}
                      >
                        <span>{language.icon}</span>
                        <span>{language.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button className="p-1.5 rounded hover:bg-muted/50">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted/50">
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted/50">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          {/* Code Editor */}
          <div className="flex-1 relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full p-4 bg-transparent text-sm font-mono text-foreground resize-none focus:outline-none border-none"
              placeholder="Write your code here..."
              spellCheck={false}
              style={{ 
                tabSize: 2,
                lineHeight: '1.5'
              }}
            />
            
            {/* Status Bar */}
            <div className="absolute bottom-0 right-0 p-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm">
              Saved • Ln 1, Col 1
            </div>
          </div>

          {/* Bottom Panel - Test Cases */}
          <div className="h-48 border-t border-border/50 flex flex-col">
            {/* Tabs */}
            <div className="flex items-center border-b border-border/50">
              <button
                onClick={() => setActiveTab('testcase')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'testcase' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Testcase
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'result' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Test Result
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activeTab === 'testcase' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Input:</label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder='babad'
                      className="w-full h-20 p-3 bg-muted/30 border border-border/50 rounded text-sm font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      You must run your code first.
                    </div>
                  ) : (
                    testResults.map((result, i) => (
                      <div key={i} className={`p-3 rounded border ${
                        result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {result.passed ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium">Test Case {i + 1}</span>
                        </div>
                        <div className="text-xs font-mono space-y-1">
                          <div>Input: "{result.input}"</div>
                          <div>Expected: "{result.expected}"</div>
                          <div>Output: "{result.actual}"</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalCoding;
