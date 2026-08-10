# LeetCode-Style Function Implementation Plan

## Overview
Implement LeetCode-style function-only submissions where candidates write only the solution function, and the system automatically handles I/O.

## What's Being Added

### 1. **Function Signature Configuration (Admin Panel)**

Admins will specify for each language:
- **Function Name**: e.g., `twoSum`
- **Return Type**: e.g., `int[]`, `List<Integer>`, `vector<int>`
- **Parameters**: Array of `{name, type}` e.g., `[{name: "nums", type: "int[]"}, {name: "target", type: "int"}]`

### 2. **UI Changes in Admin → DS Problems**

Add new section after "Code Templates":

```
┌─ Function Signatures ─────────────────────────┐
│                                                │
│ [Python] [Java] [C++] [C]                     │
│                                                │
│ Function Name: twoSum                          │
│ Return Type:   int[]                           │
│                                                │
│ Parameters:                                    │
│ ┌────────────────────────────────────────┐    │
│ │ Name: nums     Type: int[]             │    │
│ │ Name: target   Type: int         [X]   │    │
│ └────────────────────────────────────────┘    │
│ [+ Add Parameter]                              │
└────────────────────────────────────────────────┘
```

### 3. **Example: Two Sum Problem**

**Admin Enters:**

**Function Signature (Java):**
- Function Name: `twoSum`
- Return Type: `int[]`
- Parameters:
  - `nums` : `int[]`
  - `target` : `int`

**Code Template (Java):**
```java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[]{};
    }
}
```

**Test Cases:**
- Input 1: `2 7 11 15` (nums)
- Input 2: `9` (target)
- Expected Output: `0 1`

**What Candidate Sees:**
```java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[]{};
    }
}
```

**What Actually Runs (Generated Automatically):**
```java
import java.util.*;
import java.util.stream.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Candidate's code here
        HashMap<Integer, Integer> map = new HashMap<>();
        for(int i = 0; i < nums.length; i++){
            int complement = target - nums[i];
            if(map.containsKey(complement)){
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}

class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution solution = new Solution();
        
        // Parse input 1: int[] nums
        int[] nums = parseIntArray(scanner);
        
        // Parse input 2: int target
        int target = scanner.nextInt();
        
        // Call user function
        int[] result = solution.twoSum(nums, target);
        
        // Print result
        System.out.println(Arrays.stream(result)
            .mapToObj(String::valueOf)
            .collect(Collectors.joining(" ")));
        
        scanner.close();
    }
    
    private static int[] parseIntArray(Scanner scanner) {
        String line = scanner.nextLine().trim();
        if (line.isEmpty()) return new int[0];
        return Arrays.stream(line.split("\\s+"))
                     .mapToInt(Integer::parseInt)
                     .toArray();
    }
}
```

## Type Mappings

### Java
- `int` → single integer
- `int[]` → space-separated integers
- `String` → single line string
- `String[]` → space-separated strings
- `List<Integer>` → space-separated integers (parsed to ArrayList)
- `List<String>` → space-separated strings

### Python
- `int` → single integer
- `List[int]` → space-separated integers
- `str` → single line string
- `List[str]` → space-separated strings

### C++
- `int` → single integer
- `vector<int>` → space-separated integers
- `string` → single line string
- `vector<string>` → space-separated strings

## Implementation Steps

### ✅ Step 1: Update Data Models
- [x] Add `FunctionSignature` interface to frontend
- [x] Add `functionSignatures` field to `Problem` interface
- [x] Update backend models

### ⏳ Step 2: Update Admin UI
- [ ] Add Function Signature section to problem form
- [ ] Add fields for function name, return type
- [ ] Add dynamic parameter inputs (+ Add / Remove)
- [ ] Add language tabs to switch between languages
- [ ] Update sample problems with function signatures

### ⏳ Step 3: Create Test Harness Generator
- [x] Create `testHarnessGenerator.js` service
- [ ] Implement wrapper generation for all languages
- [ ] Handle different parameter types
- [ ] Format output based on return type

### ⏳ Step 4: Update Compiler Service
- [ ] Integrate test harness generator
- [ ] Wrap user code before execution
- [ ] Pass function signature to harness generator

### ⏳ Step 5: Update Frontend
- [ ] Pass function signature when running code
- [ ] Keep boilerplate clean (function only)

## Benefits

✅ **Cleaner candidate experience** - only write core logic
✅ **Consistent across languages** - same problem, same structure
✅ **No I/O mistakes** - system handles parsing/printing
✅ **True LeetCode experience** - familiar to candidates
✅ **Admin still has control** - can customize per problem

## Next Steps

1. Update Admin UI to add function signature fields
2. Update sample problems with signatures
3. Integrate harness generator into compiler
4. Test with Two Sum problem
5. Add support for complex types (LinkedList, TreeNode, etc.)
