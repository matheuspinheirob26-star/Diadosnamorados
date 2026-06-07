import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { api } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { tracking } from '../lib/tracking';
import { formatCurrency, simulateShipping, ShippingOption } from '../lib/utils';
import { ProductGallery } from '../components/product/ProductGallery';
import { ReviewsSection } from '../components/product/ReviewsSection';
import { SizeModal } from '../components/product/SizeModal';
import { Star, Truck, ShieldCheck, RefreshCw, MessageCircle, HelpCircle, ArrowLeft, Ruler, AlertCircle } from 'lucide-react';
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
        // Disparar Pixel ViewContent
        tracking.viewContent(data.id, data.name, data.price);
        
        // Carregar similares
        const all = await api.getProducts();
        const related = all
          .filter(p => p.id !== data.id && (p.category === data.category || p.gender === data.gender))
          .slice(0, 4);
        setRelatedProducts(related);

        // Se tiver tamanhos, pré-selecionar o primeiro
        if (data.sizes && data.sizes.length > 0) {
          setSelectedSize(data.sizes[0]);
        } else {
          setSelectedSize('');
        }
      }
      setLoading(false);
      // Rolar para o topo
      window.scrollTo(0, 0);
    };
    loadProductData();
  }, [productId]);

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
        <h3 className="font-serif text-xl text-white">Presente não encontrado</h3>
        <button
          onClick={() => onNavigate('catalog')}
          className="text-gold-400 font-semibold flex items-center gap-1 mx-auto"
        >
          <ArrowLeft size={16} /> Voltar ao Catálogo
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    
    addToCart(product, 1, selectedSize || undefined);
    onCartOpen(); // Abre o carrinho lateral automaticamente
  };

  const handleBuyNow = () => {
    if (product.stock <= 0) return;
    
    addToCart(product, 1, selectedSize || undefined);
    onNavigate('checkout'); // Direciona para o checkout
  };

  const handleWhatsAppChat = () => {
    const text = `Olá! Estou na loja virtual e gostaria de saber mais informações sobre o "${product.name}"${selectedSize ? ` no tamanho ${selectedSize}` : ''}. Pode me ajudar?`;
    const encodedText = encodeURIComponent(text);
    // WhatsApp comercial fictício
    window.open(`https://wa.me/5511999999999?text=${encodedText}`, '_blank');
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
    // Simula tempo de resposta do Correios / Melhor Envio
    setTimeout(() => {
      const options = simulateShipping(cleanCep);
      setShippingOptions(options);
      setShippingLoading(false);
    }, 1200);
  };

  // Preço Parcelado
  const installmentValue = product.price / 10;
  const pixPrice = product.price * 0.9; // 10% OFF no Pix

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
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-gold-400 bg-gold-500/10 px-3 py-1 rounded">
                {product.category}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
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
            
            <h1 className="font-serif text-3xl sm:text-4xl text-white tracking-wide leading-tight">
              {product.name}
            </h1>
            
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Sizing guides (for clothing kits) */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white tracking-wide uppercase">Selecione o Tamanho</span>
                <button
                  onClick={() => setSizeModalOpen(true)}
                  className="text-gold-400 hover:text-white flex items-center gap-1 transition text-[11px] font-semibold tracking-wider cursor-pointer"
                >
                  <Ruler size={12} /> Tabela de Medidas
                </button>
              </div>

              <div className="flex gap-2">
                {product.sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`h-11 w-11 rounded-lg border text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      selectedSize === sz
                        ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                        : 'border-white/10 hover:border-white/30 text-gray-300'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pricing & Offers info */}
          <div className="bg-white/2 border border-white/5 p-5 rounded-2xl space-y-4">
            <div className="flex items-baseline gap-2">
              {product.originalPrice > product.price && (
                <span className="text-xs text-gray-500 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
              <span className="text-2xl font-bold text-white">
                {formatCurrency(product.price)}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Pix com desconto</span>
                <span className="text-sm font-bold text-emerald-400 block mt-1">{formatCurrency(pixPrice)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Economize 10% adicionais</span>
              </div>
              <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-wider">Cartão de Crédito</span>
                <span className="text-sm font-bold text-white block mt-1">10x de {formatCurrency(installmentValue)}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">Sem juros no parcelamento</span>
              </div>
            </div>

            {/* Stock status indicator */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <div className={`h-2 w-2 rounded-full ${product.stock > 5 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-gray-400">
                {product.stock > 5 
                  ? 'Estoque Disponível' 
                  : `Apenas ${product.stock} unidades disponíveis no estoque`
                }
              </span>
            </div>
          </div>

          {/* Add to cart / WhatsApp CTA triggers */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className="flex-1 bg-gradient-gold hover:shadow-lg text-luxury-black font-semibold text-xs tracking-widest uppercase py-4 rounded-lg transition duration-300 cursor-pointer text-center"
            >
              Comprar Agora
            </button>
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="flex-1 border border-white/10 hover:border-gold-500 hover:text-gold-400 text-white font-semibold text-xs tracking-widest uppercase py-4 rounded-lg bg-white/2 hover:bg-white/5 transition duration-300 cursor-pointer"
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
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
              />
              <button
                type="submit"
                disabled={shippingLoading}
                className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white rounded-lg transition cursor-pointer"
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
                      <span className="font-semibold text-white block">{opt.name}</span>
                      <span className="text-[9px] text-gray-500 block">Entrega estimada em {opt.deliveryDays} dia{opt.deliveryDays !== 1 && 's'} útil{opt.deliveryDays !== 1 && 's'}</span>
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
        <h3 className="font-serif text-xl text-white tracking-widest uppercase">Características e Itens do Kit</h3>
        <p className="text-xs text-gray-400 leading-relaxed font-light whitespace-pre-line">
          {product.details}
        </p>
      </div>

      {/* Reviews list integration */}
      <ReviewsSection productId={product.id} />

      {/* Related / Cross sell suggestions slider */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 pt-10 border-t border-white/5">
          <div className="space-y-1">
            <h3 className="font-serif text-xl text-white tracking-widest uppercase">Também pode agradar</h3>
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
export default ProductDetail;
