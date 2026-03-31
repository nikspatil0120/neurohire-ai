import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginFixed from "./pages/LoginFixed";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold">N</span>
          </div>
          <span className="text-lg tracking-widest">NEUROHIRE AI</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center py-24 px-8">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-12">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
            <span className="text-4xl">🧠</span>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl tracking-wider text-center mb-6">
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">NEUROHIRE</span>{" "}
          <span className="text-white">AI</span>
        </h1>

        <p className="text-lg text-gray-400 text-center max-w-2xl mb-10">
          Next-generation AI recruitment platform. Adaptive interviews, emotion detection,
          and predictive analytics — all in one cinematic experience.
        </p>

        <a
          href="/login"
          className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm tracking-wide hover:shadow-lg transition-all duration-300 flex items-center gap-2"
        >
          Get Started →
        </a>
      </section>

      {/* Features */}
      <section className="py-24 px-8">
        <h2 className="text-3xl tracking-wider text-center mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">FEATURES</h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">Powered by cutting-edge AI to transform your hiring pipeline</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { icon: "🧠", title: "AI-Powered Interviews", desc: "Real-time adaptive questioning with neural language processing" },
            { icon: "👁️", title: "Emotion Detection", desc: "Live facial analysis and sentiment tracking during interviews" },
            { icon: "🎤", title: "Voice Analysis", desc: "Confidence and stability metrics from vocal patterns" },
            { icon: "📊", title: "Deep Analytics", desc: "Comprehensive candidate scoring with predictive insights" },
            { icon: "🛡️", title: "Secure Environment", desc: "Tab monitoring, face detection, and anti-cheat systems" },
            { icon: "👥", title: "Recruiter Portal", desc: "Full pipeline management with AI-ranked candidates" },
          ].map((feature, i) => (
            <div key={feature.title} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 hover:border-blue-500/50 transition-all">
              <div className="text-2xl mb-4">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-8 text-center">
        <p className="text-sm text-gray-400">© 2026 NeuroHire AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Profile Completion</h3>
          <p className="text-3xl font-bold text-blue-400">75%</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Upcoming Interviews</h3>
          <p className="text-3xl font-bold text-green-400">3</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Overall Score</h3>
          <p className="text-3xl font-bold text-purple-400">85</p>
        </div>
      </div>
    </div>
  );
};

const AppWorking = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginFixed />} />
      <Route path="/candidate/dashboard" element={<DashboardPage />} />
      <Route path="/recruiter/dashboard" element={<DashboardPage />} />
      <Route path="/admin/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  </BrowserRouter>
);

export default AppWorking;