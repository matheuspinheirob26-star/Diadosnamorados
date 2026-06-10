import React, { useState, useEffect } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';

interface NotificationItem {
  id: number;
  name: string;
  city: string;
  state: string;
  product: string;
  price: number;
  time: string;
}

const PURCHASE_ALERTS: NotificationItem[] = [
  { id: 1, name: 'Juliana S.', city: 'São Paulo', state: 'SP', product: 'Kit Especial Dia dos Namorados Premium', price: 449.90, time: 'há 2 minutos' },
  { id: 2, name: 'Ricardo M.', city: 'Rio de Janeiro', state: 'RJ', product: 'Relógio Chronographe Imperial', price: 849.90, time: 'há 5 minutos' },
  { id: 3, name: 'Gabriela C.', city: 'Belo Horizonte', state: 'MG', product: 'Kit Momentos a Dois Luxo', price: 299.90, time: 'há 1 minuto' },
  { id: 4, name: 'Bruno F.', city: 'Curitiba', state: 'PR', product: 'Perfume Aurum Gold Parfum', price: 379.90, time: 'há 8 minutos' },
  { id: 5, name: 'Ana Carolina P.', city: 'Salvador', state: 'BA', product: 'Bolsa Couro Saffiano Éternelle', price: 549.90, time: 'há 4 minutos' },
  { id: 6, name: 'Thiago V.', city: 'Porto Alegre', state: 'RS', product: 'Kit Especial Dia dos Namorados Premium', price: 449.90, time: 'há 10 minutos' }
];

export const NotificationPopup: React.FC = () => {
  const [currentAlert, setCurrentAlert] = useState<NotificationItem | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Primeiro pop-up após 7 segundos
    const initialTimer = setTimeout(() => {
      setCurrentAlert(PURCHASE_ALERTS[0]);
    }, 7000);

    // Ciclo de pop-ups a cada 35 segundos
    const interval = setInterval(() => {
      setIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % PURCHASE_ALERTS.length;
        setCurrentAlert(PURCHASE_ALERTS[nextIndex]);
        return nextIndex;
      });
    }, 35000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  // Esconder notificação após 6 segundos exibida
  useEffect(() => {
    if (currentAlert) {
      const dismissTimer = setTimeout(() => {
        setCurrentAlert(null);
      }, 6000);
      return () => clearTimeout(dismissTimer);
    }
  }, [currentAlert]);

  return (
    <AnimatePresence>
      {currentAlert && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="fixed bottom-6 left-6 z-40 max-w-xs w-full bg-luxury-gray/95 backdrop-blur-md border border-gold-500/20 rounded-xl p-4 glow-gold flex gap-3 shadow-2xl items-center"
        >
          {/* Icon */}
          <div className="h-10 w-10 shrink-0 bg-gold-600/10 border border-gold-500/20 rounded-lg flex items-center justify-center text-gold-400">
            <ShoppingBag size={18} />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-white truncate">Compra Verificada</p>
            <p className="text-[10px] text-theme-muted mt-0.5 leading-snug">
              <span className="font-semibold text-theme-muted">{currentAlert.name}</span> de {currentAlert.city}/{currentAlert.state} adquiriu o <span className="text-gold-400 font-medium">{currentAlert.product}</span>.
            </p>
            <span className="text-[8px] text-theme-muted font-semibold uppercase tracking-wider block mt-1">
              {currentAlert.time} • {formatCurrency(currentAlert.price)}
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={() => setCurrentAlert(null)}
            className="text-theme-muted hover:text-white shrink-0 self-start p-0.5"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default NotificationPopup;
