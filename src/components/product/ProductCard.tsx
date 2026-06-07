import React from 'react';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Star, Eye, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onNavigateToDetail: (id: string) => void;
  onQuickView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigateToDetail, onQuickView }) => {
  const { addToCart } = useCart();

  const isOutOfStock = product.stock <= 0;
  
  // Encontrar se tem tags especiais
  const hasTag = product.tags && product.tags.length > 0;
  const mainTag = hasTag ? product.tags[0] : '';

  // Calcular parcelas
  const installmentValue = product.price / 10;
  const pixPrice = product.price * 0.9; // 10% OFF no Pix

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    
    // Se tiver tamanhos, adiciona o padrão 'M' ou abre detalhes
    if (product.sizes && product.sizes.length > 0) {
      onNavigateToDetail(product.id);
    } else {
      addToCart(product, 1);
    }
  };

  return (
    <div
      onClick={() => onNavigateToDetail(product.id)}
      className="group bg-luxury-gray border border-white/5 rounded-2xl overflow-hidden hover:border-gold-500/25 transition-all duration-500 hover:shadow-[0_10px_30px_rgba(197,154,72,0.08)] flex flex-col h-full cursor-pointer"
    >
      {/* Product Image Panel */}
      <div className="relative aspect-square overflow-hidden bg-luxury-dark border-b border-white/5">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          loading="lazy"
        />
        
        {/* Dynamic Marketing Badges */}
        {hasTag && (
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
            <span className="text-[9px] font-extrabold uppercase tracking-widest bg-gradient-gold text-luxury-black px-2.5 py-1 rounded-full shadow-lg">
              {mainTag === 'namorados' ? '❤️ Dia dos Namorados' : mainTag === 'mais-vendidos' ? '⭐ Mais Vendido' : mainTag.replace('-', ' ')}
            </span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-10">
            <span className="text-xs font-bold uppercase tracking-widest border border-white/30 text-white px-4 py-2 bg-black/30">
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
              className="h-10 w-10 bg-luxury-gray text-white hover:text-gold-400 rounded-full flex items-center justify-center border border-white/10 transition-all hover:scale-105"
              title="Visualização Rápida"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={handleAddToCart}
              className="h-10 w-10 bg-gradient-gold text-luxury-black rounded-full flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg"
              title="Adicionar ao Carrinho"
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
            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
              <Star size={10} className="text-gold-500 fill-gold-500" />
              <span>{product.rating}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-serif text-white text-sm tracking-wide group-hover:text-gold-400 transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Sub description */}
          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing */}
        <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
          {product.originalPrice > product.price && (
            <span className="text-[10px] text-gray-500 line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">
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
      </div>
    </div>
  );
};
export default ProductCard;
