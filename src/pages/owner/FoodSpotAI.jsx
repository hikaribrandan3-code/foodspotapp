/**
 * FoodSpot AI - Text Assistant with Gemini Flash
 * Kitchen assistant for staff/owners
 */

import React, { useState, useRef, useEffect } from 'react';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const SYSTEM_PROMPT = `You are the FoodSpot Prep-Agent. You are a tactical kitchen assistant.
Your job is to help kitchen staff understand orders, suggest prep workflows,
and answer questions about the menu and ingredients.

You have access to:
- The current order details
- Menu items and ingredients
- Kitchen inventory (if synced)

Rules:
- Be concise. Kitchen staff are busy.
- Use short sentences. Be helpful and direct.
- If inventory is low, suggest alternatives.
- Prioritize food safety and speed.
- Answer in the same language the user asks.`;

export function FoodSpotAI({ context = {} }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: '¡Hola! Soy tu asistente de cocina. ¿En qué puedo ayudarte?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    
    const userText = input.trim();
    setInput('');
    setError(null);
    
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const contextInfo = context.order ? `
Current Order Context:
- Order ID: ${context.order.id}
- Items: ${context.order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
- Status: ${context.order.status}
` : '';

      const fullPrompt = `${SYSTEM_PROMPT}

${contextInfo}

User Question: ${userText}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 500,
              topP: 0.8,
              topK: 40
            }
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                        'No pude procesar eso. ¿Puedes reformular?';

      setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);

    } catch (err) {
      console.error('AI Error:', err);
      setError(err.message);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: 'Lo siento, tuve un problema. Intenta de nuevo.' 
      }]);
    }

    setLoading(false);
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!GOOGLE_API_KEY) {
    return (
      <div style={{ padding: 20, color: '#c00' }}>
        ❌ Missing VITE_GOOGLE_API_KEY in .env
      </div>
    );
  }

  return (
    <div className="foodspot-ai" style={styles.container}>
      <div style={styles.header}>
        <span>🤖 FoodSpot AI</span>
        <span style={styles.badge}>FLASH</span>
      </div>

      {error && (
        <div style={styles.error}>
          Error: {error}
        </div>
      )}

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.message,
            ...(msg.role === 'user' ? styles.userMsg : styles.aiMsg)
          }}>
            <div style={styles.msgText}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.message, ...styles.aiMsg }}>
            <div style={styles.typing}>Escribiendo...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Pregunta sobre pedidos, inventario, prep..."
          style={styles.input}
          disabled={loading}
        />
        <button 
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: loading || !input.trim() ? 0.5 : 1
          }}
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: 500,
    background: '#1a1a2e',
    borderRadius: 12,
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#16213e',
    color: '#fff',
    fontWeight: 600
  },
  badge: {
    fontSize: 10,
    background: '#e94560',
    padding: '2px 6px',
    borderRadius: 4
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  message: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 1.5
  },
  userMsg: {
    alignSelf: 'flex-end',
    background: '#e94560',
    color: '#fff',
    borderBottomRightRadius: 4
  },
  aiMsg: {
    alignSelf: 'flex-start',
    background: '#0f3460',
    color: '#fff',
    borderBottomLeftRadius: 4
  },
  msgText: {
    whiteSpace: 'pre-wrap'
  },
  typing: {
    color: '#888',
    fontStyle: 'italic'
  },
  inputArea: {
    display: 'flex',
    padding: 12,
    gap: 8,
    background: '#16213e'
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 20,
    border: 'none',
    background: '#0f3460',
    color: '#fff',
    fontSize: 14,
    outline: 'none'
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  error: {
    padding: '8px 16px',
    background: '#ff4444',
    color: '#fff',
    fontSize: 12
  }
};

export default FoodSpotAI;
