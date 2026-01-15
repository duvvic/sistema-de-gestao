// components/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Key, Eye, EyeOff } from 'lucide-react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth, normalizeEmail } from '@/contexts/AuthContext';
import { fetchUsers } from '@/services/api';

type Mode = 'login' | 'set-password' | 'otp-verification';

// Hash para user_credentials (legacy support)
async function hashPassword(password: string): Promise<string> {
    const hasWebCrypto = typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle &&
        (window.isSecureContext ?? window.location.hostname === 'localhost');

    if (hasWebCrypto) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = (hash << 5) - hash + password.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, loginWithSession, currentUser, authReady } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [loading, setLoading] = useState(false);

    // Carregar e-mail lembrado no monte
    useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
        }
    }, []);
    const [alertConfig, setAlertConfig] = useState<{ show: boolean, message: string, title?: string }>({
        show: false,
        message: '',
        title: ''
    });

    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const showAlert = (message: string, title: string = 'Aviso') => {
        setAlertConfig({ show: true, message, title });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, show: false }));
    };

    const peekPassword = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(true);
        setTimeout(() => setter(false), 1000);
    };

    // Redirecionamento baseado em Role
    useEffect(() => {
        if (!authReady) return;
        if (currentUser && mode === 'login') {
            const path = currentUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(path, { replace: true });
        }
    }, [authReady, currentUser, mode, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'login') await handleLogin();
        else if (mode === 'otp-verification') await handleVerifyOtp();
        else await handleCreatePassword();
    };

    const handleLogin = async () => {
        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            console.log('[Login] Tentando login via backend para:', normalizedEmail);

            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Falha na autenticação');
            }

            const { user, session } = data;

            // Usa a nova função que sincroniza tudo sem re-carregar do banco
            await loginWithSession(user, session);

            // Lembrar e-mail para o próximo acesso
            localStorage.setItem('remembered_email', normalizedEmail);

            // Sucesso - o redirecionamento acontecerá pelo useEffect
        } catch (err: any) {
            console.error('[Login] Erro no login:', err);
            showAlert(err.message || 'Erro inesperado no sistema de login', 'Falha no Acesso');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        try {
            const normalizedEmail = (selectedUser?.email || email).trim().toLowerCase();
            const { error } = await supabase.auth.verifyOtp({
                email: normalizedEmail,
                token: otpToken.trim(),
                type: 'email',
            });

            if (error) {
                // Tenta outros tipos de OTP caso o padrão falhe (recovery/signup)
                const { error: err2 } = await supabase.auth.verifyOtp({ email: normalizedEmail, token: otpToken.trim(), type: 'recovery' });
                if (err2) {
                    const { error: err3 } = await supabase.auth.verifyOtp({ email: normalizedEmail, token: otpToken.trim(), type: 'signup' });
                    if (err3) throw new Error('Token inválido ou expirado.');
                }
            }

            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) throw new Error('Falha ao estabelecer sessão segura.');

            setMode('set-password');
        } catch (err: any) {
            showAlert(err.message, 'Erro de Validação');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            showAlert('As senhas não conferem.', 'Erro de Senha');
            return;
        }
        if (newPassword.length < 7) {
            showAlert('A senha deve ter no mínimo 7 caracteres.', 'Senha Fraca');
            return;
        }

        setLoading(true);
        try {
            // 1. Atualiza no Auth
            const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
            if (authErr) throw authErr;

            // 2. Atualiza no user_credentials (Legacy)
            if (selectedUser) {
                const hash = await hashPassword(newPassword);
                await supabase.from('user_credentials').upsert({
                    colaborador_id: Number(selectedUser.id),
                    password_hash: hash,
                }, { onConflict: 'colaborador_id' });
            }

            // 3. Força logout e limpa formulário
            await supabase.auth.signOut();
            setMode('login');
            setEmail('');
            setPassword('');
            showAlert('Senha definida com sucesso! Agora você pode entrar.', 'Sucesso!');
        } catch (err: any) {
            showAlert('Erro ao definir senha: ' + err.message, 'Erro');
        } finally {
            setLoading(false);
        }
    };

    const handleFindUser = async (modeName: string) => {
        if (!email) {
            showAlert('Informe seu e-mail corporativo.', 'Campo Obrigatório');
            return;
        }
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { data: dbUser } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();

            if (!dbUser) {
                showAlert('E-mail não encontrado em nossa base de colaboradores.', 'E-mail Inválido');
                return;
            }

            // Envia OTP
            const { error: otpErr } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: { shouldCreateUser: true }
            });
            if (otpErr) throw otpErr;

            setSelectedUser({
                id: String(dbUser.ID_Colaborador),
                name: dbUser.NomeColaborador,
                email: dbUser.email,
                role: String(dbUser.papel || '').toLowerCase().includes('admin') ? 'admin' : 'developer'
            } as User);

            alert('Código enviado! Verifique seu e-mail.');
            setMode('otp-verification');
        } catch (err: any) {
            showAlert('Falha: ' + err.message, 'Erro de Conexão');
        } finally {
            setLoading(false);
        }
    };

    const effectiveEmail = (mode === 'set-password' || mode === 'otp-verification') && selectedUser ? selectedUser.email : email;

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 relative font-sans" style={{ backgroundColor: '#130e24' }}>
            <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 space-y-8 relative z-10">
                <div className="text-center flex flex-col items-center">
                    <img src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png" alt="NIC Labs" className="h-16 w-auto mb-6" />
                    <h2 className="text-[26px] font-extrabold text-[#1e1b4b]">
                        {mode === 'login' ? 'Bem-vindo colaborador' : mode === 'otp-verification' ? 'Validação' : 'Nova Senha'}
                    </h2>
                    <p className="text-[#64748b] text-sm mt-2">
                        {mode === 'login' ? 'Acesse com seu e-mail corporativo' : 'Siga as instruções para continuar'}
                    </p>
                </div>

                <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-[#334155] mb-2 uppercase">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={effectiveEmail}
                                onChange={(e) => mode === 'login' && setEmail(e.target.value)}
                                disabled={mode !== 'login'}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-emerald-500 outline-none transition-all text-[#1e1b4b] font-medium"
                                placeholder="nome@empresa.com"
                                autoComplete="username email"
                                required
                            />
                        </div>
                    </div>

                    {mode === 'login' && (
                        <div>
                            <label className="block text-xs font-bold text-[#334155] mb-2 uppercase">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    id="password"
                                    type={showPass ? "text" : "password"}
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSubmit(e as any);
                                        }
                                    }}
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-purple-500 outline-none transition-all text-[#1e1b4b] font-medium"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button type="button" onClick={() => peekPassword(setShowPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'otp-verification' && (
                        <div>
                            <label className="block text-xs font-bold text-[#334155] mb-2 uppercase text-center">Código enviado ao e-mail</label>
                            <input
                                type="text"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value)}
                                className="w-full py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-bold tracking-[0.5em] focus:border-purple-500 outline-none"
                                placeholder="000000"
                                required
                            />
                        </div>
                    )}

                    {mode === 'set-password' && (
                        <div className="space-y-4">
                            <input
                                type={showNewPass ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-purple-500 outline-none"
                                placeholder="Nova Senha (min 7 chars)"
                                required
                            />
                            <input
                                type={showConfirmPass ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-purple-500 outline-none"
                                placeholder="Confirmar Nova Senha"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-[#4c1d95] to-[#6d28d9] text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Processando...' : mode === 'login' ? 'Entrar na plataforma' : 'Confirmar'}
                    </button>

                    {mode === 'login' && (
                        <div className="flex flex-col gap-4 text-center">
                            <button type="button" onClick={() => handleFindUser('forgot')} className="text-sm font-bold text-purple-700 hover:underline">Esqueci minha senha</button>
                            <button type="button" onClick={() => handleFindUser('first')} className="w-full py-4 border-2 border-slate-100 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Primeiro acesso</button>
                        </div>
                    )}

                    {mode !== 'login' && (
                        <button type="button" onClick={() => setMode('login')} className="w-full text-sm font-bold text-slate-500 hover:underline flex items-center justify-center gap-2">
                            <ArrowRight className="w-4 h-4 rotate-180" /> Voltar ao login
                        </button>
                    )}
                </form>
            </div>

            {/* Custom Alert Modal */}
            {alertConfig.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={closeAlert}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-[380px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-purple-600">
                                <Key className="w-8 h-8" />
                            </div>

                            <h3 className="text-xl font-bold text-[#1e1b4b] mb-3">
                                {alertConfig.title}
                            </h3>

                            <p className="text-slate-600 leading-relaxed text-sm">
                                {alertConfig.message}
                            </p>
                        </div>

                        <div className="px-6 pb-8">
                            <button
                                onClick={closeAlert}
                                className="w-full py-4 bg-[#1e1b4b] text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
