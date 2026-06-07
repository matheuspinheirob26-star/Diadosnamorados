// Utilitário de rastreamento para Pixels de Marketing (Meta, GA4, GTM, TikTok, Google Ads)

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string; // Google Click ID
}

// Capturar parâmetros UTM da URL e salvar no LocalStorage
export const captureUTMParameters = () => {
  if (typeof window === 'undefined') return;
  
  const searchParams = new URLSearchParams(window.location.search);
  const utms: UTMParams = {};
  
  const keys: (keyof UTMParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  
  let hasUtm = false;
  keys.forEach(key => {
    const val = searchParams.get(key);
    if (val) {
      utms[key] = val;
      hasUtm = true;
    }
  });

  if (hasUtm) {
    // Adicionar timestamp de captura
    const dataToStore = {
      ...utms,
      capturedAt: new Date().toISOString()
    };
    localStorage.setItem('amr_utm_session', JSON.stringify(dataToStore));
    
    console.log(
      '%c[Marketing UTM Captured]',
      'color: #D4AF37; font-weight: bold; background-color: #121212; padding: 4px 8px; border-radius: 4px;',
      dataToStore
    );
  }
};

// Obter as UTMs salvas da sessão
export const getStoredUTMs = (): UTMParams | null => {
  const stored = localStorage.getItem('amr_utm_session');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UTMParams;
  } catch {
    return null;
  }
};

// Funções de disparo de eventos de Pixel
export const tracking = {
  // PageView
  pageView: (url: string) => {
    console.log(
      `%c[Pixel: PageView] %cNavigou para: ${url}`,
      'color: #4ADE80; font-weight: bold;',
      'color: #F3F4F6;'
    );
    // Exemplo de integração futura:
    // if (typeof window.fbq !== 'undefined') window.fbq('track', 'PageView');
    // if (typeof window.gtag !== 'undefined') window.gtag('event', 'page_view', { page_path: url });
  },

  // ViewContent (Visualização de Produto)
  viewContent: (id: string, name: string, price: number, currency = 'BRL') => {
    console.log(
      `%c[Pixel: ViewContent] %cVisualizou Produto: ${name} (${id}) - R$ ${price.toFixed(2)}`,
      'color: #60A5FA; font-weight: bold;',
      'color: #F3F4F6;'
    );
    
    // push to DataLayer
    if (typeof window !== 'undefined') {
      const dataLayer = (window as any).dataLayer || [];
      dataLayer.push({
        event: 'view_item',
        ecommerce: {
          currency,
          value: price,
          items: [{ item_id: id, item_name: name, price }]
        }
      });
      (window as any).dataLayer = dataLayer;
    }
  },

  // AddToCart (Adicionar ao Carrinho)
  addToCart: (id: string, name: string, price: number, quantity: number, currency = 'BRL') => {
    console.log(
      `%c[Pixel: AddToCart] %cAdicionado ao Carrinho: ${name} (x${quantity}) - R$ ${(price * quantity).toFixed(2)}`,
      'color: #FBBF24; font-weight: bold;',
      'color: #F3F4F6;'
    );
    
    if (typeof window !== 'undefined') {
      const dataLayer = (window as any).dataLayer || [];
      dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency,
          value: price * quantity,
          items: [{ item_id: id, item_name: name, price, quantity }]
        }
      });
      (window as any).dataLayer = dataLayer;
    }
  },

  // InitiateCheckout (Início do Checkout)
  initiateCheckout: (items: any[], totalValue: number, currency = 'BRL') => {
    console.log(
      `%c[Pixel: InitiateCheckout] %cIniciou Checkout com ${items.length} itens. Valor Total: R$ ${totalValue.toFixed(2)}`,
      'color: #A78BFA; font-weight: bold;',
      'color: #F3F4F6;'
    );
    
    if (typeof window !== 'undefined') {
      const dataLayer = (window as any).dataLayer || [];
      dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency,
          value: totalValue,
          items: items.map(item => ({
            item_id: item.product.id,
            item_name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          }))
        }
      });
      (window as any).dataLayer = dataLayer;
    }
  },

  // Purchase (Compra Concluída)
  purchase: (orderId: string, items: any[], subtotal: number, discount: number, totalValue: number, currency = 'BRL') => {
    const utms = getStoredUTMs() || {};
    
    console.log(
      `%c[Pixel: Purchase] %cCompra Concluída! Pedido: ${orderId}. Total: R$ ${totalValue.toFixed(2)}`,
      'color: #F43F5E; font-weight: bold; background-color: #1E1E1E; padding: 4px 8px; border-radius: 4px;',
      {
        orderId,
        items,
        totalValue,
        discount,
        utms
      }
    );
    
    if (typeof window !== 'undefined') {
      const dataLayer = (window as any).dataLayer || [];
      dataLayer.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: orderId,
          value: totalValue,
          tax: 0,
          shipping: totalValue - subtotal + discount,
          currency,
          coupon: items[0]?.couponCode || '',
          items: items.map(item => ({
            item_id: item.productId,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          attribution: utms
        }
      });
      (window as any).dataLayer = dataLayer;
    }
  }
};
