import React, { useState } from 'react';
import { useCart, ORDER_BUMP_PRODUCT } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';
import { Product } from '../../types';
import { X, ShoppingBag, Plus, Minus, Trash2, Tag, Gift, Percent, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onCheckout }) => {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    cartTotal,
    freeShippingThreshold,
    isFreeShipping,
    freeShippingRemaining,
    orderBumpSelected,
    toggleOrderBump,
    activeCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    discountAmount
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    await applyCoupon(couponCode.trim());
    setCouponLoading(false);
  };

  const handleCheckoutClick = () => {
    onClose();
    onCheckout();
  };

  // Sugestão de Cross-sell (sugerir espumante / chocolates se não estiver no carrinho)
  const hasMomentosDeux = cart.some(item => item.product.id === 'kit-momentos-dois');
  const crossSellSuggest = !hasMomentosDeux;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-luxury-gray border-l border-theme-border-faint shadow-2xl z-50 flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-theme-border-faint flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-gold-500" />
                <h2 className="font-serif text-lg text-white tracking-wider uppercase">Seu Carrinho</h2>
                <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400">
                  {cart.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              
              {/* Free Shipping Progress Bar */}
              <div className="bg-white/5 border border-theme-border-faint p-4 rounded-xl space-y-2.5">
                <div className="text-xs flex justify-between">
                  <span className="text-gray-400 font-medium">
                    {isFreeShipping 
                      ? '✨ Parabéns! Você ganhou Frete Grátis!' 
                      : `Faltam ${formatCurrency(freeShippingRemaining)} para Frete Grátis`
                    }
                  </span>
                  <span className="text-gold-400 font-semibold">{formatCurrency(cartSubtotal)} / {formatCurrency(freeShippingThreshold)}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-gradient-gold h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (cartSubtotal / freeShippingThreshold) * 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-gray-500">
                    <ShoppingBag size={24} />
                  </div>
                  <div>
                    <h3 className="font-serif text-white tracking-wider">Carrinho Vazio</h3>
                    <p className="text-xs text-gray-500 mt-1">Sua sacola de presentes está esperando para ser preenchida.</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="border border-gold-500/30 hover:border-gold-500 text-gold-400 hover:text-white px-6 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase transition duration-300"
                  >
                    Continuar Navegando
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5 space-y-4">
                  {cart.map((item, idx) => (
                    <div key={`${item.product.id}-${item.selectedSize || idx}`} className="pt-4 flex gap-4 items-start">
                      {/* Image */}
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg bg-white/5 border border-theme-border-faint"
                      />
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{item.product.name}</h4>
                        {item.selectedSize && (
                          <p className="text-[10px] text-gray-500 mt-0.5">Tamanho: <span className="text-gray-300 font-medium">{item.selectedSize}</span></p>
                        )}
                        <p className="text-xs text-gold-400 font-semibold mt-1">
                          {formatCurrency(item.product.price)}
                        </p>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize)}
                              className="p-1.5 text-gray-400 hover:text-white"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-2.5 text-xs text-white font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                              className="p-1.5 text-gray-400 hover:text-white"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          
                          {/* Trash */}
                          <button
                            onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                            className="text-gray-500 hover:text-rose-400 p-1"
                            title="Remover item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Bump Card - One Click Upsell */}
              {cart.length > 0 && !orderBumpSelected && (
                <div className="glass-gold border border-gold-500/25 p-4 rounded-xl flex gap-3.5 items-start relative overflow-hidden">
                  <div className="absolute right-0 top-0 bg-gold-600/10 text-gold-400 text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 border-b border-l border-gold-500/25 rounded-bl">
                    Mais Escolhido
                  </div>
                  <input
                    type="checkbox"
                    checked={orderBumpSelected}
                    onChange={toggleOrderBump}
                    className="mt-1 h-4 w-4 accent-gold-500 rounded border-white/10 text-gray-900 focus:ring-gold-500 cursor-pointer"
                    id="order-bump-chk"
                  />
                  <label htmlFor="order-bump-chk" className="flex-1 cursor-pointer select-none">
                    <div className="flex items-center gap-1.5">
                      <Gift size={14} className="text-gold-400" />
                      <h4 className="text-[11px] font-semibold text-white">{ORDER_BUMP_PRODUCT.name}</h4>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      Transforme seu presente em uma experiência inesquecível por apenas <span className="text-gold-400 font-semibold">{formatCurrency(ORDER_BUMP_PRODUCT.price)}</span> extras.
                    </p>
                  </label>
                </div>
              )}

              {/* Cross-Sell Suggestion */}
              {cart.length > 0 && crossSellSuggest && (
                <div className="bg-white/5 border border-theme-border-faint p-4 rounded-xl space-y-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                    Combina perfeitamente
                  </div>
                  <div className="flex gap-3 items-center">
                    <img
                      src="https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=200&auto=format&fit=crop"
                      alt="Kit Momentos a Dois"
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[11px] font-semibold text-white truncate">Kit Momentos a Dois Luxo</h5>
                      <p className="text-[10px] text-gold-400 font-semibold">{formatCurrency(299.90)}</p>
                    </div>
                    <button
                      onClick={() => {
                        // Buscar e adicionar o produto mock correspondente
                        const mockProduct: Product = {
                          id: 'kit-momentos-dois',
                          name: 'Kit Momentos a Dois Luxo',
                          description: 'Uma noite inesquecível em formato de presente.',
                          price: 299.90,
                          originalPrice: 399.90,
                          images: ['https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop'],
                          category: 'Romântico',
                          gender: 'unissex',
                          tags: ['romantico'],
                          stock: 24,
                          rating: 4.8,
                          reviewsCount: 88,
                          features: ['Espumante Premium Brut', 'Duas Taças de Cristal Bohemia', 'Chocolates Trufados Belgas', 'Vela Aromática'],
                          details: 'O Kit Momentos a Dois traz o cenário perfeito...'
                        };
                        addToCart(mockProduct, 1);
                      }}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Cart Summary & Checkout button */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-theme-border-faint bg-theme-border-faint space-y-4">
                
                {/* Promo Coupon Form */}
                {activeCoupon ? (
                  <div className="flex items-center justify-between bg-gold-600/10 border border-gold-500/25 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-gold-400 font-medium">
                      <Tag size={12} />
                      <span>{activeCoupon.code}</span>
                      <span className="text-[10px] bg-gold-500/20 px-1.5 py-0.5 rounded font-bold">
                        -{activeCoupon.type === 'percentage' ? `${activeCoupon.value}%` : formatCurrency(activeCoupon.value)}
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Cupom de desconto (ex: NAMORADOS10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={couponLoading}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </form>
                )}
                {couponError && <p className="text-[10px] text-rose-400 mt-1">{couponError}</p>}

                {/* Calculation Summary */}
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-white">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-gold-400">
                      <span className="flex items-center gap-1"><Percent size={12} /> Desconto</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span className="text-white font-medium">
                      {isFreeShipping ? <span className="text-gold-400 font-semibold">Grátis</span> : 'Calculado no Checkout'}
                    </span>
                  </div>
                  <div className="border-t border-theme-border-faint pt-3 flex justify-between text-sm font-bold text-white">
                    <span>Total Estimado</span>
                    <span className="text-gold-400 text-base">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckoutClick}
                  className="w-full bg-gradient-gold hover:shadow-lg text-gray-900 font-semibold tracking-widest uppercase py-3.5 rounded-lg text-xs transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Finalizar Compra</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default CartDrawer;
