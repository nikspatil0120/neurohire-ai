import { BrowserRouter, Routes, Route } from "react-router-dom";

const TestPage = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#fff', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>NeuroHire AI - Test Page</h1>
      <p>If you can see this, the basic React app is working!</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '20px', 
        border: '1px solid #333', 
        borderRadius: '8px' 
      }}>
        <h2>Status Check:</h2>
        <ul>
          <li>✅ React rendering works</li>
          <li>✅ Basic styling works</li>
          <li>✅ Router works</li>
          <li>❌ No providers loaded yet</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => alert('Button works!')}
          style={{ 
            padding: '10px 20px', 
            background: '#007acc', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          Test Button
        </button>
      </div>
    </div>
  );
};

const AppMinimalTest = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<TestPage />} />
      <Route path="*" element={<TestPage />} />
    </Routes>
  </BrowserRouter>
);

export default AppMinimalTest;