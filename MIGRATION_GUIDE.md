# Guia de Migração para Arquitetura MVC com React Router

## 📋 O que mudou?

### Antes (navegação por state)
```tsx
const [currentView, setCurrentView] = useState<View>('login');
// Mudava tela assim:
setCurrentView('admin');
```

### Agora (navegação por rotas)
```tsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
// Muda URL de verdade:
navigate('/admin/clients');
```

## 🗺️ Mapa de Rotas

| Antes (View State) | Agora (URL Router) |
|-------------------|-------------------|
| `'login'` | `/login` |
| `'admin'` | `/admin/clients` |
| `'kanban'` | `/tasks` |
| `'task-detail'` | `/tasks/:taskId` |
| `'task-create'` | `/tasks/new` |
| `'client-create'` | `/admin/clients/new` |
| `'client-details'` | `/admin/clients/:clientId` |
| `'project-detail'` | `/admin/projects/:projectId` |
| `'project-create'` | `/admin/projects/new` |
| `'developer-projects'` | `/developer/projects` |
| `'user-tasks'` | `/developer/tasks` |
| `'team-list'` | `/team` |
| `'team-member-detail'` | `/team/:userId` |
| `'timesheet-calendar'` | `/timesheet` |
| `'timesheet-form'` | `/timesheet/new` |
| `'timesheet-admin-dashboard'` | `/timesheet` (admin) |
| `'user-profile'` | `/profile` |

## 🔄 Como Migrar um Componente

### 1. **Login Component** - Exemplo de migração

**ANTES:**
```tsx
// components/Login.tsx (versão antiga)
interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleSubmit = () => {
    // ... validação
    onLogin(user); // Apenas chamava callback
  };
}
```

**DEPOIS:**
```tsx
// components/Login.tsx (nova versão com Router)
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = () => {
    // ... validação
    login(user); // Salva no context + localStorage
    
    // Redireciona baseado no role
    if (user.role === 'admin') {
      navigate('/admin/clients');
    } else {
      navigate('/developer/projects');
    }
  };
}
```

### 2. **Componentes que recebem dados por props**

**ANTES:**
```tsx
// App.tsx passava tudo por props
<TaskDetail 
  task={selectedTask}
  onSave={handleSaveTask}
  onBack={() => setCurrentView('kanban')}
/>
```

**DEPOIS:**
```tsx
// components/TaskDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams(); // Pega da URL!
  const navigate = useNavigate();
  const { getTaskById, updateTask } = useDataController();

  const task = taskId ? getTaskById(taskId) : null;

  const handleSave = async (updatedTask: Task) => {
    await updateTask(updatedTask.id, updatedTask);
    navigate('/tasks'); // Volta para lista
  };

  const handleBack = () => {
    navigate(-1); // Volta na história (como F5 no navegador)
  };

  return (
    <div>
      {/* UI */}
    </div>
  );
};
```

### 3. **Usar o Controller Hook**

```tsx
// Em qualquer componente:
import { useDataController } from '../controllers/useDataController';

function MeuComponente() {
  const {
    // State
    clients,
    projects,
    tasks,
    
    // Métodos
    getClientById,
    createTask,
    updateProject,
  } = useDataController();

  // Use os métodos:
  const handleCreate = async () => {
    const newId = await createTask({
      title: 'Nova tarefa',
      projectId: '123',
      // ...
    });
    
    navigate(`/tasks/${newId}`);
  };
}
```

## 🔐 Autenticação

```tsx
import { useAuth } from '../contexts/AuthContext';

function MeuComponente() {
  const { currentUser, logout } = useAuth();

  // currentUser está sempre disponível e sincronizado
  // Persiste no localStorage automaticamente
  
  return (
    <div>
      <p>Olá, {currentUser?.name}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

## 📦 Estado Persistente

### Automático pelo AuthContext:
- Usuário logado persiste no `localStorage`
- Ao dar F5, o usuário continua logado
- URL também persiste (navegação real)

### Para outros dados (opcional):
```tsx
// Salvar no localStorage manualmente se precisar:
localStorage.setItem('meuDado', JSON.stringify(data));

// Recuperar:
const data = JSON.parse(localStorage.getItem('meuDado') || '{}');
```

## ✅ Checklist de Migração de Componente

- [ ] Remover props de navegação (`onBack`, etc)
- [ ] Importar `useNavigate` e `useParams` se necessário
- [ ] Usar `useAuth()` para dados do usuário
- [ ] Usar `useDataController()` para operações CRUD
- [ ] Trocar callbacks por `navigate('/rota')`
- [ ] Atualizar imports de contextos/hooks
- [ ] Remover state local desnecessário (agora vem do controller)

## 🚀 Para Começar a Usar

1. **Renomear App.tsx:**
   ```bash
   mv App.tsx App_Old.tsx
   mv App_New.tsx App.tsx
   ```

2. **Reiniciar o servidor:**
   ```bash
   # O Vite irá recarregar automaticamente
   ```

3. **Testar navegação:**
   - Abra http://localhost:5173/login
   - Faça login
   - Navegue entre páginas
   - Dê F5 - a página deve manter o estado!

4. **Verificar URL:**
   - A URL deve mudar conforme você navega
   - `/admin/clients`, `/tasks/123`, etc
   - Você pode copiar a URL e abrir em outra aba

## 🔧 Troubleshooting

### F5 dá erro 404
- Certifique-se que `historyApiFallback: true` está no `vite.config.ts`

### Usuário desloga ao dar F5
- Verifique se `AuthContext` está carregando do localStorage

### Rotas não funcionam
- Certifique-se que o componente está dentro de `<BrowserRouter>`
- Verifique se está usando `<Outlet />` no MainLayout

## 📝 Exemplo Completo de Componente Migrado

Veja `components/MainLayout.tsx` como exemplo de componente totalmente migrado com:
- ✅ React Router (`useNavigate`, `useLocation`)
- ✅ Context de Auth (`useAuth`)
- ✅ Navegação de menu
- ✅ Layout com `<Outlet />`
