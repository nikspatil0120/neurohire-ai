// Utility to generate standardized boilerplate code for sequential inputs
// This helps admins create consistent code templates without writing input parsing manually

export interface InputDefinition {
  value: string;
  type: "int" | "int[]" | "string" | "string[]" | "long" | "double";
  description: string;
}

export interface BoilerplateOptions {
  functionName: string;
  returnType: string;
  parameters: { name: string; type: string }[];
  inputs: InputDefinition[];
  language: "python" | "java" | "cpp" | "c";
}

/**
 * Generate Python boilerplate with sequential input reading
 */
export const generatePythonBoilerplate = (options: BoilerplateOptions): string => {
  const { functionName, returnType, parameters, inputs } = options;
  
  // Generate input reading code based on input types
  let inputReadingCode = "";
  let variableDeclarations = "";
  let functionCallArgs = "";
  
  inputs.forEach((input, index) => {
    const varName = `input_${index}`;
    switch (input.type) {
      case "int":
        inputReadingCode += `    ${varName} = int(input().strip())\n`;
        break;
      case "int[]":
        inputReadingCode += `    ${varName} = list(map(int, input().strip().split()))\n`;
        break;
      case "string":
        inputReadingCode += `    ${varName} = input().strip()\n`;
        break;
      case "string[]":
        inputReadingCode += `    ${varName} = input().strip().split()\n`;
        break;
      case "long":
        inputReadingCode += `    ${varName} = int(input().strip())\n`;
        break;
      case "double":
        inputReadingCode += `    ${varName} = float(input().strip())\n`;
        break;
    }
    functionCallArgs += (index > 0 ? ", " : "") + varName;
  });
  
  // Generate function signature
  const paramsStr = parameters.map(p => `${p.name}: ${p.type}`).join(", ");
  
  return `# Write your solution here
${inputReadingCode}

def ${functionName}(${paramsStr}) -> ${returnType}:
    # Your code here
    pass

# Call the function
result = ${functionName}(${functionCallArgs})

# Print result
print(result)`;
};

/**
 * Generate Java boilerplate with sequential input reading
 */
export const generateJavaBoilerplate = (options: BoilerplateOptions): string => {
  const { functionName, returnType, parameters, inputs } = options;
  
  // Generate helper methods for input reading
  let helperMethods = "";
  let inputReadingCode = "";
  let variableDeclarations = "";
  let functionCallArgs = "";
  
  inputs.forEach((input, index) => {
    const varName = `input${index}`;
    const javaType = getJavaType(input.type);
    
    switch (input.type) {
      case "int":
        inputReadingCode += `        int ${varName} = Integer.parseInt(scanner.nextLine().trim());\n`;
        break;
      case "int[]":
        inputReadingCode += `        int[] ${varName} = Arrays.stream(scanner.nextLine().trim().split("\\\\s+"))\n`;
        inputReadingCode += `                             .mapToInt(Integer::parseInt).toArray();\n`;
        break;
      case "string":
        inputReadingCode += `        String ${varName} = scanner.nextLine().trim();\n`;
        break;
      case "string[]":
        inputReadingCode += `        String[] ${varName} = scanner.nextLine().trim().split("\\\\s+");\n`;
        break;
      case "long":
        inputReadingCode += `        long ${varName} = Long.parseLong(scanner.nextLine().trim());\n`;
        break;
      case "double":
        inputReadingCode += `        double ${varName} = Double.parseDouble(scanner.nextLine().trim());\n`;
        break;
    }
    functionCallArgs += (index > 0 ? ", " : "") + varName;
  });
  
  // Generate function signature
  const paramsStr = parameters.map(p => `${p.type} ${p.name}`).join(", ");
  
  return `import java.util.*;
import java.util.stream.*;

class Solution {
    public ${returnType} ${functionName}(${paramsStr}) {
        // Your code here
        ${returnType === "void" ? "" : "return " + getJavaDefaultValue(returnType) + ";"}
    }
}

class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Solution solution = new Solution();
        
${inputReadingCode}
        // Call the function
        ${returnType === "void" ? "solution." : getJavaType(returnType) + " result = solution."}${functionName}(${functionCallArgs});
        
        // Print result
        ${returnType === "void" ? "" : `System.out.println(result);`}
        
        scanner.close();
    }
}`;
};

/**
 * Generate C++ boilerplate with sequential input reading
 */
export const generateCppBoilerplate = (options: BoilerplateOptions): string => {
  const { functionName, returnType, parameters, inputs } = options;
  
  let inputReadingCode = "";
  let variableDeclarations = "";
  let functionCallArgs = "";
  
  inputs.forEach((input, index) => {
    const varName = `input${index}`;
    const cppType = getCppType(input.type);
    
    switch (input.type) {
      case "int":
        inputReadingCode += `    int ${varName};\n    cin >> ${varName};\n`;
        break;
      case "int[]":
        inputReadingCode += `    string line${index};\n    getline(cin, line${index});\n`;
        inputReadingCode += `    istringstream iss${index}(line${index});\n`;
        inputReadingCode += `    vector<int> ${varName};\n    int num${index};\n`;
        inputReadingCode += `    while (iss${index} >> num${index}) {\n        ${varName}.push_back(num${index});\n    }\n`;
        break;
      case "string":
        inputReadingCode += `    string ${varName};\n    getline(cin, ${varName});\n`;
        break;
      case "string[]":
        inputReadingCode += `    string line${index};\n    getline(cin, line${index});\n`;
        inputReadingCode += `    istringstream iss${index}(line${index});\n`;
        inputReadingCode += `    vector<string> ${varName};\n    string token${index};\n`;
        inputReadingCode += `    while (iss${index} >> token${index}) {\n        ${varName}.push_back(token${index});\n    }\n`;
        break;
      case "long":
        inputReadingCode += `    long long ${varName};\n    cin >> ${varName};\n`;
        break;
      case "double":
        inputReadingCode += `    double ${varName};\n    cin >> ${varName};\n`;
        break;
    }
    functionCallArgs += (index > 0 ? ", " : "") + varName;
  });
  
  // Generate function signature
  const paramsStr = parameters.map(p => `${p.type} ${p.name}`).join(", ");
  
  return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

${returnType} ${functionName}(${paramsStr}) {
    // Your code here
    ${returnType === "void" ? "" : "return " + getCppDefaultValue(returnType) + ";"}
}

int main() {
${inputReadingCode}
    // Call the function
    ${returnType === "void" ? "" : getCppType(returnType) + " result = "}${functionName}(${functionCallArgs});
    
    // Print result
    ${returnType === "void" ? "" : "cout << result << endl;"}
    
    return 0;
}`;
};

/**
 * Generate C boilerplate with sequential input reading
 */
export const generateCBoilerplate = (options: BoilerplateOptions): string => {
  const { functionName, returnType, parameters, inputs } = options;
  
  let inputReadingCode = "";
  let variableDeclarations = "";
  let functionCallArgs = "";
  
  inputs.forEach((input, index) => {
    const varName = `input${index}`;
    const inputCType = getCType(input.type);
    
    switch (input.type) {
      case "int":
        inputReadingCode += `    int ${varName};\n    scanf("%d", &${varName});\n`;
        break;
      case "int[]":
        inputReadingCode += `    int ${varName}_size;\n    scanf("%d", &${varName}_size);\n`;
        inputReadingCode += `    int ${varName}[${varName}_size];\n`;
        inputReadingCode += `    for (int i = 0; i < ${varName}_size; i++) {\n        scanf("%d", &${varName}[i]);\n    }\n`;
        break;
      case "string":
        inputReadingCode += `    char ${varName}[1000];\n`;
        inputReadingCode += `    scanf("%s", ${varName});\n`;
        break;
      case "string[]":
        inputReadingCode += `    int ${varName}_size;\n    scanf("%d", &${varName}_size);\n`;
        inputReadingCode += `    char ${varName}[${varName}_size][1000];\n`;
        inputReadingCode += `    for (int i = 0; i < ${varName}_size; i++) {\n        scanf("%s", ${varName}[i]);\n    }\n`;
        break;
      case "long":
        inputReadingCode += `    long ${varName};\n    scanf("%ld", &${varName});\n`;
        break;
      case "double":
        inputReadingCode += `    double ${varName};\n    scanf("%lf", &${varName});\n`;
        break;
    }
    functionCallArgs += (index > 0 ? ", " : "") + varName;
  });
  
  // Generate function signature
  const returnCType = getCType(returnType);
  const paramsStr = parameters.map(p => `${getCType(p.type)} ${p.name}`).join(", ");
  
  return `#include <stdio.h>
#include <stdlib.h>

${returnCType} ${functionName}(${paramsStr}) {
    // Your code here
    ${returnType === "void" ? "" : "return " + getCDefaultValue(returnType) + ";"}
}

int main() {
${inputReadingCode}
    // Call the function
    ${returnType === "void" ? "" : returnCType + " result = "}${functionName}(${functionCallArgs});
    
    // Print result
    ${returnType === "void" ? "" : `printf("%d\\\\n", result);`}
    
    return 0;
}`;
};

// Helper functions for type mapping
function getJavaType(type: string): string {
  const typeMap: Record<string, string> = {
    "int": "int",
    "int[]": "int[]",
    "string": "String",
    "string[]": "String[]",
    "long": "long",
    "double": "double"
  };
  return typeMap[type] || "Object";
}

function getJavaDefaultValue(type: string): string {
  const defaultMap: Record<string, string> = {
    "int": "0",
    "int[]": "new int[]{}",
    "string": "\"\"",
    "string[]": "new String[]{}",
    "long": "0L",
    "double": "0.0",
    "void": ""
  };
  return defaultMap[type] || "null";
}

function getCppType(type: string): string {
  const typeMap: Record<string, string> = {
    "int": "int",
    "int[]": "vector<int>",
    "string": "string",
    "string[]": "vector<string>",
    "long": "long long",
    "double": "double"
  };
  return typeMap[type] || "auto";
}

function getCppDefaultValue(type: string): string {
  const defaultMap: Record<string, string> = {
    "int": "0",
    "int[]": "{}",
    "string": "\"\"",
    "string[]": "{}",
    "long": "0LL",
    "double": "0.0",
    "void": ""
  };
  return defaultMap[type] || "{}";
}

function getCType(type: string): string {
  const typeMap: Record<string, string> = {
    "int": "int",
    "int[]": "int*",
    "string": "char*",
    "string[]": "char**",
    "long": "long",
    "double": "double"
  };
  return typeMap[type] || "void*";
}

function getCDefaultValue(type: string): string {
  const defaultMap: Record<string, string> = {
    "int": "0",
    "int[]": "NULL",
    "string": "\"\"",
    "string[]": "NULL",
    "long": "0L",
    "double": "0.0",
    "void": ""
  };
  return defaultMap[type] || "NULL";
}

/**
 * Main function to generate boilerplate for any language
 */
export const generateBoilerplate = (options: BoilerplateOptions): string => {
  switch (options.language) {
    case "python":
      return generatePythonBoilerplate(options);
    case "java":
      return generateJavaBoilerplate(options);
    case "cpp":
      return generateCppBoilerplate(options);
    case "c":
      return generateCBoilerplate(options);
    default:
      return "";
  }
};
