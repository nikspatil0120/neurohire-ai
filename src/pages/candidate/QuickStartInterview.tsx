import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";

/**
 * Development-only page to quickly start a test interview
 * This creates a mock interview in the database and redirects to the interview room
 */
const QuickStartInterview = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'creating' | 'error'>('creating');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const createTestInterview = async () => {
      try {
        const token = localStorage.getItem("token");
        
        if (!token) {
          setError("No authentication token found. Please login first.");
          setStatus('error');
          return;
        }

        // Step 1: Get current user info to get candidate_id
        const userResponse = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error("Failed to get user info. Please login again.");
        }

        const userData = await userResponse.json();
        console.log("User data:", userData);

        // Step 2: Create a test job (or use existing one)
        let jobId = 1; // Default test job ID

        // Try to get existing jobs
        try {
          const jobsResponse = await fetch('http://localhost:8000/api/jobs?limit=1', {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });

          if (jobsResponse.ok) {
            const jobsData = await jobsResponse.json();
            if (jobsData.length > 0) {
              jobId = jobsData[0].id;
              console.log("Using existing job:", jobId);
            }
          }
        } catch (err) {
          console.log("Could not fetch jobs, using default job_id:", jobId);
        }

        // Step 3: Create interview
        const interviewData = {
          job_id: jobId,
          scheduled_at: new Date().toISOString(),
          duration: 30, // 30 minutes
        };

        console.log("Creating interview with data:", interviewData);

        const createResponse = await fetch('http://localhost:8000/api/interviews/', {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(interviewData),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(errorData.detail || "Failed to create interview");
        }

        const interview = await createResponse.json();
        console.log("Interview created:", interview);

        // Step 4: Redirect to interview room
        setTimeout(() => {
          navigate(`/candidate/interview/${interview.id}`);
        }, 1000);

      } catch (err) {
        console.error("Error creating test interview:", err);
        setError(err instanceof Error ? err.message : "Failed to create interview");
        setStatus('error');
      }
    };

    createTestInterview();
  }, [navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Failed to Start Interview</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/candidate/dashboard')}
              className="w-full px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Starting Interview...</h2>
        <p className="text-muted-foreground">Creating your interview session</p>
        
        <div className="mt-8 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Creating interview session</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <span>Initializing AI interviewer</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <span>Setting up video connection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStartInterview;
