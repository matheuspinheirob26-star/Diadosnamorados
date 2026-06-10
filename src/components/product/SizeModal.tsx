import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SizeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SizeModal: React.FC<SizeModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          {/* Overlay closure */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-luxury-gray border border-white/10 rounded-2xl p-6 shadow-2xl z-10 glow-gold overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-theme-muted hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="font-serif text-xl text-gradient-gold tracking-widest uppercase">
                  Tabela de Medidas
                </h3>
                <p className="text-[10px] text-theme-muted uppercase tracking-widest">
                  Camisa Premium Egípcia & Boxer Modal
                </p>
              </div>

              {/* Shirt Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white tracking-widest uppercase border-b border-theme-border-faint pb-1">
                  1. Camisa de Algodão Egípcio
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-theme-muted font-bold border-b border-theme-border-faint">
                        <th className="py-2 pr-4">Tamanho</th>
                        <th className="py-2 px-4">Tórax (cm)</th>
                        <th className="py-2 px-4">Cintura (cm)</th>
                        <th className="py-2 px-4">Ombro (cm)</th>
                        <th className="py-2 pl-4">Manga (cm)</th>
                      </tr>
                    </thead>
                    <tbody className="text-theme-muted font-medium">
                      <tr className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">P</td>
                        <td className="py-2.5 px-4">96 - 100</td>
                        <td className="py-2.5 px-4">80 - 84</td>
                        <td className="py-2.5 px-4">44</td>
                        <td className="py-2.5 pl-4">63</td>
                      </tr>
                      <tr className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">M</td>
                        <td className="py-2.5 px-4">101 - 105</td>
                        <td className="py-2.5 px-4">85 - 89</td>
                        <td className="py-2.5 px-4">46</td>
                        <td className="py-2.5 pl-4">64</td>
                      </tr>
                      <tr className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">G</td>
                        <td className="py-2.5 px-4">106 - 110</td>
                        <td className="py-2.5 px-4">90 - 94</td>
                        <td className="py-2.5 px-4">48</td>
                        <td className="py-2.5 pl-4">65</td>
                      </tr>
                      <tr className="hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">GG</td>
                        <td className="py-2.5 px-4">111 - 116</td>
                        <td className="py-2.5 px-4">95 - 100</td>
                        <td className="py-2.5 px-4">50</td>
                        <td className="py-2.5 pl-4">66</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Brief Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white tracking-widest uppercase border-b border-theme-border-faint pb-1">
                  2. Cueca Boxer Modal
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-theme-muted font-bold border-b border-theme-border-faint">
                        <th className="py-2 pr-4">Tamanho</th>
                        <th className="py-2 px-4">Manequim</th>
                        <th className="py-2 pl-4">Cintura (cm)</th>
                      </tr>
                    </thead>
                    <tbody className="text-theme-muted font-medium">
                      <tr className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">P</td>
                        <td className="py-2.5 px-4">36 - 38</td>
                        <td className="py-2.5 pl-4">76 - 82</td>
                      </tr>
                      <tr className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">M</td>
                        <td className="py-2.5 px-4">40 - 42</td>
                        <td className="py-2.5 pl-4">83 - 90</td>
                      </tr>
                      <tr className="border-b border-theme-border-faint hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">G</td>
                        <td className="py-2.5 px-4">44 - 46</td>
                        <td className="py-2.5 pl-4">91 - 99</td>
                      </tr>
                      <tr className="hover:bg-white/2 transition">
                        <td className="py-2.5 pr-4 text-gold-400 font-bold">GG</td>
                        <td className="py-2.5 px-4">48 - 50</td>
                        <td className="py-2.5 pl-4">100 - 108</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[10px] text-theme-muted leading-relaxed bg-white/2 p-3 rounded-lg border border-theme-border-faint">
                💡 **Dica de tamanho**: Caso suas medidas estejam no limite entre dois tamanhos, recomendamos escolher o tamanho maior para um caimento mais confortável.
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default SizeModal;
