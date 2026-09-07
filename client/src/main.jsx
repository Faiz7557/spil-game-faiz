import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Premium Error Boundary for real-time browser diagnostics
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught a fatal app crash:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px 20px', 
          background: '#020617', 
          color: '#f8fafc', 
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: '700px',
            width: '100%',
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            borderRadius: '16px',
            padding: '30px'
          }}>
            <h2 style={{ 
              color: '#f43f5e', 
              fontSize: '24px', 
              fontWeight: '900', 
              margin: '0 0 10px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🚨 Simulasi Hancur! (Error Tertangkap)
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 20px 0' }}>
              Aplikasi mengalami crash runtime di sisi browser. Silakan salin trace di bawah ini untuk membantu kami menyelesaikannya secara instan:
            </p>
            
            <div style={{ margin: '15px 0' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f43f5e', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                Pesan Error:
              </span>
              <pre style={{ 
                background: '#020617', 
                padding: '15px', 
                borderRadius: '8px', 
                overflowX: 'auto', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#fda4af',
                fontSize: '13px',
                fontFamily: 'monospace',
                margin: '0'
              }}>{this.state.error && this.state.error.toString()}</pre>
            </div>

            {this.state.errorInfo && (
              <div style={{ margin: '15px 0' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                  Trace Stack Komponen:
                </span>
                <pre style={{ 
                  background: '#020617', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  overflowX: 'auto', 
                  border: '1px solid #334155', 
                  color: '#cbd5e1', 
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  margin: '0'
                }}>{this.state.errorInfo.componentStack}</pre>
              </div>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                background: 'linear-gradient(90deg, #0d9488, #6366f1)', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                marginTop: '15px',
                width: '100%',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 10px 15px -3px rgba(13, 148, 136, 0.3)'
              }}
            >
              Muat Ulang Simulasi Pelayaran
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
