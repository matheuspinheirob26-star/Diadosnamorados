import React, { useState, useEffect } from 'react';
import { useStorefront } from '../../context/StorefrontContext';
import { StorefrontConfig, DEFAULT_STOREFRONT_CONFIG } from '../../types/storefront';
import { Save, RefreshCcw, Image as ImageIcon, Link as LinkIcon, Type, Palette, MessageCircle, BarChart, Sparkles, Upload } from 'lucide-react';
import { api } from '../../lib/supabase';
import { LogService } from '../../lib/LogService';

const ImageUploadInput = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const url = await api.uploadImage(file, 'product-images', `storefront/${Date.now()}_${file.name}`);
      if (url) onChange(url);
    } catch (err) {
      console.error(err);
      alert('Erro no upload. Tente novamente ou use uma URL.');
      LogService.log('Erro de Configuração', 'Falha ao tentar salvar configurações da vitrine.', 'Admin', 'admin@amour.co', 'sistema', 'storefront', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder || "https://..."}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
        />
        <label className="flex items-center justify-center bg-theme-border-faint hover:bg-white/10 border border-theme-border rounded-lg px-3 cursor-pointer transition" title="Fazer Upload de Imagem">
          {isUploading ? <span className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></span> : <Upload size={16} className="text-theme-muted hover:text-gold-400" />}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={isUploading} />
        </label>
      </div>
    </div>
  );
};

export const StorefrontCustomizer: React.FC = () => {
  const { config, setPreviewConfig, updateConfig } = useStorefront();
  const [localConfig, setLocalConfig] = useState<StorefrontConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'identity' | 'hero' | 'social' | 'tracking'>('colors');

  // Mantém localConfig atualizado se a config global mudar por fora
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  // Atualiza o preview global a cada digitação
  const handleChange = (field: keyof StorefrontConfig, value: string | number | boolean) => {
    const updated = { ...localConfig, [field]: value } as StorefrontConfig;
    setLocalConfig(updated);
    setPreviewConfig(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateConfig(localConfig);
    setPreviewConfig(null); // Limpa o preview pois já salvou
    setIsSaving(false);
    LogService.log('Configuração Alterada', 'Vitrine Pública e identidades visuais foram atualizadas.', 'Admin', 'admin@amour.co', 'sistema', 'storefront', 'success');
    alert('Configurações da vitrine salvas com sucesso!');
  };

  const handleRestore = () => {
    if (window.confirm('Tem certeza que deseja restaurar as configurações originais? Isso não pode ser desfeito.')) {
      setLocalConfig(DEFAULT_STOREFRONT_CONFIG);
      setPreviewConfig(DEFAULT_STOREFRONT_CONFIG);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* LEFT: FORM (Customizer) */}
      <div className="flex-1 flex flex-col space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif text-theme-text tracking-wider uppercase mb-1">Personalização</h2>
            <p className="text-theme-muted text-xs">Altere a vitrine em tempo real.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRestore} className="p-2 bg-theme-border-faint hover:bg-white/10 border border-theme-border rounded-lg text-theme-muted transition" title="Restaurar Original">
              <RefreshCcw size={16} />
            </button>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-gradient-gold hover:opacity-90 text-theme-text text-sm font-bold uppercase rounded-lg transition disabled:opacity-50">
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-theme-border-faint pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'colors', label: 'Cores', icon: Palette },
            { id: 'identity', label: 'Textos', icon: Type },
            { id: 'hero', label: 'Banners', icon: ImageIcon },
            { id: 'social', label: 'Rodapé', icon: MessageCircle },
            { id: 'tracking', label: 'Pixels', icon: BarChart },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs transition whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-gold-400 font-bold border-b-2 border-gold-400' 
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-border-faint'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-luxury-gray border border-theme-border-faint rounded-xl p-4 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* TAB CORES & TEMA */}
        {activeTab === 'colors' && (
          <div className="space-y-8 max-w-2xl">
            <div className="space-y-6">
              <h3 className="text-lg font-serif text-theme-text border-b border-theme-border pb-2">Tema Claro/Escuro</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Tema Padrão da Loja</label>
                  <select
                    value={localConfig.defaultTheme}
                    onChange={e => handleChange('defaultTheme', e.target.value)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text focus:outline-none focus:border-gold-500"
                  >
                    <option value="dark" className="bg-luxury-gray text-theme-text">Modo Escuro (Padrão Luxo)</option>
                    <option value="light" className="bg-luxury-gray text-theme-text">Modo Claro</option>
                    <option value="system" className="bg-luxury-gray text-theme-text">Preferência do Sistema</option>
                  </select>
                </div>
                
                <div className="flex flex-col justify-center space-y-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localConfig.allowUserThemeToggle}
                      onChange={e => handleChange('allowUserThemeToggle', e.target.checked)}
                      className="form-checkbox text-gold-500 rounded bg-theme-border-faint border-theme-border focus:ring-gold-500 focus:ring-offset-luxury-gray"
                    />
                    <span className="text-sm font-medium text-theme-text">Permitir que o cliente alterne o tema?</span>
                  </label>
                  <p className="text-[10px] text-theme-muted pl-6">Se ativo, exibe o botão 🌓 no menu.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-serif text-theme-text border-b border-theme-border pb-2">Paleta de Cores da Marca</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Cor Primária (Destaques e Botões)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localConfig.primaryColor}
                    onChange={e => handleChange('primaryColor', e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={localConfig.primaryColor}
                    onChange={e => handleChange('primaryColor', e.target.value)}
                    className="flex-1 bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Cor Secundária (Acentos)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localConfig.secondaryColor}
                    onChange={e => handleChange('secondaryColor', e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input 
                    type="text" 
                    value={localConfig.secondaryColor}
                    onChange={e => handleChange('secondaryColor', e.target.value)}
                    className="flex-1 bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* TAB IDENTIDADE */}
        {activeTab === 'identity' && (
          <div className="space-y-8 max-w-3xl">
            <div className="space-y-4">
              <h3 className="text-lg font-serif text-theme-text border-b border-theme-border pb-2">Informações Básicas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Nome da Loja</label>
                  <input
                    type="text"
                    value={localConfig.storeName}
                    onChange={e => handleChange('storeName', e.target.value)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Slogan</label>
                  <input
                    type="text"
                    value={localConfig.slogan}
                    onChange={e => handleChange('slogan', e.target.value)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-serif text-theme-text border-b border-theme-border pb-2">Logos (URLs)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadInput
                  label="Logo Modo Claro"
                  value={localConfig.logoLight}
                  onChange={v => handleChange('logoLight', v)}
                />
                <ImageUploadInput
                  label="Logo Modo Escuro"
                  value={localConfig.logoDark}
                  onChange={v => handleChange('logoDark', v)}
                />
                <ImageUploadInput
                  label="Favicon"
                  value={localConfig.favicon}
                  onChange={v => handleChange('favicon', v)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-serif text-theme-text border-b border-theme-border pb-2">Barra de Frete Grátis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Texto da Barra</label>
                  <input
                    type="text"
                    value={localConfig.shippingBarText}
                    onChange={e => handleChange('shippingBarText', e.target.value)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Valor Mín. Frete Grátis (R$)</label>
                  <input
                    type="number"
                    value={localConfig.minFreeShippingValue}
                    onChange={e => handleChange('minFreeShippingValue', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-serif text-theme-text border-b border-theme-border pb-2">Pop-up Inicial</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Texto do Pop-up</label>
                  <input
                    type="text"
                    value={localConfig.popupText}
                    onChange={e => handleChange('popupText', e.target.value)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Cupom Exibido</label>
                  <input
                    type="text"
                    value={localConfig.popupCoupon}
                    onChange={e => handleChange('popupCoupon', e.target.value)}
                    className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB HERO BANNER */}
        {activeTab === 'hero' && (
          <div className="space-y-8 max-w-3xl">
            <div className="bg-gold-500/10 border border-gold-500/20 p-4 rounded-lg">
              <p className="text-xs text-gold-400">
                O Hero Banner padrão da loja (quando não houver uma campanha sazonal ativa sobrepondo).
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ImageUploadInput
                label="Banner Desktop URL"
                value={localConfig.heroBannerDesktop}
                onChange={v => handleChange('heroBannerDesktop', v)}
              />
              <ImageUploadInput
                label="Banner Mobile URL"
                value={localConfig.heroBannerMobile}
                onChange={v => handleChange('heroBannerMobile', v)}
              />
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Texto da Tag / Badge Exclusivo</label>
                <input
                  type="text"
                  placeholder="Ex: ✨ ❤️ ESPECIAL DIA DOS NAMORADOS"
                  value={localConfig.heroBadge}
                  onChange={e => handleChange('heroBadge', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Título Principal</label>
                <input
                  type="text"
                  value={localConfig.heroTitle}
                  onChange={e => handleChange('heroTitle', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Subtítulo</label>
                <input
                  type="text"
                  value={localConfig.heroSubtitle}
                  onChange={e => handleChange('heroSubtitle', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Texto do Botão</label>
                <input
                  type="text"
                  value={localConfig.heroButtonText}
                  onChange={e => handleChange('heroButtonText', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Link do Botão</label>
                <input
                  type="text"
                  placeholder="Ex: catalog ou product-123"
                  value={localConfig.heroButtonLink}
                  onChange={e => handleChange('heroButtonLink', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTATOS E SOCIAL */}
        {activeTab === 'social' && (
          <div className="space-y-8 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block flex items-center gap-1"><MessageCircle size={10}/> WhatsApp Principal</label>
                <input
                  type="text"
                  value={localConfig.whatsapp}
                  onChange={e => handleChange('whatsapp', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">E-mail de Suporte</label>
                <input
                  type="email"
                  value={localConfig.supportEmail}
                  onChange={e => handleChange('supportEmail', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Instagram URL</label>
                <input
                  type="text"
                  value={localConfig.instagramUrl}
                  onChange={e => handleChange('instagramUrl', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Facebook URL</label>
                <input
                  type="text"
                  value={localConfig.facebookUrl}
                  onChange={e => handleChange('facebookUrl', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">TikTok URL</label>
                <input
                  type="text"
                  value={localConfig.tiktokUrl}
                  onChange={e => handleChange('tiktokUrl', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">YouTube URL</label>
                <input
                  type="text"
                  value={localConfig.youtubeUrl}
                  onChange={e => handleChange('youtubeUrl', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
            </div>

            <div className="space-y-1 mt-6">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Endereço da Loja (Rodapé)</label>
              <textarea
                value={localConfig.storeAddress}
                onChange={e => handleChange('storeAddress', e.target.value)}
                className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text min-h-[60px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Texto de Copyright (Rodapé)</label>
              <textarea
                value={localConfig.footerText}
                onChange={e => handleChange('footerText', e.target.value)}
                className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text min-h-[60px]"
              />
            </div>
          </div>
        )}

        {/* TAB TRACKING */}
        {activeTab === 'tracking' && (
          <div className="space-y-4">
            <h3 className="text-sm font-serif text-theme-text border-b border-theme-border pb-2">Pixels e Analytics</h3>
            <div className="bg-theme-border-faint border border-theme-border p-3 rounded-lg mb-4">
              <p className="text-[10px] text-theme-muted">
                Cole aqui os IDs dos seus pixels (ex: <span className="text-gold-400 font-mono">123456789</span> para Meta).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Meta Pixel ID</label>
                <input
                  type="text"
                  placeholder="Ex: 123456789012345"
                  value={localConfig.metaPixel}
                  onChange={e => handleChange('metaPixel', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Google Analytics (G-TAG)</label>
                <input
                  type="text"
                  placeholder="Ex: G-XXXXXXXXXX"
                  value={localConfig.googleAnalytics}
                  onChange={e => handleChange('googleAnalytics', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Google Tag Manager (GTM)</label>
                <input
                  type="text"
                  placeholder="Ex: GTM-XXXXXX"
                  value={localConfig.googleTagManager}
                  onChange={e => handleChange('googleTagManager', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">TikTok Pixel ID</label>
                <input
                  type="text"
                  placeholder="Ex: C1234567890"
                  value={localConfig.tiktokPixel}
                  onChange={e => handleChange('tiktokPixel', e.target.value)}
                  className="w-full bg-theme-border-faint border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* RIGHT: LIVE PREVIEW */}
      <div className="hidden lg:flex flex-1 flex-col space-y-2 relative">
        <h3 className="text-xs uppercase tracking-widest text-theme-muted font-bold">Preview ao Vivo</h3>
        
        {/* Container do Mock - Escalado para caber na tela */}
        <div className="flex-1 bg-black rounded-xl border border-theme-border overflow-hidden relative flex flex-col items-center justify-start p-4 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAHElEQVQYV2NkYGAwYcADIwMkgIETUIIhhV0YAAAAASUVORK5CYII=')] bg-repeat">
          
          <div className="w-[1024px] h-[768px] origin-top scale-[0.45] xl:scale-[0.55] 2xl:scale-[0.65] bg-luxury-black border border-theme-border shadow-2xl rounded-sm overflow-hidden flex flex-col pointer-events-none select-none transition-all duration-300">
            
            {/* Header Mock */}
            <div className="border-b border-theme-border-faint bg-luxury-gray/90 backdrop-blur-md">
              <div className="bg-gradient-gold text-theme-text text-xs font-semibold py-1.5 px-4 text-center tracking-widest uppercase">
                {localConfig.shippingBarText}
              </div>
              <div className="h-20 px-8 flex items-center justify-between">
                <div className="text-left">
                  {localConfig.logoLight ? (
                    <img src={localConfig.logoLight} alt="Logo" className="h-8 object-contain" />
                  ) : (
                    <>
                      <span className="font-serif text-2xl tracking-widest font-light text-gradient-gold uppercase block">
                        {localConfig.storeName}
                      </span>
                      <span className="text-[9px] tracking-[0.3em] font-medium text-theme-muted uppercase -mt-1 block">
                        {localConfig.slogan}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex space-x-6">
                  <div className="text-xs font-semibold tracking-widest uppercase text-gold-400 border-b border-gold-400/50 pb-1">INÍCIO</div>
                  <div className="text-xs font-semibold tracking-widest uppercase text-theme-muted">PRESENTES</div>
                </div>
              </div>
            </div>

            {/* Hero Mock */}
            <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
              {localConfig.heroBannerDesktop && (
                <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${localConfig.heroBannerDesktop})` }} />
              )}
              <div className="absolute inset-0 bg-gradient-luxury opacity-80" />
              
              <div className="relative z-10 text-center space-y-6 max-w-2xl">
                {localConfig.heroBadge && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-theme-border-faint border border-theme-border text-[10px] sm:text-xs font-bold tracking-widest text-gold-400 uppercase">
                    <Sparkles size={12} className="animate-spin-slow" />
                    <span>{localConfig.heroBadge}</span>
                  </div>
                )}
                
                <h1 className="font-serif text-5xl font-extralight tracking-tight text-theme-text">
                  {localConfig.heroTitle}
                </h1>
                <p className="text-theme-muted text-lg font-light">
                  {localConfig.heroSubtitle}
                </p>
                <button className="bg-gradient-gold text-theme-text px-8 py-3 rounded-full font-bold tracking-widest uppercase text-sm mt-4">
                  {localConfig.heroButtonText}
                </button>
              </div>
            </div>

            {/* Footer Mock */}
            <div className="bg-luxury-gray/50 border-t border-theme-border-faint p-6 flex flex-col items-center justify-center text-center space-y-2">
               <div className="text-gold-400 font-serif text-xl tracking-widest">{localConfig.storeName}</div>
               <p className="text-xs text-theme-muted">{localConfig.storeAddress}</p>
               <p className="text-[10px] text-theme-text">{localConfig.footerText}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
