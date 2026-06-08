# 🌹 Amour & Co. — E-commerce de Presentes de Luxo

Amour & Co. é uma plataforma premium de comércio eletrônico focada em presentes sofisticados e kits de luxo para datas especiais, inicialmente customizada para o **Dia dos Namorados**, mas com arquitetura modular preparada para transições sazonais completas (Dia das Mães, Dia dos Pais, Natal, Black Friday e Aniversários).

O design e a experiência visual foram inspirados nas identidades estéticas de grandes marcas de luxo globais, como Apple, Rolex e Tesla, utilizando uma paleta refinada de tons de vinho (`wine`) e dourado (`gold`), tipografias elegantes e efeitos de glassmorphism em toda a interface.

---

## 🚀 Demonstração do Projeto

*   **URL de Produção (Vercel):** [https://diadosnamorados-iota.vercel.app/](https://diadosnamorados-iota.vercel.app/)
*   **Acesso Rápido ao Painel Administrativo:**
    *   Vá para a tela de login (`/login` ou clique no ícone de Usuário no menu superior).
    *   Utilize o botão de **"Acesso Rápido Admin de Testes"** no rodapé para acessar o painel de faturamento imediatamente sem digitar senhas.
    *   Ou acesse diretamente via URL com fallback seguro: [https://diadosnamorados-iota.vercel.app/#/admin](https://diadosnamorados-iota.vercel.app/#/admin)

---

## ✨ Recursos Implementados

### 🛒 Jornada do Cliente (Storefront)
*   **Landing Page de Alta Conversão (Home):** Banner hero emocional com badge dinâmico da campanha, carrossel de categorias sazonais, vitrine de lançamentos e depoimentos de prova social com estrelas avaliativas.
*   **Catálogo Avançado (`/catalog`):** Busca textual inteligente por produtos, filtros dinâmicos por categoria, gênero, preço e ordenação customizada (mais vendidos, maior/menor preço).
*   **Página de Detalhes do Produto (`/product/:id`):** Galeria premium de imagens e vídeos, simulador de CEP de frete integrado (Melhor Envio & Correios), escolha de tamanho dinâmico e seção de avaliações de clientes.
*   **Checkout Premium de 3 Passos (`/checkout`):**
    1.  *Passo 1 (Lead Capture):* Coleta nome, e-mail e telefone em tempo real para recuperação ativa de carrinho abandonado.
    2.  *Passo 2 (Dados e Envio):* Cadastro de endereço via CEP, cálculo de opções de envio e sistema de cupom de desconto avançado (ex: `NAMORADOS10`, `VIP20`).
    3.  *Passo 3 (Pagamento):* Integração de tela simulada de Pix com QR Code e Copia e Cola, e cartão de crédito parcelado em até 10x sem juros.
*   **Carrinho Lateral (Cart Drawer):** Acesso rápido aos itens, indicação de barra de progresso para ganhar Frete Grátis e Order Bump selecionável (embalagem de veludo laqueada).
*   **Popups de Conversão:** Alertas de prova social em tempo real ("Alguém comprou em São Paulo há 2 min") e convites de captura de leads com cupom de boas-vindas.

### 🛡️ Painel Administrativo Completo (`/admin`)
*   **Dashboard de Vendas:** KPIs financeiros (Faturamento Aprovado, Ticket Médio, Conversão, Leads Ativos) e gráfico analítico de faturamento diário.
*   **Gestão de Pedidos:** Fila com filtros de status (Pendente, Pago, Processando, Enviado, Entregue) e detalhamento de dados do comprador, endereço de entrega e código de rastreamento.
*   **Gestão de Leads (Carrinhos Abandonados):** Lista de carrinhos abandonados com disparo automático de mensagem de desconto personalizada diretamente no WhatsApp do cliente para recuperação ativa.
*   **Moderação de Avaliações:** Aprovação ou exclusão de reviews de clientes com fotos antes de irem ao ar.
*   **Criador de Cupons:** Painel para gerenciar, deletar ou criar cupons por porcentagem ou valor fixo, com definição de data de validade e compra mínima.

---

## 🛠️ Tecnologia Utilizada

*   **Core:** React 19 + TypeScript + Vite.
*   **Estilização:** Tailwind CSS v4.0 (Custom HSL tokens e gradientes no `index.css`).
*   **Animações:** Framer Motion (Transições e fade-ins de elementos).
*   **Banco de Dados & Auth:** Supabase + Fallback Local.
*   **Arquitetura Híbrida Inteligente:** Se o Supabase estiver fora do ar ou sem tabelas, a aplicação ativa automaticamente um banco mockado no `LocalStorage` (`amr_products`, `amr_orders`, etc.), garantindo que a loja funcione 100% no primeiro clique sem quebrar.

---

## 💾 Configuração do Banco de Dados (Supabase)

Para conectar o projeto ao seu banco de dados Supabase e popular com o catálogo inicial premium:

1.  Acesse o painel do seu projeto no **[Supabase](https://supabase.com/)**.
2.  No menu lateral esquerdo, clique em **SQL Editor** (ícone `SQL`).
3.  Crie uma nova query (**New Query**).
4.  Abra o arquivo [`schema.sql`](file:///c:/Users/glaub/OneDrive/Área de Trabalho/loja dos dias dos namorados/schema.sql) localizado na raiz deste projeto, copie todo o seu código SQL e cole-o no SQL Editor do Supabase.
5.  Clique no botão **Run** no canto inferior direito para rodar o script.
    *(Este comando criará as tabelas `products`, `coupons`, `reviews`, `orders`, `leads` e injetará os presentes de luxo padrão).*

---

## ⚙️ Configuração Local

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/matheuspinheirob26-star/Diadosnamorados.git
cd Diadosnamorados
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as chaves do seu Supabase:
```env
VITE_SUPABASE_URL=https://dixockjnarjouuvkgpdj.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 3. Rodar Servidor de Desenvolvimento
```bash
npm run dev
```
O projeto estará rodando localmente em: **[http://localhost:5173/](http://localhost:5173/)**

---

## 📦 Implantação e Deploy (Vercel)

Este projeto já está configurado com `vercel.json` para permitir que o roteamento de URL limpo do React funcione no servidor sem erros 404 ao atualizar a página.

Se você estiver fazendo implantação manual pela primeira vez, execute no seu terminal:
```bash
npx vercel --prod
```
E confirme as credenciais para associar o diretório de compilação da Vercel.
