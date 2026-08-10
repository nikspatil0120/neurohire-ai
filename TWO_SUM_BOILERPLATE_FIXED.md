# Two Sum Boilerplate - Fixed ✅

## Changes Made

Updated the Two Sum problem boilerplate in all languages to:
1. ✅ Use LeetCode-style `Solution` class
2. ✅ Parse your test case input format correctly
3. ✅ Output in the expected format

## Test Case Format

**Inputs:**
- Input 1: `2 7 11 15` (space-separated array)
- Input 2: `9` (target value)

**Expected Output:**
- `0 1` (space-separated indices)

## Boilerplate Structure

### All Languages Now Follow This Pattern:

1. **Solution Class** - Where candidate writes code
2. **Main/Test Harness** - Handles I/O automatically
3. **Input Parsing** - Reads from test case inputs
4. **Output Formatting** - Prints in expected format

## Java Example

```java
import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Candidate writes code here
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
        
        // Reads "2 7 11 15"
        String[] numsStr = scanner.nextLine().trim().split("\\s+");
        int[] nums = new int[numsStr.length];
        for (int i = 0; i < numsStr.length; i++) {
            nums[i] = Integer.parseInt(numsStr[i]);
        }
        
        // Reads "9"
        int target = scanner.nextInt();
        
        // Calls candidate's function
        int[] result = solution.twoSum(nums, target);
        
        // Prints "0 1"
        System.out.println(result[0] + " " + result[1]);
        scanner.close();
    }
}
```

## What Candidate Sees

The candidate only needs to write:
```java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Their code here
    }
}
```

The Main class with I/O is already provided!

## Next Steps

1. ✅ **Go to Admin → DS Problems**
2. ✅ **Edit the Two Sum problem** (or create new)
3. ✅ **Test Cases should be:**
   - Input 1: `2 7 11 15`
   - Input 2: `9`
   - Expected Output: `0 1`
4. ✅ **Save the problem**
5. ✅ **Test it in Technical Coding page**

## Benefits

✅ **LeetCode-style** - Candidate writes only the solution function
✅ **No I/O confusion** - Test harness handles everything
✅ **Works immediately** - No backend changes needed
✅ **Flexible** - Admin can customize per problem

## For Other Problems

Use the same pattern:
1. Define what inputs/outputs look like in test cases
2. Write boilerplate that parses those inputs correctly
3. Call the Solution class method
4. Print output in expected format

Simple and flexible! 🎯
