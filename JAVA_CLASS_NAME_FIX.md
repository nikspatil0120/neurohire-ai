# Java Class Name Fix

## Issue
Java compilation was failing with error:
```
error: class Main is public, should be declared in a file named Main.java
public class Solution {
       ^
```

## Root Cause
The Java boilerplate templates used `public class Solution`, but Java requires:
- Public classes must match the filename
- The backend compiler saves files as `Main.java`
- Therefore, the class must be named `Main`, not `Solution`

## Solution
Changed all Java boilerplate templates from:
```java
public class Solution {
    // code
}
```

To:
```java
class Main {
    // code
}
```

Note: Using `class Main` (without `public`) works fine and matches the filename.

## Files Updated
- `src/pages/admin/DSAProblems.tsx` - Updated all 3 sample problem templates

## Action Required
**For existing problems in the database:**
1. Admin users need to edit each existing problem
2. Update the Java code template from `public class Solution` to `class Main`
3. Save the problem

**For new problems:**
- New problems created will automatically use the correct `class Main` template

## Testing
After updating:
1. Go to Technical Coding page with a problem
2. Select Java language
3. Click "Run" - should compile successfully without class name errors
