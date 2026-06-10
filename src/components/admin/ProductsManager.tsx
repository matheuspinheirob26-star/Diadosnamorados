import React, { useState, useEffect } from 'react';
import { api } from '../../lib/supabase';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Copy, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  Package, 
  TrendingUp, 
  RefreshCw, 
  TrendingDown, 
  SlidersHorizontal 
} from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';

export const ProductsManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos'); // Todos, publicado, rascunho, arquivado
  const [activeSubTab, setActiveSubTab] = useState<'todos' | 'estoque_baixo' | 'esgotados' | 'destaques' | 'campanhas'>('todos');

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Quick Inline Edit States
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<number>(0);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPriceValue, setTempPriceValue] = useState<number>(0);

  const fetchProductsList = async () => {
    setLoading(true);
    const data = await api.getProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductsList();
  }, []);

  // CRUD Handler - Create or Update
  const handleSaveProduct = async (product: Product) => {
    setLoading(true);
    if (editProduct && !isDuplicating) {
      // Atualizar
      await api.updateProduct(product);
    } else {
      // Criar
      await api.createProduct(product);
    }
    await fetchProductsList();
    setEditProduct(null);
    setIsDuplicating(false);
  };

  // Excluir Produto
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este presente de luxo definitivamente?')) {
      setLoading(true);
      await api.deleteProduct(id);
      await fetchProductsList();
    }
  };

  // Duplicar Produto
  const handleTriggerDuplicate = (product: Product) => {
    setEditProduct(product);
    setIsDuplicating(true);
    setModalOpen(true);
  };

  // Editar Produto
  const handleTriggerEdit = (product: Product) => {
    setEditProduct(product);
    setIsDuplicating(false);
    setModalOpen(true);
  };

  // Quick Toggles
  const handleToggleStatus = async (product: Product) => {
    const updated: Product = {
      ...product,
      status: product.status === 'publicado' ? 'rascunho' : 'publicado'
    };
    await api.updateProduct(updated);
    // Atualizar estado local
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
  };

  const handleToggleFeatured = async (product: Product) => {
    const updated: Product = {
      ...product,
      featured: !product.featured
    };
    await api.updateProduct(updated);
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
  };

  // Inline Stock Edit Save
  const handleSaveStockInline = async (product: Product) => {
    const updated: Product = {
      ...product,
      stock: Number(tempStockValue)
    };
    await api.updateProduct(updated);
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
    setEditingStockId(null);
  };

  // Inline Price Edit Save
  const handleSavePriceInline = async (product: Product) => {
    const updated: Product = {
      ...product,
      price: Number(tempPriceValue)
    };
    await api.updateProduct(updated);
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
    setEditingPriceId(null);
  };

  // Filtragem dos Produtos
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
                          
    const matchesCategory = categoryFilter === 'Todos' || p.category === categoryFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'publicado') matchesStatus = p.status === 'publicado';
    else if (statusFilter === 'rascunho') matchesStatus = p.status === 'rascunho';
    else if (statusFilter === 'arquivado') matchesStatus = p.status === 'arquivado';
    else if (statusFilter === 'destaque') matchesStatus = !!p.featured;

    let matchesSubTab = true;
    const lowStockThreshold = p.minStock !== undefined ? p.minStock : 5;
    if (activeSubTab === 'estoque_baixo') {
      matchesSubTab = p.stock <= lowStockThreshold && p.stock > 0;
    } else if (activeSubTab === 'esgotados') {
      matchesSubTab = p.stock <= 0;
    } else if (activeSubTab === 'destaques') {
      matchesSubTab = !!p.featured;
    } else if (activeSubTab === 'campanhas') {
      matchesSubTab = p.campaign !== undefined && p.campaign !== 'nenhuma' && p.campaign !== '';
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesSubTab;
  });

  // Categorias únicas para filtro
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  return (
    <div className="space-y-6">
      
      {/* Title / Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-theme-border-faint pb-5">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl text-white tracking-wide uppercase">Gerenciamento de Catálogo</h2>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest">
            Adicione, duplique, edite ou gerencie o estoque e preços dos presentes de luxo
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchProductsList}
            disabled={loading}
            className="p-2.5 rounded-xl border border-white/10 hover:border-gold-500/30 hover:bg-white/5 text-theme-muted hover:text-white transition cursor-pointer"
            title="Recarregar produtos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditProduct(null);
              setIsDuplicating(false);
              setModalOpen(true);
            }}
            className="bg-gradient-gold text-theme-text font-semibold text-xs tracking-widest uppercase px-5 py-2.5 rounded-xl hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Novo Presente</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Buscar Presente</label>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted" />
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Filtrar Categoria</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-luxury-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Filtrar Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-luxury-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          >
            <option value="Todos">Todos os Status</option>
            <option value="publicado">Publicado</option>
            <option value="rascunho">Rascunho</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </div>
      </div>

      {/* Sub-tabs panel */}
      <div className="flex border-b border-theme-border-faint gap-2 pb-px text-[11px] font-bold uppercase tracking-wider overflow-x-auto no-scrollbar">
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'estoque_baixo', label: 'Estoque Baixo' },
          { id: 'esgotados', label: 'Esgotados' },
          { id: 'destaques', label: 'Destaques' },
          { id: 'campanhas', label: 'Campanhas' }
        ].map(subTab => {
          const count = products.filter(p => {
            const lowStockThreshold = p.minStock !== undefined ? p.minStock : 5;
            if (subTab.id === 'estoque_baixo') return p.stock <= lowStockThreshold && p.stock > 0;
            if (subTab.id === 'esgotados') return p.stock <= 0;
            if (subTab.id === 'destaques') return !!p.featured;
            if (subTab.id === 'campanhas') return p.campaign !== undefined && p.campaign !== 'nenhuma' && p.campaign !== '';
            return true;
          }).length;
          
          return (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id as any)}
              className={`pb-3 px-3 transition-all cursor-pointer relative whitespace-nowrap ${
                activeSubTab === subTab.id
                  ? 'text-gold-400 font-bold border-b-2 border-gold-500'
                  : 'text-theme-muted hover:text-theme-muted'
              }`}
            >
              <span>{subTab.label}</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-white/5 text-theme-muted font-medium">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Products table list */}
      <div className="bg-luxury-gray border border-theme-border-faint rounded-3xl overflow-hidden shadow-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <RefreshCw size={24} className="text-gold-500 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/2 select-none">
                <th className="p-4">Presente</th>
                <th className="p-4">SKU / Categoria</th>
                <th className="p-4">Preço (R$)</th>
                <th className="p-4">Estoque</th>
                <th className="p-4 text-center">Destaque</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-theme-muted font-medium">
                    Nenhum presente de luxo correspondente encontrado no catálogo.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-white/2 transition duration-200">
                    
                    {/* Column 1: Image & Name */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={prod.images[0] || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=200&auto=format&fit=crop'} 
                          alt={prod.name} 
                          className="w-10 h-10 object-cover rounded-lg bg-white/5 border border-white/10 shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="block text-white font-semibold truncate max-w-[200px] sm:max-w-[260px]">{prod.name}</span>
                          {prod.campaign && prod.campaign !== 'nenhuma' && (
                            <span className="inline-block text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 animate-pulse">
                              🌹 {prod.campaign}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: SKU / Category */}
                    <td className="p-4">
                      <span className="block font-mono text-[10px] text-theme-muted font-bold">{prod.sku || `SKU-${prod.id.toUpperCase()}`}</span>
                      <span className="block text-[10px] text-theme-muted mt-0.5">{prod.category}</span>
                    </td>

                    {/* Column 3: Price Inline Edit */}
                    <td className="p-4">
                      {editingPriceId === prod.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={tempPriceValue}
                            onChange={(e) => setTempPriceValue(Number(e.target.value))}
                            className="w-20 bg-luxury-black border border-gold-500/35 rounded px-2 py-1 text-xs text-white text-right focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSavePriceInline(prod);
                              else if (e.key === 'Escape') setEditingPriceId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSavePriceInline(prod)}
                            className="bg-gold-500 text-theme-text font-extrabold px-1.5 py-1 rounded text-[9px] uppercase cursor-pointer"
                          >
                            Ok
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingPriceId(prod.id);
                            setTempPriceValue(prod.price);
                          }}
                          className="font-bold text-white hover:text-gold-400 cursor-edit select-none flex items-center gap-1 group"
                          title="Clique para editar rápido"
                        >
                          <span>{formatCurrency(prod.price)}</span>
                          <Edit3 size={10} className="text-theme-text group-hover:text-gold-400 transition opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                      {prod.originalPrice > prod.price && (
                        <span className="block text-[9px] text-theme-muted line-through mt-0.5">De: {formatCurrency(prod.originalPrice)}</span>
                      )}
                    </td>

                    {/* Column 4: Stock Inline Edit */}
                    <td className="p-4">
                      {editingStockId === prod.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={tempStockValue}
                            onChange={(e) => setTempStockValue(Number(e.target.value))}
                            className="w-16 bg-luxury-black border border-gold-500/35 rounded px-2 py-1 text-xs text-white text-center focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveStockInline(prod);
                              else if (e.key === 'Escape') setEditingStockId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveStockInline(prod)}
                            className="bg-gold-500 text-theme-text font-extrabold px-1.5 py-1 rounded text-[9px] uppercase cursor-pointer"
                          >
                            Ok
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingStockId(prod.id);
                            setTempStockValue(prod.stock);
                          }}
                          className="hover:text-gold-400 cursor-edit select-none flex items-center gap-1.5 group"
                          title="Clique para editar rápido"
                        >
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            prod.stock <= 0 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : prod.stock <= (prod.minStock !== undefined ? prod.minStock : 5) 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' 
                              : 'bg-white/5 border border-white/10'
                          }`}>
                            {prod.stock <= 0 ? 'Esgotado' : prod.stock <= (prod.minStock !== undefined ? prod.minStock : 5) ? `Poucas Unidades (${prod.stock})` : `${prod.stock} un`}
                          </span>
                          <Edit3 size={10} className="text-theme-text group-hover:text-gold-400 transition opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>

                    {/* Column 5: Featured Star Toggle */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleFeatured(prod)}
                        className={`p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer ${
                          prod.featured ? 'text-gold-400' : 'text-theme-text'
                        }`}
                        title={prod.featured ? 'Remover dos destaques' : 'Destacar na vitrine'}
                      >
                        <Star size={16} className={prod.featured ? 'fill-gold-400' : ''} />
                      </button>
                    </td>

                    {/* Column 6: Status Tag / Eye Toggle */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          prod.status === 'publicado' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : prod.status === 'rascunho'
                            ? 'bg-gray-500/10 text-theme-muted border border-gray-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {prod.status || 'publicado'}
                        </span>
                        <button
                          onClick={() => handleToggleStatus(prod)}
                          className={`p-1 rounded hover:bg-white/5 transition cursor-pointer text-theme-muted hover:text-white`}
                          title={prod.status === 'publicado' ? 'Tornar Rascunho' : 'Publicar Produto'}
                        >
                          {prod.status === 'publicado' ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Column 7: Actions */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleTriggerEdit(prod)}
                          className="p-1.5 rounded-lg border border-theme-border-faint hover:border-gold-500/30 hover:bg-white/5 text-theme-muted hover:text-white transition cursor-pointer"
                          title="Editar dados"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleTriggerDuplicate(prod)}
                          className="p-1.5 rounded-lg border border-theme-border-faint hover:border-gold-500/30 hover:bg-white/5 text-theme-muted hover:text-white transition cursor-pointer"
                          title="Duplicar presente"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 rounded-lg border border-theme-border-faint hover:border-rose-500/30 hover:bg-rose-500/5 text-theme-muted hover:text-rose-400 transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={async (p) => {
          try {
            await handleSaveProduct(p);
          } catch (e) {
            console.error('Error saving product', e);
            setLoading(false);
            throw e;
          }
        }}
        productToEdit={editProduct}
        isDuplicating={isDuplicating}
      />

    </div>
  );
};
export default ProductsManager;
