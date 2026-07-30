import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'var(--bg)',
          color: 'var(--ink)',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r2)',
            padding: '32px',
            maxWidth: '480px',
            boxShadow: 'var(--shadow-dropdown)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 56, 96, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--red)'
            }}>
              <AlertTriangle size={32} />
            </div>
            
            <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 700 }}>Something went wrong</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              The application encountered an unexpected error. Please reload the session to continue working safely.
            </p>

            <div style={{
              background: 'var(--surface-soft)',
              padding: '12px',
              borderRadius: '8px',
              width: '100%',
              textAlign: 'left',
              border: '1px solid var(--line)',
              overflowX: 'auto',
              maxHeight: '120px'
            }}>
              <code style={{ fontSize: '12px', color: 'var(--red)', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.message || 'Unknown render error'}
              </code>
            </div>

            <button 
              onClick={this.handleReset}
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px', height: '48px', gap: '8px' }}
            >
              <RefreshCw size={18} />
              Reload Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
