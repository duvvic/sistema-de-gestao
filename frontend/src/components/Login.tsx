// components/Login.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth, normalizeEmail } from '@/contexts/AuthContext';
import { fetchUsers } from '@/services/api';

type Mode = 'login' | 'set-password' | 'otp-verification' | 'first-access';

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

export default function Login() {
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
    const [pendingRedirect, setPendingRedirect] = useState(false);

    // Novas flags de UI interativa e fluxo por etapas
    const [showForgot, setShowForgot] = useState(false);
    const [showFirstAccess, setShowFirstAccess] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    const [emailFound, setEmailFound] = useState(false);
    const [knownEmails, setKnownEmails] = useState<string[]>([]);

    const passwordRef = useRef<HTMLInputElement>(null);

    // Carregar e-mails para auto-complete
    useEffect(() => {
        fetchUsers().then(users => {
            const emails = users.map(u => u.email.toLowerCase());
            setKnownEmails(emails);
        }).catch(err => console.error("Erro ao carregar e-mails para autocomplete:", err));
    }, []);

    // Carregar e-mail lembrado no monte
    useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            // Se já tem e-mail salvo, podemos tentar validar imediatamente após um pequeno delay para garantir que os e-mails conhecidos carregaram
            setTimeout(() => handleEmailBlur(), 800);
        }
    }, []);
    const [alertConfig, setAlertConfig] = useState<{ show: boolean, message: string, title?: string }>({
        show: false,
        message: '',
        title: ''
    });

    // Listener global para fechar alerta com a tecla Enter
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && alertConfig.show) {
                closeAlert();
            }
        };

        if (alertConfig.show) {
            window.addEventListener('keydown', handleKeyPress);
        }

        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [alertConfig.show]);

    const [showPass, setShowPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const showAlert = (message: string, title: string = 'Aviso') => {
        setAlertConfig({ show: true, message, title });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, show: false }));
        if (pendingRedirect) {
            const userToUse = currentUser || selectedUser;
            const path = userToUse?.role === 'admin' ? '/admin/clients' : '/developer/projects';
            navigate(path, { replace: true });
        }
    };

    const togglePasswordVisibility = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(prev => !prev);
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

        // Se estiver no modo login e o campo de senha ainda estiver oculto, valida o e-mail primeiro
        if (mode === 'login' && !showPasswordInput && !showFirstAccess) {
            await handleEmailBlur();
            return;
        }

        if (mode === 'login') await handleLogin();
        else if (mode === 'first-access') await handleSendOtp();
        else if (mode === 'otp-verification') await handleVerifyOtp();
        else await handleCreatePassword();
    };

    const handleEmailBlur = async () => {
        let val = email.trim().toLowerCase();
        if (!val) return;

        // Auto-correção (.com -> .com.br)
        if (val.endsWith('.com') && !val.includes('.com.br')) {
            val = val + '.br';
            setEmail(val);
        }

        if (mode !== 'login') return;

        setIsCheckingEmail(true);
        try {
            const { data: colab } = await supabase
                .from('dim_colaboradores')
                .select('ID_Colaborador, email, NomeColaborador, papel')
                .eq('email', val)
                .maybeSingle();

            if (!colab) {
                setEmailFound(false);
                setShowPasswordInput(false);
                setShowFirstAccess(false);
                return;
            }

            setEmailFound(true);

            // Verifica se tem senha
            const { data: cred } = await supabase
                .from('user_credentials')
                .select('colaborador_id')
                .eq('colaborador_id', colab.ID_Colaborador)
                .maybeSingle();

            if (!cred) {
                // Se não tem senha, dispara AUTOMATICAMENTE o primeiro acesso
                setIsCheckingEmail(true);
                setLoading(true);
                try {
                    // Envia OTP via Supabase
                    const { error: otpErr } = await supabase.auth.signInWithOtp({
                        email: val,
                        options: { shouldCreateUser: true }
                    });

                    if (otpErr) throw otpErr;

                    // Guarda dados temporários
                    setSelectedUser({
                        id: String(colab.ID_Colaborador),
                        name: colab.NomeColaborador,
                        email: colab.email,
                        role: String(colab.papel || '').toLowerCase().includes('admin') ? 'admin' : 'developer'
                    } as User);

                    // Vai direto para verificação
                    setMode('otp-verification');
                    showAlert('Identificamos que este é seu primeiro acesso! Enviamos um código de segurança para seu e-mail.', 'Primeiro Acesso');
                } catch (otpError: any) {
                    console.error('Erro ao auto-enviar OTP:', otpError);
                    setShowFirstAccess(true); // Fallback para botão manual se falhar
                } finally {
                    setLoading(false);
                }
            } else {
                // Se tem senha, exibe o campo e foca
                setShowPasswordInput(true);
                setShowFirstAccess(false);
                setTimeout(() => passwordRef.current?.focus(), 100);
            }
        } catch (e) {
            console.warn('Erro ao validar e-mail:', e);
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: password,
            });

            if (error) {
                setShowForgot(true);
                throw new Error(error.message === 'Invalid login credentials' ? 'Senha incorreta.' : error.message);
            }

            localStorage.setItem('remembered_email', normalizedEmail);
        } catch (err: any) {
            showAlert(err.message, 'Falha no Acesso');
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

            // 3. Define flag para redirecionamento após fechar o alerta
            setPendingRedirect(true);
            showAlert('Sua senha foi definida com sucesso! Entrando no sistema...', 'Sucesso!');
        } catch (err: any) {
            showAlert('Erro ao definir senha: ' + err.message, 'Erro');
        } finally {
            setLoading(false);
        }
    };

    const handleFindUser = async (modeName: 'first' | 'forgot') => {
        setMode('first-access');
        setOtpToken('');
        setNewPassword('');
        setConfirmPassword('');
        if (!email) {
            const savedEmail = localStorage.getItem('remembered_email');
            if (savedEmail) setEmail(savedEmail);
        }
    };

    const handleSendOtp = async () => {
        if (!email) {
            showAlert('Informe seu e-mail corporativo.', 'Campo Obrigatório');
            return;
        }

        setLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();

            // 1. Validar se o usuário existe na base dim_colaboradores
            const { data: dbUser, error: dbError } = await supabase
                .from('dim_colaboradores')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();

            if (dbError) throw dbError;

            if (!dbUser) {
                showAlert('E-mail não encontrado em nossa base de colaboradores. Verifique o endereço digitado.', 'E-mail Inválido');
                return;
            }

            // 2. Enviar OTP via Supabase
            const { error: otpErr } = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true, // Garante que o usuário exista no Auth do Supabase
                }
            });

            if (otpErr) throw otpErr;

            // 3. Guardar dados temporários do usuário para a próxima fase
            setSelectedUser({
                id: String(dbUser.ID_Colaborador),
                name: dbUser.NomeColaborador,
                email: dbUser.email,
                role: String(dbUser.papel || '').toLowerCase().includes('admin') ? 'admin' : 'developer'
            } as User);

            // 4. Mudar para modo de verificação
            setMode('otp-verification');
            showAlert('Código de segurança enviado! Verifique sua caixa de entrada.', 'E-mail Enviado');
        } catch (err: any) {
            console.error('Erro ao enviar OTP:', err);
            showAlert('Falha ao processar solicitação: ' + (err.message || 'Erro de conexão'), 'Erro');
        } finally {
            setLoading(false);
        }
    };

    const effectiveEmail = (mode === 'set-password' || mode === 'otp-verification') && selectedUser ? selectedUser.email : email;

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 relative font-sans overflow-hidden bg-[#0f172a]">
            {/* Elementos Decorativos de Fundo (Premium Effect) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#312e81]/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
            </div>

            <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 md:p-12 space-y-10 relative z-10 border border-white/20">
                <div className="text-center flex flex-col items-center">
                    <div className="p-3 bg-slate-50 rounded-2xl mb-6 shadow-sm ring-1 ring-slate-100">
                        <img src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png" alt="NIC Labs" className="h-10 w-auto" />
                    </div>
                    <h2 className="text-[28px] font-black text-[#1e1b4b] tracking-tight leading-tight">
                        {mode === 'login' ? 'Bem-vindo colaborador'
                            : mode === 'first-access' ? 'Primeiro Acesso'
                                : mode === 'otp-verification' ? 'Validação de Segurança'
                                    : 'Nova Senha'}
                    </h2>
                    <p className="text-[#64748b] text-base mt-3 font-medium opacity-80">
                        {mode === 'login' ? 'Acesse com seu e-mail corporativo'
                            : mode === 'first-access' ? 'Informe seu e-mail para receber o código'
                                : mode === 'otp-verification' ? 'Insira o código enviado por e-mail'
                                    : 'Crie uma senha forte para sua conta'}
                    </p>
                </div>

                <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
                    {(mode === 'login' || mode === 'first-access') && (
                        <div>
                            <label className="block text-xs font-bold text-[#334155] mb-2 uppercase">E-mail Corporativo</label>
                            <div className="relative">
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${emailFound ? 'text-emerald-500' : 'text-slate-400'}`} />
                                <div className="relative flex items-center w-full">
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (showPasswordInput) setShowPasswordInput(false);
                                            if (showFirstAccess) setShowFirstAccess(false);
                                            if (emailFound) setEmailFound(false);
                                        }}
                                        onKeyDown={(e) => {
                                            const suggestion = email.length > 1 && mode === 'login'
                                                ? knownEmails.find(ev => ev.startsWith(email.toLowerCase()) && ev !== email.toLowerCase())
                                                : null;

                                            if (e.key === 'Tab' && suggestion) {
                                                e.preventDefault();
                                                setEmail(suggestion);
                                            }
                                        }}
                                        className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-xl focus:border-purple-500 outline-none transition-all text-[#1e1b4b] font-medium
                                            ${emailFound ? 'border-emerald-100' : 'border-slate-100'}`}
                                        placeholder="nome@nic-labs.com.br"
                                        autoComplete="off"
                                        onBlur={handleEmailBlur}
                                        required
                                    />
                                    {/* Sugestão visual (Ghost text) baseada em e-mails conhecidos */}
                                    {(email.length > 1 && mode === 'login') && (
                                        (() => {
                                            const suggestion = knownEmails.find(ev => ev.startsWith(email.toLowerCase()) && ev !== email.toLowerCase());
                                            if (!suggestion) return null;
                                            return (
                                                <div className="absolute left-12 py-3.5 pointer-events-none flex items-center overflow-hidden whitespace-nowrap">
                                                    <span className="opacity-0">{email}</span>
                                                    <span className="text-slate-300 font-medium">{suggestion.substring(email.length)}</span>
                                                    <span className="ml-2 text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">Tab</span>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                                {isCheckingEmail && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {mode === 'otp-verification' && (
                        <div>
                            <label className="block text-xs font-bold text-[#334155] mb-2 uppercase">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 opacity-50" />
                                <input
                                    type="email"
                                    value={effectiveEmail}
                                    disabled
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-2 border-slate-100 rounded-xl outline-none text-[#64748b] font-medium cursor-not-allowed"
                                />
                            </div>
                        </div>
                    )}

                    {mode === 'login' && showPasswordInput && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <label className="block text-xs font-bold text-[#334155] mb-2 uppercase">Sua Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    ref={passwordRef}
                                    type={showPass ? "text" : "password"}
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
                                <button type="button" onClick={() => togglePasswordVisibility(setShowPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-2 hover:text-purple-600 transition-colors">
                                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'otp-verification' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <label className="block text-[10px] font-black text-purple-700 mb-4 px-2 uppercase tracking-[0.2em] text-center">Código de Verificação</label>
                            <input
                                type="text"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value)}
                                className="w-full py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center text-3xl font-black tracking-[0.4em] focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-[#1e1b4b]"
                                placeholder="00000000"
                                maxLength={8}
                                required
                                autoFocus
                            />
                            <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
                                Enviado para <span className="text-slate-600 font-bold">{effectiveEmail}</span>
                            </p>
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
                        disabled={loading || isCheckingEmail}
                        className="w-full bg-[#1e1b4b] hover:bg-[#2d2a6e] text-white py-5 rounded-2xl font-black text-base transition-all active:scale-[0.98] disabled:opacity-50 shadow-[0_10px_30px_rgba(30,27,75,0.25)] flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {mode === 'login' ? (showFirstAccess ? '✨ Primeiro Acesso' : (!showPasswordInput ? 'Continuar' : 'Entrar na plataforma')) :
                                    mode === 'first-access' ? 'Enviar Código' :
                                        mode === 'otp-verification' ? 'Verificar Acesso' :
                                            'Concluir Cadastro'}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    {mode === 'login' && (
                        <div className="flex flex-col gap-3 text-center">
                            {showForgot && (
                                <button
                                    type="button"
                                    onClick={() => handleFindUser('forgot')}
                                    className="text-sm font-bold text-purple-700 hover:underline animate-in fade-in slide-in-from-top-2 duration-300"
                                >
                                    Esqueci minha senha
                                </button>
                            )}

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

