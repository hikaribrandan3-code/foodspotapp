import React from 'react'

/**
 * AdminErrorBoundary - Circuit Breaker for Super Admin Dashboard
 * 
 * Prevents white screen crashes by catching React errors and showing
 * a "Recovery Mode" UI with reload capability.
 */
class AdminErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        // Log error for debugging
        console.error('🔴 [AdminErrorBoundary] Circuit Breaker Triggered:', error)
        console.error('Component Stack:', errorInfo?.componentStack)
        this.setState({ errorInfo })
    }

    handleReload = () => {
        // Force full page reload to reset React state
        window.location.reload()
    }

    handleGoHome = () => {
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            // Recovery Mode UI
            return (
                <div style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    color: '#fff',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔧</div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        marginBottom: '12px',
                        background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Admin Recovery Mode
                    </h1>
                    <p style={{
                        opacity: 0.8,
                        maxWidth: '400px',
                        marginBottom: '32px',
                        lineHeight: 1.6
                    }}>
                        The dashboard encountered an issue during loading.
                        This is usually caused by a data sync issue.
                    </p>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={this.handleReload}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '16px 32px',
                                background: 'linear-gradient(90deg, #7C3AED, #5B21B6)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)'
                            }}
                        >
                            🔄 Reload Dashboard
                        </button>
                        <button
                            onClick={this.handleGoHome}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '16px 32px',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                cursor: 'pointer'
                            }}
                        >
                            🏠 Go Home
                        </button>
                    </div>

                    {/* Debug info (collapsed) */}
                    <details style={{ marginTop: '40px', opacity: 0.5, fontSize: '12px', maxWidth: '500px' }}>
                        <summary style={{ cursor: 'pointer' }}>Debug Info</summary>
                        <pre style={{
                            textAlign: 'left',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '12px',
                            borderRadius: '8px',
                            overflow: 'auto',
                            marginTop: '8px'
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                    </details>
                </div>
            )
        }

        return this.props.children
    }
}

export default AdminErrorBoundary
