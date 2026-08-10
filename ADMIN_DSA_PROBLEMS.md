# Admin DSA Problems Management

## Overview

The Admin DSA Problems Management feature allows administrators to manage coding problem statements that candidates will use during technical assessments. This is a complete CRUD (Create, Read, Update, Delete) interface for problem management.

## Features

### 1. **View All Problems**
   - Display all problem statements in card format
   - Shows problem title, difficulty, tags, companies
   - Preview of examples and description
   - Test case visibility statistics (visible/hidden counts)
   - Stats (acceptance rate, submissions, likes)

### 2. **Add New Problem**
   - Click "Add New Problem" button
   - Fill in problem details:
     - Title (required)
     - Difficulty (Easy/Medium/Hard)
     - Tags (comma-separated)
     - Companies (comma-separated)
     - Description (required)
     - Examples (input, output, explanation)
     - Constraints
     - Test Cases with visibility control:
       - Input
       - Expected Output
       - **Visibility:** Visible to Candidates or Hidden (for evaluation)
   - Dynamic form fields for examples, constraints, and test cases
   - Add/remove multiple examples, constraints, and test cases

### 3. **Test Case Visibility Control** 🆕
   - Each test case can be marked as:
     - **👁️ Visible to Candidates:** Test cases that candidates can see and test against
     - **🔒 Hidden (for evaluation):** Secret test cases used only for final evaluation
   - Visual indicators:
     - Green badge for visible test cases
     - Gray badge for hidden test cases
   - Statistics shown on problem cards:
     - Total test cases
     - Number of visible test cases
     - Number of hidden test cases
   - Click the "Edit" (pencil) button on any problem card
   - Modify any field
   - Save changes or cancel

### 4. **Edit Problem**
   - Click the "Edit" (pencil) button on any problem card
   - Modify any field including test case visibility
   - Save changes or cancel

### 5. **Delete Problem**
   - Click the "Delete" (trash) button on any problem card
   - Confirmation dialog before deletion

## Navigation

**Access:** Admin Dashboard → Candidates → DSA Problems

**Route:** `/admin/dsa-problems`

**Sidebar Navigation:**
- Dashboard
- System Monitor
- Recruiters
- Candidates
- **DSA Problems** ← New menu item
- AI Performance

## Problem Data Structure

```typescript
interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  companies: string[];
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  testCases: {
    input: string;
    expectedOutput: string;
    visibility: "visible" | "hidden";
  }[];
  stats: {
    likes: number;
    dislikes: number;
    acceptance: string;
    submissions: string;
  };
}
```

## Pre-loaded Problems

The system comes with 3 sample problems:

1. **Two Sum** (Easy)
   - Tags: Array, Hash Table
   - Companies: Google, Amazon, Apple
   - 3 test cases (2 visible, 1 hidden)

2. **Longest Palindromic Substring** (Medium)
   - Tags: String, Dynamic Programming
   - Companies: Amazon, Microsoft, Google
   - 5 test cases (2 visible, 3 hidden)

3. **Reverse Linked List** (Easy)
   - Tags: Linked List, Recursion
   - Companies: Amazon, Microsoft, Facebook
   - 3 test cases (2 visible, 1 hidden)

## User Interface

### Problem Card Components:
- **Header:** Problem ID, Title, Difficulty badge
- **Tags Section:** Topic tags and company tags
- **Description:** Problem statement
- **Stats Bar:** Acceptance rate, submissions, likes
- **Examples Preview:** First 2 examples shown
- **Test Cases Info:** Shows total, visible, and hidden test case counts with icons
- **Action Buttons:** Edit and Delete

### Edit/Add Form Sections:
1. Basic Information (Title, Difficulty)
2. Tags & Companies
3. Description
4. Examples (with add/remove functionality)
5. Constraints (with add/remove functionality)
6. Test Cases (with add/remove functionality and visibility toggle)

### Test Case Visibility Controls:
- **Visibility Badge:** Shows if test case is visible or hidden
- **Toggle Buttons:** 
  - "👁️ Visible to Candidates" (Green when selected)
  - "🔒 Hidden (for evaluation)" (Gray when selected)
- **Visual Indicators:** Color-coded badges on each test case

### Form Controls:
- **Save Button:** Green with check icon
- **Cancel Button:** Red with X icon
- **Add Buttons:** Small "+" buttons for dynamic fields
- **Remove Buttons:** X buttons on individual items

## Styling

- **Easy Problems:** Green badge and accents
- **Medium Problems:** Yellow badge and accents
- **Hard Problems:** Red badge and accents
- **Glass Card Design:** Consistent with admin theme
- **Neon Effects:** Primary color glows on interactive elements

## State Management

Problems are stored in component state (`useState`). In production, you should:

1. **Connect to Backend API:**
   - GET `/api/admin/problems` - Fetch all problems
   - POST `/api/admin/problems` - Create new problem
   - PUT `/api/admin/problems/:id` - Update problem
   - DELETE `/api/admin/problems/:id` - Delete problem

2. **Add Persistence:**
   - Store in MongoDB database
   - Create Problem schema/model
   - Add authentication checks

3. **Add Validation:**
   - Server-side validation
   - Unique problem titles
   - Valid difficulty values
   - Required fields enforcement

## Usage Flow

### Adding a Problem:
1. Navigate to Admin → DSA Problems
2. Click "Add New Problem"
3. Fill in all required fields (marked with *)
4. Add multiple examples using "+ Add Example"
5. Add constraints using "+ Add Constraint"
6. Add test cases using "+ Add Test Case"
7. **For each test case:**
   - Enter input and expected output
   - Click "👁️ Visible to Candidates" if candidates should see this test case
   - Click "🔒 Hidden (for evaluation)" for secret test cases
8. Click "Save"

**Best Practice:** 
- Show 2-3 simple test cases as "Visible" so candidates can verify their solution
- Keep edge cases and complex scenarios as "Hidden" for thorough evaluation

### Editing a Problem:
1. Find the problem card
2. Click the Edit (pencil) button
3. Modify any fields
4. Click "Save" to apply changes or "Cancel" to discard

### Deleting a Problem:
1. Find the problem card
2. Click the Delete (trash) button
3. Confirm deletion in the dialog

## Integration with Candidate View

The problems added/edited here will be available in:
- **Candidate Practice Mode** (`/candidate/practice`)
- **Technical Coding Assessment** (`/candidate/technical-coding`)

Currently, the TechnicalCoding component has a hardcoded problem. You should:
1. Create a problem selection/loading mechanism
2. Fetch problems from the admin-managed list
3. Allow dynamic problem selection or random assignment

## Future Enhancements

1. **Search & Filter:**
   - Search by title, tags, or companies
   - Filter by difficulty
   - Sort by various criteria

2. **Bulk Operations:**
   - Import problems from JSON
   - Export problems to JSON
   - Bulk edit or delete

3. **Code Templates:**
   - Manage starter code templates for each language
   - Version control for templates

4. **Problem Analytics:**
   - Track solve rates per problem
   - Average time to solve
   - Common mistakes

5. **Rich Text Editor:**
   - Markdown support for descriptions
   - Code syntax highlighting in examples
   - LaTeX for mathematical expressions

6. **Tags Management:**
   - Predefined tag library
   - Tag autocomplete
   - Tag usage statistics

7. **Access Control:**
   - Problem visibility settings
   - Draft/Published status
   - Scheduled publishing

## File Structure

```
src/pages/admin/
├── Dashboard.tsx          # Updated with DSA Problems nav
├── SystemMonitoring.tsx   # Updated with DSA Problems nav
└── DSAProblems.tsx        # New: Problem management page

src/App.tsx                # Updated with new route

ADMIN_DSA_PROBLEMS.md      # This documentation
```

## Security Notes

⚠️ **Production Considerations:**
- Add proper authentication/authorization
- Validate all inputs on backend
- Sanitize user inputs to prevent XSS
- Add rate limiting on API endpoints
- Log all admin actions for audit trail
- Implement role-based access control (RBAC)
