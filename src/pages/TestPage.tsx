const TestPage = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <h1>NeuroHire AI - Test Page</h1>
      <p>If you can see this, the basic app is working!</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #333', borderRadius: '8px' }}>
        <h2>Test Features:</h2>
        <ul>
          <li>✅ Basic rendering works</li>
          <li>✅ Styling works</li>
          <li>✅ Components load</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => alert('Button works!')}
          style={{ padding: '10px 20px', background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestPage;
