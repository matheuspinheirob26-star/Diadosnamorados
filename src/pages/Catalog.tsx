import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { api } from '../lib/supabase';
import { ProductCard } from '../components/product/ProductCard';
import { Search, SlidersHorizontal, X, ArrowUpDown, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface CatalogProps {
  onNavigate: (page: string) => void;
  filterState: { category?: string; gender?: string; tag?: string };
  onResetFilter: () => void;
  searchQuery?: string;
}

export const Catalog: React.FC<CatalogProps> = ({ onNavigate, filterState, onResetFilter, searchQuery: propSearchQuery }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos filtros
  const [search, setSearch] = useState(propSearchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(filterState.category || 'Todos');
  const [selectedGender, setSelectedGender] = useState<string>(filterState.gender || 'Todos');
  const [priceRange, setPriceRange] = useState<string>('Todos'); // Todos, ate200, 200a500, acima500
  const [sortBy, setSortBy] = useState<string>('mais-vendidos'); // mais-vendidos, menor-preco, maior-preco, novidades
  
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Categorias únicas
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const data = await api.getProducts();
      // Apenas produtos publicados na vitrine do cliente
      const published = data.filter(p => !p.status || p.status === 'publicado');
      setProducts(published);
      
      // Extrair categorias
      const cats = Array.from(new Set(published.map(p => p.category)));
      setCategories(['Todos', ...cats]);
      
      setLoading(false);
    };

    fetchProducts();

    window.addEventListener('productsUpdated', fetchProducts);
    return () => window.removeEventListener('productsUpdated', fetchProducts);
  }, []);

  // Sincronizar parâmetros de filtro vindos da Home ou do Header
  useEffect(() => {
    if (filterState.category) {
      setSelectedCategory(filterState.category);
    } else {
      setSelectedCategory('Todos');
    }

    if (filterState.gender) {
      setSelectedGender(filterState.gender);
    } else {
      setSelectedGender('Todos');
    }

    if (propSearchQuery !== undefined) {
      setSearch(propSearchQuery);
    }
  }, [filterState, propSearchQuery]);

  // Aplicar filtros
  useEffect(() => {
    let result = [...products];

    // Busca textual
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) || 
             p.description.toLowerCase().includes(q) || 
             p.category.toLowerCase().includes(q)
      );
    }

    // Filtro Categoria
    if (selectedCategory !== 'Todos') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filtro Gênero
    if (selectedGender !== 'Todos') {
      result = result.filter(p => p.gender === selectedGender.toLowerCase() || p.gender === 'unissex');
    }

    // Filtro Faixa de Preço
    if (priceRange !== 'Todos') {
      if (priceRange === 'ate200') {
        result = result.filter(p => p.price <= 200);
      } else if (priceRange === '200a500') {
        result = result.filter(p => p.price > 200 && p.price <= 500);
      } else if (priceRange === 'acima500') {
        result = result.filter(p => p.price > 500);
      }
    }

    // Filtro por Tag vindo de campanhas
    if (filterState.tag) {
      result = result.filter(p => p.tags.includes(filterState.tag!));
    }

    // Ordenação
    if (sortBy === 'mais-vendidos') {
      result.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
    } else if (sortBy === 'menor-preco') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'maior-preco') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'novidades') {
      // Ordenação arbitrária de estoque/tags
      result.sort((a, b) => a.stock - b.stock);
    }

    setFilteredProducts(result);
  }, [products, search, selectedCategory, selectedGender, priceRange, sortBy, filterState]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('Todos');
    setSelectedGender('Todos');
    setPriceRange('Todos');
    setSortBy('mais-vendidos');
    onResetFilter();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen">
      
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h2 className="font-serif text-3xl text-white tracking-widest uppercase">
          {selectedCategory !== 'Todos' ? selectedCategory : 'Coleção de Presentes'}
        </h2>
        <div className="h-0.5 w-16 bg-gradient-gold mx-auto" />
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          {filteredProducts.length} presente{filteredProducts.length !== 1 && 's'} disponível{filteredProducts.length !== 1 && 's'}
        </p>
      </div>

      {/* Filter and Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Filter Column (Desktop) */}
        <aside className="hidden lg:block space-y-6 bg-white/2 border border-theme-border-faint p-6 rounded-2xl h-fit">
          
          <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
            <span className="text-xs font-semibold text-white tracking-wider uppercase flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-gold-500" /> Filtros
            </span>
            <button
              onClick={handleClearFilters}
              className="text-[10px] text-gray-500 hover:text-gold-400 font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Limpar
            </button>
          </div>

          {/* Search Box */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Buscar</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Categoria</label>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-left text-xs py-1.5 px-2 rounded-lg transition-all ${
                    selectedCategory === cat
                      ? 'bg-gold-500/10 text-gold-400 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Perfil</label>
            <div className="flex flex-col gap-1">
              {['Todos', 'Masculino', 'Feminino'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => setSelectedGender(gender)}
                  className={`text-left text-xs py-1.5 px-2 rounded-lg transition-all ${
                    selectedGender === gender
                      ? 'bg-gold-500/10 text-gold-400 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Preço</label>
            <div className="flex flex-col gap-1">
              {[
                { label: 'Todos os preços', value: 'Todos' },
                { label: 'Até R$ 200', value: 'ate200' },
                { label: 'R$ 200 a R$ 500', value: '200a500' },
                { label: 'Acima de R$ 500', value: 'acima500' }
              ].map((range) => (
                <button
                  key={range.value}
                  onClick={() => setPriceRange(range.value)}
                  className={`text-left text-xs py-1.5 px-2 rounded-lg transition-all ${
                    priceRange === range.value
                      ? 'bg-gold-500/10 text-gold-400 font-semibold'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

        </aside>

        {/* Right Product Grid */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls Bar */}
          <div className="flex items-center justify-between bg-white/2 border border-theme-border-faint px-4 py-3 rounded-xl">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 text-xs text-white border border-white/10 px-3 py-1.5 rounded-lg bg-white/5 cursor-pointer"
            >
              <SlidersHorizontal size={14} />
              <span>Filtros</span>
            </button>
            
            <span className="hidden sm:inline text-xs text-gray-500">
              Mostrando {filteredProducts.length} de {products.length} presentes
            </span>

            {/* Sorting Selector */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={12} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-luxury-black border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-gold-500 transition cursor-pointer"
              >
                <option value="mais-vendidos">Mais Vendidos</option>
                <option value="menor-preco">Menor Preço</option>
                <option value="maior-preco">Maior Preço</option>
                <option value="novidades">Lançamentos</option>
              </select>
            </div>
          </div>

          {/* Active Tags / Filters indicator */}
          {(selectedCategory !== 'Todos' || selectedGender !== 'Todos' || priceRange !== 'Todos' || search.trim() !== '') && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mr-1">Filtros ativos:</span>
              
              {search.trim() !== '' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-300">
                  Busca: "{search}"
                  <X size={10} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setSearch('')} />
                </span>
              )}
              {selectedCategory !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-300">
                  Cat: {selectedCategory}
                  <X size={10} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setSelectedCategory('Todos')} />
                </span>
              )}
              {selectedGender !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-300">
                  Perfil: {selectedGender}
                  <X size={10} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setSelectedGender('Todos')} />
                </span>
              )}
              {priceRange !== 'Todos' && (
                <span className="inline-flex items-center gap-1.5 text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-300">
                  Preço: {priceRange === 'ate200' ? 'Até R$200' : priceRange === '200a500' ? 'R$200 a R$500' : 'Acima de R$500'}
                  <X size={10} className="text-gray-500 hover:text-white cursor-pointer" onClick={() => setPriceRange('Todos')} />
                </span>
              )}
            </div>
          )}

          {/* Grid Panel */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-luxury-gray border border-theme-border-faint h-80 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white/2 border border-dashed border-theme-border-faint rounded-3xl p-12 text-center space-y-4">
              <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-gray-500">
                <HelpCircle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-white tracking-wider text-lg">Nenhum Presente Encontrado</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Tente alterar os termos de busca ou redefinir os filtros para explorar toda a nossa coleção de presentes finos.
                </p>
              </div>
              <button
                onClick={handleClearFilters}
                className="bg-gradient-gold text-gray-900 font-semibold text-xs tracking-widest uppercase px-6 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onNavigateToDetail={(id) => onNavigate(`product-${id}`)}
                />
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Mobile Drawer Filters */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" onClick={() => setMobileFiltersOpen(false)} />
          
          {/* Drawer content */}
          <div className="relative w-full max-w-xs bg-luxury-gray h-full border-l border-theme-border-faint p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
                <span className="text-xs font-semibold text-white tracking-wider uppercase flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-gold-500" /> Filtros
                </span>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Box */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Buscar</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Pesquisar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Categoria</label>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[10px] py-1.5 px-3 rounded-lg border transition ${
                        selectedCategory === cat
                          ? 'bg-gold-500/15 text-gold-400 border-gold-500/25 font-bold'
                          : 'bg-white/5 border-transparent text-gray-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Perfil</label>
                <div className="flex gap-1.5">
                  {['Todos', 'Masculino', 'Feminino'].map((gender) => (
                    <button
                      key={gender}
                      onClick={() => setSelectedGender(gender)}
                      className={`flex-1 text-[10px] py-1.5 rounded-lg border text-center transition ${
                        selectedGender === gender
                          ? 'bg-gold-500/15 text-gold-400 border-gold-500/25 font-bold'
                          : 'bg-white/5 border-transparent text-gray-400'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Preço</label>
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Todos os preços', value: 'Todos' },
                    { label: 'Até R$ 200', value: 'ate200' },
                    { label: 'R$ 200 a R$ 500', value: '200a500' },
                    { label: 'Acima de R$ 500', value: 'acima500' }
                  ].map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setPriceRange(range.value)}
                      className={`text-left text-[10px] py-1.5 px-3 rounded-lg border transition ${
                        priceRange === range.value
                          ? 'bg-gold-500/15 text-gold-400 border-gold-500/25 font-bold'
                          : 'bg-white/5 border-transparent text-gray-400'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-theme-border-faint pt-4">
              <button
                onClick={handleClearFilters}
                className="flex-1 border border-white/10 hover:bg-white/5 text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
              >
                Limpar
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 bg-gradient-gold text-gray-900 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default Catalog;
