import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';

dotenv.config();

const sampleProblems = [
  {
    title: "Reverse String",
    difficulty: "Easy",
    tags: ["String"],
    companies: [],
    description: "Write a function that reverses a string. The input string is given as an array of characters.",
    examples: [
      {
        input: "s = [\"h\",\"e\",\"l\",\"l\",\"o\"]",
        output: "[\"o\",\"l\",\"l\",\"e\",\"h\"]",
        explanation: "The characters are reversed in place."
      }
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s[i] is a printable ASCII character."
    ],
    testCases: [
      {
        inputs: [
          { value: "5", type: "int", description: "Length of string" },
          { value: "h e l l o", type: "string", description: "Characters separated by spaces" }
        ],
        expectedOutput: "o l l e h",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "2", type: "int", description: "Length of string" },
          { value: "H i", type: "string", description: "Characters separated by spaces" }
        ],
        expectedOutput: "i H",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static void reverseString(char[] s) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        char[] s = new char[n];\n\n        for (int i = 0; i < n; i++) {\n            s[i] = sc.next().charAt(0);\n        }\n\n        reverseString(s);\n\n        for (char c : s) {\n            System.out.print(c + \" \");\n        }\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "reverseString", returnType: "None", parameters: [] },
      java: { functionName: "reverseString", returnType: "void", parameters: [] },
      cpp: { functionName: "reverseString", returnType: "void", parameters: [] },
      c: { functionName: "reverseString", returnType: "void", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Palindrome Number",
    difficulty: "Easy",
    tags: ["Math"],
    companies: [],
    description: "Given an integer x, return true if x is a palindrome, and false otherwise.",
    examples: [
      {
        input: "x = 121",
        output: "true",
        explanation: "121 reads the same forward and backward."
      }
    ],
    constraints: [
      "-2^31 <= x <= 2^31 - 1"
    ],
    testCases: [
      {
        inputs: [
          { value: "121", type: "int", description: "Input number" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "-121", type: "int", description: "Input number" }
        ],
        expectedOutput: "false",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "10", type: "int", description: "Input number" }
        ],
        expectedOutput: "false",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static boolean isPalindrome(int x) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int x = sc.nextInt();\n\n        System.out.println(isPalindrome(x));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "isPalindrome", returnType: "bool", parameters: [] },
      java: { functionName: "isPalindrome", returnType: "boolean", parameters: [] },
      cpp: { functionName: "isPalindrome", returnType: "bool", parameters: [] },
      c: { functionName: "isPalindrome", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Contains Duplicate",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    companies: [],
    description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "true",
        explanation: "The value 1 appears twice."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    testCases: [
      {
        inputs: [
          { value: "4", type: "int", description: "Array length" },
          { value: "1 2 3 1", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "4", type: "int", description: "Array length" },
          { value: "1 2 3 4", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "false",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "3", type: "int", description: "Array length" },
          { value: "1 1 1", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static boolean containsDuplicate(int[] nums) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n\n        System.out.println(containsDuplicate(nums));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "containsDuplicate", returnType: "bool", parameters: [] },
      java: { functionName: "containsDuplicate", returnType: "boolean", parameters: [] },
      cpp: { functionName: "containsDuplicate", returnType: "bool", parameters: [] },
      c: { functionName: "containsDuplicate", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Valid Anagram",
    difficulty: "Easy",
    tags: ["String", "Hash Table"],
    companies: [],
    description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    examples: [
      {
        input: "s = \"anagram\", t = \"nagaram\"",
        output: "true",
        explanation: "Both strings contain the same characters with the same frequencies."
      }
    ],
    constraints: [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters."
    ],
    testCases: [
      {
        inputs: [
          { value: "anagram", type: "string", description: "First string" },
          { value: "nagaram", type: "string", description: "Second string" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "rat", type: "string", description: "First string" },
          { value: "car", type: "string", description: "Second string" }
        ],
        expectedOutput: "false",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static boolean isAnagram(String s, String t) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        String t = sc.nextLine();\n\n        System.out.println(isAnagram(s, t));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "isAnagram", returnType: "bool", parameters: [] },
      java: { functionName: "isAnagram", returnType: "boolean", parameters: [] },
      cpp: { functionName: "isAnagram", returnType: "bool", parameters: [] },
      c: { functionName: "isAnagram", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    tags: ["Array", "Dynamic Programming"],
    companies: [],
    description: "You are given an array prices where prices[i] is the price of a stock on the ith day. Choose a single day to buy one stock and a different day in the future to sell that stock. Return the maximum profit you can achieve.",
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation: "Buy on day 2 at 1 and sell on day 5 at 6, giving a profit of 5."
      }
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4"
    ],
    testCases: [
      {
        inputs: [
          { value: "6", type: "int", description: "Array length" },
          { value: "7 1 5 3 6 4", type: "int[]", description: "Stock prices" }
        ],
        expectedOutput: "5",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "5", type: "int", description: "Array length" },
          { value: "7 6 4 3 1", type: "int[]", description: "Stock prices" }
        ],
        expectedOutput: "0",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static int maxProfit(int[] prices) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] prices = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            prices[i] = sc.nextInt();\n        }\n\n        System.out.println(maxProfit(prices));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "maxProfit", returnType: "int", parameters: [] },
      java: { functionName: "maxProfit", returnType: "int", parameters: [] },
      cpp: { functionName: "maxProfit", returnType: "int", parameters: [] },
      c: { functionName: "maxProfit", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["String", "Stack"],
    companies: [],
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    examples: [
      {
        input: "s = \"()[]{}\"",
        output: "true",
        explanation: "Every opening bracket is closed by the correct corresponding closing bracket."
      }
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only."
    ],
    testCases: [
      {
        inputs: [
          { value: "()[]{}", type: "string", description: "Input string" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "([)]", type: "string", description: "Input string" }
        ],
        expectedOutput: "false",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "{[]}", type: "string", description: "Input string" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static boolean isValid(String s) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n\n        System.out.println(isValid(s));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "isValid", returnType: "bool", parameters: [] },
      java: { functionName: "isValid", returnType: "boolean", parameters: [] },
      cpp: { functionName: "isValid", returnType: "bool", parameters: [] },
      c: { functionName: "isValid", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Binary Search",
    difficulty: "Easy",
    tags: ["Array", "Binary Search"],
    companies: [],
    description: "Given a sorted array of integers nums and an integer target, return the index of target if it exists in the array. Otherwise, return -1.",
    examples: [
      {
        input: "nums = [-1,0,3,5,9,12], target = 9",
        output: "4",
        explanation: "The value 9 is present at index 4."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 <= nums[i], target <= 10^4",
      "All integers in nums are unique.",
      "nums is sorted in ascending order."
    ],
    testCases: [
      {
        inputs: [
          { value: "6", type: "int", description: "Array length" },
          { value: "-1 0 3 5 9 12", type: "int[]", description: "Sorted array" },
          { value: "9", type: "int", description: "Target value" }
        ],
        expectedOutput: "4",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "6", type: "int", description: "Array length" },
          { value: "-1 0 3 5 9 12", type: "int[]", description: "Sorted array" },
          { value: "2", type: "int", description: "Target value" }
        ],
        expectedOutput: "-1",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static int search(int[] nums, int target) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n\n        int target = sc.nextInt();\n\n        System.out.println(search(nums, target));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "search", returnType: "int", parameters: [] },
      java: { functionName: "search", returnType: "int", parameters: [] },
      cpp: { functionName: "search", returnType: "int", parameters: [] },
      c: { functionName: "search", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Maximum Subarray",
    difficulty: "Medium",
    tags: ["Array", "Dynamic Programming"],
    companies: [],
    description: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum of 6."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    testCases: [
      {
        inputs: [
          { value: "9", type: "int", description: "Array length" },
          { value: "-2 1 -3 4 -1 2 1 -5 4", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "6",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "5", type: "int", description: "Array length" },
          { value: "1 2 3 4 5", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "15",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "3", type: "int", description: "Array length" },
          { value: "-5 -2 -8", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "-2",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static int maxSubArray(int[] nums) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n\n        System.out.println(maxSubArray(nums));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "maxSubArray", returnType: "int", parameters: [] },
      java: { functionName: "maxSubArray", returnType: "int", parameters: [] },
      cpp: { functionName: "maxSubArray", returnType: "int", parameters: [] },
      c: { functionName: "maxSubArray", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Merge Sorted Array",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers"],
    companies: [],
    description: "You are given two integer arrays nums1 and nums2, sorted in non-decreasing order. Merge nums2 into nums1 as one sorted array.",
    examples: [
      {
        input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
        output: "[1,2,2,3,5,6]",
        explanation: "The elements of nums2 are merged into nums1 while maintaining sorted order."
      }
    ],
    constraints: [
      "0 <= m, n <= 200",
      "1 <= m + n <= 200",
      "-10^9 <= nums1[i], nums2[j] <= 10^9"
    ],
    testCases: [
      {
        inputs: [
          { value: "6", type: "int", description: "Total length of nums1" },
          { value: "1 2 3 0 0 0", type: "int[]", description: "nums1 array" },
          { value: "3", type: "int", description: "Number of valid elements in nums1" },
          { value: "3", type: "int", description: "Length of nums2" },
          { value: "2 5 6", type: "int[]", description: "nums2 array" }
        ],
        expectedOutput: "1 2 2 3 5 6",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "1", type: "int", description: "Total length of nums1" },
          { value: "0", type: "int[]", description: "nums1 array" },
          { value: "0", type: "int", description: "Number of valid elements in nums1" },
          { value: "0", type: "int", description: "Length of nums2" }
        ],
        expectedOutput: "0",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static void merge(int[] nums1, int m, int[] nums2, int n) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n\n        int total = sc.nextInt();\n        int[] nums1 = new int[total];\n        for (int i = 0; i < total; i++) {\n            nums1[i] = sc.nextInt();\n        }\n\n        int m = sc.nextInt();\n\n        int n = sc.nextInt();\n        int[] nums2 = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums2[i] = sc.nextInt();\n        }\n\n        merge(nums1, m, nums2, n);\n\n        for (int x : nums1) {\n            System.out.print(x + \" \");\n        }\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "merge", returnType: "None", parameters: [] },
      java: { functionName: "merge", returnType: "void", parameters: [] },
      cpp: { functionName: "merge", returnType: "void", parameters: [] },
      c: { functionName: "merge", returnType: "void", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Move Zeroes",
    difficulty: "Easy",
    tags: ["Array", "Two Pointers"],
    companies: [],
    description: "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
    examples: [
      {
        input: "nums = [0,1,0,3,12]",
        output: "[1,3,12,0,0]",
        explanation: "All non-zero elements retain their relative order while zeros move to the end."
      }
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-2^31 <= nums[i] <= 2^31 - 1"
    ],
    testCases: [
      {
        inputs: [
          { value: "5", type: "int", description: "Array length" },
          { value: "0 1 0 3 12", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "1 3 12 0 0",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "3", type: "int", description: "Array length" },
          { value: "0 0 1", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "1 0 0",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static void moveZeroes(int[] nums) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n\n        moveZeroes(nums);\n\n        for (int x : nums) {\n            System.out.print(x + \" \");\n        }\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "moveZeroes", returnType: "None", parameters: [] },
      java: { functionName: "moveZeroes", returnType: "void", parameters: [] },
      cpp: { functionName: "moveZeroes", returnType: "void", parameters: [] },
      c: { functionName: "moveZeroes", returnType: "void", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Single Number",
    difficulty: "Easy",
    tags: ["Array", "Bit Manipulation"],
    companies: [],
    description: "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.",
    examples: [
      {
        input: "nums = [4,1,2,1,2]",
        output: "4",
        explanation: "Every value appears twice except 4."
      }
    ],
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "-3 * 10^4 <= nums[i] <= 3 * 10^4",
      "Every element appears twice except for one element."
    ],
    testCases: [
      {
        inputs: [
          { value: "5", type: "int", description: "Array length" },
          { value: "4 1 2 1 2", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "4",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "3", type: "int", description: "Array length" },
          { value: "2 2 1", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "1",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static int singleNumber(int[] nums) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n\n        System.out.println(singleNumber(nums));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "singleNumber", returnType: "int", parameters: [] },
      java: { functionName: "singleNumber", returnType: "int", parameters: [] },
      cpp: { functionName: "singleNumber", returnType: "int", parameters: [] },
      c: { functionName: "singleNumber", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Fizz Buzz",
    difficulty: "Easy",
    tags: ["Math", "String"],
    companies: [],
    description: "Given an integer n, return a string array answer where answer[i] is FizzBuzz when i is divisible by both 3 and 5, Fizz when divisible by 3, Buzz when divisible by 5, and the number itself otherwise.",
    examples: [
      {
        input: "n = 5",
        output: "[\"1\",\"2\",\"Fizz\",\"4\",\"Buzz\"]",
        explanation: "3 is divisible by 3 and 5 is divisible by 5."
      }
    ],
    constraints: [
      "1 <= n <= 10^4"
    ],
    testCases: [
      {
        inputs: [
          { value: "5", type: "int", description: "Input number" }
        ],
        expectedOutput: "1 2 Fizz 4 Buzz",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "15", type: "int", description: "Input number" }
        ],
        expectedOutput: "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static String[] fizzBuzz(int n) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n\n        String[] result = fizzBuzz(n);\n\n        for (String s : result) {\n            System.out.print(s + \" \");\n        }\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "fizzBuzz", returnType: "List[str]", parameters: [] },
      java: { functionName: "fizzBuzz", returnType: "String[]", parameters: [] },
      cpp: { functionName: "fizzBuzz", returnType: "vector<string>", parameters: [] },
      c: { functionName: "fizzBuzz", returnType: "char**", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Climbing Stairs",
    difficulty: "Easy",
    tags: ["Dynamic Programming", "Math"],
    companies: [],
    description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. Return the number of distinct ways you can climb to the top.",
    examples: [
      {
        input: "n = 3",
        output: "3",
        explanation: "There are three ways: 1+1+1, 1+2, and 2+1."
      }
    ],
    constraints: [
      "1 <= n <= 45"
    ],
    testCases: [
      {
        inputs: [
          { value: "2", type: "int", description: "Number of steps" }
        ],
        expectedOutput: "2",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "3", type: "int", description: "Number of steps" }
        ],
        expectedOutput: "3",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "5", type: "int", description: "Number of steps" }
        ],
        expectedOutput: "8",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static int climbStairs(int n) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n\n        System.out.println(climbStairs(n));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "climbStairs", returnType: "int", parameters: [] },
      java: { functionName: "climbStairs", returnType: "int", parameters: [] },
      cpp: { functionName: "climbStairs", returnType: "int", parameters: [] },
      c: { functionName: "climbStairs", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Majority Element",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    companies: [],
    description: "Given an array nums of size n, return the majority element. The majority element is the element that appears more than n/2 times.",
    examples: [
      {
        input: "nums = [2,2,1,1,1,2,2]",
        output: "2",
        explanation: "2 appears four times, which is more than half of the array."
      }
    ],
    constraints: [
      "n == nums.length",
      "1 <= n <= 5 * 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "The majority element always exists in the array."
    ],
    testCases: [
      {
        inputs: [
          { value: "7", type: "int", description: "Array length" },
          { value: "2 2 1 1 1 2 2", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "2",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "3", type: "int", description: "Array length" },
          { value: "3 2 3", type: "int[]", description: "Array elements" }
        ],
        expectedOutput: "3",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static int majorityElement(int[] nums) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n\n        System.out.println(majorityElement(nums));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "majorityElement", returnType: "int", parameters: [] },
      java: { functionName: "majorityElement", returnType: "int", parameters: [] },
      cpp: { functionName: "majorityElement", returnType: "int", parameters: [] },
      c: { functionName: "majorityElement", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Power of Two",
    difficulty: "Easy",
    tags: ["Math", "Bit Manipulation"],
    companies: [],
    description: "Given an integer n, return true if it is a power of two. Otherwise, return false. An integer n is a power of two if there exists an integer x such that n == 2^x.",
    examples: [
      {
        input: "n = 16",
        output: "true",
        explanation: "16 is equal to 2^4."
      }
    ],
    constraints: [
      "-2^31 <= n <= 2^31 - 1"
    ],
    testCases: [
      {
        inputs: [
          { value: "16", type: "int", description: "Input number" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "18", type: "int", description: "Input number" }
        ],
        expectedOutput: "false",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "1", type: "int", description: "Input number" }
        ],
        expectedOutput: "true",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\npublic class Main {\n\n    static boolean isPowerOfTwo(int n) {\n\n        // Write your code here\n\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n\n        System.out.println(isPowerOfTwo(n));\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "isPowerOfTwo", returnType: "bool", parameters: [] },
      java: { functionName: "isPowerOfTwo", returnType: "boolean", parameters: [] },
      cpp: { functionName: "isPowerOfTwo", returnType: "bool", parameters: [] },
      c: { functionName: "isPowerOfTwo", returnType: "int", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  },
  {
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    tags: ["Linked List", "Recursion"],
    companies: [],
    description: "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list and return the head of the merged linked list.",
    examples: [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        output: "[1,1,2,3,4,4]",
        explanation: "The two sorted lists are merged into a single sorted linked list."
      }
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order."
    ],
    testCases: [
      {
        inputs: [
          { value: "3", type: "int", description: "Length of first list" },
          { value: "1 2 4", type: "int[]", description: "First list elements" },
          { value: "3", type: "int", description: "Length of second list" },
          { value: "1 3 4", type: "int[]", description: "Second list elements" }
        ],
        expectedOutput: "1 1 2 3 4 4",
        visibility: "visible"
      },
      {
        inputs: [
          { value: "0", type: "int", description: "Length of first list" },
          { value: "3", type: "int", description: "Length of second list" },
          { value: "1 2 3", type: "int[]", description: "Second list elements" }
        ],
        expectedOutput: "1 2 3",
        visibility: "visible"
      }
    ],
    codeTemplates: {
      python: "",
      java: "import java.util.*;\n\nclass ListNode {\n    int val;\n    ListNode next;\n\n    ListNode() {}\n\n    ListNode(int val) {\n        this.val = val;\n    }\n\n    ListNode(int val, ListNode next) {\n        this.val = val;\n        this.next = next;\n    }\n}\n\npublic class Main {\n\n    static ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n\n        // Write your code here\n\n    }\n\n    static ListNode createList(int[] arr) {\n        ListNode dummy = new ListNode(-1);\n        ListNode curr = dummy;\n\n        for (int x : arr) {\n            curr.next = new ListNode(x);\n            curr = curr.next;\n        }\n\n        return dummy.next;\n    }\n\n    static void printList(ListNode head) {\n        while (head != null) {\n            System.out.print(head.val);\n            if (head.next != null) {\n                System.out.print(\" \");\n            }\n            head = head.next;\n        }\n        System.out.println();\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n\n        int n = sc.nextInt();\n        int[] arr1 = new int[n];\n        for (int i = 0; i < n; i++) {\n            arr1[i] = sc.nextInt();\n        }\n\n        int m = sc.nextInt();\n        int[] arr2 = new int[m];\n        for (int i = 0; i < m; i++) {\n            arr2[i] = sc.nextInt();\n        }\n\n        ListNode list1 = createList(arr1);\n        ListNode list2 = createList(arr2);\n\n        ListNode result = mergeTwoLists(list1, list2);\n\n        printList(result);\n\n        sc.close();\n    }\n}",
      cpp: "",
      c: ""
    },
    functionSignatures: {
      python: { functionName: "mergeTwoLists", returnType: "ListNode", parameters: [] },
      java: { functionName: "mergeTwoLists", returnType: "ListNode", parameters: [] },
      cpp: { functionName: "mergeTwoLists", returnType: "ListNode*", parameters: [] },
      c: { functionName: "mergeTwoLists", returnType: "ListNode*", parameters: [] }
    },
    stats: {
      likes: 0,
      dislikes: 0,
      acceptance: "0%",
      submissions: "0"
    },
    published: true
  }
];

async function addSampleProblems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neurohire');
    console.log('Connected to MongoDB');

    // Clear existing problems (optional - remove if you want to keep existing)
    // await Problem.deleteMany({});
    // console.log('Cleared existing problems');

    // Insert sample problems
    const inserted = await Problem.insertMany(sampleProblems);
    console.log(`Successfully inserted ${inserted.length} problems`);

    console.log('Sample problems added:');
    inserted.forEach(p => console.log(`- ${p.title} (${p.difficulty})`));

  } catch (error) {
    console.error('Error adding sample problems:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

addSampleProblems();
