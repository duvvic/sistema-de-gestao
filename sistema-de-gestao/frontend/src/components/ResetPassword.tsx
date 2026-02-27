import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface ResetPasswordProps {
  onComplete: () => void;
}

// Hash de senha com fallback para ambiente sem WebCrypto seguro
async function hashPassword(password: string): Promise<string> {
  const hasWebCrypto =
    typeof window !== 'undefined' &&
    !!window.crypto &&
    !!window.crypto.subtle &&
    (window.isSecureContext ?? window.location.hostname === 'localhost');

  if (hasWebCrypto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isValidToken, setIsValidToken] = useState(false);

  // Estados para visualização temporária de senha
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const peekPassword = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(true);
    setTimeout(() => setter(false), 1000);
  };

  useEffect(() => {
    // Verifica se há uma sessão de recuperação de senha
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {

          alert('Link de recuperação inválido ou expirado. Solicite um novo link.');
          onComplete();
          return;
        }

        // Session existe - usuário veio do link de email
        setUserEmail(session.user.email || '');
        setIsValidToken(true);
      } catch (error) {

        alert('Erro ao validar link de recuperação.');
        onComplete();
      }
    };

    checkSession();
  }, [onComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem. Digite novamente.');
      return;
    }

    if (newPassword.length < 7) {
      alert('A senha deve ter no mínimo 7 caracteres.');
      return;
    }

    const hasLetters = /[a-zA-Z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);

    if (!hasLetters || !hasNumbers) {
      alert('A senha deve conter letras e números.');
      return;
    }

    try {
      setLoading(true);

      // 1. Atualiza a senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {

        alert('Erro ao atualizar senha. Tente novamente.');
        return;
      }

      // 2. Busca o colaborador pelo email
      const { data: colaboradores, error: dbError } = await supabase
        .from('dim_colaboradores')
        .select('ID_Colaborador')
        .eq('email', userEmail)
        .maybeSingle();

      if (dbError || !colaboradores) {

        // Senha foi alterada no Auth, mas não conseguimos atualizar credentials
        alert('Senha alterada, mas houve um problema ao sincronizar. Contate o administrador.');
        setSuccess(true);
        return;
      }

      // 3. Atualiza o hash na tabela user_credentials
      const passwordHash = await hashPassword(newPassword);

      const { error: credError } = await supabase
        .from('user_credentials')
        .upsert({
          colaborador_id: colaboradores.ID_Colaborador,
          password_hash: passwordHash,
        }, {
          onConflict: 'colaborador_id',
        });

      if (credError) {

        alert('Senha alterada parcialmente. Contate o administrador se tiver problemas ao entrar.');
      }

      // 4. Faz logout da sessão temporária
      await supabase.auth.signOut();

      setSuccess(true);

      // Redireciona para login após 3 segundos
      setTimeout(() => {
        onComplete();
      }, 3000);

    } catch (error) {

      alert('Erro ao processar alteração de senha.');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bgApp)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4c1d95] mx-auto"></div>
          <p className="mt-4" style={{ color: 'var(--textMuted)' }}>Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bgApp)' }}>
        <div className="w-full max-w-md rounded-2xl shadow-xl border p-8 text-center space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--textTitle)' }}>Senha Alterada!</h2>
            <p style={{ color: 'var(--textMuted)' }}>
              Sua senha foi redefinida com sucesso. Você será redirecionado para a tela de login.
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={onComplete}
              className="font-semibold hover:underline"
              style={{ color: 'var(--brand)' }}
            >
              Ir para login agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4" style={{ backgroundColor: 'var(--bgApp)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-xl border p-8 space-y-8" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img
              src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png"
              alt="NIC Labs"
              className="h-20 w-auto object-contain bg-white rounded-lg p-2"
            />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--textTitle)' }}>Redefinir Senha</h2>
          <p className="text-sm" style={{ color: 'var(--textMuted)' }}>
            Digite sua nova senha para a conta: <span className="font-semibold" style={{ color: 'var(--text)' }}>{userEmail}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3 space-y-1 text-left">
              <p className="text-xs font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider">Requisitos da senha:</p>
              <ul className="text-xs text-purple-700 dark:text-purple-400 list-disc list-inside space-y-0.5">
                <li>No mínimo 7 caracteres</li>
                <li>Deve conter letras e números</li>
              </ul>
            </div>

            {/* Nova Senha */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all placeholder-slate-400"
                  style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Mínimo 7 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => peekPassword(setShowNewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all placeholder-slate-400"
                  style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Digite a senha novamente"
                  required
                />
                <button
                  type="button"
                  onClick={() => peekPassword(setShowConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#4c1d95] to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processando...
              </>
            ) : (
              <>
                Redefinir Senha
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
