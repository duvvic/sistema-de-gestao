// components/Login.tsx - Versão adaptada para React Router
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Key, Eye, EyeOff } from 'lucide-react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUsers } from '@/services/api';

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

    // Estados para visualização temporária de senha
    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Função para mostrar senha por 1 segundo
    const peekPassword = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(true);
        setTimeout(() => setter(false), 1000);
    };

    // Carregar usuários ao montar
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const usersData = await fetchUsers();
                if (usersData.length === 0) {
                    console.warn('[Login] Aviso: Lista de usuários retornou vazia do banco.');
                }
                console.log(`[Login] ${usersData.length} usuários carregados com sucesso.`);
                setUsers(usersData);
            } catch (error) {
                console.error('[Login] ERRO CRÍTICO ao carregar usuários:', error);
                alert('Não foi possível conectar ao banco de dados para carregar os usuários. Verifique sua conexão.');
            }
        };
        loadUsers();
    }, []);

    // Redireciona se já estiver logado (somente no modo normal de login)
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
            console.log('[Login] Tentando login para:', normalizedInput);

            if (!normalizedInput || !password) {
                alert('Informe e-mail e senha.');
                return;
            }

            // Busca colaborador diretamente pelo e-mail (mais robusto que buscar no state)
            const { data: dbUser, error: userError } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('E-mail', normalizedInput)
                .maybeSingle();

            if (userError) {
                console.error('[Login] Erro ao buscar usuário:', userError);
                throw new Error('Erro ao conectar com o banco de dados.');
            }

            if (!dbUser) {
                console.warn('[Login] Usuário não encontrado no banco:', normalizedInput);
                alert(`E-mail "${normalizedInput}" não encontrado.`);
                return;
            }

            // Mapeia para o tipo User
            const foundUser: User = {
                id: String(dbUser.ID_Colaborador),
                name: dbUser.NomeColaborador || "Sem nome",
                email: String(dbUser["E-mail"] || "").trim().toLowerCase(),
                avatarUrl: dbUser.avatar_url || undefined,
                cargo: dbUser.Cargo || undefined,
                role: dbUser.papel === 'Administrador' ? 'admin' : (dbUser.papel === 'Gestor' ? 'gestor' : 'developer'),
                active: dbUser.ativo !== false,
            };

            // Busca credencial
            const { data: credential, error: credError } = await supabase
                .from('user_credentials')
                .select('password_hash')
                .eq('colaborador_id', Number(foundUser.id))
                .maybeSingle();

            if (credError) {
                console.error('[Login] Erro ao buscar credencial:', credError);
                throw new Error('Erro ao validar credenciais.');
            }

            if (!credential) {
                alert('Este é seu primeiro acesso. Use o botão "Primeiro acesso" abaixo.');
                return;
            }

            const passwordHash = await hashPassword(password);
            if (passwordHash !== credential.password_hash) {
                alert('Senha incorreta.');
                return;
            }

            console.log('[Login] Sucesso!');
            login(foundUser);
            const redirectPath = foundUser.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(redirectPath);

        } catch (err: any) {
            console.error('[Login] Falha no login:', err);
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
            console.log('[Login] Verificando OTP para:', normalizedEmail);

            const { error } = await supabase.auth.verifyOtp({
                email: normalizedEmail,
                token: otpToken.trim(),
                type: 'email',
            });

            if (error) {
                // Tenta como 'recovery' (recuperação de senha)
                const { error: recoveryError } = await supabase.auth.verifyOtp({
                    email: normalizedEmail,
                    token: otpToken.trim(),
                    type: 'recovery',
                });

                if (recoveryError) {
                    // Tenta como 'signup' (primeiro acesso)
                    const { error: signupError } = await supabase.auth.verifyOtp({
                        email: normalizedEmail,
                        token: otpToken.trim(),
                        type: 'signup',
                    });

                    if (signupError) {
                        console.error('[Login] Erro OTP (Todos os tipos falharam):', signupError);
                        alert('Token inválido ou expirado. Verifique o código e tente novamente.');
                        return;
                    }
                }
            }

            setMode('set-password');
        } catch (error) {
            console.error('[Login] Erro no verifyOtp:', error);
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

        if (newPassword.length < 7 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            alert('A senha deve ter no mínimo 7 caracteres, com letras e números.');
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

            // Volta para login preenchendo os campos, sem logar automaticamente
            setMode('login');
            setEmail(selectedUser.email);
            setPassword(newPassword);
            setSelectedUser(null);
            setNewPassword('');
            setConfirmPassword('');
            setOtpToken('');
            setSuccessMessage('Senha atualizada com sucesso! Faça login abaixo.');
        } catch (error: any) {
            console.error('[Login] Erro ao criar senha:', error);
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
            console.log('[Login] Iniciando recuperação para:', normalizedEmail);

            // Verifica se usuário existe antes de tentar enviar e-mail
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
                email: String(dbUser["E-mail"] || "").trim().toLowerCase(),
                role: (String(dbUser.papel || dbUser.cargo || '')).toLowerCase().includes('admin') ? 'admin' : 'developer',
            } as User;

            // Envia OTP (Token)
            const { error: authError } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true
                }
            });

            if (authError) {
                console.error('[Login] Erro signInWithOtp:', authError);
                throw authError;
            }

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
            alert('Informe seu e-mail para validar seu primeiro acesso.');
            return;
        }

        try {
            setLoading(true);
            const normalizedEmail = email.trim().toLowerCase();
            console.log('[Login] Iniciando primeiro acesso para:', normalizedEmail);

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
                email: String(dbUser["E-mail"] || "").trim().toLowerCase(),
                role: dbUser.papel === 'admin' ? 'admin' : (dbUser.papel === 'gestor' ? 'gestor' : 'developer'),
            } as User;

            // Envia OTP para primeiro acesso
            const { error: authError } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true
                }
            });

            if (authError) {
                console.error('[Login] Erro signInWithOtp:', authError);
                throw authError;
            }

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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        <img
                            src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png"
                            alt="NIC Labs"
                            className="h-20 w-auto object-contain"
                        />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        {mode === 'otp-verification' ? 'Verificação de Código' :
                            mode === 'set-password' ? 'Defina sua senha' : 'Bem-vindo de volta'}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {mode === 'otp-verification' ? 'Insira o token enviado para seu e-mail' :
                            mode === 'set-password' ? 'Crie sua senha para acessar o NIC Labs Manager.' :
                                'Acesse sua conta para gerenciar projetos'}
                    </p>
                    {successMessage && mode === 'login' && (
                        <div className="mt-4 px-4 py-2 rounded-lg bg-green-100 border border-green-200 text-green-700 text-sm font-semibold">
                            {successMessage}
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* E-mail */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <input
                                    type="email"
                                    value={effectiveEmail}
                                    onChange={(e) => mode === 'login' && setEmail(e.target.value)}
                                    disabled={mode !== 'login'}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Token OTP */}
                        {mode === 'otp-verification' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Token de Verificação</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Key className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={otpToken}
                                        onChange={(e) => setOtpToken(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 font-mono tracking-widest text-center text-lg"
                                        placeholder="••••••"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Senha normal */}
                        {mode === 'login' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <Lock className="h-5 h-5" />
                                    </div>
                                    <input
                                        type={showPass ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => peekPassword(setShowPass)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Definição de senha */}
                        {mode === 'set-password' && (
                            <>
                                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Requisitos da senha:</p>
                                    <ul className="text-xs text-purple-700 list-disc list-inside space-y-0.5">
                                        <li>No mínimo 7 caracteres</li>
                                        <li>Deve conter letras e números</li>
                                    </ul>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nova senha</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Lock className="h-5 h-5" />
                                        </div>
                                        <input
                                            type={showNewPass ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
                                            placeholder="Defina uma senha"
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

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar senha</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Lock className="h-5 h-5" />
                                        </div>
                                        <input
                                            type={showConfirmPass ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400"
                                            placeholder="Repita a senha"
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
                            </>
                        )}
                    </div>

                    <div className="flex flex-col space-y-3">
                        {mode === 'login' && (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-sm font-medium text-[#4c1d95] hover:underline self-end"
                            >
                                Esqueci minha senha
                            </button>
                        )}

                        {mode !== 'login' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login');
                                    setSelectedUser(null);
                                    setOtpToken('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                className="text-sm font-medium text-slate-500 hover:underline flex items-center gap-1"
                            >
                                <ArrowRight className="w-4 h-4 rotate-180" />
                                Voltar para login
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#4c1d95] hover:bg-[#3b1675] disabled:opacity-70 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 group"
                    >
                        {loading ? 'Aguarde...' :
                            mode === 'login' ? 'Entrar' :
                                mode === 'otp-verification' ? 'Validar Token' :
                                    'Salvar senha e entrar'}
                        {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </button>

                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={handleFirstAccess}
                            disabled={loading}
                            className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            Primeiro acesso
                        </button>
                    )}
                </form>
            </div>

            <p className="mt-8 text-center text-slate-400 text-sm">
                © 2024 NIC Labs Manager. Todos os direitos reservados.
            </p>
        </div>
    );
};

export default Login;
