import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Coupon, Lead } from '../types';
import { api } from '../lib/supabase';
import { tracking } from '../lib/tracking';

// Produto fixo de Order Bump
export const ORDER_BUMP_PRODUCT: Product = {
  id: 'order-bump-embalagem',
  name: 'Caixa de Veludo Perfumada + Cartão Dedicatório Luxo',
  description: 'Adicione uma embalagem premium de veludo borrifada com essência artesanal de baunilha e um cartão impresso em papel linho com sua mensagem personalizada.',
  price: 14.90,
  originalPrice: 29.90,
  images: ['https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=200&auto=format&fit=crop'],
  category: 'Acessórios',
  gender: 'unissex',
  tags: ['order-bump'],
  stock: 999,
  rating: 4.9,
  reviewsCount: 1400,
  features: ['Caixa de veludo com fecho magnético', 'Fragrância exclusiva', 'Cartão personalizado impresso em linho'],
  details: 'Dê um toque de exclusividade extrema ao seu presente.'
};

// Produto fixo de Upsell Pós-Compra
export const POST_PURCHASE_UPSELL_PRODUCT: Product = {
  id: 'upsell-joia-prata',
  name: 'Colar Gargantilha Coração em Prata 925',
  description: 'Leve este colar de prata legítima 925 com pingente de zircônia em formato de coração pela metade do preço para complementar seu presente.',
  price: 59.90,
  originalPrice: 119.90,
  images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=300&auto=format&fit=crop'],
  category: 'Feminino',
  gender: 'feminino',
  tags: ['upsell'],
  stock: 50,
  rating: 4.8,
  reviewsCount: 312,
  features: ['Prata 925 legítima', 'Pingente zircônia 6mm', 'Corrente veneziana de 45cm', 'Estojo de veludo incluso'],
  details: 'Oferta pós-compra única.'
};

interface CartContextProps {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedVariations?: Record<string, string>) => void;
  removeFromCart: (productId: string, size?: string, variationKey?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, variationKey?: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotal: number;
  freeShippingThreshold: number;
  isFreeShipping: boolean;
  freeShippingRemaining: number;
  orderBumpSelected: boolean;
  toggleOrderBump: () => void;
  activeCoupon: Coupon | null;
  couponError: string | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  discountAmount: number;
  leadCaptured: Lead | null;
  captureLead: (name: string, email: string, phone: string) => Promise<void>;
  // Upsell
  upsellProduct: Product;
  lastCreatedOrderId: string | null;
  setLastCreatedOrderId: (id: string | null) => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('amr_cart');
    return stored ? JSON.parse(stored) : [];
  });

  const [orderBumpSelected, setOrderBumpSelected] = useState<boolean>(() => {
    const stored = localStorage.getItem('amr_order_bump_active');
    return stored === 'true';
  });

  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(() => {
    const stored = localStorage.getItem('amr_active_coupon');
    return stored ? JSON.parse(stored) : null;
  });

  const [leadCaptured, setLeadCaptured] = useState<Lead | null>(() => {
    const stored = localStorage.getItem('amr_lead_captured');
    return stored ? JSON.parse(stored) : null;
  });

  const [couponError, setCouponError] = useState<string | null>(null);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);

  const freeShippingThreshold = 290.00;

  // Persistir carrinho
  useEffect(() => {
    localStorage.setItem('amr_cart', JSON.stringify(cart));
  }, [cart]);

  // Persistir status do order bump
  useEffect(() => {
    localStorage.setItem('amr_order_bump_active', String(orderBumpSelected));
  }, [orderBumpSelected]);

  // Helper: calcular preço efetivo de um item (base + acréscimos de variações)
  const calcItemPrice = (item: CartItem): number => {
    let price = item.product.price;
    if (item.selectedVariations && item.product.variations) {
      Object.values(item.selectedVariations).forEach(varId => {
        const variation = item.product.variations!.find(v => v.id === varId);
        if (variation && variation.active) {
          price += variation.priceAddition;
        }
      });
    }
    return price;
  };

  // Subtotal sem frete ou cupons
  const cartSubtotal = cart.reduce((acc, item) => acc + calcItemPrice(item) * item.quantity, 0);

  // Frete grátis
  const isFreeShipping = cartSubtotal >= freeShippingThreshold;
  const freeShippingRemaining = Math.max(0, freeShippingThreshold - cartSubtotal);

  // Cálculo de Desconto
  const discountAmount = activeCoupon
    ? activeCoupon.type === 'percentage'
      ? cartSubtotal * (activeCoupon.value / 100)
      : activeCoupon.value
    : 0;

  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  // Helper: gerar chave única para combinar produto + tamanho + variações
  const makeItemKey = (productId: string, selectedSize?: string, selectedVariations?: Record<string, string>) => {
    const varKey = selectedVariations ? JSON.stringify(Object.entries(selectedVariations).sort()) : '';
    return `${productId}__${selectedSize ?? ''}__${varKey}`;
  };

  // Adicionar ao Carrinho
  const addToCart = (product: Product, quantity = 1, selectedSize?: string, selectedVariations?: Record<string, string>) => {
    setCart(prevCart => {
      const key = makeItemKey(product.id, selectedSize, selectedVariations);
      const existingIdx = prevCart.findIndex(
        item => makeItemKey(item.product.id, item.selectedSize, item.selectedVariations) === key
      );

      let newCart = [...prevCart];
      if (existingIdx !== -1) {
        newCart[existingIdx].quantity += quantity;
      } else {
        newCart.push({ product, quantity, selectedSize, selectedVariations });
      }

      tracking.addToCart(product.id, product.name, product.price, quantity);
      return newCart;
    });
  };

  // Remover do Carrinho
  const removeFromCart = (productId: string, size?: string, variationKey?: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => {
        const key = makeItemKey(item.product.id, item.selectedSize, item.selectedVariations);
        const targetKey = variationKey ?? makeItemKey(productId, size, undefined);
        if (variationKey) {
          return key !== variationKey;
        }
        return !(item.product.id === productId && item.selectedSize === size && !item.selectedVariations);
      });
      if (productId === ORDER_BUMP_PRODUCT.id) {
        setOrderBumpSelected(false);
      }
      return newCart;
    });
  };

  // Atualizar Quantidade
  const updateQuantity = (productId: string, quantity: number, size?: string, variationKey?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, variationKey);
      return;
    }
    setCart(prevCart => {
      const idx = prevCart.findIndex(item => {
        if (variationKey) {
          return makeItemKey(item.product.id, item.selectedSize, item.selectedVariations) === variationKey;
        }
        return item.product.id === productId && item.selectedSize === size && !item.selectedVariations;
      });
      if (idx !== -1) {
        const newCart = [...prevCart];
        newCart[idx].quantity = quantity;
        return newCart;
      }
      return prevCart;
    });
  };

  // Limpar Carrinho
  const clearCart = () => {
    setCart([]);
    setOrderBumpSelected(false);
    setActiveCoupon(null);
    setLastCreatedOrderId(null);
    localStorage.removeItem('amr_active_coupon');
    localStorage.removeItem('amr_order_bump_active');
  };

  // Gerenciar Order Bump
  const toggleOrderBump = () => {
    setOrderBumpSelected(prev => {
      const nextState = !prev;
      if (nextState) {
        // Adiciona o produto do order bump
        addToCart(ORDER_BUMP_PRODUCT, 1);
      } else {
        // Remove o produto do order bump
        removeFromCart(ORDER_BUMP_PRODUCT.id);
      }
      return nextState;
    });
  };

  // Aplicar Cupom
  const applyCoupon = async (code: string): Promise<boolean> => {
    setCouponError(null);
    try {
      const res = await api.validateCoupon(code, cartSubtotal);
      if (res.isValid && res.coupon) {
        setActiveCoupon(res.coupon);
        localStorage.setItem('amr_active_coupon', JSON.stringify(res.coupon));
        return true;
      } else {
        setCouponError(res.message);
        return false;
      }
    } catch {
      setCouponError('Erro ao validar o cupom.');
      return false;
    }
  };

  // Remover Cupom
  const removeCoupon = () => {
    setActiveCoupon(null);
    setCouponError(null);
    localStorage.removeItem('amr_active_coupon');
  };

  // Capturar Lead em tempo real (Checkout Passo 1)
  const captureLead = async (name: string, email: string, phone: string) => {
    const leadItems = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize
    }));

    try {
      const lead = await api.createLead({
        name,
        email,
        phone,
        cartItems: leadItems
      });
      setLeadCaptured(lead);
      localStorage.setItem('amr_lead_captured', JSON.stringify(lead));
      
      console.log(
        '%c[Checkout Lead Captured]',
        'color: #A78BFA; font-weight: bold; background-color: #1A1A1A; padding: 4px 8px; border-radius: 4px;',
        lead
      );
    } catch (err) {
      console.error('Falha ao capturar lead:', err);
    }
  };

  // Atualizar itens do lead quando o carrinho mudar e houver lead ativo
  useEffect(() => {
    if (leadCaptured && cart.length > 0) {
      captureLead(leadCaptured.name, leadCaptured.email, leadCaptured.phone);
    }
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
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
        discountAmount,
        leadCaptured,
        captureLead,
        upsellProduct: POST_PURCHASE_UPSELL_PRODUCT,
        lastCreatedOrderId,
        setLastCreatedOrderId
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser utilizado sob um CartProvider');
  }
  return context;
};
