import { BrowserRouter, Routes, Route } from "react-router-dom";

const TestPage = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <h1>NeuroHire AI - Minimal Test (No Providers)</h1>
      <p>If you can see this, the basic app works without any providers!</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #333', borderRadius: '8px' }}>
        <h2>Test Features:</h2>
        <ul>
          <li>✅ Basic rendering works</li>
          <li>✅ Styling works</li>
          <li>✅ Components load</li>
          <li>❌ No providers (AuthContext, MongoDB, Google OAuth removed)</li>
        </ul>
        <div style={{ marginTop: '20px', padding: '15px', background: '#222', borderRadius: '4px' }}>
          <h3>Buffer Issue Detected:</h3>
          <p>The buffer.js file you showed suggests MongoDB driver compatibility issues.</p>
          <p>This is likely causing the white screen when providers are added.</p>
        </div>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => alert('Button works! No providers needed!')}
          style={{ padding: '10px 20px', background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test Button (No Providers)
        </button>
      </div>
    </div>
  );
};

const AppMinimal = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<TestPage />} />
      <Route path="/login" element={<TestPage />} />
      <Route path="*" element={<TestPage />} />
    </Routes>
  </BrowserRouter>
);

export default AppMinimal;
