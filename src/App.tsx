import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { GoogleAuthProvider } from "@/components/GoogleOAuthProvider";
import DatabaseStatus from "@/components/DatabaseStatus";
import Index from "./pages/Index";
import Login from "./pages/Login";
import LoginSimple from "./pages/LoginSimple";
import TestPage from "./pages/TestPage";
import NotFound from "./pages/NotFound";

// Candidate
import CandidateDashboard from "./pages/candidate/Dashboard";
import CandidateProfile from "./pages/candidate/Profile";
import ProfilePhotoOnboarding from "./pages/candidate/ProfilePhotoOnboarding";
import PracticeMode from "./pages/candidate/PracticeMode";
import ProblemList from "./pages/candidate/ProblemList";
import AptitudeTest from "./pages/candidate/AptitudeTest";
import TechnicalCoding from "./pages/candidate/TechnicalCoding";
import InterviewRoom from "./pages/candidate/InterviewRoom";
import Interviews from "./pages/candidate/Interviews";
import Report from "./pages/candidate/Report";
import IncomingOpportunities from "./pages/candidate/IncomingOpportunities";

// Recruiter
import RecruiterDashboard from "./pages/recruiter/Dashboard";
import RecruiterProfile from "./pages/recruiter/Profile";
import CreateJob from "./pages/recruiter/CreateJob";
import EditJob from "./pages/recruiter/EditJob";
import JobsCreated from "./pages/recruiter/JobsCreated";
import QuestionDB from "./pages/recruiter/QuestionDB";
import Rankings from "./pages/recruiter/Rankings";
import Messaging from "./pages/recruiter/Messaging";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import SystemMonitoring from "./pages/admin/SystemMonitoring";
import DSAProblems from "./pages/admin/DSAProblems";
import AptitudeQuestions from "./pages/admin/AptitudeQuestions";
import Recruiters from "./pages/admin/Recruiters";
import Candidates from "./pages/admin/Candidates";
import IncomingJobs from "./pages/admin/IncomingJobs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleAuthProvider>
      <AuthProvider>
        <ProfileProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />

                {/* Candidate */}
                <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
                <Route path="/candidate/profile" element={<CandidateProfile />} />
                <Route path="/candidate/profile-photo-setup" element={<ProfilePhotoOnboarding />} />
                <Route path="/candidate/practice" element={<PracticeMode />} />
                <Route path="/candidate/problem-list" element={<ProblemList />} />
                <Route path="/candidate/aptitude-test" element={<AptitudeTest />} />
                <Route path="/candidate/technical-coding" element={<TechnicalCoding />} />
                <Route path="/candidate/interview-room" element={<InterviewRoom />} />
                <Route path="/candidate/interviews" element={<Interviews />} />
                <Route path="/candidate/reports" element={<Report />} />
                <Route path="/candidate/incoming-opportunities" element={<IncomingOpportunities />} />

                {/* Recruiter */}
                <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
                <Route path="/recruiter/profile" element={<RecruiterProfile />} />
                <Route path="/recruiter/create-job" element={<CreateJob />} />
                <Route path="/recruiter/edit-job/:jobId" element={<EditJob />} />
                <Route path="/recruiter/jobs-created" element={<JobsCreated />} />
                <Route path="/recruiter/questions" element={<QuestionDB />} />
                <Route path="/recruiter/rankings" element={<Rankings />} />
                <Route path="/recruiter/messages" element={<Messaging />} />

                {/* Admin */}
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/monitoring" element={<SystemMonitoring />} />
                <Route path="/admin/recruiters" element={<Recruiters />} />
                <Route path="/admin/candidates" element={<Candidates />} />
                <Route path="/admin/dsa-problems" element={<DSAProblems />} />
                <Route path="/admin/aptitude-questions" element={<AptitudeQuestions />} />
                <Route path="/admin/incoming-jobs" element={<IncomingJobs />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ProfileProvider>
      </AuthProvider>
    </GoogleAuthProvider>
  </QueryClientProvider>
);

export default App;
