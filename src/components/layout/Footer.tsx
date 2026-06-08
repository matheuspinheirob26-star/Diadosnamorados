import React, { useState } from 'react';
import { Heart, Mail, MapPin, Shield, CheckCircle2, CreditCard } from 'lucide-react';
import { useStorefront } from '../../context/StorefrontContext';

interface FooterProps {
  onNavigate: (page: string, tab?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { config } = useStorefront();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Simular salvamento
    const leads = localStorage.getItem('amr_newsletter_emails') 
      ? JSON.parse(localStorage.getItem('amr_newsletter_emails')!) 
      : [];
    leads.push({ email, subscribedAt: new Date().toISOString() });
    localStorage.setItem('amr_newsletter_emails', JSON.stringify(leads));
    
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  return (
    <footer className="bg-luxury-black border-t border-white/5 pt-16 pb-8 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Footer Top - Newsletter Lead Capture */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 border-b border-white/5 items-center">
          <div className="lg:col-span-1">
            <h3 className="font-serif text-xl text-gradient-gold tracking-widest uppercase mb-2">
              Clube Amour & Co.
            </h3>
            <p className="text-xs text-gray-500 max-w-sm">
              Inscreva-se para receber convites para pré-lançamentos sazonais, edições numeradas e ofertas de frete privado.
            </p>
          </div>
          
          <div className="lg:col-span-2">
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 max-w-md lg:ml-auto">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500 transition"
                required
              />
              <button
                type="submit"
                className="bg-gradient-gold text-luxury-black font-semibold text-xs tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
              >
                {subscribed ? 'Cadastrado' : 'Inscrever-se'}
              </button>
            </form>
            {subscribed && (
              <p className="text-[10px] text-gold-400 mt-2">
                Obrigado! Seu convite foi enviado para sua caixa de entrada.
              </p>
            )}
          </div>
        </div>

        {/* Footer Middle - Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-12">
          
          {/* Brand Col */}
          <div>
            <h3 className="font-serif text-2xl tracking-widest text-gold-400 uppercase mb-6">
              {config.storeName}
            </h3>
            <p className="text-gray-400 text-sm font-light leading-relaxed mb-6">
              {config.slogan}
            </p>
            <div className="flex space-x-4">
              {config.instagramUrl && (
                <a href={config.instagramUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              )}
              {config.facebookUrl && (
                <a href={config.facebookUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {config.youtubeUrl && (
                <a href={config.youtubeUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                </a>
              )}
            </div>
          </div>

          {/* Institutional Links */}
          <div>
            <h4 className="text-xs font-semibold text-white tracking-widest uppercase mb-4">
              Nossa Marca
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'sobre')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Nossa História
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'sobre')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Sobre Nós
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'contato')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Fale Conosco
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care Links */}
          <div>
            <h4 className="text-xs font-semibold text-white tracking-widest uppercase mb-4">
              Suporte & Ajuda
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'trocas')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Trocas e Devoluções
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'frete')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Fretes e Prazos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'termos')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('institutional', 'privacidade')}
                  className="hover:text-gold-400 transition-colors"
                >
                  Privacidade
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-white font-semibold tracking-widest text-sm uppercase mb-6">Contato</h4>
            <ul className="space-y-4 text-sm font-light">
              <li className="flex items-start text-gray-400">
                <MapPin size={16} className="text-gold-400 mr-3 mt-1 flex-shrink-0" />
                <span>{config.storeAddress}</span>
              </li>
              <li className="flex items-center text-gray-400">
                <Mail size={16} className="text-gold-400 mr-3" />
                <span>{config.supportEmail}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom - Badges & Copyright */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs font-light text-gray-500 gap-6">
          <p>{config.footerText}</p>
          
          {/* Trust Seals */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded">
              <Shield size={10} className="text-gold-400" />
              <span>SSL Blindado</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded">
              <CheckCircle2 size={10} className="text-gold-400" />
              <span>Compra Segura</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-2 py-1 rounded">
              <CreditCard size={10} className="text-gold-400" />
              <span>Pix & Cartão até 10x</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
export default Footer;
