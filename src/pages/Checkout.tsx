import React, { useState, useEffect, useCallback } from 'react';
import { useCart, ORDER_BUMP_PRODUCT, POST_PURCHASE_UPSELL_PRODUCT } from '../context/CartContext';
import { api } from '../lib/supabase';
import { tracking } from '../lib/tracking';
import { formatCurrency, formatCpf, formatPhone, formatCep, simulateShipping, ShippingOption, validateCpf } from '../lib/utils';
import { ShieldCheck, Truck, CreditCard, Tag, Sparkles, ChevronRight, Check, AlertCircle, ShoppingBag, ArrowLeft, Download, ExternalLink, Calendar, MessageCircle, Bitcoin, Copy, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentService } from '../lib/payments/PaymentService';
import { CryptoCurrency, PixResponse, BoletoResponse, CryptoResponse } from '../types/payments';
import { formatCountdown, secondsUntil } from '../lib/payments/utils';

export const Checkout: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const {
    cart,
    cartSubtotal,
    cartTotal,
    discountAmount,
    activeCoupon,
    orderBumpSelected,
    toggleOrderBump,
    captureLead,
    clearCart,
    lastCreatedOrderId,
    setLastCreatedOrderId
  } = useCart();

  const [step, setStep] = useState(1); // 1: Identificacao, 2: Endereco, 3: Pagamento, 4: Sucesso

  // Step 1 Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [step1Error, setStep1Error] = useState('');

  // Step 2 Form
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [shippingMethod, setShippingMethod] = useState<ShippingOption | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [step2Error, setStep2Error] = useState('');

  // Step 3 Payment Form
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'boleto' | 'crypto'>('pix');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardFocused, setCardFocused] = useState(false); // Virar para o CVV
  const [installments, setInstallments] = useState('1');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  // Crypto
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency>('BTC');
  // Payment result state
  const [pixResult, setPixResult] = useState<PixResponse | null>(null);
  const [boletoResult, setBoletoResult] = useState<BoletoResponse | null>(null);
  const [cryptoResult, setCryptoResult] = useState<CryptoResponse | null>(null);
  const [pixCountdown, setPixCountdown] = useState(0);
  const [pixPaid, setPixPaid] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  // Upsell & Success State
  const [showUpsell, setShowUpsell] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [pixTimeRemaining, setPixTimeRemaining] = useState(900); // 15 minutos em segundos

  // Disparar checkout pixel ao carregar
  useEffect(() => {
    if (cart.length > 0) {
      tracking.initiateCheckout(cart, cartTotal);
    }
  }, []);

  // Timer do Pix QR Code — agora baseado no expiresAt do PaymentService
  useEffect(() => {
    if (!pixResult) return;
    const secs = secondsUntil(pixResult.expiresAt);
    setPixCountdown(secs);
    if (secs <= 0) return;
    const timer = setInterval(() => {
      setPixCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pixResult]);

  // Polling de status do Pix a cada 5 segundos
  useEffect(() => {
    if (!pixResult || pixPaid || pixCountdown <= 0) return;
    const poll = setInterval(async () => {
      const status = await PaymentService.getStatus(pixResult.transactionId, pixResult.gateway);
      if (status?.status === 'paid') {
        setPixPaid(true);
        clearInterval(poll);
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [pixResult, pixPaid, pixCountdown]);

  // CEP Lookup Auto-complete
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = formatCep(e.target.value);
    setCep(value);

    const clean = value.replace(/\D/g, '');
    if (clean.length === 8) {
      setAddressLoading(true);
      setStep2Error('');
      
      // Simular chamada API Viacep
      setTimeout(() => {
        // Mock de bairros baseados em CEP fictício
        if (clean === '01311000' || clean.startsWith('013')) {
          setAddress('Avenida Paulista');
          setNeighborhood('Bela Vista');
          setCity('São Paulo');
          setState('SP');
        } else if (clean === '22021001' || clean.startsWith('220')) {
          setAddress('Avenida Atlântica');
          setNeighborhood('Copacabana');
          setCity('Rio de Janeiro');
          setState('RJ');
        } else {
          // Preencher campos padrão para o CEP digitado
          setAddress('Rua das Flores');
          setNeighborhood('Centro');
          setCity('São Paulo');
          setState('SP');
        }
        
        // Calcular opções de frete
        const options = simulateShipping(clean);
        setShippingOptions(options);
        setShippingMethod(options[1] || options[0]); // Seleciona o Sedex ou PAC padrão
        setAddressLoading(false);
      }, 800);
    }
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error('');

    if (!name || !email || !phone || !cpf) {
      setStep1Error('Por favor, preencha todos os campos.');
      return;
    }
    if (!validateCpf(cpf)) {
      setStep1Error('CPF inválido. Digite um CPF válido para emissão da nota fiscal.');
      return;
    }
    
    // Capturar Lead para recuperação de carrinho
    captureLead(name, email, phone);
    
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error('');

    if (!cep || !address || !number || !neighborhood || !city || !state || !shippingMethod) {
      setStep2Error('Por favor, preencha todos os campos do endereço e escolha o frete.');
      return;
    }

    setStep(3);
  };

  const handleConfirmOrder = async () => {
    setSubmittingPayment(true);
    setPaymentError('');

    const shipPrice = shippingMethod ? shippingMethod.price : 0;
    const finalTotal = cartTotal + (cartSubtotal >= 290 ? 0 : shipPrice);

    const items = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      image: item.product.images[0]
    }));

    const customerInfo = { name, email, cpf: cpf.replace(/\D/g, ''), phone };
    const addressInfo = { street: address, number, complement, neighborhood, city, state, zipCode: cep };

    try {
      // 1. Criar pedido no banco
      const order = await api.createOrder({
        customerName: name, customerEmail: email, customerPhone: phone, customerCpf: cpf,
        cep, address, number, complement, neighborhood, city, state,
        shippingMethod: shippingMethod ? shippingMethod.name : 'PAC',
        shippingPrice: cartSubtotal >= 290 ? 0 : shipPrice,
        paymentMethod,
        couponCode: activeCoupon?.code,
        items, subtotal: cartSubtotal, discount: discountAmount, total: finalTotal
      });

      setCreatedOrder(order);
      setLastCreatedOrderId(order.id);
      tracking.purchase(order.id, items, cartSubtotal, discountAmount, finalTotal);

      // 2. Processar pagamento via PaymentService (com fallback automático)
      if (paymentMethod === 'pix') {
        const result = await PaymentService.process({
          method: 'pix', orderId: order.id, amount: finalTotal,
          customer: customerInfo,
          description: `Pedido Amour & Co. #${order.id}`,
          expirationMinutes: 15,
        });
        if (result.success && result.result.method === 'pix') {
          setPixResult(result.result as PixResponse);
        }
      } else if (paymentMethod === 'card') {
        const result = await PaymentService.process({
          method: 'card', orderId: order.id, amount: finalTotal,
          installments: parseInt(installments),
          cardToken: `demo_token_${Date.now()}`, // Em produção: token do SDK do gateway
          customer: customerInfo,
        });
        if (!result.success) {
          setPaymentError(result.error);
          setSubmittingPayment(false);
          return;
        }
      } else if (paymentMethod === 'boleto') {
        const result = await PaymentService.process({
          method: 'boleto', orderId: order.id, amount: finalTotal,
          customer: customerInfo,
          address: addressInfo,
          expirationDays: 3,
        });
        if (result.success && result.result.method === 'boleto') {
          setBoletoResult(result.result as BoletoResponse);
        }
      } else if (paymentMethod === 'crypto') {
        const result = await PaymentService.process({
          method: 'crypto', orderId: order.id, amountBRL: finalTotal,
          currency: selectedCrypto,
          customerEmail: email,
        });
        if (result.success && result.result.method === 'crypto') {
          setCryptoResult(result.result as CryptoResponse);
        }
      }

      // 3. Upsell pós-compra (exceto para cripto — pagamento ainda pendente)
      const hasUpsellProduct = cart.some(item => item.product.id === POST_PURCHASE_UPSELL_PRODUCT.id);
      if (!hasUpsellProduct && paymentMethod === 'card') {
        setShowUpsell(true);
      } else {
        setStep(4);
        if (paymentMethod === 'card') clearCart();
      }

    } catch (err: any) {
      console.error(err);
      setPaymentError('Ocorreu um erro ao processar o pagamento. Tente novamente.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Aceitar Upsell Pós-compra
  const handleAcceptUpsell = async () => {
    if (!createdOrder) return;
    
    // Atualizar pedido original no localStorage / banco mock
    const orders = localStorage.getItem('amr_orders') ? JSON.parse(localStorage.getItem('amr_orders')!) : [];
    const idx = orders.findIndex((o: any) => o.id === createdOrder.id);
    
    if (idx !== -1) {
      const upsellItem = {
        productId: POST_PURCHASE_UPSELL_PRODUCT.id,
        name: POST_PURCHASE_UPSELL_PRODUCT.name,
        price: POST_PURCHASE_UPSELL_PRODUCT.price,
        quantity: 1,
        image: POST_PURCHASE_UPSELL_PRODUCT.images[0]
      };
      
      orders[idx].items.push(upsellItem);
      orders[idx].subtotal += POST_PURCHASE_UPSELL_PRODUCT.price;
      orders[idx].total += POST_PURCHASE_UPSELL_PRODUCT.price;
      
      localStorage.setItem('amr_orders', JSON.stringify(orders));
      setCreatedOrder(orders[idx]);

      console.log(
        '%c[Post-Purchase Upsell Accepted]',
        'color: #F43F5E; font-weight: bold; background-color: #121212; padding: 4px 8px; border-radius: 4px;',
        POST_PURCHASE_UPSELL_PRODUCT
      );
    }

    setShowUpsell(false);
    setStep(4);
    clearCart();
  };

  const handleDeclineUpsell = () => {
    setShowUpsell(false);
    setStep(4);
    clearCart();
  };

  // Frete final
  const currentShippingCost = cartSubtotal >= 290 ? 0 : (shippingMethod ? shippingMethod.price : 0);
  const checkoutFinalTotal = cartTotal + currentShippingCost;

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const CRYPTO_LABELS: Record<CryptoCurrency, string> = {
    BTC: '₿ Bitcoin', ETH: 'Ξ Ethereum', USDT_TRC20: '💚 USDT TRC20', USDT_ERC20: '🔵 USDT ERC20',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      
      {step < 4 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Multi-step checkout form */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Steps Progress Indicator */}
            <div className="flex items-center gap-2 bg-white/2 border border-white/5 p-4 rounded-xl text-xs font-semibold uppercase tracking-wider text-gray-500">
              <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-gold-400 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-gold-400 bg-gold-500/10 text-gold-400' : 'border-gray-600'}`}>1</span>
                Identificação
              </span>
              <ChevronRight size={14} className="text-gray-600" />
              <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-gold-400 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-gold-400 bg-gold-500/10 text-gold-400' : 'border-gray-600'}`}>2</span>
                Entrega
              </span>
              <ChevronRight size={14} className="text-gray-600" />
              <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-gold-400 font-bold' : ''}`}>
                <span className={`h-5 w-5 rounded-full flex items-center justify-center border ${step >= 3 ? 'border-gold-400 bg-gold-500/10 text-gold-400' : 'border-gray-600'}`}>3</span>
                Pagamento
              </span>
            </div>

            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="bg-luxury-gray border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="font-serif text-xl text-theme-text tracking-wider uppercase">Dados Pessoais</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Para emissão da nota fiscal e envio seguro</p>
                </div>
                
                {step1Error && (
                  <div className="bg-rose-500/10 border border-rose-500/35 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{step1Error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">E-mail</label>
                    <input
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">WhatsApp / Celular</label>
                    <input
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" /> Seus dados estão 100% protegidos
                  </span>
                  
                  <button
                    type="submit"
                    className="bg-gradient-gold text-luxury-black font-semibold text-xs tracking-widest uppercase px-8 py-3 rounded-lg hover:shadow-lg transition cursor-pointer"
                  >
                    Seguir para Entrega
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Address Info & Shipping */}
            {step === 2 && (
              <form onSubmit={handleNextStep2} className="bg-luxury-gray border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="space-y-1 flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-xl text-theme-text tracking-wider uppercase">Endereço de Entrega</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Selecione onde deseja receber seus presentes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[10px] text-gray-500 hover:text-theme-text uppercase font-bold"
                  >
                    Voltar
                  </button>
                </div>

                {step2Error && (
                  <div className="bg-rose-500/10 border border-rose-500/35 text-rose-400 text-xs p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{step2Error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={handleCepChange}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Logradouro</label>
                    <input
                      type="text"
                      placeholder="Av, Rua, Travessa..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      disabled={addressLoading}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 100"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Complemento / Referência</label>
                    <input
                      type="text"
                      placeholder="Apto, bloco, portão (Opcional)"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Bairro</label>
                    <input
                      type="text"
                      placeholder="Seu bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      disabled={addressLoading}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Cidade</label>
                    <input
                      type="text"
                      placeholder="Sua cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={addressLoading}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">UF</label>
                    <input
                      type="text"
                      placeholder="SP"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled={addressLoading}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2.5 text-xs text-theme-text text-center focus:outline-none focus:border-gold-500 transition disabled:opacity-50"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

                {/* Shipping Providers */}
                {shippingOptions.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Opção de Envio</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {shippingOptions.map((opt) => {
                        const finalPrice = cartSubtotal >= 290 ? 0 : opt.price;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setShippingMethod(opt)}
                            className={`border rounded-xl p-4 cursor-pointer transition flex flex-col justify-between h-24 ${
                              shippingMethod?.id === opt.id
                                ? 'border-gold-500 bg-gold-500/10'
                                : 'border-theme-border hover:border-white/30 bg-white/2'
                            }`}
                          >
                            <div>
                              <span className="text-[10px] uppercase font-bold text-theme-text block">{opt.name}</span>
                              <span className="text-[9px] text-gray-500 mt-0.5 block">Entrega em {opt.deliveryDays} dia{opt.deliveryDays !== 1 && 's'}</span>
                            </div>
                            <span className="text-xs font-bold text-gold-400 mt-2 block">
                              {finalPrice === 0 ? 'Frete Grátis' : formatCurrency(finalPrice)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-gradient-gold text-luxury-black font-semibold text-xs tracking-widest uppercase px-8 py-3 rounded-lg hover:shadow-lg transition cursor-pointer"
                  >
                    Ir para Pagamento
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Secure Payment Gateways */}
            {step === 3 && (
              <div className="bg-luxury-gray border border-white/5 rounded-2xl p-6 sm:p-8 space-y-6">
                
                <div className="space-y-1 flex justify-between items-center">
                  <div>
                    <h3 className="font-serif text-xl text-theme-text tracking-wider uppercase">Método de Pagamento</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ambiente 100% criptografado e seguro</p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="text-[10px] text-gray-500 hover:text-theme-text uppercase font-bold"
                  >
                    Voltar
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap border border-theme-border rounded-xl overflow-hidden text-xs">
                  {(['pix', 'card', 'boleto', 'crypto'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-3 font-semibold text-center uppercase tracking-wider transition text-[10px] ${
                        paymentMethod === m ? 'bg-gold-500/20 text-gold-400' : 'bg-white/2 hover:bg-theme-border-faint text-theme-muted'
                      }`}
                    >
                      {m === 'pix' ? '⚡ Pix (10% off)'
                       : m === 'card' ? '💳 Cartão'
                       : m === 'boleto' ? '📄 Boleto'
                       : '₿ Cripto'}
                    </button>
                  ))}
                </div>

                {/* Pix */}
                {paymentMethod === 'pix' && (
                  <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-4 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Zap size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">Aprovação Instantânea via Pix</h4>
                      <p className="text-[10px] text-theme-muted max-w-sm mx-auto leading-relaxed">
                        Pague com Pix e garanta aprovação imediata. Ganhe <span className="text-emerald-400 font-bold">10% de desconto</span> automático.
                        O QR Code será gerado após confirmar o pedido.
                      </p>
                    </div>
                  </div>
                )}

                {/* Boleto */}
                {paymentMethod === 'boleto' && (
                  <div className="bg-white/2 border border-white/5 rounded-xl p-5 space-y-4 text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-gold-600/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                      <Download size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-theme-text uppercase tracking-wider">Boleto Bancário</h4>
                      <p className="text-[10px] text-theme-muted max-w-sm mx-auto leading-relaxed">
                        O boleto será gerado após a confirmação do pedido. Prazo de compensação bancária de 1 a 2 dias úteis.
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
                    
                    {/* Interactive Credit Card Widget */}
                    <div className="perspective-1000 flex justify-center">
                      <motion.div
                        animate={{ rotateY: cardFocused ? 180 : 0 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                        className="w-72 h-44 bg-gradient-to-br from-neutral-800 via-neutral-900 to-zinc-800 border border-theme-border rounded-2xl p-5 shadow-2xl relative preserve-3d transform-style text-theme-text text-xs font-mono"
                      >
                        {/* Front Side */}
                        <div className="absolute inset-0 p-5 flex flex-col justify-between backface-hidden">
                          <div className="flex justify-between items-start">
                            <div className="h-8 w-11 bg-gold-500/20 border border-gold-500/20 rounded-md" /> {/* chip */}
                            <span className="font-serif italic font-bold tracking-widest text-[11px] text-gradient-gold">AMOUR</span>
                          </div>
                          
                          <div className="text-sm tracking-[0.2em] font-semibold py-2">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </div>

                          <div className="flex justify-between items-end uppercase text-[9px] tracking-wider text-theme-muted">
                            <div>
                              <span className="block text-[7px] text-gray-500">Nome do Titular</span>
                              <span className="block text-theme-text truncate max-w-[120px] font-sans">{cardName || 'NOME DO TITULAR'}</span>
                            </div>
                            <div>
                              <span className="block text-[7px] text-gray-500 text-right">Validade</span>
                              <span className="block text-theme-text font-sans">{cardExpiry || 'MM/AA'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className="absolute inset-0 p-5 flex flex-col justify-between backface-hidden rotate-y-180">
                          <div className="w-full h-8 bg-black -mx-5 mt-1" />
                          
                          <div className="space-y-1 text-right mt-2">
                            <span className="text-[7px] text-gray-500 block mr-2">CVV</span>
                            <div className="bg-white/10 rounded px-2.5 py-1 text-[10px] text-theme-text font-bold inline-block border border-white/5 mr-1 font-sans">
                              {cardCvv || '•••'}
                            </div>
                          </div>

                          <div className="text-[7px] text-gray-500 leading-normal">
                            🔒 Assinatura autorizada Amour & Co. Presentes Finos.
                          </div>
                        </div>

                      </motion.div>
                    </div>

                    {/* Card input forms */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Número do Cartão</label>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19))}
                          className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome Impresso no Cartão</label>
                        <input
                          type="text"
                          placeholder="Como está gravado no cartão"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Validade</label>
                          <input
                            type="text"
                            placeholder="MM/AA"
                            value={cardExpiry}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '');
                              setCardExpiry(v.length >= 2 ? `${v.substring(0, 2)}/${v.substring(2, 4)}` : v);
                            }}
                            className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2 text-xs text-theme-text text-center focus:outline-none focus:border-gold-500 transition"
                            maxLength={5}
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">CVV</label>
                          <input
                            type="text"
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            onFocus={() => setCardFocused(true)}
                            onBlur={() => setCardFocused(false)}
                            className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-4 py-2 text-xs text-theme-text text-center focus:outline-none focus:border-gold-500 transition"
                            maxLength={4}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Parcelamento</label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                            const val = checkoutFinalTotal / num;
                            return (
                              <option key={num} value={num}>
                                {num}x de {formatCurrency(val)} sem juros
                              </option>
                            );
                          })}
                        </select>
                      </div>

                    </div>

                  </div>
                )}

                {/* Final Submit action */}
                <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] text-gray-500 flex items-center gap-1.5">
                    🔒 Segurança SSL de nível bancário ativa
                  </span>
                  
                  <button
                    onClick={handleConfirmOrder}
                    disabled={submittingPayment}
                    className="w-full sm:w-auto bg-gradient-gold hover:shadow-lg text-luxury-black font-semibold text-xs tracking-widest uppercase px-8 py-3.5 rounded-lg transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{submittingPayment ? 'Processando...' : 'Confirmar Pedido'}</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Right Side: Fixed Order Summary & Bumps */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Summary Box */}
            <div className="bg-luxury-gray border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="font-serif text-base text-theme-text tracking-wider uppercase border-b border-white/5 pb-2.5">
                Resumo do Pedido
              </h3>
              
              {/* Product Lines */}
              <div className="divide-y divide-white/5 space-y-3 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {cart.map((item, idx) => (
                  <div key={`${item.product.id}-${idx}`} className="flex gap-3.5 items-center pt-3 first:pt-0">
                    <img src={item.product.images[0]} alt="" className="w-12 h-12 object-cover rounded-lg bg-theme-border-faint border border-white/5" />
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-semibold text-theme-text truncate">{item.product.name}</h4>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                        <span>Quant: {item.quantity} {item.selectedSize && `• Tam: ${item.selectedSize}`}</span>
                        <span className="font-semibold text-gray-300">{formatCurrency(item.product.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Advanced Coupon Tag inside Checkout */}
              {activeCoupon && (
                <div className="flex items-center justify-between bg-gold-600/10 border border-gold-500/25 px-3 py-1.5 rounded-lg text-[10px] text-gold-400 font-semibold">
                  <span className="flex items-center gap-1"><Tag size={10} /> {activeCoupon.code}</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {/* Order Bump inline checkout toggle */}
              {!orderBumpSelected && (
                <div className="border border-dashed border-gold-500/25 p-3 rounded-xl flex gap-2.5 items-start bg-gold-500/5">
                  <input
                    type="checkbox"
                    checked={orderBumpSelected}
                    onChange={toggleOrderBump}
                    id="checkout-bump"
                    className="mt-0.5 accent-gold-500 rounded cursor-pointer"
                  />
                  <label htmlFor="checkout-bump" className="text-[10px] cursor-pointer select-none leading-relaxed text-theme-muted">
                    <span className="text-theme-text font-semibold flex items-center gap-1"><Sparkles size={10} className="text-gold-400" /> Adicionar Embalagem de Luxo?</span>
                    Caixa de veludo com aroma baunilha e cartão personalizado por + <span className="text-gold-400 font-bold">{formatCurrency(ORDER_BUMP_PRODUCT.price)}</span>.
                  </label>
                </div>
              )}

              {/* Totals Table */}
              <div className="border-t border-white/5 pt-4 space-y-2 text-xs text-theme-muted">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-theme-text">{formatCurrency(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-gold-400">
                    <span>Desconto</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Envio estimado</span>
                  <span className="text-theme-text">
                    {cartSubtotal >= 290 
                      ? <span className="text-gold-400 font-semibold">Grátis</span> 
                      : (shippingMethod ? formatCurrency(shippingMethod.price) : 'A calcular')
                    }
                  </span>
                </div>
                
                {paymentMethod === 'pix' && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Desconto Pix 10%</span>
                    <span>-{formatCurrency(checkoutFinalTotal * 0.1)}</span>
                  </div>
                )}

                <div className="border-t border-white/5 pt-3 flex justify-between text-sm font-bold text-theme-text">
                  <span>Total</span>
                  <span className="text-gold-400 text-base">
                    {formatCurrency(paymentMethod === 'pix' ? checkoutFinalTotal * 0.9 : checkoutFinalTotal)}
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* SUCCESS PAGE SECTION (Post Checkout) */
        <div className="max-w-xl mx-auto bg-luxury-gray border border-gold-500/20 rounded-3xl p-8 sm:p-10 text-center space-y-8 glow-gold relative overflow-hidden">
          {/* Confetti simulation overlay */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-gold" />
          
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-600/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
            <Check size={24} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-gold-400">Pedido Recebido com Sucesso</span>
            <h2 className="font-serif text-2xl sm:text-3xl text-theme-text tracking-wide">Obrigado pela sua compra!</h2>
            <p className="text-xs text-theme-muted max-w-sm mx-auto">
              Nossa equipe de concierge já foi notificada e está iniciando a preparação meticulosa do seu presente.
            </p>
          </div>

          {/* Details wrapper */}
          <div className="bg-white/2 border border-white/5 rounded-2xl p-5 text-left space-y-4">
            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2.5">
              <span className="text-gray-500">Código do Pedido</span>
              <span className="text-theme-text font-mono font-bold">{createdOrder?.id}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2.5">
              <span className="text-gray-500">Destinatário</span>
              <span className="text-theme-text font-medium">{createdOrder?.customerName}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Previsão de Entrega</span>
              <span className="text-gold-400 font-semibold flex items-center gap-1.5">
                <Calendar size={12} /> {createdOrder?.shippingMethod.includes('SEDEX') ? '1 a 3 dias úteis' : '4 a 7 dias úteis'}
              </span>
            </div>
          </div>

          {/* PIX QR CODE BLOCK */}
          {paymentMethod === 'pix' && pixResult && (
            <div className="bg-theme-border-faint border border-gold-500/20 rounded-2xl p-6 space-y-4 flex flex-col items-center">
              {pixPaid ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Pix Confirmado!</p>
                  <p className="text-[10px] text-theme-muted">Seu pagamento foi aprovado. Seu presente já está sendo preparado. 💛</p>
                </div>
              ) : (
                <>
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Pague com Pix · {pixResult.isDemo && <span className="text-amber-400">MODO DEMO</span>}</span>
                  <div className="h-44 w-44 bg-white p-2 rounded-xl shadow-lg">
                    <img src={pixResult.qrCodeImage} alt="QR Code Pix" className="h-full w-full object-contain" />
                  </div>
                  <div className="text-[11px] text-theme-muted font-medium flex items-center gap-1.5">
                    <RefreshCw size={10} className="text-gold-400 animate-spin" />
                    Expira em: <span className="text-gold-400 font-bold">{formatCountdown(pixCountdown)}</span>
                  </div>
                  <div className="w-full flex gap-1.5">
                    <input type="text" readOnly value={pixResult.copyPaste}
                      className="flex-1 bg-luxury-black border border-theme-border rounded-lg px-3 py-2 text-[9px] text-theme-muted font-mono focus:outline-none truncate" />
                    <button
                      onClick={() => copyToClipboard(pixResult.copyPaste, setCopiedPix)}
                      className="bg-gradient-gold text-luxury-black font-semibold text-[10px] px-4 py-2 rounded-lg hover:shadow-lg transition cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      {copiedPix ? <><Check size={10} /> Copiado!</> : <><Copy size={10} /> Copiar</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* BOLETO BLOCK */}
          {paymentMethod === 'boleto' && boletoResult && (
            <div className="bg-theme-border-faint border border-gold-500/20 rounded-2xl p-6 space-y-4">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block text-center">
                Boleto Gerado · {boletoResult.isDemo && <span className="text-amber-400">MODO DEMO</span>}
              </span>
              <div className="space-y-2">
                <p className="text-[9px] uppercase text-gray-600">Linha Digitável</p>
                <div className="flex gap-1.5">
                  <input type="text" readOnly value={boletoResult.barcode}
                    className="flex-1 bg-luxury-black border border-theme-border rounded-lg px-3 py-2 text-[9px] text-theme-muted font-mono focus:outline-none truncate" />
                  <button
                    onClick={() => copyToClipboard(boletoResult.barcode, setCopiedBarcode)}
                    className="bg-gradient-gold text-luxury-black font-semibold text-[10px] px-3 py-2 rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    {copiedBarcode ? <><Check size={10} /> Copiado!</> : <><Copy size={10} /></>}
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-gray-500 text-center">
                Vencimento: {new Date(boletoResult.expiresAt).toLocaleDateString('pt-BR')} · Pague em qualquer banco
              </p>
              {boletoResult.pdfUrl && (
                <a href={boletoResult.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-theme-border py-2.5 rounded-lg text-[10px] text-theme-muted hover:text-theme-text hover:border-white/20 transition"
                >
                  <Download size={12} /> Baixar PDF do Boleto
                </a>
              )}
            </div>
          )}

          {/* CRYPTO BLOCK */}
          {paymentMethod === 'crypto' && cryptoResult && (
            <div className="bg-theme-border-faint border border-orange-500/20 rounded-2xl p-6 space-y-4 flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-orange-400 font-bold">
                {CRYPTO_LABELS[cryptoResult.currency]} · {cryptoResult.isDemo ? 'Endereço Demo' : 'Pagamento Cripto'}
              </span>
              <div className="h-40 w-40 bg-white p-2 rounded-xl shadow-lg">
                <img src={cryptoResult.qrCodeImage} alt="Carteira Crypto" className="h-full w-full object-contain" />
              </div>
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold text-theme-text text-center">
                  Enviar exatamente: <span className="text-orange-400">{cryptoResult.cryptoAmount} {cryptoResult.currency.replace('_', ' ')}</span>
                </p>
                <div className="flex gap-1.5">
                  <input type="text" readOnly value={cryptoResult.walletAddress}
                    className="flex-1 bg-luxury-black border border-theme-border rounded-lg px-3 py-2 text-[9px] text-theme-muted font-mono focus:outline-none truncate" />
                  <button
                    onClick={() => copyToClipboard(cryptoResult.walletAddress, (v) => setCopiedPix(v))}
                    className="bg-orange-500/80 text-theme-text font-semibold text-[10px] px-3 py-2 rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    {copiedPix ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-gray-500">
                Taxa: {cryptoResult.exchangeRate.toLocaleString('pt-BR')} BRL/{cryptoResult.currency.replace('_', ' ')} · Válido por 60 min
              </p>
            </div>
          )}

          {/* WhatsApp concierge notification link */}
          <div className="space-y-4 pt-2">
            <button
              onClick={() => {
                const text = `Olá! Gostaria de confirmar o pagamento do meu pedido "${createdOrder?.id}" realizado na Amour & Co. no valor de ${formatCurrency(createdOrder?.total)}.`;
                window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 border border-emerald-500/20 py-3 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition cursor-pointer"
            >
              <MessageCircle size={16} />
              <span>Confirmar Pagamento no WhatsApp</span>
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="text-xs text-gray-500 hover:text-theme-text uppercase font-bold tracking-wider block mx-auto transition"
            >
              Voltar para a Loja
            </button>
          </div>

        </div>
      )}

      {/* POST-PURCHASE UPSELL MODAL DIALOG */}
      <AnimatePresence>
        {showUpsell && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative w-full max-w-lg bg-luxury-gray border border-gold-500/20 rounded-3xl p-8 shadow-2xl text-center space-y-6 glow-gold overflow-hidden"
            >
              {/* Top luxury badge */}
              <div className="mx-auto inline-flex items-center gap-1 px-3 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-[9px] uppercase tracking-widest font-extrabold text-rose-400 animate-pulse">
                🔥 Oferta Única e Exclusiva Pós-Compra
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl text-theme-text tracking-wide">
                  Complete seu presente pela metade do preço!
                </h3>
                <p className="text-xs text-theme-muted leading-relaxed max-w-sm mx-auto">
                  Como agradecimento pelo seu pedido, adicione o <span className="text-theme-text font-bold">{POST_PURCHASE_UPSELL_PRODUCT.name}</span> ao seu pacote com <span className="text-gold-400 font-bold">50% de Desconto</span>.
                </p>
              </div>

              {/* Product Showcase */}
              <div className="bg-white/2 border border-white/5 rounded-2xl p-4 flex gap-4 items-center text-left">
                <img
                  src={POST_PURCHASE_UPSELL_PRODUCT.images[0]}
                  alt={POST_PURCHASE_UPSELL_PRODUCT.name}
                  className="w-20 h-20 object-cover rounded-xl bg-theme-border-faint border border-white/5"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-theme-text truncate">{POST_PURCHASE_UPSELL_PRODUCT.name}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mt-1 leading-snug">
                    {POST_PURCHASE_UPSELL_PRODUCT.description}
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-[10px] text-gray-500 line-through">
                      {formatCurrency(POST_PURCHASE_UPSELL_PRODUCT.originalPrice)}
                    </span>
                    <span className="text-xs font-bold text-gold-400">
                      {formatCurrency(POST_PURCHASE_UPSELL_PRODUCT.price)}
                    </span>
                    <span className="text-[8px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-extrabold uppercase">
                      50% OFF
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleAcceptUpsell}
                  className="w-full bg-gradient-gold text-luxury-black font-semibold tracking-widest uppercase py-3.5 rounded-lg text-xs hover:shadow-lg transition duration-300 cursor-pointer"
                >
                  Sim! Adicionar ao meu Pedido
                </button>
                <button
                  onClick={handleDeclineUpsell}
                  className="w-full text-xs text-gray-500 hover:text-theme-text uppercase font-bold tracking-wider py-2 transition cursor-pointer"
                >
                  Não, obrigado. Quero concluir sem o colar
                </button>
              </div>

              <div className="text-[9px] text-gray-600">
                ⚠️ Essa oferta não aparecerá novamente. O item será empacotado na mesma embalagem de envio.
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
export default Checkout;
