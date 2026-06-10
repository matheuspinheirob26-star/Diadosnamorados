import React from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Star, Eye, ShoppingCart, Flame, Sparkles, AlertTriangle, Zap } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onNavigateToDetail: (id: string) => void;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigateToDetail, onQuickView }) => {
  const { addToCart } = useCart();

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock > 0 && product.stock <= (product.minStock ?? 5);
  
  // Calcular parcelas
  const installmentValue = product.price / 10;
  const pixPrice = product.price * 0.9; // 10% OFF no Pix

  // Verificar se tem desconto real
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Variações disponíveis
  const activeVariations = product.variations?.filter(v => v.active) ?? [];
  const hasVariations = activeVariations.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    
    // Se tiver tamanhos ou variações, navegar para detalhe
    if ((product.sizes && product.sizes.length > 0) || hasVariations) {
      onNavigateToDetail(product.id);
    } else {
      addToCart(product, 1);
    }
  };

  return (
    <div
      onClick={() => onNavigateToDetail(product.id)}
      className="group bg-luxury-gray border border-theme-border-faint rounded-2xl overflow-hidden hover:border-gold-500/25 transition-all duration-500 hover:shadow-[0_10px_30px_rgba(197,154,72,0.08)] flex flex-col h-full cursor-pointer"
    >
      {/* Product Image Panel */}
      <div className="relative aspect-square overflow-hidden bg-theme-border-faint border-b border-theme-border-faint">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        
        {/* Dynamic Marketing Badges - top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.featured && (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest bg-gradient-gold text-gray-900 px-2.5 py-1 rounded-full shadow-lg">
              <Flame size={9} /> Destaque
            </span>
          )}
          {product.campaign && !product.featured && (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest bg-wine-600/90 text-theme-text px-2.5 py-1 rounded-full shadow-lg border border-wine-400/30">
              <Sparkles size={9} /> Campanha
            </span>
          )}
          {!product.featured && !product.campaign && product.tags?.includes('namorados') && (
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-gradient-gold text-gray-900 px-2.5 py-1 rounded-full shadow-lg">
              ❤️ Dia dos Namorados
            </span>
          )}
          {!product.featured && !product.campaign && product.tags?.includes('mais-vendidos') && (
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-white/10 border border-white/20 text-theme-text px-2.5 py-1 rounded-full shadow-lg">
              ⭐ Mais Vendido
            </span>
          )}
          {isLowStock && (
            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest bg-amber-500/90 text-gray-900 px-2.5 py-1 rounded-full shadow-lg">
              <AlertTriangle size={9} /> Poucas Unidades
            </span>
          )}
        </div>

        {/* Discount badge - top right */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-3 right-3 z-10">
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-rose-500 text-theme-text px-2 py-1 rounded-full shadow-lg">
              -{discountPct}%
            </span>
          </div>
        )}

        {/* Full delivery badge - bottom left */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold italic uppercase tracking-wider bg-emerald-500 text-gray-900 px-2.5 py-1 rounded-sm shadow-lg">
            <Zap size={10} className="fill-luxury-black" /> Entrega FULL
          </span>
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="text-xs font-bold uppercase tracking-widest border border-white/30 text-theme-text px-4 py-2 bg-black/30 rounded">
              Esgotado
            </span>
          </div>
        )}

        {/* Quick actions hover overlay */}
        {!isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickView) onQuickView(product);
                else onNavigateToDetail(product.id);
              }}
              className="h-10 w-10 bg-luxury-gray text-theme-text hover:text-gold-400 rounded-full flex items-center justify-center border border-theme-border transition-all hover:scale-105"
              title="Visualização Rápida"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={handleAddToCart}
              className="h-10 w-10 bg-gradient-gold text-gray-900 rounded-full flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg"
              title={hasVariations || (product.sizes && product.sizes.length > 0) ? 'Escolher Opções' : 'Adicionar ao Carrinho'}
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* Category & Rating */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">
              {product.category}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-theme-muted font-semibold">
              <Star size={10} className="text-gold-500 fill-gold-500" />
              <span>{product.rating}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-serif text-theme-text text-sm tracking-wide group-hover:text-gold-400 transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Sub description */}
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Variations hint */}
          {hasVariations && (
            <p className="text-[10px] text-gold-400/70 font-semibold">
              {activeVariations.length} opção{activeVariations.length !== 1 ? 'ões' : ''} disponível{activeVariations.length !== 1 ? 'is' : ''}
            </p>
          )}
        </div>

        {/* Pricing & Actions */}
        <div className="mt-4 pt-3 border-t border-theme-border-faint flex flex-col gap-3">
          <div className="space-y-1">
            {hasDiscount && (
              <span className="text-[10px] text-gray-500 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-theme-text">
                {formatCurrency(product.price)}
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {formatCurrency(pixPrice)} no Pix
              </span>
            </div>
            <p className="text-[9px] text-gray-500">
              ou <span className="text-gray-300 font-medium">10x de {formatCurrency(installmentValue)}</span> sem juros
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 border ${
              isOutOfStock 
                ? 'bg-theme-border-faint text-gray-500 border-theme-border-faint cursor-not-allowed'
                : 'bg-theme-border-faint border-theme-border text-theme-text hover:bg-gradient-gold hover:text-gray-900 hover:border-transparent hover:shadow-lg'
            }`}
          >
            <ShoppingCart size={14} />
            <span>
              {isOutOfStock 
                ? 'Esgotado' 
                : hasVariations || (product.sizes && product.sizes.length > 0) 
                  ? 'Escolher Opções' 
                  : 'Comprar Agora'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default ProductCard;
