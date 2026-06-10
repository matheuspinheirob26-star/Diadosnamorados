import React, { useEffect, useState, useMemo } from 'react';
import { Product, ProductVariation } from '../types';
import { api } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { tracking } from '../lib/tracking';
import { formatCurrency, simulateShipping, ShippingOption } from '../lib/utils';
import { ProductGallery } from '../components/product/ProductGallery';
import { ReviewsSection } from '../components/product/ReviewsSection';
import { SizeModal } from '../components/product/SizeModal';
import {
  Star, Truck, ShieldCheck, RefreshCw, MessageCircle, ArrowLeft,
  Ruler, AlertCircle, Flame, Sparkles, PackageX, AlertTriangle, Plus
} from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';

interface ProductDetailProps {
  productId: string;
  onNavigate: (page: string) => void;
  onCartOpen: () => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId, onNavigate, onCartOpen }) => {
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  
  // Variações selecionadas: Record<type, variationId>
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  // CEP Shipping
  const [cep, setCep] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

  // Size Modal
  const [sizeModalOpen, setSizeModalOpen] = useState(false);

  useEffect(() => {
    const loadProductData = async () => {
      setLoading(true);
      const data = await api.getProductById(productId);
      setProduct(data);
      
      if (data) {
        tracking.viewContent(data.id, data.name, data.price);
        
        const all = await api.getProducts();
        const related = all
          .filter(p => p.id !== data.id && (!p.status || p.status === 'publicado') && (p.category === data.category || p.gender === data.gender))
          .slice(0, 4);
        setRelatedProducts(related);

        if (data.sizes && data.sizes.length > 0) {
          setSelectedSize(data.sizes[0]);
        } else {
          setSelectedSize('');
        }

        // Pré-selecionar primeira variação ativa de cada tipo
        if (data.variations && data.variations.length > 0) {
          const activeVars = data.variations.filter(v => v.active);
          const types = [...new Set(activeVars.map(v => v.type))];
          const initial: Record<string, string> = {};
          types.forEach(type => {
            const first = activeVars.find(v => v.type === type);
            if (first) initial[type] = first.id;
          });
          setSelectedVariations(initial);
        } else {
          setSelectedVariations({});
        }
      }
      setLoading(false);
      window.scrollTo(0, 0);
    };

    loadProductData();

    window.addEventListener('productsUpdated', loadProductData);
    return () => window.removeEventListener('productsUpdated', loadProductData);
  }, [productId]);

  // Calcular preço efetivo com acréscimos de variações
  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    let price = product.price;
    if (product.variations) {
      Object.values(selectedVariations).forEach(varId => {
        const variation = product.variations!.find(v => v.id === varId);
        if (variation && variation.active) {
          price += variation.priceAddition;
        }
      });
    }
    return price;
  }, [product, selectedVariations]);

  // Agrupar variações ativas por tipo
  const variationsByType = useMemo(() => {
    if (!product?.variations) return {} as Record<string, ProductVariation[]>;
    const active = product.variations.filter(v => v.active);
    return active.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {} as Record<string, ProductVariation[]>);
  }, [product]);

  const variationTypes = Object.keys(variationsByType);

  const typeLabels: Record<string, string> = {
    tamanho: 'Tamanho',
    cor: 'Cor',
    modelo: 'Modelo',
    fragrancia: 'Fragrância',
    embalagem: 'Tipo de Embalagem',
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-gray-500">
        Carregando detalhes do presente...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h3 className="font-serif text-xl text-theme-text">Presente não encontrado</h3>
        <button
          onClick={() => onNavigate('catalog')}
          className="text-gold-400 font-semibold flex items-center gap-1 mx-auto"
        >
          <ArrowLeft size={16} /> Voltar ao Catálogo
        </button>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0 && !product.allowOutOfStockSale;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= (product.minStock ?? 5);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, 1, selectedSize || undefined, Object.keys(selectedVariations).length > 0 ? selectedVariations : undefined);
    onCartOpen();
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, 1, selectedSize || undefined, Object.keys(selectedVariations).length > 0 ? selectedVariations : undefined);
    onNavigate('checkout');
  };

  const handleWhatsAppChat = () => {
    const varText = Object.entries(selectedVariations).map(([type, varId]) => {
      const v = product.variations?.find(x => x.id === varId);
      return v ? `${typeLabels[type] ?? type}: ${v.name}` : '';
    }).filter(Boolean).join(', ');
    const text = `Olá! Quero saber mais sobre "${product.name}"${selectedSize ? ` (Tamanho: ${selectedSize})` : ''}${varText ? ` (${varText})` : ''}. Pode me ajudar?`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCalculateShipping = (e: React.FormEvent) => {
    e.preventDefault();
    setShippingError('');
    setShippingOptions([]);
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setShippingError('Digite um CEP válido com 8 dígitos.');
      return;
    }
    setShippingLoading(true);
    setTimeout(() => {
      const options = simulateShipping(cleanCep);
      setShippingOptions(options);
      setShippingLoading(false);
    }, 1200);
  };

  const installmentValue = effectivePrice / 10;
  const pixPrice = effectivePrice * 0.9;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      
      {/* Back to catalog link */}
      <button
        onClick={() => onNavigate('catalog')}
        className="text-xs text-gray-500 hover:text-gold-400 transition font-semibold flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft size={14} /> Voltar para presentes
      </button>

      {/* Main product panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column - Gallery */}
        <div className="lg:col-span-5">
          <ProductGallery images={product.images} video={product.id === 'kit-namorados-premium' ? 'https://www.youtube.com/embed/dQw4w9WgXcQ' : undefined} />
        </div>

        {/* Right Column - Product Buy Panel */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-400 bg-gold-500/10 px-3 py-1 rounded">
                {product.category}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {product.featured && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest bg-gradient-gold text-luxury-black px-2.5 py-1 rounded-full">
                    <Flame size={9} /> Destaque
                  </span>
                )}
                {product.campaign && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest bg-wine-600/90 text-theme-text px-2.5 py-1 rounded-full border border-wine-400/30">
                    <Sparkles size={9} /> Campanha
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-theme-muted font-semibold">
                  <div className="flex text-gold-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= Math.round(product.rating) ? 'fill-gold-500 text-gold-500' : 'text-gray-600'}
                      />
                    ))}
                  </div>
                  <span>{product.rating} ({product.reviewsCount} avaliações)</span>
                </div>
              </div>
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl text-theme-text tracking-wide leading-tight">
              {product.name}
            </h1>
            
            <p className="text-xs text-theme-muted font-light leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Sizing guide (for clothing kits) */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-theme-text tracking-wide uppercase">Selecione o Tamanho</span>
                <button
                  onClick={() => setSizeModalOpen(true)}
                  className="text-gold-400 hover:text-theme-text flex items-center gap-1 transition text-[11px] font-semibold tracking-wider cursor-pointer"
                >
                  <Ruler size={12} /> Tabela de Medidas
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`h-11 w-11 rounded-lg border text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      selectedSize === sz
                        ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                        : 'border-theme-border hover:border-white/30 text-gray-300'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === VARIAÇÕES PROFISSIONAIS === */}
          {variationTypes.length > 0 && (
            <div className="space-y-5 pt-4 border-t border-white/5">
              {variationTypes.map(type => {
                const vars = variationsByType[type];
                const selectedId = selectedVariations[type];
                const selectedVar = vars.find(v => v.id === selectedId);
                
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-theme-text tracking-wide uppercase">
                        {typeLabels[type] ?? type}
                      </span>
                      {selectedVar && (
                        <span className="text-theme-muted">
                          {selectedVar.name}
                          {selectedVar.priceAddition > 0 && (
                            <span className="text-gold-400 ml-1">(+{formatCurrency(selectedVar.priceAddition)})</span>
                          )}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {vars.map(v => {
                        const isSelected = selectedId === v.id;
                        const varOutOfStock = v.stock <= 0;
                        
                        return (
                          <button
                            key={v.id}
                            onClick={() => !varOutOfStock && setSelectedVariations(prev => ({ ...prev, [type]: v.id }))}
                            disabled={varOutOfStock}
                            title={varOutOfStock ? 'Esgotado' : `${v.name}${v.priceAddition > 0 ? ` (+${formatCurrency(v.priceAddition)})` : ''}`}
                            className={`relative px-4 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                                : varOutOfStock
                                ? 'border-white/5 bg-white/2 text-gray-600 cursor-not-allowed line-through'
                                : 'border-theme-border hover:border-white/30 text-gray-300 hover:text-theme-text'
                            }`}
                          >
                            {type === 'cor' && (
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-white/20 mr-1.5 align-middle"
                                style={{ backgroundColor: v.name.toLowerCase() }}
                              />
                            )}
                            {v.name}
                            {v.priceAddition > 0 && !varOutOfStock && (
                              <span className="ml-1 text-[9px] text-gold-500 font-bold">
                                +{formatCurrency(v.priceAddition)}
                              </span>
                            )}
                            {varOutOfStock && (
                              <span className="absolute -top-1 -right-1 bg-gray-700 text-[8px] text-theme-muted px-1 rounded">
                                Esg.
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pricing & Offers info */}
          <div className="bg-white/2 border border-white/5 p-5 rounded-2xl space-y-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              {hasDiscount && (
                <span className="text-xs text-gray-500 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
              <span className="text-2xl font-bold text-theme-text">
                {formatCurrency(effectivePrice)}
              </span>
              {variationTypes.length > 0 && Object.keys(selectedVariations).length > 0 && (
                <span className="text-[10px] text-theme-muted italic">(com variações selecionadas)</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-theme-border-faint border border-white/5 p-3 rounded-xl">
                <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Pix com desconto</span>
                <span className="text-sm font-bold text-emerald-400 block mt-1">{formatCurrency(pixPrice)}</span>
                <span className="text-[10px] text-theme-muted block mt-0.5">Economize 10% adicionais</span>
              </div>
              <div className="bg-theme-border-faint border border-white/5 p-3 rounded-xl">
                <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Cartão de Crédito</span>
                <span className="text-sm font-bold text-theme-text block mt-1">10x de {formatCurrency(installmentValue)}</span>
                <span className="text-[10px] text-theme-muted block mt-0.5">Sem juros no parcelamento</span>
              </div>
            </div>

            {/* Stock status indicator */}
            <div className="flex items-center gap-1.5 text-[11px]">
              {isOutOfStock ? (
                <>
                  <PackageX size={13} className="text-rose-400" />
                  <span className="text-rose-400 font-semibold">Produto Esgotado</span>
                </>
              ) : isLowStock ? (
                <>
                  <AlertTriangle size={13} className="text-amber-400 animate-pulse" />
                  <span className="text-amber-400 font-semibold">Apenas {product.stock} unidades disponíveis! Corra!</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-theme-muted">Estoque Disponível</span>
                </>
              )}
            </div>
          </div>

          {/* Add to cart / WhatsApp CTA triggers */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`flex-1 font-semibold text-xs tracking-widest uppercase py-4 rounded-lg transition duration-300 cursor-pointer text-center ${
                isOutOfStock
                  ? 'bg-theme-border-faint text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-gold hover:shadow-lg text-luxury-black'
              }`}
            >
              {isOutOfStock ? 'Indisponível' : 'Comprar Agora'}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 border font-semibold text-xs tracking-widest uppercase py-4 rounded-lg transition duration-300 cursor-pointer ${
                isOutOfStock
                  ? 'border-white/5 text-gray-600 cursor-not-allowed'
                  : 'border-theme-border hover:border-gold-500 hover:text-gold-400 text-theme-text bg-white/2 hover:bg-theme-border-faint'
              }`}
            >
              Adicionar à Sacola
            </button>
          </div>

          {/* WhatsApp Direct Line */}
          <button
            onClick={handleWhatsAppChat}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 border border-emerald-500/20 py-3 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>Falar com Personal Shopper (WhatsApp)</span>
          </button>

          {/* Shipping Estimation Simulator */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Calcular Frete e Prazo</label>
            <form onSubmit={handleCalculateShipping} className="flex gap-2">
              <input
                type="text"
                placeholder="Digite seu CEP (ex: 01311-000)"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                className="flex-1 bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
              />
              <button
                type="submit"
                disabled={shippingLoading}
                className="bg-theme-border-faint hover:bg-white/10 border border-theme-border px-5 py-2 text-xs font-semibold uppercase tracking-wider text-theme-text rounded-lg transition cursor-pointer"
              >
                {shippingLoading ? 'Calculando...' : 'Calcular'}
              </button>
            </form>
            {shippingError && <p className="text-[10px] text-rose-400">{shippingError}</p>}
            
            {shippingOptions.length > 0 && (
              <div className="bg-white/2 border border-white/5 rounded-xl p-3 divide-y divide-white/5 space-y-2.5">
                {shippingOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between text-xs pt-2.5 first:pt-0">
                    <div>
                      <span className="font-semibold text-theme-text block">{opt.name}</span>
                      <span className="text-[9px] text-gray-500 block">Entrega estimada em {opt.deliveryDays} dia{opt.deliveryDays !== 1 && 's'} útil{opt.deliveryDays !== 1 && 'is'}</span>
                    </div>
                    <span className="font-bold text-gold-400">{formatCurrency(opt.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Value Props Lists */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] text-gray-500 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Truck size={12} className="text-gold-500" />
              <span>Embalagem protetora luxuosa</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-gold-500" />
              <span>Garantia de autenticidade</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className="text-gold-500" />
              <span>Troca fácil de tamanho</span>
            </div>
          </div>

        </div>

      </div>

      {/* Product Long Details Features Tab */}
      <div className="space-y-4 pt-10 border-t border-white/5">
        <h3 className="font-serif text-xl text-theme-text tracking-widest uppercase">Características e Itens do Kit</h3>
        <p className="text-xs text-theme-muted leading-relaxed font-light whitespace-pre-line">
          {product.details}
        </p>
      </div>

      {/* Reviews list integration */}
      <ReviewsSection productId={product.id} />

      {/* Related / Cross sell suggestions slider */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-white/5">
          <div className="space-y-1">
            <h3 className="font-serif text-xl text-theme-text tracking-widest uppercase">Também pode agradar</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Complete seu presente com outros mimos</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onNavigateToDetail={(id) => onNavigate(`product-${id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* SizingModal */}
      <SizeModal isOpen={sizeModalOpen} onClose={() => setSizeModalOpen(false)} />

    </div>
  );
};

export default ProductDetail;
