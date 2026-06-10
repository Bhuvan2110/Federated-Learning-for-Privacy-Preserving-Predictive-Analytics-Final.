import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, X, Settings, Bot, User, Sparkles, Key, Check, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

const AIAgentWidget = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: "👋 **Hi! I am your Federated Learning Platform Assistant.**\n\nHow can I help you today? You can ask me how to use the website, upload datasets, manage training runs, or run predictions. You can also ask general questions about Federated Learning, cryptography, or machine learning!",
      id: 'welcome'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const chatEndRef = useRef(null);

  // Listen to toggle event from Sidebar or other components
  useEffect(() => {
    const handleToggle = (e) => {
      if (e.detail && typeof e.detail.open === 'boolean') {
        setIsOpen(e.detail.open);
      } else {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('toggle-ai-agent', handleToggle);
    return () => window.removeEventListener('toggle-ai-agent', handleToggle);
  }, []);

  // Fetch API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    setApiKey(savedKey);
    setTempKey(savedKey);
  }, []);

  // Scroll to bottom when messages or loading state change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isOpen]);

  const handleSaveKey = (e) => {
    e.preventDefault();
    const cleanKey = tempKey.trim();
    localStorage.setItem('gemini_api_key', cleanKey);
    setApiKey(cleanKey);
    setShowSettings(false);
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setTempKey('');
    setShowSettings(false);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMsg).trim();
    if (!text) return;

    if (!textToSend) setInputMsg('');
    setErrorMsg('');

    // Append user message
    const userMsg = { role: 'user', content: text, id: Date.now().toString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsSending(true);

    // Keep last 10 messages for conversation context window
    const historyContext = updatedMessages
      .slice(-10, -1) // skip the latest one we are sending now
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await apiFetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          apiKey: apiKey || null,
          history: historyContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to communicate with the AI Agent.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'model',
        content: data.response,
        id: Date.now().toString() + '-resp'
      }]);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Connection failed. Please verify the backend service is running.');
      // Keep user message but show error
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSendMessage(promptText);
  };

  // Simple Markdown Parser with React element outputs
  const parseMarkdown = (text) => {
    if (!text) return '';
    const blocks = text.split('\n\n');
    
    return blocks.map((block, bIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Headings
      if (trimmed.startsWith('### ')) {
        return <h4 key={bIdx} style={{ margin: '14px 0 8px', fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{renderInline(trimmed.slice(4))}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={bIdx} style={{ margin: '16px 0 8px', fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>{renderInline(trimmed.slice(3))}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={bIdx} style={{ margin: '18px 0 10px', fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{renderInline(trimmed.slice(2))}</h2>;
      }
      
      // Bullet list items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split(/\n[-*] /g).map(item => item.replace(/^[-*] /, ''));
        return (
          <ul key={bIdx} style={{ paddingLeft: '18px', margin: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {items.map((item, iIdx) => (
              <li key={iIdx} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      }
      
      // Default paragraph
      return (
        <p key={bIdx} style={{ fontSize: '13px', lineHeight: '1.5', margin: '8px 0', color: 'var(--text-secondary)' }}>
          {renderInline(trimmed)}
        </p>
      );
    });
  };

  const renderInline = (text) => {
    let parts = [{ type: 'text', content: text }];
    
    // 1. Code tokens `code`
    parts = parts.flatMap(p => {
      if (p.type !== 'text') return p;
      const pieces = p.content.split(/(`[^`]+`)/g);
      return pieces.map(piece => {
        if (piece.startsWith('`') && piece.endsWith('`')) {
          return { type: 'code', content: piece.slice(1, -1) };
        }
        return { type: 'text', content: piece };
      });
    });

    // 2. Bold tokens **text**
    parts = parts.flatMap(p => {
      if (p.type !== 'text') return p;
      const pieces = p.content.split(/(\*\*[^*]+\*\*)/g);
      return pieces.map(piece => {
        if (piece.startsWith('**') && piece.endsWith('**')) {
          return { type: 'bold', content: piece.slice(2, -2) };
        }
        return { type: 'text', content: piece };
      });
    });

    // 3. Link tokens [label](url)
    parts = parts.flatMap(p => {
      if (p.type !== 'text') return p;
      const pieces = p.content.split(/(\[[^\]]+\]\([^)]+\))/g);
      return pieces.map(piece => {
        const match = piece.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return { type: 'link', label: match[1], url: match[2] };
        }
        return { type: 'text', content: piece };
      });
    });

    return parts.map((p, idx) => {
      if (p.type === 'bold') {
        return <strong key={idx} style={{ color: 'white', fontWeight: 600 }}>{p.content}</strong>;
      }
      if (p.type === 'code') {
        return (
          <code key={idx} style={{
            background: 'rgba(0,0,0,0.35)',
            padding: '2px 5px',
            borderRadius: '4px',
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '11px',
            color: '#fda4af',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {p.content}
          </code>
        );
      }
      if (p.type === 'link') {
        const isExternal = p.url.startsWith('http');
        return (
          <a
            key={idx}
            href={p.url}
            target={isExternal ? '_blank' : '_self'}
            rel={isExternal ? 'noopener noreferrer' : ''}
            style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={e => e.target.style.textDecoration = 'underline'}
            onMouseLeave={e => e.target.style.textDecoration = 'none'}
            onClick={(e) => {
              if (!isExternal) {
                e.preventDefault();
                setIsOpen(false); // Close drawer to show page
                navigate(p.url);
              }
            }}
          >
            {p.label}
          </a>
        );
      }
      return p.content;
    });
  };

  const quickPrompts = [
    "How to use this site?",
    "Explain FedAvg vs FedProx vs SCAFFOLD",
    "Is my dataset secure?",
    "How to start a training run?"
  ];

  return (
    <>
      {/* ── Floating Action Trigger Button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 400,
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.45)';
          }}
          aria-label="Open AI Assistant"
        >
          <MessageSquare size={24} />
          {/* Subtle pulse badge if API Key is not configured (friendly invitation) */}
          {!apiKey && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              border: '2px solid var(--bg-primary)',
              boxShadow: '0 0 0 rgba(245,158,11,0.4)',
              animation: 'pulse 2s infinite'
            }} />
          )}
        </button>
      )}

      {/* ── Overlay Backdrop (Mobile Only) ── */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 490,
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* ── Slide-out Assistant Panel (Drawer) ── */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '100vw',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
            }}>
              <Bot size={20} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                FL Assistant
                <Sparkles size={13} color="#60a5fa" />
              </h3>
              <p style={{ fontSize: '11px', color: apiKey ? '#10b981' : '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: apiKey ? '#10b981' : '#f59e0b'
                }} />
                {apiKey ? 'Full AI Mode' : 'Local Guide Mode'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: showSettings ? '#3b82f6' : 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Settings & API Key"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Settings Panel (API Key Setup) */}
        {showSettings && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(30, 41, 59, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} color="#60a5fa" />
              Configure Gemini API Key
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
              To get rich dynamic responses, input a Gemini API Key. Get one for free at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Google AI Studio</a>. Saved locally in your browser.
            </p>
            <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={tempKey}
                  onChange={e => setTempKey(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    padding: '8px 36px 8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '6px' }}>
                  Save Key
                </button>
                {apiKey && (
                  <button type="button" onClick={handleClearKey} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '6px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
                    Remove
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Chat Message Window */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          scrollBehavior: 'smooth'
        }} className="custom-scrollbar">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isModel ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isModel ? 'flex-start' : 'flex-end',
                  animation: 'fadeIn 0.25s ease-out'
                }}
              >
                {/* Speaker indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '4px',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  fontWeight: 500
                }}>
                  {isModel ? (
                    <>
                      <Bot size={12} color="#60a5fa" />
                      <span>Assistant</span>
                    </>
                  ) : (
                    <>
                      <span>You</span>
                      <User size={12} />
                    </>
                  )}
                </div>
                
                {/* Bubble */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: isModel ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                  background: isModel
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                  border: isModel ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  color: 'white',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
                }}>
                  {isModel ? parseMarkdown(msg.content) : <p style={{ fontSize: '13px', lineHeight: '1.4', margin: 0 }}>{msg.content}</p>}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isSending && (
            <div style={{
              alignSelf: 'flex-start',
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.25s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <Bot size={12} color="#60a5fa" />
                <span>Assistant typing...</span>
              </div>
              <div style={{
                padding: '12px 18px',
                borderRadius: '12px 12px 12px 2px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                width: '64px'
              }}>
                <span className="dot-loading" style={{ animationDelay: '0s' }} />
                <span className="dot-loading" style={{ animationDelay: '0.2s' }} />
                <span className="dot-loading" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}

          {/* Error Message display */}
          {errorMsg && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f87171',
              marginTop: '8px'
            }}>
              <strong>Error:</strong> {errorMsg}
            </div>
          )}

          {/* Chat Quick suggestions (rendered at bottom when history is short) */}
          {messages.length === 1 && !isSending && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HelpCircle size={13} color="#60a5fa" />
                Quick Suggestions:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(p)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'var(--text-secondary)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder="Ask anything..."
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              disabled={isSending}
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'white',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button
              type="submit"
              disabled={isSending || !inputMsg.trim()}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: inputMsg.trim() ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                color: inputMsg.trim() ? 'white' : 'rgba(255,255,255,0.2)',
                border: 'none',
                cursor: inputMsg.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                if (inputMsg.trim()) e.currentTarget.style.background = 'var(--accent-hover)';
              }}
              onMouseLeave={e => {
                if (inputMsg.trim()) e.currentTarget.style.background = 'var(--accent-primary)';
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Local Styles for Micro-animations and custom scrollbars */}
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25);
          }
          
          .dot-loading {
            width: 6px;
            height: 6px;
            background-color: var(--text-secondary);
            border-radius: 50%;
            display: inline-block;
            animation: bounce 1.4s infinite ease-in-out both;
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
          }
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
            }
            70% {
              box-shadow: 0 0 0 6px rgba(245, 158, 11, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </aside>
    </>
  );
};

export default AIAgentWidget;
