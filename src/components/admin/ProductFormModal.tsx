import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { X, Sparkles, Plus, Trash2, Info, DollarSign, Image as ImageIcon, Ruler, Search } from 'lucide-react';
import { Product } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

// Schema de validação Zod
const productFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  slug: z.string().min(2, 'Slug deve ser válido'),
  description: z.string().min(5, 'Descrição curta é obrigatória'),
  details: z.string().min(10, 'Descrição detalhada é obrigatória'),
  price: z.preprocess((val) => Number(val), z.number().positive('Preço deve ser maior que zero')),
  originalPrice: z.preprocess((val) => Number(val), z.number().positive('Preço original deve ser positivo')),
  stock: z.preprocess((val) => Number(val), z.number().int().nonnegative('Estoque não pode ser negativo')),
  sku: z.string().min(3, 'SKU inválido'),
  category: z.string().min(2, 'Categoria é obrigatória'),
  gender: z.enum(['masculino', 'feminino', 'unissex']),
  mainImage: z.string().url('URL da imagem principal inválida'),
  galleryImages: z.string().optional(), // urls separadas por vírgula
  video: z.string().optional(),
  status: z.enum(['ativo', 'inativo']),
  featured: z.boolean().default(false),
  campaign: z.string().default('nenhuma'),
  sizes: z.string().optional(), // tamanhos separados por vírgula
  colors: z.string().optional(), // cores separadas por vírgula
  models: z.string().optional(), // modelos separados por vírgula
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Product) => void;
  productToEdit?: Product | null;
  isDuplicating?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  isDuplicating = false
}) => {
  const [activeFormTab, setActiveFormTab] = useState<'basico' | 'precos' | 'midia' | 'variacoes' | 'seo'>('basico');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { register, handleSubmit, setValue, watch, reset } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      details: '',
      price: 0,
      originalPrice: 0,
      stock: 0,
      sku: '',
      category: 'Kits Presenteáveis',
      gender: 'unissex',
      mainImage: '',
      galleryImages: '',
      video: '',
      status: 'ativo',
      featured: false,
      campaign: 'nenhuma',
      sizes: '',
      colors: '',
      models: '',
      seoTitle: '',
      seoDescription: '',
    }
  });

  const watchName = watch('name');

  // Gerar slug automaticamente se o usuário alterar o nome
  useEffect(() => {
    if (watchName && (!productToEdit || isDuplicating)) {
      const generatedSlug = watchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífen
        .replace(/-+/g, '-'); // Evita múltiplos hífens consecutivos
      setValue('slug', generatedSlug);
      setValue('sku', 'AMR-' + generatedSlug.toUpperCase().replace(/-/g, '_'));
    }
  }, [watchName, setValue, productToEdit, isDuplicating]);

  // Carregar dados para edição/duplicação
  useEffect(() => {
    if (productToEdit) {
      reset({
        name: isDuplicating ? `${productToEdit.name} (Cópia)` : productToEdit.name,
        slug: isDuplicating ? `${productToEdit.slug}-copia` : productToEdit.slug || productToEdit.id,
        description: productToEdit.description,
        details: productToEdit.details,
        price: productToEdit.price,
        originalPrice: productToEdit.originalPrice || productToEdit.price,
        stock: productToEdit.stock,
        sku: isDuplicating ? `${productToEdit.sku}_COPIA` : productToEdit.sku || `SKU-${productToEdit.id.toUpperCase()}`,
        category: productToEdit.category,
        gender: productToEdit.gender,
        mainImage: productToEdit.images[0] || '',
        galleryImages: productToEdit.images.slice(1).join(', ') || '',
        video: productToEdit.video || '',
        status: productToEdit.status || 'ativo',
        featured: productToEdit.featured || false,
        campaign: productToEdit.campaign || 'nenhuma',
        sizes: productToEdit.sizes?.join(', ') || '',
        colors: productToEdit.colors?.join(', ') || '',
        models: productToEdit.models?.join(', ') || '',
        seoTitle: productToEdit.seoTitle || productToEdit.name,
        seoDescription: productToEdit.seoDescription || productToEdit.description,
      });
    } else {
      reset({
        name: '',
        slug: '',
        description: '',
        details: '',
        price: 0,
        originalPrice: 0,
        stock: 0,
        sku: '',
        category: 'Kits Presenteáveis',
        gender: 'unissex',
        mainImage: '',
        galleryImages: '',
        video: '',
        status: 'ativo',
        featured: false,
        campaign: 'nenhuma',
        sizes: '',
        colors: '',
        models: '',
        seoTitle: '',
        seoDescription: '',
      });
    }
    setFormErrors({});
    setActiveFormTab('basico');
  }, [productToEdit, isDuplicating, reset, isOpen]);

  const onFormSubmit = (data: ProductFormData) => {
    // Validação com Zod manual para evitar dependências extras
    const result = productFormSchema.safeParse(data);
    if (!result.success) {
      const errorsMap: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join('.');
        errorsMap[path] = err.message;
      });
      setFormErrors(errorsMap);
      
      // Ir para a aba do primeiro erro para dar feedback visual
      const firstErrorKey = Object.keys(errorsMap)[0];
      if (['name', 'slug', 'description', 'details', 'category', 'gender'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('basico');
      } else if (['price', 'originalPrice', 'stock', 'sku'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('precos');
      } else if (['mainImage', 'galleryImages', 'video'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('midia');
      } else if (['sizes', 'colors', 'models'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('variacoes');
      } else if (['seoTitle', 'seoDescription'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('seo');
      }
      return;
    }

    const validated = result.data;
    
    // Preparar lista de imagens (principal + galeria)
    const imagesList = [validated.mainImage];
    if (validated.galleryImages) {
      validated.galleryImages
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0)
        .forEach(url => imagesList.push(url));
    }

    // Preparar arrays de variações
    const parseCommaSeparated = (str?: string) => 
      str ? str.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];

    const newProduct: Product = {
      id: productToEdit && !isDuplicating ? productToEdit.id : validated.slug,
      name: validated.name,
      description: validated.description,
      price: validated.price,
      originalPrice: validated.originalPrice,
      images: imagesList,
      video: validated.video || undefined,
      category: validated.category,
      gender: validated.gender,
      tags: validated.campaign !== 'nenhuma' ? [validated.campaign] : [],
      stock: validated.stock,
      rating: productToEdit && !isDuplicating ? productToEdit.rating : 5.0,
      reviewsCount: productToEdit && !isDuplicating ? productToEdit.reviewsCount : 0,
      features: productToEdit && !isDuplicating ? productToEdit.features : ['Item de Luxo Exclusivo'],
      details: validated.details,
      sizes: parseCommaSeparated(validated.sizes),
      colors: parseCommaSeparated(validated.colors),
      models: parseCommaSeparated(validated.models),
      status: validated.status,
      featured: validated.featured,
      campaign: validated.campaign,
      slug: validated.slug,
      sku: validated.sku,
      seoTitle: validated.seoTitle || validated.name,
      seoDescription: validated.seoDescription || validated.description,
    };

    onSubmit(newProduct);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
          {/* Backdrop wrapper */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4 }}
            className="relative w-full max-w-4xl bg-luxury-gray border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold overflow-hidden my-8"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-rose-400 font-extrabold flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>Amour & Co. Curadoria</span>
                </span>
                <h3 className="font-serif text-xl sm:text-2xl text-white tracking-wide uppercase">
                  {isDuplicating ? 'Duplicar Produto' : productToEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Tabs Navigation */}
            <div className="flex flex-wrap gap-1 border-b border-white/5 py-3 text-[11px] font-bold uppercase tracking-wider">
              {[
                { id: 'basico', label: 'Básico', icon: Info },
                { id: 'precos', label: 'Preços & Estoque', icon: DollarSign },
                { id: 'midia', label: 'Imagens & Vídeo', icon: ImageIcon },
                { id: 'variacoes', label: 'Variações', icon: Ruler },
                { id: 'seo', label: 'SEO Metadados', icon: Search }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isTabActive = activeFormTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFormTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      isTabActive
                        ? 'bg-gold-500/10 text-gold-400 font-bold border-b-2 border-gold-500 rounded-b-none'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <TabIcon size={12} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit(onFormSubmit)} className="mt-6 space-y-6">
              
              {/* TAB 1: INFORMAÇÕES BÁSICAS */}
              {activeFormTab === 'basico' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome do Produto *</label>
                      <input
                        type="text"
                        placeholder="Ex: Kit Especial Sedução"
                        {...register('name')}
                        className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                          formErrors.name ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                        }`}
                      />
                      {formErrors.name && <p className="text-[10px] text-rose-400">{formErrors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">URL Slug *</label>
                      <input
                        type="text"
                        placeholder="ex-kit-especial"
                        {...register('slug')}
                        className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                          formErrors.slug ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                        }`}
                      />
                      {formErrors.slug && <p className="text-[10px] text-rose-400">{formErrors.slug}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Categoria *</label>
                      <select
                        {...register('category')}
                        className="w-full bg-luxury-black border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="Kits Presenteáveis">Kits Presenteáveis</option>
                        <option value="Romântico">Romântico</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Joias">Joias</option>
                        <option value="Acessórios">Acessórios</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Gênero Alvo *</label>
                      <select
                        {...register('gender')}
                        className="w-full bg-luxury-black border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="unissex">Unissex</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Status de Vendas *</label>
                      <select
                        {...register('status')}
                        className="w-full bg-luxury-black border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="ativo">Ativo (Visível na loja)</option>
                        <option value="inativo">Inativo (Escondido)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Descrição Curta *</label>
                    <textarea
                      placeholder="Descrição rápida de faturamento para vitrine..."
                      rows={2}
                      {...register('description')}
                      className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                        formErrors.description ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                      }`}
                    />
                    {formErrors.description && <p className="text-[10px] text-rose-400">{formErrors.description}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Descrição Detalhada e Itens *</label>
                    <textarea
                      placeholder="Descreva detalhadamente o produto, materiais, acabamentos e a lista de itens inclusos..."
                      rows={4}
                      {...register('details')}
                      className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                        formErrors.details ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                      }`}
                    />
                    {formErrors.details && <p className="text-[10px] text-rose-400">{formErrors.details}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/2 border border-white/5 p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="featured"
                        {...register('featured')}
                        className="h-4.5 w-4.5 rounded border-white/10 bg-white/5 text-gold-500 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="featured" className="text-xs font-semibold text-white cursor-pointer block">Produto Destaque (Flagship)</label>
                        <span className="text-[9px] text-gray-500 block">Exibe na seção de destaque principal da Home.</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Campanha Sazonal</label>
                      <select
                        {...register('campaign')}
                        className="w-full bg-luxury-black border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="nenhuma">Nenhuma (Venda contínua)</option>
                        <option value="namorados">Dia dos Namorados 🌹</option>
                        <option value="maes">Dia das Mães 🌸</option>
                        <option value="pais">Dia dos Pais 👔</option>
                        <option value="natal">Natal 🎄</option>
                        <option value="blackfriday">Black Friday ⚡</option>
                        <option value="aniversarios">Aniversários 🎁</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PREÇOS E ESTOQUE */}
              {activeFormTab === 'precos' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Preço de Venda (R$) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="299.90"
                          {...register('price')}
                          className={`w-full bg-white/5 border rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none transition ${
                            formErrors.price ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                          }`}
                        />
                      </div>
                      {formErrors.price && <p className="text-[10px] text-rose-400">{formErrors.price}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Preço Original / De (R$) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="399.90"
                          {...register('originalPrice')}
                          className={`w-full bg-white/5 border rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none transition ${
                            formErrors.originalPrice ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                          }`}
                        />
                      </div>
                      {formErrors.originalPrice && <p className="text-[10px] text-rose-400">{formErrors.originalPrice}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Estoque Disponível *</label>
                      <input
                        type="number"
                        placeholder="15"
                        {...register('stock')}
                        className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                          formErrors.stock ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                        }`}
                      />
                      {formErrors.stock && <p className="text-[10px] text-rose-400">{formErrors.stock}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">SKU do Produto *</label>
                      <input
                        type="text"
                        placeholder="AMR-KIT_EXEMPLO"
                        {...register('sku')}
                        className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                          formErrors.sku ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                        }`}
                      />
                      {formErrors.sku && <p className="text-[10px] text-rose-400">{formErrors.sku}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MÍDIA (IMAGENS E VÍDEO) */}
              {activeFormTab === 'midia' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">URL da Imagem Principal *</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/photo-..."
                      {...register('mainImage')}
                      className={`w-full bg-white/5 border rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition ${
                        formErrors.mainImage ? 'border-rose-500' : 'border-white/10 focus:border-gold-500'
                      }`}
                    />
                    {formErrors.mainImage && <p className="text-[10px] text-rose-400">{formErrors.mainImage}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">URLs da Galeria de Imagens (Separadas por vírgula)</label>
                    <textarea
                      placeholder="Ex: https://image1.com, https://image2.com"
                      rows={3}
                      {...register('galleryImages')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Link do Vídeo do Produto (Opcional - YouTube Embed URL)</label>
                    <input
                      type="text"
                      placeholder="Ex: https://www.youtube.com/embed/..."
                      {...register('video')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: VARIAÇÕES */}
              {activeFormTab === 'variacoes' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white/2 border border-white/5 p-4 rounded-2xl text-[11px] text-gray-500 space-y-1">
                    <span className="font-bold text-gold-400 block tracking-wider uppercase">Variações Disponíveis</span>
                    <span>Digite as opções disponíveis separadas por vírgula para que o cliente selecione na página do produto.</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Tamanhos Disponíveis (Ex: P, M, G, GG)</label>
                    <input
                      type="text"
                      placeholder="P, M, G, GG"
                      {...register('sizes')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Cores Disponíveis (Ex: Preto, Café, Off-White)</label>
                    <input
                      type="text"
                      placeholder="Preto, Café, Off-White"
                      {...register('colors')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Modelos / Tipos Disponíveis (Ex: Slim, Comfort, Premium)</label>
                    <input
                      type="text"
                      placeholder="Slim, Comfort, Premium"
                      {...register('models')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: SEO METADADOS */}
              {activeFormTab === 'seo' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">SEO Title (Título na Busca)</label>
                    <input
                      type="text"
                      placeholder="Título otimizado para o Google..."
                      {...register('seoTitle')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">SEO Meta Description (Descrição na Busca)</label>
                    <textarea
                      placeholder="Meta descrição otimizada para buscadores..."
                      rows={3}
                      {...register('seoDescription')}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-gold text-luxury-black font-semibold text-xs tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{productToEdit && !isDuplicating ? 'Salvar Alterações' : 'Criar Produto'}</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ProductFormModal;
