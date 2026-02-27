# Guia de Design Tokens - Sistema de Cores Profissional

## 📋 Visão Geral

Este guia documenta o sistema de design tokens reorganizado para garantir profundidade visual adequada e consistência perfeita entre os modos **claro** e **escuro**.

---

## 🎨 Hierarquia de Backgrounds

### Modo Claro
```css
--bg: #F8FAFC              /* Slate 50 - Fundo principal da aplicação */
--bg-elevated: #FFFFFF      /* Superfícies elevadas (modais, dropdowns) */
--surface: #FFFFFF          /* Cards e containers */
--surface-elevated: #FFFFFF /* Modais, popovers */
--surface-2: #F1F5F9        /* Slate 100 - Seções aninhadas */
--surface-3: #E2E8F0        /* Slate 200 - Campos de input */
--surface-hover: #F8FAFC    /* Hover states */
--surface-pressed: #F1F5F9  /* Pressed states */
```

### Modo Escuro
```css
--bg: #0A0A0F              /* Muito escuro - Fundo principal */
--bg-elevated: #13121C     /* Ligeiramente elevado */
--surface: #1A1825         /* Cards - claramente elevados */
--surface-elevated: #211E30 /* Modais, dropdowns - mais elevados */
--surface-2: #100E18       /* Seções aninhadas - mais escuro que surface */
--surface-3: #0D0B13       /* Inputs - ainda mais escuro */
--surface-hover: #252233   /* Hover - mais claro */
--surface-pressed: #1E1B2E /* Pressed */
```

**Regra de Ouro**: No modo escuro, quanto mais **profundo** no DOM, **mais escuro**. Modais e dropdowns são **mais claros** pois estão "acima".

---

## 📝 Inputs e Formulários

### Variáveis Específicas
```css
/* Modo Claro */
--input-bg: #F1F5F9         /* Slate 100 */
--input-bg-focus: #FFFFFF   /* Branco ao focar */
--input-border: #E2E8F0     /* Slate 200 */
--input-border-focus: #CBD5E1

/* Modo Escuro */
--input-bg: #13121C         /* Escuro para profundidade */
--input-bg-focus: #1A1825   /* Levemente mais claro ao focar */
--input-border: #2D2839     /* Borda sutil */
--input-border-focus: #3D3750
```

**Uso Correto**:
```tsx
<input
  className="px-3 py-2 text-sm border rounded-lg outline-none"
  style={{
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text)'
  }}
/>
```

---

## 🔤 Hierarquia de Texto

```css
/* Modo Claro */
--text: #0F172A             /* Slate 900 - Texto primário */
--text-2: #334155           /* Slate 700 - Texto secundário */
--text-3: #64748B           /* Slate 500 - Texto terciário */
--text-muted: #94A3B8       /* Slate 400 - Texto discreto */
--text-placeholder: #CBD5E1 /* Slate 300 - Placeholders */

/* Modo Escuro */
--text: #F1F5F9             /* Slate 100 - Muito claro */
--text-2: #CBD5E1           /* Slate 300 */
--text-3: #94A3B8           /* Slate 400 */
--text-muted: #64748B       /* Slate 500 */
--text-placeholder: #475569 /* Slate 600 */
```

**Uso Correto**:
```tsx
<h1 style={{ color: 'var(--text)' }}>Título Principal</h1>
<p style={{ color: 'var(--text-2)' }}>Texto secundário</p>
<span style={{ color: 'var(--text-muted)' }}>Informação adicional</span>
```

---

## 🔲 Bordas e Divisores

```css
/* Modo Claro */
--border: #E2E8F0           /* Slate 200 - Bordas padrão */
--border-strong: #CBD5E1    /* Slate 300 - Bordas enfatizadas */
--border-muted: #F1F5F9     /* Slate 100 - Divisores sutis */

/* Modo Escuro */
--border: #2D2839           /* Roxo escuro sutil */
--border-strong: #3D3750    /* Mais visível */
--border-muted: #1E1B2E     /* Muito sutil */
```

---

## 🌈 Cores de Status

### Modo Claro
```css
--success: #10B981          /* Emerald 500 */
--success-bg: #ECFDF5       /* Emerald 50 */
--success-text: #065F46     /* Emerald 800 */

--warning: #F59E0B          /* Amber 500 */
--warning-bg: #FFFBEB
--warning-text: #92400E

--danger: #EF4444           /* Red 500 */
--danger-bg: #FEF2F2
--danger-text: #991B1B

--info: #3B82F6             /* Blue 500 */
--info-bg: #EFF6FF
--info-text: #1E40AF
```

### Modo Escuro (Cores mais Brilhantes)
```css
--success: #34D399          /* Emerald 400 */
--success-bg: rgba(52, 211, 153, 0.15)
--success-text: #6EE7B7     /* Emerald 300 */

--warning: #FBBF24          /* Amber 400 */
--warning-bg: rgba(251, 191, 36, 0.15)
--warning-text: #FCD34D

--danger: #F87171           /* Red 400 */
--danger-bg: rgba(248, 113, 113, 0.15)
--danger-text: #FCA5A5

--info: #60A5FA             /* Blue 400 */
--info-bg: rgba(96, 165, 250, 0.15)
--info-text: #93C5FD
```

---

## 🎭 Overlays e Modais

```css
/* Modo Claro */
--overlay: rgba(15, 23, 42, 0.4)    /* Slate 900 com alpha */
--modal-bg: #FFFFFF

/* Modo Escuro */
--overlay: rgba(0, 0, 0, 0.7)       /* Preto mais opaco */
--modal-bg: #1A1825
```

**Uso Correto**:
```tsx
<div
  className="fixed inset-0 backdrop-blur-md"
  style={{ backgroundColor: 'var(--overlay)' }}
>
  <div
    className="rounded-xl shadow-2xl"
    style={{ backgroundColor: 'var(--modal-bg)' }}
  >
    {/* Conteúdo do modal */}
  </div>
</div>
```

---

## ⛔ O Que EVITAR

### ❌ Cores Hardcoded
```tsx
// NÃO FAÇA ISSO
<div className="bg-slate-800 text-white">
<div className="border-slate-200">
<div style={{ backgroundColor: '#1e1b4b' }}>
```

### ✅ Use Variáveis CSS
```tsx
// FAÇA ISSO
<div style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
<div style={{ borderColor: 'var(--border)' }}>
```

### ❌ Classes Tailwind de Cores Fixas
```tsx
// NÃO use cores hardcoded do Tailwind
className="bg-gray-100 text-gray-900"
className="border-slate-300"
```

### ✅ Use Variáveis ou Classes Dinâmicas
```tsx
// FAÇA ISSO
style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}

// OU combine Tailwind com variáveis
className="p-4 rounded-xl border"
style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
```

---

## 📦 Sombras

```css
/* Modo Claro - Sombras Sutis */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1)
--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1)

/* Modo Escuro - Sombras Mais Fortes */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.4)
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.4)
--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.5)
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.6)
```

---

## 🧪 Checklist de Implementação

Ao criar ou atualizar um componente:

- [ ] Todos os backgrounds usam variáveis `--bg`, `--surface`, etc.
- [ ] Todo texto usa variáveis `--text`, `--text-2`, `--text-muted`
- [ ] Todas as bordas usam `--border` ou `--border-strong`
- [ ] Inputs usam variáveis `--input-bg`, `--input-border`
- [ ] Overlays e modais usam `--overlay` e `--modal-bg`
- [ ] Cores de status usam variáveis `--success`, `--danger`, etc.
- [ ] Sombras usam `--shadow-*`
- [ ] **Nenhuma cor Tailwind hardcoded** (bg-slate-*, text-gray-*, etc.)
- [ ] Testado em **modo claro** e **modo escuro**

---

## 🔄 Migração de Código Legado

### Encontrar Cores Hardcoded
```bash
# Procurar por cores Tailwind hardcoded
rg "bg-slate-" --type tsx
rg "text-gray-" --type tsx
rg "border-slate-" --type tsx
```

### Padrão de Substituição
```tsx
// ANTES
<div className="bg-slate-100 border-slate-200 text-slate-900">

// DEPOIS
<div
  className="border rounded-xl"
  style={{
    backgroundColor: 'var(--surface-2)',
    borderColor: 'var(--border)',
    color: 'var(--text)'
  }}
>
```

---

## 📚 Exemplos Completos

### Card de Conteúdo
```tsx
<div
  className="p-6 rounded-xl border shadow-lg"
  style={{
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--border)'
  }}
>
  <h3 style={{ color: 'var(--text)' }}>Título</h3>
  <p style={{ color: 'var(--text-2)' }}>Descrição</p>
</div>
```

### Input Field
```tsx
<input
  type="text"
  className="w-full px-4 py-2 rounded-lg border outline-none"
  style={{
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text)'
  }}
  placeholder="Digite aqui..."
/>
```

### Modal
```tsx
<div
  className="fixed inset-0 backdrop-blur-md"
  style={{ backgroundColor: 'var(--overlay)' }}
>
  <div
    className="p-6 rounded-2xl border shadow-2xl"
    style={{
      backgroundColor: 'var(--modal-bg)',
      borderColor: 'var(--border)'
    }}
  >
    <h2 style={{ color: 'var(--text)' }}>Título do Modal</h2>
  </div>
</div>
```

---

## 🎯 Resultado Esperado

Com este sistema implementado corretamente:

✅ **Modo Claro**: Backgrounds brancos/claros com profundidade através de sutis variações de cinza  
✅ **Modo Escuro**: Backgrounds escuros com camadas bem definidas (quanto mais fundo, mais escuro)  
✅ **Transição Suave**: Mudança perfeita entre temas sem quebras visuais  
✅ **Consistência**: Todos os componentes seguem a mesma hierarquia visual  
✅ **Manutenção**: Fácil ajuste global mudando apenas as variáveis CSS  
✅ **Zero Pontas Soltas**: Nenhuma cor hardcoded que não muda com o tema

---

**Última atualização**: 2026-02-12  
**Versão**: 2.0 - Sistema Profissional de Design Tokens
