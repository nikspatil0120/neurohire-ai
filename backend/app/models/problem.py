from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class TestCase(BaseModel):
    inputs: List[str]
    expectedOutput: str
    visibility: str  # "visible" or "hidden"

class Parameter(BaseModel):
    name: str
    type: str

class FunctionSignature(BaseModel):
    functionName: str
    returnType: str
    parameters: List[Parameter]

class CodeTemplate(BaseModel):
    python: str = ""
    java: str = ""
    cpp: str = ""
    c: str = ""

class Example(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None

class ProblemStats(BaseModel):
    likes: int = 0
    dislikes: int = 0
    acceptance: str = "0%"
    submissions: str = "0"

class Problem(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    title: str
    difficulty: str  # "Easy", "Medium", "Hard"
    tags: List[str] = []
    companies: List[str] = []
    description: str
    examples: List[Example] = []
    constraints: List[str] = []
    testCases: List[TestCase] = []
    codeTemplates: CodeTemplate
    functionSignatures: Optional[Dict[str, FunctionSignature]] = None
    stats: ProblemStats = ProblemStats()
    published: bool = False
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ProblemCreate(BaseModel):
    title: str
    difficulty: str
    tags: List[str] = []
    companies: List[str] = []
    description: str
    examples: List[Example] = []
    constraints: List[str] = []
    testCases: List[TestCase] = []
    codeTemplates: CodeTemplate
    functionSignatures: Optional[Dict[str, FunctionSignature]] = None
    published: bool = False

class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    companies: Optional[List[str]] = None
    description: Optional[str] = None
    examples: Optional[List[Example]] = None
    constraints: Optional[List[str]] = None
    testCases: Optional[List[TestCase]] = None
    codeTemplates: Optional[CodeTemplate] = None
    functionSignatures: Optional[Dict[str, FunctionSignature]] = None
    stats: Optional[ProblemStats] = None
    published: Optional[bool] = None
