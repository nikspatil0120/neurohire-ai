import java.util.*;
import java.util.stream.*;

class Solution {
    // Candidate writes their solution here
    public int[] twoSum(int[] nums, int target) {
        // Example solution
        return new int[]{};
    }
}

class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution solution = new Solution();
        
        // ============================================
        // ADMIN: Read inputs in the order you defined
        // ============================================
        
        // For Two Sum example:
        int[] nums = readIntArray(scanner);    // Input 1
        int target = readInt(scanner);         // Input 2
        
        // Call solution
        int[] result = solution.twoSum(nums, target);
        
        // Print result (customize format as needed)
        printArray(result, " ");  // Space-separated
        
        scanner.close();
    }
    
    // ============================================
    // HELPER FUNCTIONS - Use these to read inputs
    // ============================================
    
    /** Read an array of integers from one line (space-separated) */
    static int[] readIntArray(Scanner sc) {
        return Arrays.stream(sc.nextLine().trim().split("\\s+"))
                     .mapToInt(Integer::parseInt)
                     .toArray();
    }
    
    /** Read a single integer */
    static int readInt(Scanner sc) {
        return Integer.parseInt(sc.nextLine().trim());
    }
    
    /** Read a single string */
    static String readString(Scanner sc) {
        return sc.nextLine().trim();
    }
    
    /** Read an array of strings from one line (space-separated) */
    static String[] readStringArray(Scanner sc) {
        return sc.nextLine().trim().split("\\s+");
    }
    
    /** Read a long integer */
    static long readLong(Scanner sc) {
        return Long.parseLong(sc.nextLine().trim());
    }
    
    /** Read a double */
    static double readDouble(Scanner sc) {
        return Double.parseDouble(sc.nextLine().trim());
    }
    
    // ============================================
    // OUTPUT HELPER FUNCTIONS
    // ============================================
    
    /** Print array with custom separator */
    static void printArray(int[] arr, String separator) {
        System.out.println(Arrays.stream(arr)
            .mapToObj(String::valueOf)
            .collect(Collectors.joining(separator)));
    }
    
    /** Print array (space-separated by default) */
    static void printArray(int[] arr) {
        printArray(arr, " ");
    }
    
    /** Print 2D array (for matrix problems) */
    static void print2DArray(int[][] matrix) {
        for (int[] row : matrix) {
            printArray(row);
        }
    }
}
