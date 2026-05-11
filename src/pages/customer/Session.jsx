// src/pages/customer/Session.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useSession } from '../../contexts/SessionContext';
import { useLanguage } from '../../contexts/LanguageContext';
import HeaderClamp from '../../components/HeaderClamp';
import { QRCodeSVG } from 'qrcode.react';
import BurgerLoader from '../../components/BurgerLoader';

function Session({ config }) {
    const { tenantSlug, sessionId } = useParams();
    const navigate = useNavigate();
    const { tenantData } = useTenant();
    const { t } = useLanguage();
    const { activeSession, hasActiveSession, loading, error, startNewSession, joinExistingSession, leaveSession } = useSession();

    const [mode, setMode] = useState('loading');
    const [tableInput, setTableInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [showCopied, setShowCopied] = useState(false);

    useEffect(() => {
        if (sessionId) {
            setMode('joining');
            joinSessionFromUrl();
        } else if (hasActiveSession) {
            setMode('active');
        } else {
            setMode('create');
        }
    }, [sessionId, hasActiveSession]);

    const joinSessionFromUrl = async () => {
        if (!sessionId) return;
        const result = await joinExistingSession(sessionId);
        if (result.success) {
            setMode('active');
            navigate(`/${tenantSlug}/menu`, { replace: true });
        } else {
            setMode('error');
        }
    };

    const handleCreateSession = async () => {
        const result = await startNewSession({
            tableNumber: tableInput || null,
            sessionName: nameInput || null
        });
        if (result.success) {
            setMode('active');
        }
    };

    const handleJoinByCode = async () => {
        if (!codeInput.trim()) return;
        const result = await joinExistingSession(codeInput.trim());
        if (result.success) {
            setMode('active');
            navigate(`/${tenantSlug}/menu`, { replace: true });
        }
    };

    const handleLeave = async () => {
        await leaveSession();
        setMode('create');
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/${tenantSlug}/session/${activeSession?.id}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Pedido compartido - ${tenantData?.business_name || 'Restaurant'}`,
                    text: `Unirse a mi pedido en ${tenantData?.business_name}`,
                    url: shareUrl
                });
            } catch (e) {
                copyToClipboard(shareUrl);
            }
        } else {
            copyToClipboard(shareUrl);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    const sessionUrl = activeSession?.id 
        ? `${window.location.origin}/${tenantSlug}/session/${activeSession.id}`
        : '';

    if (loading) {
        return <BurgerLoader />
    }

    if (mode === 'error' || error) {
        return (
            <div style={{ minHeight: '100vh', padding: 20, background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'white', borderRadius: 20, padding: 32, textAlign: 'center', maxWidth: 320 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
                        Sesión no encontrada
                    </h2>
                    <p style={{ color: '#6B7280', marginBottom: 24 }}>
                        La sesión no existe o ya expiró.
                    </p>
                    <button
                        onClick={() => navigate(`/${tenantSlug}/menu`)}
                        style={{
                            padding: '14px 24px',
                            background: tenantData?.confirmation_color || '#C4856A',
                            color: 'white',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Ir al menú
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'active' && activeSession) {
        return (
            <div style={{ minHeight: '100vh', paddingBottom: 100, background: '#FAFAF8' }}>
                <HeaderClamp config={config} />
                
                <div style={{ padding: 20 }}>
                    <div style={{ 
                        background: 'linear-gradient(135deg, #10B981, #059669)', 
                        borderRadius: 20, 
                        padding: 24, 
                        color: 'white',
                        marginBottom: 24
                    }}>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>{t('active_session')}</div>
                        <div style={{ fontSize: 28, fontWeight: 800 }}>
                            {activeSession.session_name || `Mesa ${activeSession.table_number || '—'}`}
                        </div>
                        <div style={{ fontSize: 48, fontWeight: 800, marginTop: 16, letterSpacing: '0.1em' }}>
                            {activeSession.share_code}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                            Compartí este código con quienes quieran sumarse
                        </div>
                    </div>

                    <div style={{ 
                        background: 'white', 
                        borderRadius: 20, 
                        padding: 20, 
                        marginBottom: 16,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase' }}>
                            Compartir enlace
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ flex: 1, padding: 12, background: '#F3F4F6', borderRadius: 12, fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sessionUrl}
                            </div>
                            <button
                                onClick={() => copyToClipboard(sessionUrl)}
                                style={{
                                    padding: 12,
                                    background: tenantData?.confirmation_color || '#C4856A',
                                    border: 'none',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    color: 'white'
                                }}
                            >
                                {showCopied ? '✓' : '📋'}
                            </button>
                        </div>
                        {showCopied && (
                            <div style={{ color: '#10B981', fontSize: 13, marginTop: 8 }}>¡Copiado al portapapeles!</div>
                        )}
                    </div>

                    <div style={{ 
                        background: 'white', 
                        borderRadius: 20, 
                        padding: 20, 
                        marginBottom: 16,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 12 }}>
                                Escanear QR
                            </div>
                            <QRCodeSVG 
                                value={sessionUrl}
                                size={160}
                                bgColor="#FFFFFF"
                                fgColor="#1F2937"
                                level="M"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handleShare}
                            style={{
                                flex: 1,
                                padding: 16,
                                background: tenantData?.confirmation_color || '#C4856A',
                                color: 'white',
                                border: 'none',
                                borderRadius: 14,
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            📤 Compartir
                        </button>
                        <button
                            onClick={() => navigate(`/${tenantSlug}/menu`)}
                            style={{
                                flex: 1,
                                padding: 16,
                                background: 'white',
                                border: '2px solid #E5E7EB',
                                borderRadius: 14,
                                fontSize: 16,
                                fontWeight: 600,
                                color: '#374151',
                                cursor: 'pointer'
                            }}
                        >
                            ➜ Menú
                        </button>
                    </div>

                    <button
                        onClick={handleLeave}
                        style={{
                            width: '100%',
                            marginTop: 16,
                            padding: 14,
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Salir de la sesión
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 100, background: '#FAFAF8' }}>
            <HeaderClamp config={config} />
            
            <div style={{ padding: 20 }}>
                <div style={{ 
                    background: 'white', 
                    borderRadius: 20, 
                    padding: 24, 
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                    marginBottom: 16
                }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1F2937', marginBottom: 8 }}>
                        Crear sesión de pedido
                    </h2>
                    <p style={{ color: '#6B7280', marginBottom: 24 }}>
                        Iniciá una sesión compartida para pedir con amigos
                    </p>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
                            {t('table_number_optional')}
                        </label>
                        <input
                            type="text"
                            value={tableInput}
                            onChange={(e) => setTableInput(e.target.value)}
                            placeholder="Ej: 5"
                            style={{
                                width: '100%',
                                padding: 14,
                                borderRadius: 12,
                                border: '1px solid #E5E7EB',
                                fontSize: 16,
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'block' }}>
                            Nombre de la sesión (opcional)
                        </label>
                        <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Ej: Cumpleaños de Juan"
                            style={{
                                width: '100%',
                                padding: 14,
                                borderRadius: 12,
                                border: '1px solid #E5E7EB',
                                fontSize: 16,
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleCreateSession}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: 16,
                            background: tenantData?.confirmation_color || '#C4856A',
                            color: 'white',
                            border: 'none',
                            borderRadius: 14,
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Creando...' : 'Crear sesión'}
                    </button>
                </div>

                <div style={{ 
                    background: 'white', 
                    borderRadius: 20, 
                    padding: 24, 
                    boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
                }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 16 }}>
                        Unirse a una sesión
                    </h3>
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                            placeholder="Código de 6 letras"
                            maxLength={6}
                            style={{
                                flex: 1,
                                padding: 14,
                                borderRadius: 12,
                                border: '1px solid #E5E7EB',
                                fontSize: 18,
                                fontWeight: 700,
                                letterSpacing: '0.2em',
                                textAlign: 'center',
                                outline: 'none',
                                textTransform: 'uppercase'
                            }}
                        />
                        <button
                            onClick={handleJoinByCode}
                            disabled={loading || codeInput.length < 6}
                            style={{
                                padding: '14px 20px',
                                background: codeInput.length >= 6 ? '#10B981' : '#9CA3AF',
                                color: 'white',
                                border: 'none',
                                borderRadius: 12,
                                fontSize: 16,
                                fontWeight: 700,
                                cursor: codeInput.length >= 6 ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Unirse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Session;