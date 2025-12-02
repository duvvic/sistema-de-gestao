import React, { useState, useEffect } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (user: User) => void;
  onForgotPassword: (email: string) => void;
  users: User[];
}


type Mode = 'login' | 'set-password';

// Hash de senha com fallback para ambiente sem WebCrypto seguro
async function hashPassword(password: string): Promise<string> {
  const hasWebCrypto =
    typeof window !== 'undefined' &&
    !!window.crypto &&
    !!window.crypto.subtle &&
    (window.isSecureContext ?? window.location.hostname === 'localhost');

  if (hasWebCrypto) {
    // Caminho "correto" quando estiver em HTTPS ou localhost
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // Fallback apenas para DESENVOLVIMENTO em HTTP (como 192.168.x.x)
  console.warn(
    '[NIC Labs Manager] WebCrypto indisponível neste contexto. Usando hash simples apenas para desenvolvimento.'
  );

  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // força 32 bits
  }
  return hash.toString(16);
}


const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [email, setEmail] = useState(''); // 🔹 sem e-mail padrão
  const [password, setPassword] = useState('');

  const [mode, setMode] = useState<Mode>('login');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Só pra debug mesmo
  useEffect(() => {
    console.log('Users recebidos no Login:', users);
  }, [users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await handleLogin();
    } else {
      await handleCreatePassword();
    }
  };

  // 1) Fluxo normal de login
  const handleLogin = async () => {
    try {
      setLoading(true);

      const normalizedInput = email.trim().toLowerCase();

      const foundUser = users.find(
        (u) => (u.email || '').trim().toLowerCase() === normalizedInput
      );

      if (!foundUser) {
        alert(
          'E-mail não encontrado no sistema. Peça para o administrador cadastrá-lo na base de colaboradores.'
        );
        return;
      }

      // Busca credencial na tabela user_credentials
      const { data: credential, error } = await supabase
        .from('user_credentials')
        .select('password_hash')
        .eq('colaborador_id', Number(foundUser.id))
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar credenciais:', error);
        alert('Erro ao validar credenciais. Tente novamente em alguns instantes.');
        return;
      }

      // Nenhuma senha criada ainda -> primeiro acesso -> ir para tela de definição de senha
      if (!credential) {
        setSelectedUser(foundUser);
        setMode('set-password');
        setNewPassword('');
        setConfirmPassword('');
        setPassword('');
        return;
      }

      if (!password) {
        alert('Informe a senha.');
        return;
      }

      const passwordHash = await hashPassword(password);

      if (passwordHash !== credential.password_hash) {
        alert('Senha incorreta.');
        return;
      }

      // Tudo certo -> entra
      onLogin(foundUser);
    } finally {
      setLoading(false);
    }
  };

  // 2) Primeiro acesso: criar e salvar senha
  const handleCreatePassword = async () => {
    if (!selectedUser) {
      // não era pra acontecer, mas só por segurança
      alert('Erro interno. Volte para o login e tente novamente.');
      setMode('login');
      return;
    }

    if (!newPassword || !confirmPassword) {
      alert('Preencha e confirme a nova senha.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('As senhas não conferem.');
      return;
    }

    if (newPassword.length < 6) {
      alert('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);

      const passwordHash = await hashPassword(newPassword);

      const { error } = await supabase.from('user_credentials').insert({
        colaborador_id: Number(selectedUser.id),
        password_hash: passwordHash,
      });

      if (error) {
        console.error('Erro ao salvar senha:', error);
        alert('Não foi possível salvar a senha. Tente novamente.');
        return;
      }

      alert('Senha criada com sucesso!');

      // Depois de criar, já entra no sistema
      onLogin(selectedUser);
    } finally {
      setLoading(false);
    }
  };

  // 3) Esqueci minha senha (vamos deixar só um placeholder por enquanto)
  const handleForgotPassword = () => {
    alert(
      'Fluxo de "Esqueci minha senha" ainda será configurado. Por enquanto, fale com o administrador.'
    );
  };

  const isSetPassword = mode === 'set-password';
  const effectiveEmail =
    isSetPassword && selectedUser ? selectedUser.email : email;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img
              src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png"
              alt="NIC Labs"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isSetPassword ? 'Defina sua senha' : 'Bem-vindo de volta'}
          </h2>
          <p className="text-slate-500 text-sm">
            {isSetPassword
              ? 'Crie sua senha para acessar o NIC Labs Manager.'
              : 'Acesse sua conta para gerenciar projetos'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={effectiveEmail}
                  onChange={(e) => !isSetPassword && setEmail(e.target.value)}
                  disabled={isSetPassword}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Campo de senha normal */}
            {!isSetPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Tela de definição de senha (primeiro acesso) */}
            {isSetPassword && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
                      placeholder="Defina uma senha"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dica apenas no modo login */}
          {!isSetPassword && (
            <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
              <p className="font-bold">Dica para teste:</p>
              <p>
                Admin:{' '}
                <span className="text-slate-600">
                  fernanda.nicacio@nic-labs.com.br
                </span>
              </p>
              <p>
                Dev:{' '}
                <span className="text-slate-600">
                  jonatas.freire@nic-labs.com.br
                </span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-end">
            {!isSetPassword && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-[#4c1d95] hover:underline"
              >
                Esqueci minha senha
              </button>
            )}

            {isSetPassword && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setSelectedUser(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-sm font-medium text-slate-500 hover:underline"
              >
                Voltar para login
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4c1d95] hover:bg-[#3b1675] disabled:opacity-70 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 group"
          >
            {loading
              ? 'Aguarde...'
              : isSetPassword
              ? 'Salvar senha e entrar'
              : 'Entrar'}
            {!loading && (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-center text-slate-400 text-sm">
        © 2024 NIC Labs Manager. Todos os direitos reservados.
      </p>
    </div>
  );
};

export default Login;
