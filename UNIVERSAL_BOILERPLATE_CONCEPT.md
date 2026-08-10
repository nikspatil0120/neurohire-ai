# Universal Boilerplate - Auto Input Reading

## Concept

Admin adds inputs in order:
```
Input 1: 2 7 11 15    (array)
Input 2: 9            (target)
```

Code automatically reads them:
```java
String input1 = scanner.nextLine();  // "2 7 11 15"
String input2 = scanner.nextLine();  // "9"
```

Then admin's boilerplate code **manually parses and uses them**.

---

## Simplest Approach

### **Template Pattern:**

```java
import java.util.*;

class Solution {
    // Candidate writes function here
}

class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution solution = new Solution();
        
        // Read inputs sequentially (one per line)
        String[] inputs = new String[NUM_INPUTS];
        for (int i = 0; i < NUM_INPUTS; i++) {
            inputs[i] = scanner.nextLine().trim();
        }
        
        // Admin writes parsing logic here based on their problem
        // Example for Two Sum:
        String[] numsStr = inputs[0].split("\\s+");
        int[] nums = new int[numsStr.length];
        for (int i = 0; i < numsStr.length; i++) {
            nums[i] = Integer.parseInt(numsStr[i]);
        }
        int target = Integer.parseInt(inputs[1]);
        
        // Call solution
        int[] result = solution.twoSum(nums, target);
        
        // Print result
        System.out.println(result[0] + " " + result[1]);
        scanner.close();
    }
}
```

---

## Better Approach: Provide Helper Functions

Give admin a library of parsing helpers:

```java
class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution solution = new Solution();
        
        // Admin writes their own input reading
        int[] nums = readIntArray(scanner);
        int target = readInt(scanner);
        
        int[] result = solution.twoSum(nums, target);
        
        printIntArray(result);
        scanner.close();
    }
    
    // Helper functions
    static int[] readIntArray(Scanner sc) {
        return Arrays.stream(sc.nextLine().trim().split("\\s+"))
                     .mapToInt(Integer::parseInt).toArray();
    }
    
    static int readInt(Scanner sc) {
        return Integer.parseInt(sc.nextLine().trim());
    }
    
    static String readString(Scanner sc) {
        return sc.nextLine().trim();
    }
    
    static void printIntArray(int[] arr) {
        System.out.println(Arrays.stream(arr)
            .mapToObj(String::valueOf)
            .collect(Collectors.joining(" ")));
    }
}
```

---

## What Do You Prefer?

**Option A:** Generic template where admin writes parsing logic
**Option B:** Provide helper functions (readIntArray, readInt, etc.)
**Option C:** Fully automatic based on input type hints (complex)

Which makes most sense for your use case?
