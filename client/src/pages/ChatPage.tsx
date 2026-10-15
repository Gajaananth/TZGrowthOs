import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, User, Bot, CheckSquare, Square,
  Package, HelpCircle, RotateCcw, AlertCircle, ArrowRight, Zap
} from 'lucide-react';
import { sendChatMessage, ChatResponse } from '../services/api';
import { useI18n } from '../context/I18nContext';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: ChatResponse;
  aiMeta?: {
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    latencyMs: number;
    model: string;
  };
  timestamp: string;
}

const STARTER_PROMPTS = [
  'What should I promote for the upcoming festival in Sri Lanka?',
  'How can I clear my slow-moving inventory without heavy discounts?',
  'Recommend a high-converting WhatsApp promotion strategy.',
  'What are the best pricing tactics for Colombo and Kandy retail shoppers?'
];

export const ChatPage: React.FC = () => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Ayubowan & Vanakkam! 🙏 I am your **GrowthOS Retail Strategist**, grounded directly in your inventory, sales margins, and Sri Lankan consumer calendar.\n\nAsk me anything about promotional bundles, festival timing, inventory clearance, or local channel marketing.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setError(null);
    const userMsg: UiMessage = {
      id: 'u_' + Date.now(),
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for multi-turn context
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendChatMessage(q, history);

      if (res.success && res.response) {
        const botMsg: UiMessage = {
          id: 'b_' + Date.now(),
          role: 'assistant',
          content: res.response.answer,
          data: res.response,
          aiMeta: res.aiMeta,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setError(res.error || 'The strategist could not generate a response.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with GrowthOS AI service.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const toggleActionItem = (key: string) => {
    setCheckedActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Ayubowan & Vanakkam! 🙏 Conversation refreshed. Ask me a new strategy or marketing question.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setCheckedActions({});
  };

  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 120px)', minHeight: '360px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '0.625rem',
            background: 'var(--primary-600)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="title-hero" style={{ margin: 0, fontSize: '1.25rem' }}>{t('chat.title')}</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('chat.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          title="Reset conversation"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border-medium)',
            background: 'white',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RotateCcw size={14} />
          Reset Chat
        </button>
      </div>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: '0.75rem',
                alignItems: 'flex-start',
                maxWidth: isUser ? '80%' : '90%',
                alignSelf: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: isUser ? 'var(--text-main)' : 'var(--primary-600)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                {isUser ? <User size={16} /> : <Bot size={18} />}
              </div>

              {/* Message Bubble */}
              <div style={{
                background: isUser ? 'var(--primary-600)' : 'white',
                color: isUser ? 'white' : 'var(--text-main)',
                padding: '0.9rem 1.15rem',
                borderRadius: '0.875rem',
                borderTopRightRadius: isUser ? '0.15rem' : '0.875rem',
                borderTopLeftRadius: !isUser ? '0.15rem' : '0.875rem',
                border: isUser ? 'none' : '1px solid var(--border-light)',
                boxShadow: isUser ? '0 2px 4px rgba(5, 150, 105, 0.2)' : 'var(--shadow-sm)',
                fontSize: '0.9rem',
                lineHeight: 1.6
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>

                {/* Structured Insights (Action Items & Related Products) */}
                {msg.data && (
                  <div style={{ marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                    {/* Confidence & Badges */}
                    {msg.data.confidence && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '0.25rem',
                          background: msg.data.confidence === 'high' ? '#dcfce7' : '#fef3c7',
                          color: msg.data.confidence === 'high' ? '#15803d' : '#b45309',
                          textTransform: 'uppercase'
                        }}>
                          {msg.data.confidence} confidence
                        </span>
                      </div>
                    )}

                    {/* Action Items Checklist */}
                    {msg.data.action_items && msg.data.action_items.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Recommended Action Steps
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {msg.data.action_items.map((item, idx) => {
                            const itemKey = `${msg.id}_act_${idx}`;
                            const isDone = checkedActions[itemKey] || false;
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleActionItem(itemKey)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.45rem',
                                  cursor: 'pointer',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: '0.375rem',
                                  background: isDone ? 'var(--primary-50)' : 'var(--bg-subtle)',
                                  color: isDone ? 'var(--primary-800)' : 'var(--text-main)',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                  fontSize: '0.82rem',
                                  transition: 'background 0.15s'
                                }}
                              >
                                {isDone ? (
                                  <CheckSquare size={16} color="var(--primary-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                ) : (
                                  <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                )}
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Related Products */}
                    {msg.data.related_products && msg.data.related_products.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Linked Items:</span>
                        {msg.data.related_products.map((prod, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: 'var(--bg-subtle)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                              border: '1px solid var(--border-light)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}
                          >
                            <Package size={11} /> {prod}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {msg.aiMeta && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.68rem',
                    color: '#166534',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    marginTop: '0.35rem',
                    fontWeight: 600,
                  }}>
                    <Zap size={11} color="#16a34a" />
                    <span>{(msg.aiMeta.totalTokens || (msg.aiMeta.tokensIn + msg.aiMeta.tokensOut)).toLocaleString()} Tokens</span>
                    <span>•</span>
                    <span>{msg.aiMeta.latencyMs}ms</span>
                    <span>•</span>
                    <span>{msg.aiMeta.model || 'gemini-3.5-flash'}</span>
                  </div>
                )}

                <div style={{
                  fontSize: '0.68rem',
                  color: isUser ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-subtle)',
                  marginTop: '0.35rem',
                  textAlign: isUser ? 'right' : 'left'
                }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', maxWidth: '85%' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--primary-600)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Bot size={18} />
            </div>
            <div style={{
              background: 'white',
              padding: '0.85rem 1.1rem',
              borderRadius: '0.875rem',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: 16, height: 16,
                border: '2px solid var(--border-light)',
                borderTopColor: 'var(--primary-600)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Consulting inventory levels and retail calendar...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompt Chips */}
      {messages.length <= 2 && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
          padding: '0 0.25rem'
        }}>
          {STARTER_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '0.35rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid var(--border-medium)',
                background: 'white',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>{prompt}</span>
              <ArrowRight size={11} color="var(--primary-600)" />
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          display: 'flex',
          gap: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-light)'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chat.inputPlaceholder')}
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '0.625rem',
            border: '1px solid var(--border-medium)',
            outline: 'none',
            fontSize: '0.9rem',
            background: 'white',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            padding: '0 1.25rem',
            borderRadius: '0.625rem',
            border: 'none',
            background: input.trim() && !loading ? 'var(--primary-600)' : 'var(--border-medium)',
            color: 'white',
            fontWeight: 600,
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s'
          }}
        >
          <Send size={16} />
          <span>{t('chat.sendBtn')}</span>
        </button>
      </form>
    </div>
  );
};

export default ChatPage;
