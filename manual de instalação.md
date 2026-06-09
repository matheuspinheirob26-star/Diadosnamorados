# Manual de Instalação e Configuração - Amour & Co.

Este é o guia oficial de instalação da plataforma de e-commerce **Amour & Co.**, construída com React, TypeScript, Tailwind CSS e Supabase.

---

## 1. Pré-requisitos

Antes de iniciar, certifique-se de ter os seguintes programas instalados em sua máquina:
- **Node.js** (versão 18 ou superior) - [Baixar Node.js](https://nodejs.org/)
- **Git** - [Baixar Git](https://git-scm.com/)
- **Conta no Supabase** (para hospedagem do banco de dados e imagens) - [Criar conta](https://supabase.com/)

---

## 2. Clonando e Preparando o Projeto

Abra o seu terminal (ou Prompt de Comando/PowerShell) e siga os passos:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/matheuspinheirob26-star/Diadosnamorados.git
   cd Diadosnamorados
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

---

## 3. Configurando o Banco de Dados (Supabase)

O sistema utiliza o Supabase como banco de dados (PostgreSQL) e armazenamento de imagens (Storage). 

1. Crie um novo projeto no [Supabase](https://supabase.com/).
2. No painel do seu projeto Supabase, acesse **Project Settings > API**.
3. Copie a sua **Project URL** e a **Project API Key (anon/public)**.
4. Na raiz do projeto baixado, renomeie o arquivo `.env.example` para `.env` (ou crie um novo arquivo `.env`) e adicione as suas chaves:

   ```env
   VITE_SUPABASE_URL=sua_project_url_aqui
   VITE_SUPABASE_ANON_KEY=sua_api_key_aqui
   ```

### 3.1. Criando as Tabelas (Migrações)

Para que o sistema funcione, o banco de dados precisa ter a estrutura correta (tabelas de produtos, cupons, pedidos, etc).

1. No painel do Supabase, acesse a aba **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/migrations/20260609000000_initial_schema.sql` (que está na pasta do seu projeto).
4. Copie todo o código SQL desse arquivo, cole no **SQL Editor** do Supabase e clique em **Run** (Executar).
5. O console informará "Success". Isso significa que todas as tabelas foram criadas.

### 3.2. Configurando o Storage (Para Upload de Imagens)

O painel de administração da loja faz upload de imagens de produtos diretamente para o Supabase Storage.

1. No painel do Supabase, acesse a aba **Storage**.
2. Clique em **New Bucket** e crie um bucket chamado `product-images`.
3. Certifique-se de marcar a opção **Public bucket** para que as imagens apareçam na loja.
4. Na aba "Policies" do Storage, certifique-se de criar regras para permitir a leitura pública (`SELECT`) e o envio de arquivos (`INSERT` / `UPDATE`) conforme a segurança desejada.

---

## 4. Rodando o Projeto Localmente

Com o banco configurado e as variáveis de ambiente preenchidas, você já pode rodar a loja:

No terminal, execute:
```bash
npm run dev
```

Abra o seu navegador e acesse a URL que aparecer no terminal (geralmente `http://localhost:5173`).

---

## 5. Como Acessar o Painel de Administração

Para gerenciar produtos, pedidos, cupons e leads:
1. Acesse a URL: `http://localhost:5173/admin`
2. Utilize o painel para cadastrar novos produtos e imagens.

---

## 6. Build para Produção (Publicação na Vercel)

Quando quiser colocar o site no ar de forma definitiva (ex: na Vercel, Netlify ou AWS):

1. Conecte sua conta do GitHub à Vercel.
2. Importe o repositório do projeto.
3. Nas **Environment Variables** (Variáveis de Ambiente) da Vercel, não esqueça de adicionar as duas variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. A Vercel fará o build automaticamente executando o comando `npm run build`.

---

## Dúvidas e Suporte
Caso enfrente qualquer erro de permissão no Supabase (RLS - Row Level Security), você pode desativar o RLS temporariamente no painel do Supabase (Table Editor > Edit Table > Disable RLS) até configurar suas políticas de segurança de autenticação definitivas.
