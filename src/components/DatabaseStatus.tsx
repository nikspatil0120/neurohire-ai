import { useState, useEffect } from 'react';
import { getCollection } from '@/lib/mongodb';
import { CheckCircle, AlertCircle, Database } from 'lucide-react';

const DatabaseStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      setErrorMessage('');

      // Try to connect and perform a simple query
      const usersCollection = await getCollection('users');
      const testDoc = await usersCollection.findOne({}, { projection: { _id: 1 } });

      setConnectionStatus('connected');
    } catch (error: any) {
      setConnectionStatus('disconnected');
      setErrorMessage(error.message || 'Connection failed');
      console.error('Database connection error:', error);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'checking':
        return <Database className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'Checking connection...';
      case 'connected':
        return 'MongoDB Connected';
      case 'disconnected':
        return 'MongoDB Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'text-yellow-500';
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-red-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {connectionStatus === 'disconnected' && errorMessage && (
          <div className="text-xs text-red-400 mb-2">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={checkConnection}
            className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded transition-colors"
            disabled={connectionStatus === 'checking'}
          >
            {connectionStatus === 'checking' ? 'Testing...' : 'Test Connection'}
          </button>

          {connectionStatus === 'connected' && (
            <a
              href="https://cloud.mongodb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 bg-secondary/10 hover:bg-secondary/20 rounded transition-colors"
            >
              Open Atlas
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatus;
