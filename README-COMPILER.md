# NeuroHire Full Compiler System

## 🎯 Overview

This system allows users to write complete programs in **4 core languages** (Python, Java, C++, C) and executes them in secure Docker containers. Unlike LeetCode's function-signature approach, users write full programs that read input and produce output.

## 🏗️ Architecture

```
Frontend (React) → Backend API → Docker Container → Language Runtime → Output
```

## 🚀 Quick Start

1. **Build the system:**
   ```bash
   chmod +x setup-compiler.sh
   ./setup-compiler.sh
   ```

2. **Start the backend:**
   ```bash
   cd server
   npm run dev
   ```

3. **Start the frontend:**
   ```bash
   npm run dev
   ```

## 📝 Supported Languages (4 Core Languages)

| Language   | Runtime      | Compilation | Execution |
|------------|--------------|-------------|-----------|
| Python     | Python 3.10  | No          | `python3 program.py < input.txt` |
| Java       | OpenJDK 17   | Yes         | `javac Solution.java && java Solution < input.txt` |
| C++        | GCC 11       | Yes         | `g++ -o solution program.cpp && ./solution < input.txt` |
| C          | GCC 11       | Yes         | `gcc -o solution program.c && ./solution < input.txt` |

## 🔒 Security Features

- **Docker Isolation**: Each execution runs in a separate container
- **Resource Limits**: CPU (50%) and Memory (128MB default) restrictions
- **Network Isolation**: No internet access during execution
- **Time Limits**: 5-second default timeout
- **Non-root User**: Code runs as 'compiler' user
- **Read-only Filesystem**: Limited write access

## 📊 API Endpoints

### Execute Single Program
```http
POST /api/compiler/execute
Content-Type: application/json

{
  "code": "print('Hello World')",
  "language": "python",
  "input": "",
  "timeLimit": 5,
  "memoryLimit": 128
}
```

### Test Multiple Cases
```http
POST /api/compiler/test
Content-Type: application/json

{
  "code": "s = input().strip()\nprint(s[::-1])",
  "language": "python",
  "testCases": [
    {"input": "hello", "expectedOutput": "olleh"},
    {"input": "world", "expectedOutput": "dlrow"}
  ]
}
```

## 💻 Code Templates

### Python Template
```python
s = input().strip()

def solve(s):
    return s  # placeholder

print(solve(s))
```

### Java Template
```java
import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.nextLine().trim();
        
        System.out.println(solve(s));
        scanner.close();
    }
    
    public static String solve(String s) {
        return s; // placeholder
    }
}
```

### C++ Template
```cpp
#include <iostream>
#include <string>
using namespace std;

string solve(string s) {
    return s; // placeholder
}

int main() {
    string s;
    getline(cin, s);
    
    cout << solve(s) << endl;
    return 0;
}
```

### C Template
```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

char* solve(char* s) {
    int len = strlen(s);
    char* result = malloc(len + 1);
    strcpy(result, s);
    return result; // placeholder
}

int main() {
    char s[1001];
    fgets(s, sizeof(s), stdin);
    s[strcspn(s, "\n")] = 0; // Remove newline
    
    char* result = solve(s);
    printf("%s\n", result);
    free(result);
    return 0;
}
```

## 🔧 Configuration

### Docker Container Limits
```javascript
const containerConfig = {
  Memory: 128 * 1024 * 1024,  // 128MB
  CpuQuota: 50000,            // 50% CPU
  NetworkMode: 'none',        // No network
  ReadonlyRootfs: false,      // Allow compilation
  Timeout: 5000               // 5 seconds
};
```

### Security Validation
```javascript
const securityChecks = {
  maxCodeLength: 50000,       // 50KB max
  maxExecutionTime: 30,       // 30 seconds max
  allowedLanguages: ['python', 'java', 'cpp', 'c']
};
```

## 🐛 Troubleshooting

### Docker Issues
```bash
# Check if Docker is running
docker ps

# Rebuild compiler image
docker build -f Dockerfile.compiler -t neurohire-compiler:latest .

# Check container logs
docker logs <container_id>
```

### Permission Issues
```bash
# Fix execution directory permissions
sudo chmod 777 /tmp/neurohire-executions

# Check Docker permissions
sudo usermod -aG docker $USER
```

## 📈 Performance Optimization

1. **Container Reuse**: Consider keeping containers warm
2. **Parallel Execution**: Run multiple test cases in parallel
3. **Caching**: Cache compiled binaries for repeated submissions
4. **Resource Monitoring**: Track CPU/memory usage per execution

## 🔮 Future Enhancements

- [ ] **Advanced Security**: Static code analysis, malware detection
- [ ] **Performance Metrics**: Detailed timing and memory tracking
- [ ] **Code Quality**: Linting, style checking, complexity analysis
- [ ] **Debugging Support**: Step-through debugging, breakpoints
- [ ] **Collaborative Features**: Code sharing, peer review

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details