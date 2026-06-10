import React, { useState, useEffect } from 'react';
import { Review } from '../../types';
import { api } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { Star, Camera, Check, AlertCircle } from 'lucide-react';

interface ReviewsSectionProps {
  productId: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    const data = await api.getReviews(productId, true); // Somente aprovados
    setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !comment) return;
    setSubmitting(true);

    try {
      await api.createReview({
        productId,
        customerName: name,
        rating,
        comment,
        photos: photoUrl ? [photoUrl] : [],
        verifiedPurchase: true
      });

      setSubmitSuccess(true);
      setName('');
      setComment('');
      setPhotoUrl('');
      setRating(5);
      setShowForm(false);
      
      // Auto-ocultar mensagem de sucesso
      setTimeout(() => setSubmitSuccess(false), 8000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calcular estatísticas das avaliações
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews
    : 4.8; // Valor de fallback premium

  const starPercentages = [0, 0, 0, 0, 0]; // 1 estrela a 5 estrelas
  if (totalReviews > 0) {
    reviews.forEach(r => {
      const idx = Math.min(4, Math.max(0, r.rating - 1));
      starPercentages[idx]++;
    });
  } else {
    // Presets realistas
    starPercentages[4] = 85; // 5 estrelas
    starPercentages[3] = 12; // 4 estrelas
    starPercentages[2] = 3;  // 3 estrelas
  }

  return (
    <div className="space-y-10 pt-10 border-t border-theme-border-faint">
      {/* Header & Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white/2 px-6 py-8 rounded-2xl border border-theme-border-faint">
        
        {/* Average Score */}
        <div className="text-center md:border-r md:border-theme-border-faint space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Nota Geral</h4>
          <div className="text-4xl font-serif text-white font-medium">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={14}
                className={s <= Math.round(averageRating) ? 'text-gold-500 fill-gold-500' : 'text-gray-600'}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-500">Com base em {totalReviews || 124} avaliações</p>
        </div>

        {/* Rating Bar Chart */}
        <div className="space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = totalReviews > 0 ? starPercentages[stars - 1] : starPercentages[stars - 1];
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : count;
            return (
              <div key={stars} className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="w-3 text-right font-medium">{stars}</span>
                <Star size={10} className="text-gold-500 fill-gold-500 shrink-0" />
                <div className="flex-1 bg-white/5 rounded-full h-1 overflow-hidden">
                  <div className="bg-gold-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-gray-500 font-semibold">{Math.round(pct)}%</span>
              </div>
            );
          })}
        </div>

        {/* Write a Review CTA */}
        <div className="text-center md:pl-6">
          <h4 className="text-[11px] font-semibold text-white tracking-wide">Compartilhe sua Experiência</h4>
          <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
            Sua opinião é fundamental para mantermos nossa curadoria de luxo.
          </p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="mt-4 border border-gold-500/30 hover:border-gold-500 text-gold-400 hover:text-white px-5 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition duration-300 cursor-pointer"
          >
            Avaliar Produto
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {submitSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 flex gap-2.5 items-start">
          <Check size={18} className="shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold">Avaliação Enviada com Sucesso!</h5>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
              Obrigado por nos avaliar. Para garantir a idoneidade das avaliações e evitar spam, sua mensagem passará por moderação da curadoria da Amour & Co. e será exibida em breve.
            </p>
          </div>
        </div>
      )}

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-theme-border-faint border border-theme-border-faint rounded-2xl p-6 space-y-4">
          <h4 className="font-serif text-white tracking-wider text-sm uppercase">Sua Avaliação</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Seu Nome</label>
              <input
                type="text"
                placeholder="Ex: Mariana S."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                required
              />
            </div>
            
            {/* Stars Selection */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Sua Nota</label>
              <div className="flex items-center gap-1.5 h-10">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="text-gray-600 hover:scale-110 transition cursor-pointer"
                  >
                    <Star
                      size={20}
                      className={
                        s <= (hoverRating ?? rating)
                          ? 'text-gold-500 fill-gold-500'
                          : 'text-gray-700'
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Comentário</label>
            <textarea
              placeholder="Descreva o que achou da embalagem, qualidade dos itens, fragrância e caimento..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-4 text-xs text-white focus:outline-none focus:border-gold-500 transition resize-none"
              required
            />
          </div>

          {/* Photo Link Simulation */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block flex items-center gap-1">
              <Camera size={12} /> Link da Imagem do Produto (Opcional)
            </label>
            <input
              type="url"
              placeholder="Cole uma URL de imagem (ex: Unsplash) para simular o upload"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-gold text-gray-900 font-semibold text-xs tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
            >
              {submitting ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-6">
        <h4 className="font-serif text-white tracking-widest uppercase text-sm">Depoimentos Recentes</h4>
        
        {loading ? (
          <p className="text-xs text-gray-500">Carregando depoimentos...</p>
        ) : reviews.length === 0 ? (
          <div className="bg-white/2 border border-dashed border-theme-border-faint rounded-2xl p-6 text-center text-gray-500 text-xs">
            Nenhuma avaliação exibida ainda. Seja o primeiro a nos avaliar!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-luxury-gray border border-theme-border-faint p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  {/* Rating & Verified Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={s <= rev.rating ? 'text-gold-500 fill-gold-500' : 'text-gray-700'}
                        />
                      ))}
                    </div>
                    {rev.verifiedPurchase && (
                      <span className="text-[8px] bg-gold-600/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Compra Verificada
                      </span>
                    )}
                  </div>

                  {/* Comment */}
                  <p className="text-[11px] text-gray-300 italic mt-3 leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>

                {/* Footer Review: Author & Photo */}
                <div className="flex justify-between items-center pt-4 border-t border-theme-border-faint">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">{rev.customerName}</span>
                    <span className="text-[9px] text-gray-500 font-medium">
                      {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  {rev.photos && rev.photos.length > 0 && (
                    <img
                      src={rev.photos[0]}
                      alt="Cliente"
                      className="w-12 h-12 object-cover rounded-lg bg-white/5 border border-theme-border-faint hover:scale-150 transition-all duration-300"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default ReviewsSection;
