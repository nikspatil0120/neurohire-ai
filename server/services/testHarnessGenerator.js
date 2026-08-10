/**
 * Test Harness Generator - Simple Version
 * Generates wrapper code that handles I/O for LeetCode-style function submissions
 */

class TestHarnessGenerator {
  /**
   * Generate complete executable code from user's Solution class
   */
  generateWrapper(userCode, language, functionSignature, inputTypes) {
    switch (language) {
      case 'java':
        return this.generateJavaWrapper(userCode, functionSignature, inputTypes);
      case 'python':
        return this.generatePythonWrapper(userCode, functionSignature, inputTypes);
      case 'cpp':
        return this.generateCppWrapper(userCode, functionSignature, inputTypes);
      default:
        return userCode; // Return as-is if not supported
    }
  }

  generateJavaWrapper(userCode, signature, inputTypes) {
    const { functionName, returnType, parameters } = signature;
    
    // Generate input reading code
    const inputReading = inputTypes.map((type, idx) => {
      const paramName = parameters[idx]?.name || `input${idx + 1}`;
      return this.generateJavaInputReader(type, paramName);
    }).join('\n        ');

    // Generate function call
    const paramNames = parameters.map(p => p.name).join(', ');
    
    // Generate output printing
    const outputCode = this.generateJavaOutput(returnType, 'result');

    return `import java.util.*;
import java.util.stream.*;

${userCode}

class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution solution = new Solution();
        
        // Auto-generated input reading
        ${inputReading}
        
        // Call solution
        ${returnType} result = solution.${functionName}(${paramNames});
        
        // Auto-generated output
        ${outputCode}
        
        scanner.close();
    }
    
    // Helper functions
    static int[] readIntArray(Scanner sc) {
        return Arrays.stream(sc.nextLine().trim().split("\\\\s+"))
                     .mapToInt(Integer::parseInt).toArray();
    }
    
    static String[] readStringArray(Scanner sc) {
        return sc.nextLine().trim().split("\\\\s+");
    }
}`;
  }

  generateJavaInputReader(type, varName) {
    switch(type) {
      case 'int':
        return `int ${varName} = Integer.parseInt(scanner.nextLine().trim());`;
      case 'int[]':
        return `int[] ${varName} = readIntArray(scanner);`;
      case 'string':
        return `String ${varName} = scanner.nextLine().trim();`;
      case 'string[]':
        return `String[] ${varName} = readStringArray(scanner);`;
      case 'long':
        return `long ${varName} = Long.parseLong(scanner.nextLine().trim());`;
      case 'double':
        return `double ${varName} = Double.parseDouble(scanner.nextLine().trim());`;
      default:
        return `String ${varName} = scanner.nextLine().trim();`;
    }
  }

  generateJavaOutput(returnType, varName) {
    if (returnType === 'int[]') {
      return `System.out.println(Arrays.stream(${varName}).mapToObj(String::valueOf).collect(Collectors.joining(" ")));`;
    } else if (returnType === 'String[]') {
      return `System.out.println(String.join(" ", ${varName}));`;
    } else if (returnType.includes('List')) {
      return `System.out.println(${varName}.stream().map(Object::toString).collect(Collectors.joining(" ")));`;
    } else {
      return `System.out.println(${varName});`;
    }
  }

  generatePythonWrapper(userCode, signature, inputTypes) {
    const { functionName, parameters } = signature;
    
    const inputReading = inputTypes.map((type, idx) => {
      const paramName = parameters[idx]?.name || `input${idx + 1}`;
      return this.generatePythonInputReader(type, paramName);
    }).join('\n    ');

    const paramNames = parameters.map(p => p.name).join(', ');

    return `from typing import List

${userCode}

if __name__ == "__main__":
    solution = Solution()
    
    # Auto-generated input reading
    ${inputReading}
    
    # Call solution
    result = solution.${functionName}(${paramNames})
    
    # Auto-generated output
    if isinstance(result, list):
        print(' '.join(map(str, result)))
    else:
        print(result)`;
  }

  generatePythonInputReader(type, varName) {
    switch(type) {
      case 'int':
        return `${varName} = int(input().strip())`;
      case 'int[]':
        return `${varName} = list(map(int, input().strip().split()))`;
      case 'string':
        return `${varName} = input().strip()`;
      case 'string[]':
        return `${varName} = input().strip().split()`;
      default:
        return `${varName} = input().strip()`;
    }
  }

  generateCppWrapper(userCode, signature, inputTypes) {
    // Similar to Java but for C++
    return userCode; // Simplified for now
  }
}

export default TestHarnessGenerator;
