import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, User, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStorefront } from '../../context/StorefrontContext';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const ConciergeChatWidget: React.FC = () => {
  const { config } = useStorefront();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  
  // Lead info capture state
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [captureStage, setCaptureStage] = useState<'none' | 'name' | 'phone' | 'done'>('none');

  const [aiConfig, setAiConfig] = useState({
    ai_name: 'Concierge',
    ai_greeting: 'Olá! Sou seu Concierge de luxo. Como posso ajudar você a encontrar o presente perfeito hoje?',
    human_whatsapp: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and load AI settings
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        if (!supabase) return;
        const response = await supabase.functions.invoke('chat-concierge', { body: { action: 'init' } });
        if (response.data && response.data.config) {
          setAiConfig({
            ai_name: response.data.config.ai_name || 'Concierge',
            ai_greeting: response.data.config.ai_greeting || 'Olá! Sou seu Concierge de luxo.',
            human_whatsapp: response.data.config.human_whatsapp || config.whatsapp
          });
        }
      } catch (err) {
        console.error("Erro ao obter configurações iniciais:", err);
      }
    };
    fetchConfig();
    
    // Check if we have a saved leadId in localStorage
    const savedLead = localStorage.getItem('amour_chat_lead_id');
    if (savedLead) {
      setLeadId(savedLead);
      setCaptureStage('done');
      loadHistory(savedLead);
    } else {
      setCaptureStage('name');
    }
  }, [config.whatsapp]);

  const loadHistory = async (id: string) => {
    try {
      if (!supabase) return;
      const response = await supabase.functions.invoke('chat-concierge', { body: { action: 'get_history', leadId: id } });
      if (response.data && response.data.history) {
        setMessages(response.data.history);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  };

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captureStage === 'name' && leadName.trim()) {
      setCaptureStage('phone');
    } else if (captureStage === 'phone' && leadPhone.trim()) {
      setCaptureStage('done');
      
      // Criar o Lead no banco
      const newLeadId = uuidv4();
      setLeadId(newLeadId);
      localStorage.setItem('amour_chat_lead_id', newLeadId);

      const initialMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Olá, ${leadName}! ${aiConfig.ai_greeting}`,
        timestamp: new Date().toISOString()
      };

      setMessages([initialMessage]);

      if (supabase) {
        await supabase.from('chat_leads').insert({
          id: newLeadId,
          name: leadName,
          phone: leadPhone,
          chat_history: [initialMessage]
        });
      }
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || captureStage !== 'done') return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (!supabase) throw new Error("Supabase não configurado");

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('chat-concierge', {
        body: {
          action: 'message',
          leadId,
          message: userMessage.content,
          chatHistory: messages,
          leadName,
          leadPhone
        }
      });

      if (response.error) throw response.error;

      const aiResponse: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiResponse]);

    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      // Fallback
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Perdão, estou enfrentando uma instabilidade técnica. Por favor, clique no botão "Continuar no WhatsApp" abaixo para falar com um humano.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppFallback = () => {
    const text = "Olá! Estava conversando com o Concierge IA no site e gostaria de continuar por aqui.";
    const num = aiConfig.human_whatsapp?.replace(/\D/g, '') || config.whatsapp?.replace(/\D/g, '');
    if (num) {
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-gold hover:shadow-gold-500/20 text-luxury-black p-4 rounded-full shadow-2xl hover:scale-105 transition duration-300 flex items-center justify-center cursor-pointer animate-bounce-slow"
          title="Falar com Concierge"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Janela de Chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[350px] max-h-[600px] h-[80vh] flex flex-col bg-luxury-gray border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
          
          {/* Header */}
          <div className="bg-luxury-black border-b border-white/10 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center relative">
                <Sparkles size={18} className="text-gold-400" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-luxury-black rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-serif text-white">{aiConfig.ai_name}</h3>
                <p className="text-[10px] text-gray-400">Concierge de Luxo IA</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-luxury-gray">
            
            {/* Capture Stage */}
            {captureStage !== 'done' ? (
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl rounded-tl-sm self-start text-sm text-gray-200">
                  <p className="mb-3">Para iniciarmos um atendimento personalizado, por favor, me diga o seu nome e telefone.</p>
                  <form onSubmit={handleCaptureSubmit} className="space-y-3">
                    {captureStage === 'name' && (
                      <input
                        type="text"
                        placeholder="Seu nome"
                        value={leadName}
                        onChange={e => setLeadName(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded p-2 text-xs text-white focus:border-gold-500 outline-none"
                        autoFocus
                      />
                    )}
                    {captureStage === 'phone' && (
                      <input
                        type="tel"
                        placeholder="Seu WhatsApp (ex: 11999999999)"
                        value={leadPhone}
                        onChange={e => setLeadPhone(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded p-2 text-xs text-white focus:border-gold-500 outline-none"
                        autoFocus
                      />
                    )}
                    <button type="submit" className="w-full bg-gold-600 text-black font-bold text-xs py-2 rounded">
                      Continuar
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                  >
                    <div 
                      className={`p-3 text-sm rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-gradient-gold text-luxury-black rounded-tr-sm' 
                          : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
                      }`}
                      dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                    />
                    <span className="text-[9px] text-gray-500 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex flex-col max-w-[85%] self-start items-start">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Footer Input */}
          {captureStage === 'done' && (
            <div className="p-3 bg-luxury-black border-t border-white/10 shrink-0">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  disabled={loading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-gold-500 transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-full bg-gold-600 text-luxury-black flex items-center justify-center shrink-0 hover:bg-gold-500 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
              
              <div className="mt-2 text-center">
                <button 
                  onClick={handleWhatsAppFallback}
                  type="button"
                  className="text-[10px] text-emerald-500 hover:text-emerald-400 flex items-center justify-center gap-1 w-full"
                >
                  <ExternalLink size={10} />
                  Continuar no WhatsApp Humano
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </>
  );
};
