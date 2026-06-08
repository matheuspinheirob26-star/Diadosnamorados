# 🌹 Amour & Co. — E-commerce de Presentes de Luxo

Amour & Co. é uma plataforma premium de comércio eletrônico focada em presentes sofisticados e kits de luxo para datas especiais. Inicialmente customizada para o **Dia dos Namorados**, com arquitetura modular preparada para transições sazonais completas (Dia das Mães, Dia dos Pais, Natal, Black Friday e Aniversários).

O design é inspirado nas identidades estéticas de grandes marcas de luxo globais (Apple, Rolex, Tesla), utilizando uma paleta refinada de tons de vinho (`wine`) e dourado (`gold`), tipografias elegantes e efeitos de glassmorphism.

---

## 🚀 Links do Projeto

| | |
|---|---|
| **Produção (Vercel)** | [https://diadosnamorados-iota.vercel.app/](https://diadosnamorados-iota.vercel.app/) |
| **Painel Admin** | [https://diadosnamorados-iota.vercel.app/#/admin](https://diadosnamorados-iota.vercel.app/#/admin) |
| **Login Admin** | [https://diadosnamorados-iota.vercel.app/#/admin/login](https://diadosnamorados-iota.vercel.app/#/admin/login) |

### 🔐 Credenciais do Painel Admin

| Função | E-mail | Senha |
|---|---|---|
| Administrador Principal | `admin@amour.com` | `Amour@2024` |
| Gerente de Loja | `gerente@amour.com` | `Gerente@2024` |

> **Dica:** Na tela de login do admin, use o botão **"Preencher credenciais admin demo"** para acessar com um clique.

---

## ✨ Recursos Implementados

### 🛒 Jornada do Cliente (Storefront)

- **Home de Alta Conversão:** Hero emocional com badge dinâmico da campanha ativa, carrossel de categorias sazonais, vitrine de lançamentos filtrada por produtos publicados e depoimentos de prova social.
- **Catálogo Avançado (`/catalog`):** Busca textual, filtros por categoria, gênero e faixa de preço, ordenação (mais vendidos, menor/maior preço, lançamentos). Exibe apenas produtos publicados.
- **Página de Produto (`/product/:id`):**
  - Galeria premium com suporte a vídeo
  - Seletor de variações profissional por tipo (tamanho, cor, modelo, fragrância, embalagem)
  - **Preço efetivo calculado em tempo real** somando acréscimos de variações
  - Variações esgotadas bloqueadas e riscadas
  - Badges dinâmicos: Destaque 🔥, Campanha ✨, Poucas Unidades ⚠️, Esgotado
  - Simulador de frete por CEP
  - Atalho para WhatsApp com descrição das variações escolhidas
- **Checkout Premium de 3 Passos:**
  1. *Lead Capture:* Nome, e-mail e telefone para recuperação de carrinho abandonado
  2. *Dados e Envio:* Endereço via CEP + cálculo de frete + cupom de desconto
  3. *Pagamento:* Pix com QR Code e Copia e Cola, cartão de crédito 10x sem juros
- **Carrinho Lateral (Cart Drawer):** Suporte a variações combinadas (Kit M + Vanilla e Kit G + Vanilla entram como itens separados), barra de progresso para frete grátis, Order Bump
- **Popups de Conversão:** Prova social em tempo real e captura de leads com cupom de boas-vindas
- **Concierge de IA Premium (Gemini):** Chat flutuante integrado ao catálogo em tempo real, que captura leads (nome/telefone) e ajuda os clientes de forma persuasiva, equipado com taxa de limites anti-abuso e fallback para atendimento humano no WhatsApp.

---

### 🛡️ Painel Administrativo (`/admin`)

#### 🔒 Autenticação Segura
- Tela de login admin dedicada em `/admin/login` (layout split-panel premium)
- Validação de credenciais com e-mail + senha
- Sessão com **expiração automática em 8 horas**
- **Proteção brute-force:** bloqueio de 30 segundos após 5 tentativas erradas com contador regressivo
- Rota `/admin` protegida: redireciona para o login se não autenticado
- Sidebar exibe nome, e-mail e horário de login do administrador

#### 📊 Funcionalidades do Painel
- **Dashboard:** KPIs financeiros (faturamento aprovado, ticket médio, leads ativos) + gráfico analítico de faturamento diário
- **Pedidos:** Fila completa com atualização de status e código de rastreamento
- **Gestão de Produtos (CRUD completo):**
  - Listagem com subabas: Todos · Estoque Baixo · Esgotados · Destaques · Campanhas
  - Busca, filtro por categoria e status
  - Upload de imagem principal + galeria múltipla (drag & drop, preview, reordenar)
  - Upload real no Supabase Storage com **fallback automático em base64**
  - Gerenciador visual de variações (tamanho, cor, modelo, fragrância, embalagem) com preço adicional, estoque e SKU próprios
  - Controle de estoque avançado: estoque mínimo, alerta de estoque baixo, venda sem estoque
  - Status: Rascunho · Publicado · Arquivado
  - Marcar como Destaque ou vincular à Campanha Sazonal
  - Preview de SEO em tempo real
  - Duplicar, editar e excluir produtos
- **Clientes:** Base unificada de compradores com total investido
- **Leads / Carrinhos Abandonados:** Recuperação com disparo de mensagem personalizada via WhatsApp
- **Moderação de Avaliações:** Aprovação/exclusão de reviews com fotos
- **Cupons:** Criação por porcentagem ou valor fixo com validade e mínimo de compra
- **Campanhas Sazonais:** Alternância do tema visual e curadoria da loja em tempo real
- **Configurações:** WhatsApp, e-mail, frete grátis, gateways de pagamento
- **Concierge IA (Gemini):** Configuração segura da Chave de API, nome do bot e prompt do sistema protegido por RLS (Row Level Security).

---

## 🛠️ Tecnologia Utilizada

| Camada | Tecnologia |
|---|---|
| **Core** | React 19 + TypeScript + Vite |
| **Estilização** | Tailwind CSS v4 (tokens HSL customizados no `index.css`) |
| **Animações** | Framer Motion |
| **Banco / Auth** | Supabase (com fallback automático para LocalStorage) |
| **Imagens Admin** | Supabase Storage (bucket `product-images`) + fallback base64 |
| **Roteamento** | Custom SPA com suporte a hash routing (Vercel) |

### Arquitetura Híbrida

Se o Supabase estiver offline ou sem tabelas configuradas, a aplicação ativa automaticamente um banco mockado no `LocalStorage` (`amr_products`, `amr_orders`, etc.), garantindo que a loja funcione 100% sem quebrar.

---

## 💾 Configuração do Banco de Dados (Supabase)

1. Acesse seu projeto no **[Supabase](https://supabase.com/)**
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo do arquivo [`schema.sql`](./schema.sql) da raiz do projeto
4. Clique em **Run** para criar as tabelas e inserir os dados iniciais

*(Tabelas criadas: `products`, `coupons`, `reviews`, `orders`, `leads`)*

### Supabase Storage (Imagens de Produtos)

Para ativar o upload real de imagens no painel admin:

1. No Supabase, vá em **Storage → New Bucket**
2. Crie um bucket chamado `product-images`
3. Marque como **Public**
4. Configure a política de upload para o role `anon` (ou `authenticated` conforme sua preferência)

### Edge Functions (Supabase)

O serviço do Concierge de IA exige o deploy da nossa Edge Function segura. Se tiver o CLI do Supabase:
1. Pelo terminal do projeto: `supabase functions deploy chat-concierge --no-verify-jwt`
2. Configure as variáveis de ambiente necessárias (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`) nos *Secrets* da sua Edge Function caso não sejam mapeadas automaticamente.

---

## ⚙️ Configuração Local

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/matheuspinheirob26-star/Diadosnamorados.git
cd Diadosnamorados
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> Sem o `.env`, o projeto funciona normalmente com dados mockados no LocalStorage.

### 3. Rodar Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse em: **[http://localhost:5173/](http://localhost:5173/)**

---

## 📦 Deploy (Vercel)

O projeto já está configurado com `vercel.json` para roteamento SPA sem erros 404.

```bash
npx vercel --prod
```

Não esqueça de adicionar as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da Vercel em **Settings → Environment Variables**.

---

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── admin/          # AdminLayout, AdminSidebar, ProductsManager, ProductFormModal
│   ├── cart/           # CartDrawer, OrderBump
│   ├── layout/         # Header, Footer
│   ├── product/        # ProductCard, ProductGallery, ReviewsSection
│   └── ui/             # NotificationPopup, NewsletterPopup
├── context/
│   ├── AuthContext.tsx  # Auth admin (login, sessão, expiração)
│   ├── CartContext.tsx  # Carrinho com suporte a variações
│   └── CampaignContext.tsx
├── lib/
│   ├── supabase.ts     # API híbrida (Supabase + LocalStorage fallback)
│   ├── tracking.ts     # Pixel / Analytics
│   └── utils.ts
├── pages/
│   ├── Admin.tsx        # Painel admin completo
│   ├── AdminLogin.tsx   # Tela de login admin dedicada
│   ├── Catalog.tsx
│   ├── Checkout.tsx
│   ├── Home.tsx
│   ├── Login.tsx        # Login de cliente
│   └── ProductDetail.tsx
└── types/
    └── index.ts        # Product, CartItem, Order, Lead, Coupon, Review, Campaign
```
