import React, { useState, useEffect } from 'react';
import { X, Mail, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NewsletterPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Verificar se já viu o pop-up nesta sessão
    const alreadySeen = sessionStorage.getItem('amr_newsletter_popup_seen');
    if (alreadySeen === 'true') return;

    // Abrir o pop-up após 12 segundos
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem('amr_newsletter_popup_seen', 'true');
    }, 12000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Salvar no localstorage de emails capturados
    const emails = localStorage.getItem('amr_newsletter_emails')
      ? JSON.parse(localStorage.getItem('amr_newsletter_emails')!)
      : [];
    emails.push({ email, capturedFrom: 'popup', capturedAt: new Date().toISOString() });
    localStorage.setItem('amr_newsletter_emails', JSON.stringify(emails));

    setSubmitted(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          {/* Outer click closure */}
          <div className="absolute inset-0" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-luxury-gray border border-gold-500/20 rounded-2xl overflow-hidden shadow-2xl z-10 glow-gold p-8"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1"
            >
              <X size={18} />
            </button>

            {/* Content */}
            {!submitted ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gold-600/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                  <Sparkles size={20} className="animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-2xl tracking-wider text-gradient-gold uppercase">
                    Clube de Privilégios
                  </h3>
                  <p className="text-xs text-gray-400">
                    Junte-se à nossa lista seleta e receba <span className="text-gold-400 font-semibold">R$ 50 de Desconto</span> na sua primeira compra de presentes finos.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      placeholder="Seu melhor e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-gold hover:shadow-lg text-luxury-black font-semibold tracking-widest uppercase py-3 rounded-lg text-xs transition duration-300 cursor-pointer"
                  >
                    Resgatar R$ 50 OFF
                  </button>
                </form>

                <p className="text-[10px] text-gray-500">
                  Ao se cadastrar, você concorda com nossos termos. Válido para compras acima de R$ 300.
                </p>
              </div>
            ) : (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-600/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                  <Check size={22} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-2xl tracking-wider text-white uppercase">
                    Acesso Concedido
                  </h3>
                  <p className="text-xs text-gray-400">
                    Use o cupom abaixo no seu carrinho para aplicar o desconto especial de R$ 50,00.
                  </p>
                </div>

                <div className="bg-white/5 border border-dashed border-gold-500/40 rounded-xl p-4 flex flex-col items-center gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Código do Cupom</span>
                  <span className="text-lg font-mono font-bold tracking-widest text-gold-400 uppercase select-all">
                    BEMVINDO50
                  </span>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full border border-white/10 hover:bg-white/5 text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
                >
                  Ir para a Loja
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default NewsletterPopup;
