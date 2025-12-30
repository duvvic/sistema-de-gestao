// components/Login_New.tsx - Versão Premium com Lógica Restaurada
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUsers } from '@/services/api';
import logoImg from '@/assets/logo.png';

type Mode = 'login' | 'set-password' | 'otp-verification';

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

    // Fallback apenas para DESENVOLVIMENTO em HTTP
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const chr = password.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString(16);
}


const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, currentUser } = useAuth();
    // ... restante do componente ...

    const [users, setUsers] = useState<User[]>([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpToken, setOtpToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [emailError, setEmailError] = useState(false);

    // Estados para visualização de senha
    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Carregar usuários ao montar
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const usersData = await fetchUsers();
                setUsers(usersData);
            } catch (error) {
                console.error('[Login] ERRO ao carregar usuários:', error);
            }
        };
        loadUsers();
    }, []);

    // Redireciona se já estiver logado
    useEffect(() => {
        if (currentUser && mode === 'login') {
            const redirectPath = currentUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(redirectPath, { replace: true });
        }
    }, [currentUser, navigate, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'login') {
            await handleLogin();
        } else if (mode === 'otp-verification') {
            await handleVerifyOtp();
        } else {
            await handleCreatePassword();
        }
    };

    const handleLogin = async () => {
        try {
            setLoading(true);
            const normalizedInput = email.trim().toLowerCase();

            if (!normalizedInput || !password) {
                alert('Informe e-mail e senha.');
                return;
            }

            // Busca colaborador diretamente pelo e-mail
            const { data: dbUser, error: userError } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('E-mail', normalizedInput)
                .maybeSingle();

            if (userError) throw new Error('Erro ao conectar com o banco de dados.');

            if (!dbUser) {
                alert(`E-mail "${normalizedInput}" não encontrado.`);
                return;
            }

            const foundUser: User = {
                id: String(dbUser.ID_Colaborador),
                name: dbUser.NomeColaborador || "Sem nome",
                email: String(dbUser["E-mail"] || "").trim().toLowerCase(),
                avatarUrl: dbUser.avatar_url || undefined,
                cargo: dbUser.Cargo || undefined,
                role: dbUser.papel === 'Administrador' ? 'admin' : 'developer',
                active: dbUser.ativo !== false,
            };

            // Busca credencial
            const { data: credential, error: credError } = await supabase
                .from('user_credentials')
                .select('password_hash')
                .eq('colaborador_id', Number(foundUser.id))
                .maybeSingle();

            if (credError) throw new Error('Erro ao validar credenciais.');

            if (!credential) {
                alert('Este é seu primeiro acesso. Use o botão "Primeiro acesso" abaixo.');
                return;
            }

            const passwordHash = await hashPassword(password);
            if (passwordHash !== credential.password_hash) {
                alert('Senha incorreta.');
                return;
            }

            login(foundUser);
            const redirectPath = foundUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(redirectPath);

        } catch (err: any) {
            alert(err.message || 'Erro inesperado ao realizar login.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpToken) {
            alert('Por favor, informe o token enviado para o seu e-mail.');
            return;
        }

        try {
            setLoading(true);
            const normalizedEmail = (selectedUser?.email || email).trim().toLowerCase();

            const { error } = await supabase.auth.verifyOtp({
                email: normalizedEmail,
                token: otpToken.trim(),
                type: 'recovery', // Tenta recovery primeiro para esqueci senha
            });

            if (error) {
                const { error: signupError } = await supabase.auth.verifyOtp({
                    email: normalizedEmail,
                    token: otpToken.trim(),
                    type: 'signup',
                });

                if (signupError) {
                    alert('Token inválido ou expirado. Verifique o código e tente novamente.');
                    return;
                }
            }

            setMode('set-password');
        } catch (error) {
            alert('Erro ao validar token.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePassword = async () => {
        if (!selectedUser) {
            alert('Sessão expirada. Tente novamente.');
            setMode('login');
            return;
        }

        if (!newPassword || newPassword !== confirmPassword) {
            alert('As senhas não conferem ou estão vazias.');
            return;
        }

        if (newPassword.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        try {
            setLoading(true);
            const passwordHash = await hashPassword(newPassword);

            const { error } = await supabase.from('user_credentials').upsert({
                colaborador_id: Number(selectedUser.id),
                password_hash: passwordHash,
            }, {
                onConflict: 'colaborador_id'
            });

            if (error) throw error;

            setMode('login');
            setEmail(selectedUser.email);
            setPassword(newPassword);
            setSelectedUser(null);
            setNewPassword('');
            setConfirmPassword('');
            setOtpToken('');
            setSuccessMessage('Senha atualizada com sucesso! Faça login abaixo.');
        } catch (error: any) {
            alert('Erro ao salvar senha: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            alert('Por favor, informe seu e-mail para recuperar a senha.');
            return;
        }

        try {
            setLoading(true);
            const normalizedEmail = email.trim().toLowerCase();

            const { data: dbUser, error: userError } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('E-mail', normalizedEmail)
                .maybeSingle();

            if (userError || !dbUser) {
                alert('E-mail não cadastrado no sistema.');
                return;
            }

            const foundUser: User = {
                id: String(dbUser.ID_Colaborador),
                name: dbUser.NomeColaborador || "Sem nome",
                email: normalizedEmail,
                role: dbUser.papel === 'Administrador' ? 'admin' : 'developer',
            } as User;

            const { error: authError } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
            });

            if (authError) throw authError;

            alert('Um código de acesso (Token) foi enviado para seu e-mail.');
            setSelectedUser(foundUser);
            setMode('otp-verification');
        } catch (err: any) {
            alert('Erro ao processar recuperação: ' + (err.message || 'Erro interno'));
        } finally {
            setLoading(false);
        }
    };

    const handleFirstAccess = async () => {
        if (!email) {
            setEmailError(true);
            return;
        }

        try {
            setLoading(true);
            const normalizedEmail = email.trim().toLowerCase();

            const { data: dbUser, error: userError } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('E-mail', normalizedEmail)
                .maybeSingle();

            if (userError || !dbUser) {
                alert('E-mail não cadastrado ou não encontrado.');
                return;
            }

            const foundUser: User = {
                id: String(dbUser.ID_Colaborador),
                name: dbUser.NomeColaborador || "Sem nome",
                email: normalizedEmail,
                role: dbUser.papel === 'Administrador' ? 'admin' : 'developer',
            } as User;

            const { error: authError } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: { shouldCreateUser: true }
            });

            if (authError) throw authError;

            alert('Um código de acesso (Token) foi enviado para seu e-mail.');
            setSelectedUser(foundUser);
            setMode('otp-verification');
        } catch (err: any) {
            alert('Erro no primeiro acesso: ' + (err.message || 'Erro interno'));
        } finally {
            setLoading(false);
        }
    };

    const effectiveEmail = (mode === 'set-password' || mode === 'otp-verification') && selectedUser ? selectedUser.email : email;

    return (
        <div className="min-h-screen bg-[#0f0720] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
            {/* Globos de Luz */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4c1d95] opacity-20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7c3aed] opacity-20 blur-[120px] rounded-full"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden z-10 relative"
            >

                <div className="p-8 sm:p-10 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-3">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="flex justify-center mb-6"
                        >
                            <img src={logoImg} alt="NIC-LABS" className="h-20 w-auto object-contain" />
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl font-extrabold text-[#1e1b4b]"
                        >
                            {mode === 'otp-verification' ? 'Valide seu Token' :
                                mode === 'set-password' ? 'Defina sua senha' : 'Bem-vindo colaborador'}
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-slate-500 text-sm font-medium"
                        >
                            {mode === 'otp-verification' ? 'Insira o código enviado para seu e-mail' :
                                mode === 'set-password' ? 'Crie sua senha para acessar o NIC-LABS.' :
                                    'Acesse com seu email@nic-labs.com.br'}
                        </motion.p>

                        {successMessage && mode === 'login' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-4 px-4 py-2 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-bold"
                            >
                                {successMessage}
                            </motion.div>
                        )}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            {/* E-mail */}
                            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="email"
                                        value={effectiveEmail}
                                        onChange={(e) => {
                                            if (mode === 'login') {
                                                const val = e.target.value;
                                                setEmail(val);
                                                if (val.length > 0) setEmailError(false);
                                            }
                                        }}
                                        disabled={mode !== 'login'}
                                        className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100 font-medium ${emailError
                                            ? 'border-red-500 focus:border-red-600'
                                            : email.length > 0
                                                ? 'border-green-500 focus:border-green-600'
                                                : 'border-slate-100 focus:border-[#4c1d95]'
                                            }`}
                                        placeholder="email@nic-labs.com.br"
                                        required
                                    />
                                </div>
                                {emailError && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-red-500 text-xs mt-2 font-bold ml-2"
                                    >
                                        Coloque seu email
                                    </motion.p>
                                )}
                            </motion.div>

                            {/* Token OTP */}
                            {mode === 'otp-verification' && (
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Token de Verificação</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                            <Key className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={otpToken}
                                            onChange={(e) => setOtpToken(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 font-mono tracking-widest text-center text-lg"
                                            placeholder="••••••"
                                            required
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Senha Login */}
                            {mode === 'login' && (
                                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            type={showPass ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#4c1d95] transition-colors"
                                        >
                                            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Definição de Senha */}
                            {mode === 'set-password' && (
                                <div className="space-y-5">
                                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nova senha</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <input
                                                type={showNewPass ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                                                placeholder="Defina uma senha"
                                            />
                                            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#4c1d95]">
                                                {showNewPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmar senha</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#4c1d95] transition-colors">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <input
                                                type={showConfirmPass ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#4c1d95] focus:bg-white outline-none transition-all text-slate-800 placeholder-slate-400 font-medium"
                                                placeholder="Repita a senha"
                                            />
                                            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#4c1d95]">
                                                {showConfirmPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end">
                            {mode === 'login' ? (
                                <button type="button" onClick={handleForgotPassword} className="text-sm font-bold text-[#4c1d95] hover:text-[#3b1675] transition-colors">
                                    Esqueci minha senha
                                </button>
                            ) : (
                                <button type="button" onClick={() => { setMode('login'); setSelectedUser(null); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    Voltar para login
                                </button>
                            )}
                        </div>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 1.0 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#4c1d95] hover:bg-[#3b1675] disabled:opacity-70 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold shadow-xl shadow-purple-500/20 transition-all flex items-center justify-center gap-2 group relative overflow-hidden active:scale-[0.98]"
                        >
                            <span className="relative z-10">{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar na plataforma' : mode === 'otp-verification' ? 'Validar Token' : 'Salvar e entrar'}</span>
                            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                        </motion.button>

                        {mode === 'login' && (
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.1 }}
                                type="button"
                                onClick={handleFirstAccess}
                                disabled={loading}
                                className="w-full bg-white border-2 border-slate-100 text-slate-600 py-3.5 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm"
                            >
                                Primeiro acesso
                            </motion.button>
                        )}
                    </form>
                </div>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-10 text-center text-slate-500 text-sm font-medium z-10"
            >
                © 2026 NIC-LABS. Todos os direitos reservados.
            </motion.p>
        </div>
    );
};

export default Login;
