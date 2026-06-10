import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  Info, 
  DollarSign, 
  Image as ImageIcon, 
  Ruler, 
  Search, 
  Upload, 
  Globe, 
  Eye, 
  ArrowLeft, 
  ArrowRight,
  Settings,
  Ruler as RulerIcon,
  Package
} from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/supabase';
import { LogService } from '../../lib/LogService';

// Removed dataURLtoFile helper since we will upload files directly

// Zod validation schema
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
  mainImage: z.string().min(1, 'Imagem principal é obrigatória'),
  galleryImages: z.string().optional(),
  video: z.string().optional(),
  status: z.enum(['rascunho', 'publicado', 'arquivado']),
  featured: z.boolean().default(false),
  campaign: z.string().default('nenhuma'),
  minStock: z.preprocess((val) => Number(val), z.number().int().nonnegative('Estoque mínimo inválido')),
  allowOutOfStockSale: z.boolean().default(false),
  canonicalUrl: z.string().optional(),
  keyword: z.string().optional(),
  indexing: z.enum(['index', 'noindex']).default('index'),
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
  const [loading, setLoading] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // States for Image Upload and Gallery
  const [useExternalMainImage, setUseExternalMainImage] = useState(true);
  const [galleryList, setGalleryList] = useState<string[]>([]);
  const mainImageFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // States for Variations Management
  const [variationsList, setVariationsList] = useState<ProductVariation[]>([]);
  const [newVarType, setNewVarType] = useState<ProductVariation['type']>('tamanho');
  const [newVarName, setNewVarName] = useState('');

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
      status: 'publicado',
      featured: false,
      campaign: 'nenhuma',
      minStock: 5,
      allowOutOfStockSale: false,
      canonicalUrl: '',
      keyword: '',
      indexing: 'index',
      seoTitle: '',
      seoDescription: '',
    }
  });

  const watchName = watch('name');
  const watchSlug = watch('slug');
  const watchSeoTitle = watch('seoTitle');
  const watchSeoDescription = watch('seoDescription');
  const watchDescription = watch('description');
  const watchCanonicalUrl = watch('canonicalUrl');
  const watchMainImage = watch('mainImage');

  // Auto-generate Slug, SKU, and Canonical Url on Name change
  useEffect(() => {
    if (watchName && (!productToEdit || isDuplicating)) {
      const generatedSlug = watchName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Spaces to hyphen
        .replace(/-+/g, '-'); // Merge multiple hyphens
        
      setValue('slug', generatedSlug);
      setValue('sku', 'AMR-' + generatedSlug.toUpperCase().replace(/-/g, '_'));
      setValue('canonicalUrl', `https://amour.co/product/${generatedSlug}`);
      setValue('seoTitle', `${watchName} | Amour & Co.`);
      setValue('seoDescription', watch('description') || '');
    }
  }, [watchName, setValue, productToEdit, isDuplicating]);

  // Load Data for Editing / Duplicating
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
        status: productToEdit.status || 'publicado',
        featured: productToEdit.featured || false,
        campaign: productToEdit.campaign || 'nenhuma',
        minStock: productToEdit.minStock !== undefined ? productToEdit.minStock : 5,
        allowOutOfStockSale: productToEdit.allowOutOfStockSale || false,
        canonicalUrl: productToEdit.canonicalUrl || `https://amour.co/product/${productToEdit.slug || productToEdit.id}`,
        keyword: productToEdit.keyword || '',
        indexing: productToEdit.indexing || 'index',
        seoTitle: productToEdit.seoTitle || productToEdit.name,
        seoDescription: productToEdit.seoDescription || productToEdit.description,
      });
      setGalleryList(productToEdit.images.slice(1) || []);
      setVariationsList(productToEdit.variations || []);
      setUseExternalMainImage(true);
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
        status: 'publicado',
        featured: false,
        campaign: 'nenhuma',
        minStock: 5,
        allowOutOfStockSale: false,
        canonicalUrl: '',
        keyword: '',
        indexing: 'index',
        seoTitle: '',
        seoDescription: '',
      });
      setGalleryList([]);
      setVariationsList([]);
      setUseExternalMainImage(true);
    }
    setFormErrors({});
    setActiveFormTab('basico');
  }, [productToEdit, isDuplicating, reset, isOpen]);

  // Main Image Upload Handler
  const handleMainImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingMedia(true);
      try {
        const url = await api.uploadProductImage(file, `products/${Date.now()}_${file.name}`);
        if (url) {
          setValue('mainImage', url);
          LogService.log('Upload de Imagem', `Upload da imagem principal: ${file.name}`, 'Admin', 'admin@amour.co', 'product', 'upload', 'info');
        }
      } catch (err) {
        console.error('Erro no upload da imagem principal', err);
        alert('Erro ao fazer upload da imagem.');
      } finally {
        setIsUploadingMedia(false);
      }
    }
  };

  // Gallery Multiple Files Upload Handler
  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsUploadingMedia(true);
      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          const url = await api.uploadProductImage(file, `products/${Date.now()}_${file.name}`);
          if (url) {
             LogService.log('Upload de Imagem', `Upload para galeria: ${file.name}`, 'Admin', 'admin@amour.co', 'product', 'upload', 'info');
          }
          return url;
        });
        
        const urls = await Promise.all(uploadPromises);
        const validUrls = urls.filter(url => url !== undefined) as string[];
        
        setGalleryList(prev => [...prev, ...validUrls]);
      } catch (err) {
        console.error('Erro no upload da galeria', err);
        alert('Erro ao fazer upload de imagens da galeria.');
      } finally {
        setIsUploadingMedia(false);
      }
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryList(prev => prev.filter((_, i) => i !== index));
  };

  const moveGalleryImage = (index: number, direction: 'left' | 'right') => {
    const newList = [...galleryList];
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx >= 0 && targetIdx < galleryList.length) {
      const temp = newList[index];
      newList[index] = newList[targetIdx];
      newList[targetIdx] = temp;
      setGalleryList(newList);
    }
  };

  // Variations Handler
  const handleAddVariation = () => {
    if (!newVarName.trim()) return;
    const cleanName = newVarName.trim();
    const parentSku = watch('sku') || 'AMR';
    const varSku = `${parentSku}_${newVarType.toUpperCase()}_${cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    const newVar: ProductVariation = {
      id: `${newVarType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: newVarType,
      name: cleanName,
      priceAddition: 0,
      stock: 10,
      sku: varSku,
      active: true
    };

    setVariationsList(prev => [...prev, newVar]);
    setNewVarName('');
  };

  const handleUpdateVariationField = (id: string, field: keyof ProductVariation, value: any) => {
    setVariationsList(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, [field]: value };
      }
      return v;
    }));
  };

  const handleRemoveVariation = (id: string) => {
    setVariationsList(prev => prev.filter(v => v.id !== id));
  };

  // Form Submit Handler
  const onFormSubmit = async (data: ProductFormData) => {
    const result = productFormSchema.safeParse(data);
    if (!result.success) {
      const errorsMap: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join('.');
        errorsMap[path] = err.message;
      });
      setFormErrors(errorsMap);

      // Focus tab that has the first validation error
      const firstErrorKey = Object.keys(errorsMap)[0];
      if (['name', 'slug', 'description', 'details', 'category', 'gender', 'status', 'campaign'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('basico');
      } else if (['price', 'originalPrice', 'stock', 'sku', 'minStock', 'allowOutOfStockSale'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('precos');
      } else if (['mainImage', 'video'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('midia');
      } else if (['canonicalUrl', 'keyword', 'indexing', 'seoTitle', 'seoDescription'].some(k => firstErrorKey.includes(k))) {
        setActiveFormTab('seo');
      }
      return;
    }

    setLoading(true);
    const validated = result.data;

    try {
      // 1. Imagem Principal
      let uploadedMainUrl = validated.mainImage;

      // 2. Imagens da Galeria
      const uploadedGalleryUrls = galleryList;

      const allImages = [uploadedMainUrl, ...uploadedGalleryUrls];

      // Assemble final product payload
      const finalProduct: Product = {
        id: productToEdit && !isDuplicating ? productToEdit.id : validated.slug,
        name: validated.name,
        description: validated.description,
        price: validated.price,
        originalPrice: validated.originalPrice,
        images: allImages,
        video: validated.video || undefined,
        category: validated.category,
        gender: validated.gender,
        tags: validated.campaign !== 'nenhuma' ? [validated.campaign] : [],
        stock: validated.stock,
        rating: productToEdit && !isDuplicating ? productToEdit.rating : 5.0,
        reviewsCount: productToEdit && !isDuplicating ? productToEdit.reviewsCount : 0,
        features: productToEdit && !isDuplicating ? productToEdit.features : ['Embalagem de Luxo', 'Envio Privado'],
        details: validated.details,
        sizes: Array.from(new Set(variationsList.filter(v => v.type === 'tamanho' && v.active).map(v => v.name))),
        colors: Array.from(new Set(variationsList.filter(v => v.type === 'cor' && v.active).map(v => v.name))),
        models: Array.from(new Set(variationsList.filter(v => v.type === 'modelo' && v.active).map(v => v.name))),
        status: validated.status,
        featured: validated.featured,
        campaign: validated.campaign,
        slug: validated.slug,
        sku: validated.sku,
        seoTitle: validated.seoTitle || validated.name,
        seoDescription: validated.seoDescription || validated.description,
        variations: variationsList,
        minStock: validated.minStock,
        allowOutOfStockSale: validated.allowOutOfStockSale,
        canonicalUrl: validated.canonicalUrl,
        keyword: validated.keyword,
        indexing: validated.indexing,
      };

      await onSubmit(finalProduct);
      
      LogService.log(
        productToEdit && !isDuplicating ? 'Produto Editado' : 'Produto Criado',
        `O produto ${finalProduct.name} (${finalProduct.sku}) foi ${productToEdit && !isDuplicating ? 'atualizado' : 'criado'}.`,
        'Admin',
        'admin@amour.co',
        'product',
        finalProduct.id,
        'success'
      );

      onClose();
    } catch (err: any) {
      console.error('Falha ao processar imagens e salvar produto:', err);
      alert(`Houve um erro no salvamento do produto.\nDetalhes: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs overflow-y-auto">
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.35 }}
            className="relative w-full max-w-4xl bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold my-8 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-theme-border-faint pb-4 shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-rose-400 font-extrabold flex items-center gap-1">
                  <Sparkles size={12} className="animate-spin-slow" />
                  <span>Gerenciador Comercial Amour & Co.</span>
                </span>
                <h3 className="font-serif text-xl sm:text-2xl text-theme-text tracking-wide uppercase">
                  {isDuplicating ? 'Duplicar Produto' : productToEdit ? 'Editar Presente de Luxo' : 'Cadastrar Presente de Luxo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-theme-text p-1.5 rounded-full hover:bg-theme-border-faint transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Tabs Navigation */}
            <div className="flex flex-wrap gap-1 border-b border-theme-border-faint py-3 text-[10px] font-bold uppercase tracking-wider shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'basico', label: '1. Informações Básicas', icon: Info },
                { id: 'precos', label: '2. Preços & Estoque', icon: DollarSign },
                { id: 'midia', label: '3. Mídia & Uploads', icon: ImageIcon },
                { id: 'variacoes', label: '4. Variações Comerciais', icon: Ruler },
                { id: 'seo', label: '5. Google SEO & Metadados', icon: Globe }
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isTabActive = activeFormTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFormTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg transition-all duration-300 cursor-pointer ${
                      isTabActive
                        ? 'bg-gold-500/10 text-gold-400 font-bold border-b-2 border-gold-500 rounded-b-none'
                        : 'text-gray-500 hover:text-theme-text hover:bg-theme-border-faint'
                    }`}
                  >
                    <TabIcon size={12} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Form Container */}
            <form onSubmit={handleSubmit(onFormSubmit)} className="flex-grow overflow-y-auto pr-1 mt-4 space-y-6 scrollbar-thin">
              
              {/* TAB 1: INFORMAÇÕES BÁSICAS */}
              {activeFormTab === 'basico' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome do Produto *</label>
                      <input
                        type="text"
                        placeholder="Ex: Caixa Especial Dia dos Namorados"
                        {...register('name')}
                        className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                          formErrors.name ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                        }`}
                      />
                      {formErrors.name && <p className="text-[10px] text-rose-400">{formErrors.name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">URL Slug (Auto-gerada) *</label>
                      <input
                        type="text"
                        placeholder="ex-caixa-especial"
                        {...register('slug')}
                        className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                          formErrors.slug ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
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
                        className="w-full bg-luxury-black border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
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
                        className="w-full bg-luxury-black border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="unissex">Unissex</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Status de Publicação *</label>
                      <select
                        {...register('status')}
                        className="w-full bg-luxury-black border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="publicado">Publicado (Disponível na vitrine)</option>
                        <option value="rascunho">Rascunho (Escondido da vitrine)</option>
                        <option value="arquivado">Arquivado (Inativo comercialmente)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Descrição Curta *</label>
                    <textarea
                      placeholder="Descrição rápida para cartões da vitrine..."
                      rows={2}
                      {...register('description')}
                      className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                        formErrors.description ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                      }`}
                    />
                    {formErrors.description && <p className="text-[10px] text-rose-400">{formErrors.description}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Descrição Detalhada e Itens *</label>
                    <textarea
                      placeholder="Descreva detalhadamente o kit, a experiência, materiais, e liste cada item incluso no presente..."
                      rows={4}
                      {...register('details')}
                      className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                        formErrors.details ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                      }`}
                    />
                    {formErrors.details && <p className="text-[10px] text-rose-400">{formErrors.details}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/2 border border-theme-border-faint p-4 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="featured"
                        {...register('featured')}
                        className="h-4.5 w-4.5 rounded border-theme-border bg-theme-border-faint text-gold-500 focus:ring-0 cursor-pointer"
                      />
                      <div>
                        <label htmlFor="featured" className="text-xs font-semibold text-theme-text cursor-pointer block">Produto Destaque (Flagship)</label>
                        <span className="text-[9px] text-gray-500 block">Destaque central com banner emocional na Home page.</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Campanha Sazonal Ativa</label>
                      <select
                        {...register('campaign')}
                        className="w-full bg-luxury-black border border-theme-border rounded-lg px-3.5 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="nenhuma">Nenhuma (Venda regular)</option>
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
                          className={`w-full bg-theme-border-faint border rounded-lg pl-9 pr-4 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                            formErrors.price ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                          }`}
                        />
                      </div>
                      {formErrors.price && <p className="text-[10px] text-rose-400">{formErrors.price}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Preço Original ("De") *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="399.90"
                          {...register('originalPrice')}
                          className={`w-full bg-theme-border-faint border rounded-lg pl-9 pr-4 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                            formErrors.originalPrice ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                          }`}
                        />
                      </div>
                      {formErrors.originalPrice && <p className="text-[10px] text-rose-400">{formErrors.originalPrice}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Estoque Geral Disponível *</label>
                      <input
                        type="number"
                        placeholder="15"
                        {...register('stock')}
                        className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                          formErrors.stock ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                        }`}
                      />
                      {formErrors.stock && <p className="text-[10px] text-rose-400">{formErrors.stock}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Estoque Mínimo (Alerta) *</label>
                      <input
                        type="number"
                        placeholder="5"
                        {...register('minStock')}
                        className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                          formErrors.minStock ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                        }`}
                      />
                      {formErrors.minStock && <p className="text-[10px] text-rose-400">{formErrors.minStock}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">SKU Master *</label>
                      <input
                        type="text"
                        placeholder="AMR-KIT_EXEMPLO"
                        {...register('sku')}
                        className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                          formErrors.sku ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                        }`}
                      />
                      {formErrors.sku && <p className="text-[10px] text-rose-400">{formErrors.sku}</p>}
                    </div>
                  </div>

                  <div className="bg-white/2 border border-theme-border-faint p-4 rounded-2xl flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="allowOutOfStockSale"
                      {...register('allowOutOfStockSale')}
                      className="h-4.5 w-4.5 rounded border-theme-border bg-theme-border-faint text-gold-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="allowOutOfStockSale" className="text-xs font-semibold text-theme-text cursor-pointer block">Permitir Venda sem Estoque (Sob Encomenda)</label>
                      <span className="text-[9px] text-gray-500 block">Clientes poderão comprar o produto esgotado e ele receberá a marcação "Sob encomenda".</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MÍDIA (UPLOAD DE IMAGENS E VÍDEOS) */}
              {activeFormTab === 'midia' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* MAIN IMAGE SECTION */}
                  <div className="bg-white/2 border border-theme-border-faint p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-theme-border-faint pb-2">
                      <span className="text-xs font-bold text-theme-text uppercase tracking-wider block">Imagem Principal do Produto</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUseExternalMainImage(!useExternalMainImage);
                          setValue('mainImage', '');
                        }}
                        className="text-[10px] text-gold-400 hover:text-theme-text font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        {useExternalMainImage ? 'Fazer Upload de Arquivo' : 'Fornecer URL Externa'}
                      </button>
                    </div>

                    {useExternalMainImage ? (
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">URL da Imagem Principal</label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/photo-..."
                          {...register('mainImage')}
                          className={`w-full bg-theme-border-faint border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none transition ${
                            formErrors.mainImage ? 'border-rose-500' : 'border-theme-border focus:border-gold-500'
                          }`}
                        />
                        {formErrors.mainImage && <p className="text-[10px] text-rose-400">{formErrors.mainImage}</p>}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                        <div className="sm:col-span-3">
                          <div
                            onClick={() => mainImageFileInputRef.current?.click()}
                            className="border-2 border-dashed border-theme-border hover:border-gold-500/40 rounded-xl p-6 text-center cursor-pointer transition bg-white/1 flex flex-col items-center justify-center gap-2 group"
                          >
                            <Upload size={20} className="text-theme-muted group-hover:text-gold-400 transition" />
                            <span className="text-[10px] text-theme-muted font-bold uppercase tracking-wider">
                              {isUploadingMedia ? 'Enviando...' : 'Clique para selecionar imagem'}
                            </span>
                            <span className="text-[9px] text-gray-600">JPG, PNG ou WebP (Máx 5MB)</span>
                            <input
                              type="file"
                              ref={mainImageFileInputRef}
                              onChange={handleMainImageFileChange}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                        </div>
                        <div className="flex justify-center">
                          {watchMainImage ? (
                            <div className="relative group rounded-xl overflow-hidden border border-theme-border aspect-square w-24 shrink-0 bg-black">
                              <img src={watchMainImage} alt="Main Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                              <button
                                type="button"
                                onClick={() => setValue('mainImage', '')}
                                className="absolute top-1 right-1 bg-rose-500/90 hover:bg-rose-600 text-theme-text p-1.5 rounded-lg transition-colors shadow-lg cursor-pointer z-10"
                                title="Remover Imagem Principal"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-theme-border-faint aspect-square w-24 flex items-center justify-center text-gray-600 text-[10px] font-bold uppercase">
                              Sem arquivo
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GALLERY IMAGES SECTION */}
                  <div className="bg-white/2 border border-theme-border-faint p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-theme-border-faint pb-2">
                      <div>
                        <span className="text-xs font-bold text-theme-text uppercase tracking-wider block">Galeria de Imagens</span>
                        <span className="text-[9px] text-gray-500 block">Adicione fotos adicionais da experiência de unboxing e detalhes do kit.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => galleryFileInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="bg-theme-border-faint hover:bg-white/10 border border-theme-border text-theme-text font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isUploadingMedia ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span> : <Plus size={12} />} 
                        {isUploadingMedia ? 'Enviando...' : 'Adicionar Fotos'}
                      </button>
                      <input
                        type="file"
                        ref={galleryFileInputRef}
                        onChange={handleGalleryFilesChange}
                        accept="image/*"
                        multiple
                        className="hidden"
                      />
                    </div>

                    {galleryList.length === 0 ? (
                      <p className="text-[10px] text-gray-500 text-center py-6">Nenhuma imagem na galeria secundária.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {galleryList.map((imgUrl, idx) => (
                          <div key={idx} className="relative group border border-theme-border rounded-xl overflow-hidden aspect-square bg-black">
                            <img src={imgUrl} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute top-1 right-1 z-10">
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(idx)}
                                className="p-1.5 bg-rose-500/90 hover:bg-rose-600 text-theme-text rounded-lg transition shadow-lg cursor-pointer"
                                title="Remover imagem"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            
                            {/* Controller Buttons for ordering */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                              <div className="flex justify-between pointer-events-auto">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveGalleryImage(idx, 'left')}
                                  className="p-1 bg-white/20 hover:bg-white/40 rounded text-theme-text disabled:opacity-30 cursor-pointer"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === galleryList.length - 1}
                                  onClick={() => moveGalleryImage(idx, 'right')}
                                  className="p-1 bg-white/20 hover:bg-white/40 rounded text-theme-text disabled:opacity-30 cursor-pointer"
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VIDEO FIELD */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Vídeo do Produto (Embed Link do YouTube)</label>
                    <input
                      type="text"
                      placeholder="Ex: https://www.youtube.com/embed/dQw4w9WgXcQ"
                      {...register('video')}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>

                </div>
              )}

              {/* TAB 4: VARIAÇÕES COMERCIAIS */}
              {activeFormTab === 'variacoes' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* ADD VARIATION FORM */}
                  <div className="bg-white/2 border border-theme-border-faint p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Selecione o Tipo de Atributo</label>
                      <select
                        value={newVarType}
                        onChange={(e) => setNewVarType(e.target.value as any)}
                        className="w-full bg-luxury-black border border-theme-border rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="tamanho">Tamanho (ex: P, M, G, GG)</option>
                        <option value="cor">Cor (ex: Preto, Vermelho, Nude)</option>
                        <option value="modelo">Modelo (ex: Imperial, Slim, Padrão)</option>
                        <option value="fragrancia">Fragrância (ex: Vanilla & Âmbar, Lavanda)</option>
                        <option value="embalagem">Tipo de Embalagem (ex: Estojo de Madeira, Caixa Rígida)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Nome da Opção</label>
                      <input
                        type="text"
                        placeholder="Ex: P, Vermelho"
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddVariation}
                      className="bg-gradient-gold text-gray-900 font-semibold text-xs tracking-widest uppercase py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>

                  {/* VARIATIONS TABLE LIST */}
                  <div className="bg-luxury-black border border-theme-border-faint rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-gray-500 font-bold border-b border-theme-border-faint bg-white/2 select-none">
                          <th className="p-3">Atributo</th>
                          <th className="p-3">Nome</th>
                          <th className="p-3 w-28">Preço Adicional (R$)</th>
                          <th className="p-3 w-24">Estoque</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3 text-center w-16">Status</th>
                          <th className="p-3 text-right w-12">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300 font-medium">
                        {variationsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                              Nenhuma variação comercial cadastrada. Use o formulário acima para adicionar.
                            </td>
                          </tr>
                        ) : (
                          variationsList.map((v) => (
                            <tr key={v.id} className="hover:bg-white/2 transition">
                              <td className="p-3 capitalize">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  v.type === 'tamanho' ? 'bg-indigo-500/10 text-indigo-400' :
                                  v.type === 'cor' ? 'bg-amber-500/10 text-amber-400' :
                                  v.type === 'modelo' ? 'bg-teal-500/10 text-teal-400' :
                                  v.type === 'fragrancia' ? 'bg-rose-500/10 text-rose-400' :
                                  'bg-purple-500/10 text-purple-400'
                                }`}>
                                  {v.type}
                                </span>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={v.name}
                                  onChange={(e) => handleUpdateVariationField(v.id, 'name', e.target.value)}
                                  className="bg-theme-border-faint border border-theme-border rounded px-2 py-1 text-xs text-theme-text w-full max-w-[120px] focus:outline-none focus:border-gold-500"
                                />
                              </td>
                              <td className="p-3">
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 font-bold">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.priceAddition}
                                    onChange={(e) => handleUpdateVariationField(v.id, 'priceAddition', Number(e.target.value))}
                                    className="bg-theme-border-faint border border-theme-border rounded pl-5 pr-1.5 py-1 text-xs text-theme-text text-right w-24 focus:outline-none focus:border-gold-500"
                                  />
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => handleUpdateVariationField(v.id, 'stock', Number(e.target.value))}
                                  className="bg-theme-border-faint border border-theme-border rounded px-1.5 py-1 text-xs text-theme-text text-center w-16 focus:outline-none focus:border-gold-500"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) => handleUpdateVariationField(v.id, 'sku', e.target.value)}
                                  className="bg-theme-border-faint border border-theme-border rounded px-2 py-1 text-[10px] text-theme-text font-mono w-full max-w-[160px] focus:outline-none focus:border-gold-500"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={v.active}
                                  onChange={(e) => handleUpdateVariationField(v.id, 'active', e.target.checked)}
                                  className="h-4.5 w-4.5 rounded border-theme-border bg-theme-border-faint text-gold-500 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariation(v.id)}
                                  className="text-gray-500 hover:text-rose-400 p-1 transition cursor-pointer"
                                  title="Remover variação"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* TAB 5: GOOGLE SEO METADADOS */}
              {activeFormTab === 'seo' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* GOOGLE PREVIEW WIDGET */}
                  <div className="bg-white/2 border border-theme-border-faint p-6 rounded-3xl space-y-3 shadow-2xl">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-extrabold flex items-center gap-1">
                      <Search size={12} className="text-blue-500" />
                      <span>Widget Google Search Preview</span>
                    </span>
                    <div className="border border-theme-border p-5 rounded-2xl bg-luxury-black font-sans leading-normal">
                      {/* Search result mock */}
                      <div className="space-y-1">
                        <div className="text-[11px] text-theme-muted flex items-center gap-1.5 truncate select-none">
                          <Globe size={11} className="text-gray-500" />
                          <span>{watchCanonicalUrl || `https://amour.co/product/${watchSlug || 'slug'}`}</span>
                          <span className="text-[9px] text-gray-600">▼</span>
                        </div>
                        <h4 className="text-[18px] text-[#8ab4f8] hover:underline cursor-pointer font-medium leading-snug truncate">
                          {watchSeoTitle || `${watchName || 'Título da Página'} | Amour & Co.`}
                        </h4>
                        <p className="text-[13px] text-[#bdc1c6] font-light leading-relaxed line-clamp-2">
                          {watchSeoDescription || watchDescription || 'Insira uma meta descrição na aba SEO para ver como ela será exibida nas pesquisas do Google...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SEO INPUTS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Título de Busca (SEO Title)</label>
                      <input
                        type="text"
                        placeholder="Título otimizado para clique no Google..."
                        {...register('seoTitle')}
                        className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">URL Canônica (Canonical URL)</label>
                      <input
                        type="text"
                        placeholder="Ex: https://amour.co/product/presente-exclusivo"
                        {...register('canonicalUrl')}
                        className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Palavra-chave Principal</label>
                      <input
                        type="text"
                        placeholder="Ex: kit presente namorados luxo"
                        {...register('keyword')}
                        className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Controle de Indexação (Robots)</label>
                      <select
                        {...register('indexing')}
                        className="w-full bg-luxury-black border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition cursor-pointer"
                      >
                        <option value="index">Index (Permitir indexar no Google)</option>
                        <option value="noindex">Noindex (Bloquear dos resultados de busca)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Descrição de Busca (SEO Meta Description)</label>
                    <textarea
                      placeholder="Resumo chamativo otimizado para o Google (recomendado até 160 caracteres)..."
                      rows={3}
                      {...register('seoDescription')}
                      className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3.5 py-2.5 text-xs text-theme-text focus:outline-none focus:border-gold-500 transition"
                    />
                  </div>

                </div>
              )}

            </form>

            {/* Modal Actions Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-theme-border-faint shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold text-theme-muted hover:text-theme-text transition cursor-pointer disabled:opacity-30"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit(onFormSubmit)}
                disabled={loading}
                className="bg-gradient-gold text-gray-900 font-semibold text-xs tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Settings className="animate-spin" size={14} />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{productToEdit && !isDuplicating ? 'Salvar Alterações' : 'Criar Produto'}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ProductFormModal;
