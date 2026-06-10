# Plano de Implementação: Modo Claro e Escuro (Light/Dark Mode)

Este documento detalha a estratégia para adicionar o sistema de alternância entre Modo Claro e Modo Escuro na loja Amour & Co., que atualmente foi construída de forma fixa no modo escuro.

## ⚠️ User Review Required
**Por favor, revise a abordagem técnica.** Como a loja já está construída com classes fixas do Tailwind (ex: `bg-luxury-gray`, `text-white`), a estratégia mais eficiente e segura para não quebrar o layout é **manter as classes atuais e alterar os seus valores por baixo dos panos usando Variáveis CSS**, em vez de reescrever milhares de linhas com modificadores `dark:`.

---

## 1. Estratégia de Cores e Variáveis CSS (Refatoração do `index.css`)

Em vez de alterar todos os componentes, vamos transformar as cores atuais (que são fixas) em variáveis CSS que se adaptam conforme a classe `.light-mode` inserida no `<html>`.

### Alterações no `index.css`:
```css
/* Valores Padrão (Modo Escuro Atual) */
:root {
  --bg-black: #0A0A0A;       /* Fundo geral */
  --bg-gray: #121212;        /* Fundo de cards/headers */
  --bg-dark: #1A1A1A;        /* Fundo de seções */
  --bg-input: #242424;       /* Fundo de inputs */
  --text-main: #FFFFFF;      /* Texto principal */
  --text-muted: #9CA3AF;     /* Texto secundário (gray-400) */
  --border-light: rgba(255, 255, 255, 0.1);
  --border-faint: rgba(255, 255, 255, 0.05);
}

/* Valores Modo Claro */
.light-mode {
  --bg-black: #F9FAFB;       /* gray-50 */
  --bg-gray: #FFFFFF;        /* white */
  --bg-dark: #F3F4F6;        /* gray-100 */
  --bg-input: #FFFFFF;       
  --text-main: #111827;      /* gray-900 */
  --text-muted: #4B5563;     /* gray-600 */
  --border-light: rgba(0, 0, 0, 0.1);
  --border-faint: rgba(0, 0, 0, 0.05);
}

@theme {
  --color-luxury-black: var(--bg-black);
  --color-luxury-gray: var(--bg-gray);
  --color-luxury-dark: var(--bg-dark);
  --color-luxury-input: var(--bg-input);
  --color-theme-text: var(--text-main);
  --color-theme-muted: var(--text-muted);
  --color-theme-border: var(--border-light);
  --color-theme-border-faint: var(--border-faint);
}
```

---

## 2. Criação do Gerenciador de Estado (ThemeContext)

Criaremos um contexto React (`src/context/ThemeContext.tsx`) que irá:
- Ler a preferência do usuário salva no `localStorage` (se ele já escolheu claro ou escuro).
- Se não houver preferência, ler a preferência nativa do sistema operacional (`window.matchMedia('(prefers-color-scheme: dark)')`).
- Injetar a classe `light-mode` na tag `<html>` quando o modo claro estiver ativo.
- Fornecer as funções `toggleTheme` e `setTheme('light' | 'dark' | 'system')` para os botões.

---

## 3. Interface: Botão de Alternância (Toggle)

Adicionaremos o controle de tema na UI:
1. **No Header Principal (`src/components/layout/Header.tsx`):**
   - Um ícone de Sol (Sun) / Lua (Moon) ao lado dos ícones de "Conta" e "Carrinho".
   - Ao clicar, ele alterna entre o modo claro e escuro instantaneamente com uma animação suave de transição (`transition-colors`).
2. **No Menu Mobile:**
   - Adicionar a opção "Alternar Tema" no rodapé do menu lateral ou como um toggle na lista.
3. **No Painel Admin:**
   - Opcionalmente, adicionar o mesmo toggle no painel de administração (`StorefrontCustomizer` ou sidebar).

---

## 4. Refatoração de Classes Hardcoded no Código

Muitos arquivos utilizam cores como `text-white`, `border-white/10`, `bg-white/5` diretamente. Faremos um Buscar e Substituir (Find & Replace) seguro nos componentes principais (`ProductCard`, `Header`, `Hero`, modals):

- `text-white` ➔ `text-theme-text`
- `text-gray-400` ➔ `text-theme-muted`
- `border-white/10` ➔ `border-theme-border`
- `bg-white/5` ➔ `bg-theme-border-faint`

> [!TIP]
> Essa substituição preservará a aparência premium e luxuosa do site, pois o tema escuro continuará idêntico. Apenas o tema claro será ativado invertendo essas variáveis globalmente.

---

## 5. Plano de Verificação (Verification Plan)

### Verificação Visual e Interativa
- Acessar a loja em Modo Escuro e garantir que nada mudou (pixel perfect).
- Clicar no botão de toggle para Modo Claro.
- Verificar o contraste de textos, bordas, ícones e inputs no Modo Claro.
- Atualizar a página (F5) e garantir que a escolha do usuário foi lembrada via `localStorage`.

### Teste de Transições
- Confirmar que a transição de cores ocorre sem "flashes" brancos em telas escuras ao carregar a página inicialmente. Para isso, injetaremos um pequeno script no `<head>` do `index.html` que aplica a classe correta antes do React hidratar.
