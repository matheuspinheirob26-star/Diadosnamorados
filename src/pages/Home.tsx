import React, { useEffect, useState, useRef } from 'react';
import { useCampaign } from '../context/CampaignContext';
import { useCart } from '../context/CartContext';
import { useStorefront } from '../context/StorefrontContext';
import { api } from '../lib/supabase';
import { Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { Truck, ShieldCheck, CreditCard, Headphones, RotateCcw, ArrowRight, Heart, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeProps {
  onNavigate: (page: string, tab?: string) => void;
  onSetCatalogFilter: (filter: { category?: string; gender?: string; tag?: string }) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, onSetCatalogFilter }) => {
  const { currentCampaign } = useCampaign();
  const { config } = useStorefront();
  const { addToCart } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [flagshipProduct, setFlagshipProduct] = useState<Product | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      const all = await api.getProducts();
      // Apenas produtos publicados na vitrine
      const published = all.filter(p => !p.status || p.status === 'publicado');
      
      // Flagship: preferência para produto featured da campanha ativa, depois id fixo, depois primeiro
      const main = 
        published.find(p => p.featured && p.campaign === currentCampaign.id) ||
        published.find(p => p.id === 'kit-namorados-premium') ||
        published[0];
      
      if (!main) {
        setFlagshipProduct(null);
        setFeaturedProducts([]);
        return;
      }
      setFlagshipProduct(main);
      
      // Vitrine: produtos publicados, excluindo a flagship (mostrar até 12 para o carrossel rolar)
      const rest = published.filter(p => p.id !== main.id).slice(0, 12);
      setFeaturedProducts(rest);
    };

    loadProducts();

    window.addEventListener('productsUpdated', loadProducts);
    return () => window.removeEventListener('productsUpdated', loadProducts);
  }, [currentCampaign]);

  const handleCategoryClick = (categoryName: string, options?: { gender?: string; tag?: string }) => {
    onSetCatalogFilter({
      category: categoryName !== 'Masculino' && categoryName !== 'Feminino' ? categoryName : undefined,
      gender: options?.gender,
      tag: options?.tag
    });
    onNavigate('catalog');
  };

  const handleBuyFlagship = () => {
    if (flagshipProduct) {
      // Como tem tamanhos, melhor navegar para o detalhe para o cliente escolher o tamanho
      onNavigate(`product-${flagshipProduct.id}`);
    }
  };

  return (
    <div className="space-y-20 pb-20 overflow-hidden bg-gradient-luxury">
            
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[65vh] flex items-center justify-center pt-32 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Imagem de Fundo do Hero (Desktop) */}
        {(config.heroBannerDesktop || (currentCampaign as any).heroImage) && (
          <div 
            className="hidden sm:block absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-700" 
            style={{ backgroundImage: `url(${config.heroBannerDesktop || (currentCampaign as any).heroImage})` }} 
          />
        )}
        {/* Imagem de Fundo do Hero (Mobile) */}
        {(config.heroBannerMobile || config.heroBannerDesktop || (currentCampaign as any).heroImage) && (
          <div 
            className="block sm:hidden absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-700" 
            style={{ backgroundImage: `url(${config.heroBannerMobile || config.heroBannerDesktop || (currentCampaign as any).heroImage})` }} 
          />
        )}
        <div className="absolute inset-0 bg-gradient-luxury opacity-80" />

        {/* Background glow overlay */}
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gold-600/5 blur-[120px] pointer-events-none animate-pulse-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-wine-600/5 blur-[120px] pointer-events-none animate-pulse-slow" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          
          {/* Animated Seasonal Badge */}
          {(config.heroBadge || (currentCampaign as any).badgeText) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-border-faint border border-theme-border text-[10px] sm:text-xs font-bold tracking-widest text-gold-400 uppercase"
            >
              <Sparkles size={12} className="animate-spin-slow" />
              <span>{config.heroBadge || (currentCampaign as any).badgeText}</span>
            </motion.div>
          )}

          {/* Slogan */}
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="font-serif text-4xl sm:text-6xl md:text-7xl font-extralight tracking-tight leading-tight text-theme-text"
            >
              {(config.heroTitle || currentCampaign.headline).trim().split(/\s+/).map((word, i, arr) => (
                <React.Fragment key={i}>
                  <span className={word.toLowerCase().includes('memórias') || word.toLowerCase().includes('presente') || word.toLowerCase().includes('amor') || word.toLowerCase().includes('inesquecíveis') ? 'text-gradient-gold block md:inline font-normal' : ''}>
                    {word}
                  </span>
                  {i !== arr.length - 1 && ' '}
                </React.Fragment>
              ))}
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-theme-muted text-lg sm:text-xl max-w-2xl mx-auto font-light leading-relaxed"
            >
              {config.heroSubtitle || currentCampaign.subheadline}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button
              onClick={() => {
                onSetCatalogFilter({}); // Reset filters to show all
                onNavigate(config.heroButtonLink || 'catalog');
              }}
              className="w-full sm:w-auto bg-gradient-gold hover:shadow-lg hover:shadow-gold-500/10 text-theme-text font-semibold text-xs tracking-widest uppercase px-8 py-4 rounded-lg transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{config.heroButtonText || 'Ver Coleção'}</span>
              <ArrowRight size={14} />
            </button>
            
            {flagshipProduct && (
              <button
                onClick={() => onNavigate(`product-${flagshipProduct.id}`)}
                className="w-full sm:w-auto border border-theme-border hover:border-gold-500 hover:text-gold-400 text-theme-text font-semibold text-xs tracking-widest uppercase px-8 py-4 rounded-lg bg-white/2 hover:bg-theme-border-faint transition duration-300 cursor-pointer"
              >
                Edição Especial
              </button>
            )}
          </motion.div>

        </div>
      </section>

      {/* 2. BENEFIT BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 border-y border-theme-border-faint py-10">
          
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-theme-border-faint flex items-center justify-center text-gold-500 border border-theme-border">
              <Truck size={18} />
            </div>
            <h4 className="text-[11px] font-bold text-theme-text uppercase tracking-wider">Envio Privado</h4>
            <p className="text-[10px] text-theme-muted">Frete Expresso para todo Brasil</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-theme-border-faint flex items-center justify-center text-gold-500 border border-theme-border">
              <ShieldCheck size={18} />
            </div>
            <h4 className="text-[11px] font-bold text-theme-text uppercase tracking-wider">Compra Blindada</h4>
            <p className="text-[10px] text-theme-muted">Criptografia SSL certificado</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-2.5 col-span-2 md:col-span-1">
            <div className="h-10 w-10 rounded-full bg-theme-border-faint flex items-center justify-center text-gold-500 border border-theme-border">
              <CreditCard size={18} />
            </div>
            <h4 className="text-[11px] font-bold text-theme-text uppercase tracking-wider">Pix & Cartão</h4>
            <p className="text-[10px] text-theme-muted">Pix 10% OFF ou até 10x sem juros</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-theme-border-faint flex items-center justify-center text-gold-500 border border-theme-border">
              <Headphones size={18} />
            </div>
            <h4 className="text-[11px] font-bold text-theme-text uppercase tracking-wider">Concierge 24h</h4>
            <p className="text-[10px] text-theme-muted">Suporte humanizado pós-venda</p>
          </div>

          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-theme-border-faint flex items-center justify-center text-gold-500 border border-theme-border">
              <RotateCcw size={18} />
            </div>
            <h4 className="text-[11px] font-bold text-theme-text uppercase tracking-wider">Troca Garantida</h4>
            <p className="text-[10px] text-theme-muted">Primeira devolução sem custos</p>
          </div>

        </div>
      </section>

      {/* 3. CATEGORIES SECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-3xl text-theme-text tracking-widest uppercase">Coleções Sazonais</h2>
          <div className="h-0.5 w-16 bg-gradient-gold mx-auto" />
          <p className="text-xs text-theme-muted uppercase tracking-widest">Navegue por categorias exclusivas</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          
          <div
            onClick={() => handleCategoryClick('Dia dos Namorados', { tag: 'namorados' })}
            className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-theme-border-faint hover:border-gold-500/25 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=200&auto=format&fit=crop" alt="Dia dos Namorados" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
              <span className="text-xl">❤️</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text mt-1">Namorados</h4>
            </div>
          </div>

          <div
            onClick={() => handleCategoryClick('Kits Presenteáveis')}
            className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-theme-border-faint hover:border-gold-500/25 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=200&auto=format&fit=crop" alt="Kits Presenteáveis" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
              <span className="text-xl">🎁</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text mt-1">Kits Presentes</h4>
            </div>
          </div>

          <div
            onClick={() => handleCategoryClick('Masculino', { gender: 'masculino' })}
            className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-theme-border-faint hover:border-gold-500/25 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop" alt="Masculino" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
              <span className="text-xl">👔</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text mt-1">Masculino</h4>
            </div>
          </div>

          <div
            onClick={() => handleCategoryClick('Feminino', { gender: 'feminino' })}
            className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-theme-border-faint hover:border-gold-500/25 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=200&auto=format&fit=crop" alt="Feminino" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
              <span className="text-xl">👗</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text mt-1">Feminino</h4>
            </div>
          </div>

          <div
            onClick={() => handleCategoryClick('Romântico')}
            className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-theme-border-faint hover:border-gold-500/25 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=200&auto=format&fit=crop" alt="Romântico" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
              <span className="text-xl">🌹</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text mt-1">Romântico</h4>
            </div>
          </div>

          <div
            onClick={() => handleCategoryClick('Mais Vendidos', { tag: 'mais-vendidos' })}
            className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer border border-theme-border-faint hover:border-gold-500/25 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop" alt="Mais Vendidos" className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute bottom-4 left-0 right-0 text-center z-20">
              <span className="text-xl">⭐</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-theme-text mt-1">Mais Vendidos</h4>
            </div>
          </div>

        </div>
      </section>

      {/* 4. FLAGSHIP PRODUCT EMOTIONAL BANNER */}
      {flagshipProduct && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-wine rounded-3xl overflow-hidden border border-theme-border-faint grid grid-cols-1 lg:grid-cols-12 glow-wine items-center">
            
            {/* Image Col */}
            <div className="lg:col-span-5 h-[350px] lg:h-full min-h-[350px] relative">
              <img
                src={flagshipProduct.images[0]}
                alt={flagshipProduct.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-luxury-black/60 via-transparent to-transparent" />
            </div>

            {/* Description Details */}
            <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 space-y-6">
              
              <div className="inline-flex items-center gap-1 bg-gold-600/10 border border-gold-500/30 px-3 py-1 rounded text-gold-400 text-[9px] uppercase tracking-widest font-bold">
                <Heart size={10} className="fill-currentColor" /> Campanha Oficial
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl text-theme-text tracking-wide leading-tight">
                {flagshipProduct.name}
              </h2>
              
              <p className="text-xs text-theme-muted leading-relaxed font-light">
                {flagshipProduct.description}
              </p>

              {/* Items bullet lists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-theme-muted">
                {flagshipProduct.features.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-gold-500 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>

              {/* Buy block */}
              <div className="pt-6 border-t border-theme-border-faint flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] text-theme-muted line-through block">De R$ {flagshipProduct.originalPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-xl font-bold text-theme-text block">Por R$ {flagshipProduct.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">Ou R$ {(flagshipProduct.price * 0.9).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no Pix (10% OFF)</span>
                </div>

                <button
                  onClick={handleBuyFlagship}
                  className="w-full sm:w-auto bg-gradient-gold hover:shadow-lg text-theme-text font-semibold text-xs tracking-widest uppercase px-8 py-3.5 rounded-lg transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Garantir Presente</span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* 5. FEATURED VITRINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4 border-b border-theme-border-faint pb-6">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl text-theme-text tracking-widest uppercase">Novos Lançamentos</h2>
            <p className="text-[10px] text-theme-muted uppercase tracking-widest">Experiências premium recém-chegadas</p>
          </div>
          <button
            onClick={() => {
              onSetCatalogFilter({});
              onNavigate('catalog');
            }}
            className="text-xs text-gold-400 hover:text-theme-text transition font-semibold tracking-wider flex items-center gap-1 group cursor-pointer"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
            }}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-luxury-gray/90 border border-theme-border rounded-full flex items-center justify-center text-theme-text opacity-0 group-hover:opacity-100 transition-all hover:bg-gold-500 hover:text-black hidden sm:flex cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Scroll Container */}
          <div 
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 pt-2 px-2 -mx-2"
          >
            {featuredProducts.map((prod) => (
              <div key={prod.id} className="w-[85vw] sm:w-[300px] lg:w-[calc(25%-1.125rem)] shrink-0 snap-start">
                <ProductCard
                  product={prod}
                  onNavigateToDetail={(id) => onNavigate(`product-${id}`)}
                />
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
            }}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-luxury-gray/90 border border-theme-border rounded-full flex items-center justify-center text-theme-text opacity-0 group-hover:opacity-100 transition-all hover:bg-gold-500 hover:text-black hidden sm:flex cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* 6. SOCIAL PROOF DEPOIMENTOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/2 border border-theme-border-faint rounded-3xl p-8 sm:p-12 lg:p-16 space-y-10 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-gold-600/5 blur-[80px]" />
          
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl text-theme-text tracking-widest uppercase">O que dizem sobre nós</h2>
            <div className="flex justify-center gap-0.5 text-gold-500">
              <Star size={14} className="fill-currentColor" />
              <Star size={14} className="fill-currentColor" />
              <Star size={14} className="fill-currentColor" />
              <Star size={14} className="fill-currentColor" />
              <Star size={14} className="fill-currentColor" />
            </div>
            <p className="text-xs text-theme-muted uppercase tracking-widest">Nota 4.9/5 com base em mais de 5.000 entregas</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-4">
              <p className="text-xs text-theme-muted italic leading-relaxed">
                "Comprei o Kit Premium para meu namorado. Chegou em menos de 2 dias em Belo Horizonte, a caixa laqueada de madeira chamou atenção antes mesmo de abrir. A qualidade da camisa e carteira é fantástica. Recomendo muito!"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-gold-400">AM</div>
                <div>
                  <h4 className="text-xs font-semibold text-theme-text">Aline Mendonça</h4>
                  <span className="text-[9px] text-theme-muted uppercase tracking-widest">Belo Horizonte - MG</span>
                </div>
              </div>
            </div>

            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-4">
              <p className="text-xs text-theme-muted italic leading-relaxed">
                "Experiência incrível. O concierge via WhatsApp me auxiliou na escolha do tamanho. O cartão personalizado em papel linho deu um toque de exclusividade perfeito. Com certeza voltarei a comprar nas próximas datas."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-gold-400">FF</div>
                <div>
                  <h4 className="text-xs font-semibold text-theme-text">Felipe Faria</h4>
                  <span className="text-[9px] text-theme-muted uppercase tracking-widest">São Paulo - SP</span>
                </div>
              </div>
            </div>

            <div className="bg-luxury-gray border border-theme-border-faint p-6 rounded-2xl space-y-4">
              <p className="text-xs text-theme-muted italic leading-relaxed">
                "Surpreendente a atenção aos detalhes. As taças de cristal do kit Momentos a Dois são lapidadas à mão, pesadas e elegantes. O espumante brut estava ótimo e os chocolates belgas são deliciosos. Nota 10 pela apresentação."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-gold-400">CR</div>
                <div>
                  <h4 className="text-xs font-semibold text-theme-text">Carla Rodrigues</h4>
                  <span className="text-[9px] text-theme-muted uppercase tracking-widest">Curitiba - PR</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};

const CheckCircle2: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ width: size, height: size }}
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export default Home;
