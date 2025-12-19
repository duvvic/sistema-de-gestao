# 🧪 Checklist de Testes - Arquitetura MVC

## 📝 Informações de Login
- **URL Inicial**: http://localhost:5174/login
- **Email**: adm@nic-labs.com.br
- **Senha**: adm@2025

---

## ✅ Testes Básicos

### 1. Tela de Login
- [ ] Abrir http://localhost:5174/login
- [ ] Console sem erros vermelhos (400)
- [ ] Formulário de login aparece corretamente
- [ ] Campos de email e senha funcionam

### 2. Processo de Login
- [ ] Inserir email: `adm@nic-labs.com.br`
- [ ] Inserir senha: `adm@2025`
- [ ] Clicar em "Entrar"
- [ ] **Resultado esperado**: Redirecionar para `/admin/clients`

### 3. Navegação por Rotas
Após login, a URL deve mostrar: `/admin/clients`

- [ ] Verificar se sidebar aparece à esquerda
- [ ] Verificar se tem os menus:
  - Clientes
  - Tarefas
  - Projetos
  - Equipe
  - Timesheet

### 4. Teste de Cliques no Menu
Clicar em cada item e verificar se a URL muda:

- [ ] Clicar em "Clientes" → URL: `/admin/clients`
- [ ] Clicar em "Tarefas" → URL: `/tasks`
- [ ] Clicar em "Projetos" → URL: `/admin/projects`
- [ ] Clicar em "Equipe" → URL: `/team`
- [ ] Clicar em "Timesheet" → URL: `/timesheet`

### 5. Teste F5 (CRÍTICO!)
- [ ] Navegar para `/admin/clients`
- [ ] Apertar **F5**
- [ ] **Resultado esperado**: Página recarrega e mantém em `/admin/clients`
- [ ] Usuário continua logado

### 6. Teste de Compartilhamento de URL
- [ ] Navegar para `/admin/clients`
- [ ] Copiar a URL do navegador
- [ ] Abrir em uma **nova aba**
- [ ] **Resultado esperado**: Abre direto em `/admin/clients` (mantém login)

### 7. Teste de Navegação de Cliente
- [ ] Na tela de clientes, clicar em um cliente
- [ ] **Resultado esperado**: 
  - URL muda para `/admin/clients/:id` (ex: `/admin/clients/1`)
  - Mostra detalhes do cliente

### 8. Teste de Botão Voltar do Navegador
- [ ] Clicar em um cliente (vai para `/admin/clients/123`)
- [ ] Clicar no **botão VOLTAR do navegador** (←)
- [ ] **Resultado esperado**: Volta para `/admin/clients`

### 9. Teste de Logout
- [ ] Clicar no botão "Sair" na sidebar
- [ ] **Resultado esperado**: 
  - Redireciona para `/login`
  - localStorage limpa
  - Ao tentar acessar `/admin/clients` diretamente, redireciona para `/login`

---

## 🐛 Problemas Conhecidos a Reportar

Se você encontrar algum destes problemas, me avise:

1. **Tela branca após login**
   - Abra o console (F12) e me envie os erros
   
2. **URL não muda ao clicar no menu**
   - React Router pode não estar ativado

3. **F5 dá erro 404**
   - Vite config precisa de ajuste

4. **Componentes não carregam (espera props antigas)**
   - Preciso adaptar mais componentes

5. **Dados não aparecem**
   - useDataController pode não estar carregando

---

## 📊 Resultados Esperados

### ✅ O que DEVE funcionar:

1. **Login** → Redireciona para dashboard admin
2. **URLs reais** → Mudam conforme navegação
3. **F5** → Mantém estado e tela
4. **Botão voltar** → Navega no histórico
5. **Menu sidebar** → Todos os links funcionam
6. **Console limpo** → Sem erros 400
7. **Logout** → Limpa sessão e volta para login

### ❌ O que AINDA NÃO funciona (componentes antigos):

Componentes que ainda usam props antigas e podem dar erro:
- KanbanBoard
- TaskDetail  
- ClientDetailsView
- ProjectDetailView
- Alguns outros

**Quando clicar nesses e der erro**, me avise qual componente e eu adapto!

---

## 📝 Como Reportar Problemas

Me envie:
1. **Qual passo quebrou**: Ex: "Passo 4 - Cliquei em Tarefas"
2. **O que aconteceu**: Ex: "Tela ficou branca"
3. **URL mostrada**: Ex: "Ficou em /tasks"
4. **Erros no console**: Abra F12 → Console → Print ou copie

---

## 🎯 Próximos Passos (Depois dos Testes)

Baseado no seu feedback, vou:
1. Adaptar os componentes que deram erro
2. Ajustar rotas que não funcionaram
3. Corrigir bugs encontrados
4. Migrar próximos componentes gradualmente

---

**Comece pelos testes 1-9 e me diga até onde funcionou!** 🚀
