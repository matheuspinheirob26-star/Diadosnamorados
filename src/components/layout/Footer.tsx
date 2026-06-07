import React, { useState } from 'react';
import { Mail, Phone, MapPin, Shield, CheckCircle2, CreditCard } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, tab?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
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
          <div className="space-y-4">
            <div className="cursor-pointer" onClick={() => onNavigate('home')}>
              <span className="font-serif text-xl tracking-widest font-light text-gradient-gold uppercase block">
                Amour & Co.
              </span>
              <span className="text-[8px] tracking-[0.3em] font-medium text-gray-500 uppercase -mt-1 block">
                Presentes de Luxo
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Transformamos presentes em memórias inesquecíveis. Curadoria de alta sofisticação para celebrar os maiores momentos da vida em todo o Brasil.
            </p>
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
          <div className="space-y-4 text-xs">
            <h4 className="text-xs font-semibold text-white tracking-widest uppercase mb-4">
              Atendimento Especial
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gold-500" />
                <span>0800 500 7000 (Concierge)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-gold-500" />
                <span>concierge@amour.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-gold-500 shrink-0 mt-0.5" />
                <span className="text-gray-500">
                  Alameda Lorena, 1500 - Jardins<br />
                  São Paulo - SP, CEP 01424-002
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom - Badges & Copyright */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-gray-500">
          <div>
            <p>© {new Date().getFullYear()} Amour & Co. Presentes S.A. CNPJ 12.345.678/0001-90. Todos os direitos reservados.</p>
          </div>
          
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
