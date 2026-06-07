import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Sparkles, Send, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter no mínimo 3 caracteres.' }),
  email: z.string().email({ message: 'E-mail inválido.' }),
  phone: z.string().min(10, { message: 'Telefone inválido.' }),
  subject: z.string().min(5, { message: 'Assunto deve ter no mínimo 5 caracteres.' }),
  message: z.string().min(10, { message: 'Mensagem deve ter no mínimo 10 caracteres.' })
});

type ContactFormData = z.infer<typeof contactSchema>;

interface InstitutionalProps {
  defaultTab?: string; // 'sobre' | 'trocas' | 'frete' | 'termos' | 'privacidade' | 'contato'
}

export const Institutional: React.FC<InstitutionalProps> = ({ defaultTab = 'sobre' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormData>({
    defaultValues: { name: '', email: '', phone: '', subject: '', message: '' }
  });

  const onSubmit = async (data: ContactFormData) => {
    // Simular envio de contato
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('Contato enviado:', data);
    
    // Salvar localmente
    const contacts = localStorage.getItem('amr_contacts') 
      ? JSON.parse(localStorage.getItem('amr_contacts')!) 
      : [];
    contacts.push({ ...data, sentAt: new Date().toISOString() });
    localStorage.setItem('amr_contacts', JSON.stringify(contacts));

    setFormSubmitted(true);
    reset();
    setTimeout(() => setFormSubmitted(false), 5000);
  };

  const tabs = [
    { id: 'sobre', label: 'Sobre Nós & História' },
    { id: 'frete', label: 'Frete e Prazos' },
    { id: 'trocas', label: 'Trocas e Devoluções' },
    { id: 'contato', label: 'Fale Conosco' },
    { id: 'termos', label: 'Termos e Privacidade' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 min-h-screen">
      
      {/* Top Header */}
      <div className="text-center space-y-2">
        <span className="text-[10px] uppercase tracking-widest text-gold-400 font-bold">Transparência & Relacionamento</span>
        <h1 className="font-serif text-3xl text-white tracking-widest uppercase">Área Institucional</h1>
        <div className="h-0.5 w-16 bg-gradient-gold mx-auto" />
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap justify-center border-b border-white/5 pb-2 text-xs font-semibold uppercase tracking-wider">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 border-b-2 transition ${
              activeTab === tab.id
                ? 'border-gold-500 text-gold-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-luxury-gray border border-white/5 rounded-3xl p-8 sm:p-10 text-gray-400 leading-relaxed font-light text-xs sm:text-sm">
        
        {/* SOBRE NOS */}
        {activeTab === 'sobre' && (
          <div className="space-y-6">
            <div className="flex justify-center mb-4 text-gold-500">
              <Sparkles size={28} className="animate-pulse" />
            </div>
            
            <h3 className="font-serif text-xl sm:text-2xl text-white text-center tracking-wide uppercase">
              "Transformamos presentes em memórias inesquecíveis"
            </h3>
            
            <p className="indent-6">
              Nascida no coração de São Paulo, a **Amour & Co.** foi fundada com o propósito de elevar a arte de presentear. Acreditamos que um presente de verdade vai muito além do objeto físico: ele carrega emoções, sela compromissos e materializa o afeto que palavras muitas vezes não conseguem expressar.
            </p>

            <p className="indent-6">
              Nosso processo criativo é pautado por uma curadoria obsessiva por detalhes. Da escolha de tecidos nobres, passando pelas fragrâncias autorais de cada embalagem, até a seleção de cristais lapidados à mão, cada kit presenteável da Amour & Co. é uma edição limitada desenvolvida para surpreender.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div className="bg-white/2 border border-white/5 p-5 rounded-2xl">
                <span className="text-gold-400 font-bold block uppercase tracking-widest text-[10px] mb-2">Curadoria de Luxo</span>
                Parcerias exclusivas com artesãos e marcas internacionais de alta costura e relojoaria.
              </div>
              <div className="bg-white/2 border border-white/5 p-5 rounded-2xl">
                <span className="text-gold-400 font-bold block uppercase tracking-widest text-[10px] mb-2">Atenção ao Detalhe</span>
                Toda caixa de presente é finalizada à mão, perfumada e acompanhada de cartão manuscrito.
              </div>
              <div className="bg-white/2 border border-white/5 p-5 rounded-2xl">
                <span className="text-gold-400 font-bold block uppercase tracking-widest text-[10px] mb-2">Alcance Nacional</span>
                Embalagem de transporte blindada garante integridade impecável de norte a sul do Brasil.
              </div>
            </div>
          </div>
        )}

        {/* FRETE E PRAZOS */}
        {activeTab === 'frete' && (
          <div className="space-y-6">
            <h3 className="font-serif text-lg text-white tracking-wider uppercase border-b border-white/5 pb-2">Políticas de Envio</h3>
            
            <p>
              Para assegurar que seus presentes cheguem em perfeito estado e no prazo estipulado, trabalhamos com uma rede de transportadoras privadas de elite e opções prioritárias dos Correios (SEDEX).
            </p>

            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-full bg-gold-600/10 border border-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                <div>
                  <h4 className="font-semibold text-white">Prazo de Postagem</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Pedidos aprovados até as 12:00 (meio-dia) são despachados no mesmo dia útil. Pedidos após esse horário são despachados na manhã do dia útil seguinte.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-full bg-gold-600/10 border border-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                <div>
                  <h4 className="font-semibold text-white">Embalagem Blindada</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Os kits de presente viajam dentro de uma embalagem de transporte externa resistente e discreta, sem logotipos chamativos, garantindo segurança contra violações e surpresa absoluta para o destinatário.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="h-6 w-6 rounded-full bg-gold-600/10 border border-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                <div>
                  <h4 className="font-semibold text-white">Rastreamento Avançado</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Você receberá atualizações em tempo real via e-mail e WhatsApp a cada etapa da jornada física do presente até o destino final.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TROCAS E DEVOLUÇÕES */}
        {activeTab === 'trocas' && (
          <div className="space-y-6">
            <h3 className="font-serif text-lg text-white tracking-wider uppercase border-b border-white/5 pb-2">Trocas e Devoluções Facilitadas</h3>
            
            <p>
              Compre com total segurança. Na Amour & Co., se o tamanho da camisa não vestir perfeitamente ou se o presenteado desejar realizar a troca de qualquer item, nosso processo de devolução é rápido, humanizado e gratuito.
            </p>

            <ul className="list-disc pl-5 space-y-2.5 text-xs text-gray-500">
              <li><strong className="text-gray-300">Prazo de Solicitação</strong>: Você ou o presenteado têm até 30 dias corridos a partir do recebimento para solicitar a troca de qualquer produto de vestuário ou acessórios.</li>
              <li><strong className="text-gray-300">Primeira Troca Grátis</strong>: A primeira troca é por nossa conta. Geramos um código de logística reversa dos Correios sem nenhum custo para você.</li>
              <li><strong className="text-gray-300">Condições do Produto</strong>: O produto deve ser devolvido sem indícios de uso, com todas as etiquetas originais intactas e na embalagem original (caixa de presente).</li>
              <li><strong className="text-gray-300">Itens Personalizados</strong>: Cartões de dedicatórias personalizados impressos sob demanda não podem ser devolvidos, mas todos os demais produtos físicos que compõem o kit estão qualificados para troca.</li>
            </ul>
          </div>
        )}

        {/* CONTATO FORM */}
        {activeTab === 'contato' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Contacts Info */}
            <div className="md:col-span-5 space-y-6">
              <h3 className="font-serif text-lg text-white tracking-wider uppercase border-b border-white/5 pb-2">Contatos Concierge</h3>
              
              <ul className="space-y-4 text-xs">
                <li className="flex gap-3 items-center">
                  <Phone className="text-gold-500 shrink-0" size={16} />
                  <div>
                    <span className="font-semibold text-white block">Telefone Concierge</span>
                    <span className="text-gray-500">0800 500 7000 (Atendimento Nacional)</span>
                  </div>
                </li>
                <li className="flex gap-3 items-center">
                  <Mail className="text-gold-500 shrink-0" size={16} />
                  <div>
                    <span className="font-semibold text-white block">E-mail Principal</span>
                    <span className="text-gray-500">concierge@amour.com</span>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <MapPin className="text-gold-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-semibold text-white block">Sede Corporativa</span>
                    <span className="text-gray-500">Alameda Lorena, 1500 - Jardins, São Paulo/SP</span>
                  </div>
                </li>
              </ul>

              <div className="bg-white/2 border border-white/5 p-4 rounded-xl text-[11px] text-gray-500 leading-relaxed">
                🕒 **Horário de Atendimento Concierge**: Segunda a Sexta das 08h00 às 20h00. Sábados das 09h00 às 16h00.
              </div>
            </div>

            {/* Form Column */}
            <div className="md:col-span-7 space-y-4">
              <h3 className="font-serif text-lg text-white tracking-wider uppercase border-b border-white/5 pb-2">Envie uma Mensagem</h3>
              
              {formSubmitted && (
                <div className="bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded-xl p-4 flex gap-2.5 items-center">
                  <Check size={18} />
                  <span className="text-xs font-bold">Mensagem enviada! Retornaremos em menos de 2 horas.</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome</label>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      {...register('name')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                    {errors.name && <p className="text-[10px] text-rose-400">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">E-mail</label>
                    <input
                      type="email"
                      placeholder="email@exemplo.com"
                      {...register('email')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                    {errors.email && <p className="text-[10px] text-rose-400">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Celular / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      {...register('phone')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                    {errors.phone && <p className="text-[10px] text-rose-400">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Assunto</label>
                    <input
                      type="text"
                      placeholder="Motivo do contato"
                      {...register('subject')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                    {errors.subject && <p className="text-[10px] text-rose-400">{errors.subject.message}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Mensagem</label>
                  <textarea
                    placeholder="Escreva detalhadamente sua dúvida, sugestão ou solicitação..."
                    {...register('message')}
                    className="w-full h-28 bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-white focus:outline-none focus:border-gold-500 transition resize-none"
                  />
                  {errors.message && <p className="text-[10px] text-rose-400">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-gold text-luxury-black font-semibold text-xs tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send size={12} />
                  <span>{isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}</span>
                </button>

              </form>
            </div>

          </div>
        )}

        {/* TERMOS E PRIVACIDADE */}
        {activeTab === 'termos' && (
          <div className="space-y-6 text-gray-500 text-xs">
            <h3 className="font-serif text-lg text-white tracking-wider uppercase border-b border-white/5 pb-2">Políticas Gerais</h3>
            
            <div className="space-y-3">
              <h4 className="font-bold text-gray-300">1. Termos de Uso</h4>
              <p>Ao navegar em nosso site e efetuar compras, você concorda com nossos termos gerais de serviço. A venda de produtos é limitada a maiores de 18 anos devido a itens regulados (perfumaria/bebidas). Nos reservamos o direito de cancelar pedidos em caso de suspeita fundamentada de fraude bancária ou clonagem de dados.</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-300">2. Segurança de Dados e LGPD</h4>
              <p>Seguimos estritamente as diretrizes da LGPD (Lei Geral de Proteção de Dados). Seus dados cadastrais (CPF, Nome, Endereço) e informações de contato são armazenados sob criptografia de dados segura e são compartilhados exclusivamente com os gateways de pagamento autorizados (ex: Stripe, Mercado Pago) e transportadoras encarregadas do envio físico.</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-300">3. Direitos Autorais</h4>
              <p>A identidade visual Amour & Co., logos, descrições literárias de produtos e imagens produzidas sob estúdio fotográfico são propriedades exclusivas, sendo expressamente proibida a reprodução ou cópia comercial não autorizada.</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
export default Institutional;
