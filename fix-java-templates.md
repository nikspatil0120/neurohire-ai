# How to Fix Java Templates in Existing Problems

## The Issue
If you see this error when running Java code:
```
error: class Main is public, should be declared in a file named Main.java
public class Solution {
```

## Quick Fix (For Admin Users)

### Option 1: Edit Each Problem Manually
1. Go to Admin Dashboard → DS Problems
2. Click "Edit" on the problem (e.g., "Two Sum")
3. In the **Java Code Template** section, find:
   ```java
   public class Solution {
   ```
4. Change it to:
   ```java
   class Main {
   ```
5. Click "Save"

### Option 2: Recreate the Problem
1. Delete the existing problem
2. Click "Add New Problem"
3. Fill in the details - the new template will automatically use `class Main`

## Why This Happens
- Java requires public classes to match the filename
- The backend compiler saves Java code as `Main.java`
- So the class must be named `Main`, not `Solution`

## Example Fix for Two Sum Problem

**Before (Broken):**
```java
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        // code
    }
    
    public static int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}
```

**After (Fixed):**
```java
import java.util.*;

class Main {
    public static void main(String[] args) {
        // code
    }
    
    public static int[] twoSum(int[] nums, int target) {
        // Your code here
        return new int[]{};
    }
}
```

Note: Just change `public class Solution` to `class Main` - everything else stays the same!
