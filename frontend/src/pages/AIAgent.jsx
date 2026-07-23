import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/apiFetch'
import { Send, Loader2 } from 'lucide-react'

export default function AIAgent() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi there! I can help you build a prediction input and explain model features. Select a trained model, then enter values for all dataset features.' },
  ])
  const [selectedModel, setSelectedModel] = useState(null)
  const [models, setModels] = useState([])
  const [featureValues, setFeatureValues] = useState({})
  const [modelMetadata, setModelMetadata] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/predict/models').then(data => {
      setModels(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedModel) {
      setModelMetadata(null)
      setFeatureValues({})
      return
    }

    apiFetch(`/predict/model/${selectedModel.id}`).then(data => {
      setModelMetadata(data)
      const initial = {}
      data.feature_names.forEach(name => {
        initial[name] = ''
      })
      setFeatureValues(initial)
    }).catch(e => {
      setError(e.message)
    })
  }, [selectedModel])

  const addMessage = (message) => setMessages(prev => [...prev, message])

  const handleChat = async (question) => {
    if (!question) return
    addMessage({ role: 'user', text: question })
    setLoading(true)
    try {
      const res = await apiFetch('/ai-agent/chat', {
        method: 'POST',
        body: JSON.stringify({ question, model_id: selectedModel?.id || null }),
      })
      addMessage({ role: 'assistant', text: res.answer })
    } catch (e) {
      addMessage({ role: 'assistant', text: `Sorry, I could not answer that: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedModel) {
      setError('Select a model before predicting.')
      return
    }
    setError(null)
    const invalid = modelMetadata?.feature_names?.filter(name => featureValues[name] === '' || featureValues[name] === null)
    if (invalid?.length) {
      setError(`Please fill all features: ${invalid.join(', ')}`)
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch('/predict/single', {
        method: 'POST',
        body: JSON.stringify({ model_id: selectedModel.id, features: featureValues }),
      })
      addMessage({ role: 'assistant', text: `Prediction result: ${res.class_label} (${(res.confidence * 100).toFixed(1)}%)` })
      addMessage({ role: 'assistant', text: `Feature input hash: ${res.input_hash}` })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="page-title">AI Agent</h1>
          <p className="page-subtitle">Ask questions and predict with the trained model using all dataset features.</p>
        </div>

        <div className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-1">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Select Model</h2>
              {models.length === 0 ? (
                <p className="text-slate-500 text-sm">No trained models available yet.</p>
              ) : (
                <select
                  value={selectedModel?.id || ''}
                  onChange={e => setSelectedModel(models.find(m => m.id === e.target.value) || null)}
                  className="input-field w-full"
                >
                  <option value="">— Choose a model —</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.algorithm} · {m.id.slice(0, 8)}…</option>
                  ))}
                </select>
              )}
            </div>
            <div className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-200 mb-3">Prediction Input</h2>
              {modelMetadata ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modelMetadata.feature_names.map(name => (
                    <label key={name} className="block">
                      <span className="text-xs text-slate-400">{name}</span>
                      <input
                        type="text"
                        value={featureValues[name] ?? ''}
                        onChange={e => setFeatureValues(prev => ({ ...prev, [name]: e.target.value }))}
                        className="input-field mt-1"
                        placeholder="Enter value"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Select a model to load its dataset feature names.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handlePredict} disabled={loading || !selectedModel} className="btn-primary w-full justify-center">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {loading ? 'Working…' : 'Predict with AI Agent'}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Conversation</h2>
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`rounded-2xl p-4 ${msg.role === 'assistant' ? 'bg-surface-700' : 'bg-slate-900 border border-white/5'}`}>
                <p className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-2">{msg.role === 'assistant' ? 'Agent' : 'You'}</p>
                <p className="text-sm leading-relaxed text-slate-100 whitespace-pre-line">{msg.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-3">
            <input
              id="agent-question"
              type="text"
              placeholder="Ask the AI Agent about model input or predictions…"
              className="input-field"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleChat(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
            />
            <button onClick={() => {
              const input = document.getElementById('agent-question')
              if (input?.value) {
                handleChat(input.value)
                input.value = ''
              }
            }}
            disabled={loading}
            className="btn-secondary w-full lg:w-auto"
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
