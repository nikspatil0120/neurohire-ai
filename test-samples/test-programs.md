# Test Programs for NeuroHire Compiler

## Python Test
```python
s = input().strip()

def longest_palindrome(s):
    if len(s) <= 1:
        return s
    
    start = 0
    max_len = 1
    
    for i in range(len(s)):
        # Check for odd length palindromes
        left, right = i, i
        while left >= 0 and right < len(s) and s[left] == s[right]:
            current_len = right - left + 1
            if current_len > max_len:
                start = left
                max_len = current_len
            left -= 1
            right += 1
        
        # Check for even length palindromes
        left, right = i, i + 1
        while left >= 0 and right < len(s) and s[left] == s[right]:
            current_len = right - left + 1
            if current_len > max_len:
                start = left
                max_len = current_len
            left -= 1
            right += 1
    
    return s[start:start + max_len]

result = longest_palindrome(s)
print(result)
```

## Java Test
```java
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.nextLine().trim();
        
        String result = longestPalindrome(s);
        System.out.println(result);
        
        scanner.close();
    }
    
    public static String longestPalindrome(String s) {
        if (s.length() <= 1) return s;
        
        int start = 0, maxLen = 1;
        
        for (int i = 0; i < s.length(); i++) {
            // Odd length palindromes
            int len1 = expandAroundCenter(s, i, i);
            // Even length palindromes
            int len2 = expandAroundCenter(s, i, i + 1);
            
            int len = Math.max(len1, len2);
            if (len > maxLen) {
                maxLen = len;
                start = i - (len - 1) / 2;
            }
        }
        
        return s.substring(start, start + maxLen);
    }
    
    private static int expandAroundCenter(String s, int left, int right) {
        while (left >= 0 && right < s.length() && s.charAt(left) == s.charAt(right)) {
            left--;
            right++;
        }
        return right - left - 1;
    }
}
```

## C++ Test
```cpp
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

string longestPalindrome(string s) {
    if (s.length() <= 1) return s;
    
    int start = 0, maxLen = 1;
    
    for (int i = 0; i < s.length(); i++) {
        // Check odd length palindromes
        int left = i, right = i;
        while (left >= 0 && right < s.length() && s[left] == s[right]) {
            int currentLen = right - left + 1;
            if (currentLen > maxLen) {
                start = left;
                maxLen = currentLen;
            }
            left--;
            right++;
        }
        
        // Check even length palindromes
        left = i;
        right = i + 1;
        while (left >= 0 && right < s.length() && s[left] == s[right]) {
            int currentLen = right - left + 1;
            if (currentLen > maxLen) {
                start = left;
                maxLen = currentLen;
            }
            left--;
            right++;
        }
    }
    
    return s.substr(start, maxLen);
}

int main() {
    string s;
    getline(cin, s);
    
    string result = longestPalindrome(s);
    cout << result << endl;
    
    return 0;
}
```

## C Test
```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

char* longestPalindrome(char* s) {
    int len = strlen(s);
    if (len <= 1) {
        char* result = (char*)malloc((len + 1) * sizeof(char));
        strcpy(result, s);
        return result;
    }
    
    int start = 0, maxLen = 1;
    
    for (int i = 0; i < len; i++) {
        // Check odd length palindromes
        int left = i, right = i;
        while (left >= 0 && right < len && s[left] == s[right]) {
            int currentLen = right - left + 1;
            if (currentLen > maxLen) {
                start = left;
                maxLen = currentLen;
            }
            left--;
            right++;
        }
        
        // Check even length palindromes
        left = i;
        right = i + 1;
        while (left >= 0 && right < len && s[left] == s[right]) {
            int currentLen = right - left + 1;
            if (currentLen > maxLen) {
                start = left;
                maxLen = currentLen;
            }
            left--;
            right++;
        }
    }
    
    char* result = (char*)malloc((maxLen + 1) * sizeof(char));
    strncpy(result, s + start, maxLen);
    result[maxLen] = '\0';
    return result;
}

int main() {
    char s[1001];
    fgets(s, sizeof(s), stdin);
    
    // Remove newline if present
    s[strcspn(s, "\n")] = 0;
    
    char* result = longestPalindrome(s);
    printf("%s\n", result);
    
    free(result);
    return 0;
}
```

## Test Cases
- Input: "babad" → Expected: "bab" or "aba"
- Input: "cbbd" → Expected: "bb"
- Input: "a" → Expected: "a"
- Input: "racecar" → Expected: "racecar"