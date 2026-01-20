import React, { useState, useRef } from 'react';
import {
    CloudUpload,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Info,
    Table
} from 'lucide-react';
import { syncExcel } from '@/services/reportApi';
import { ToastContainer, ToastType } from '@/components/Toast';

const AdminSync: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado local para toasts já que o componente exige o array
    const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.name.endsWith('.xlsx')) {
                setFile(selectedFile);
                setResults(null);
            } else {
                addToast("Por favor, selecione um arquivo Excel (.xlsx)", 'error');
            }
        }
    };

    const handleSync = async () => {
        if (!file) return;

        setIsSyncing(true);
        setResults(null);
        setProgress(10);

        try {
            setProgress(30);
            const response = await syncExcel(file);
            setProgress(100);
            setResults(response.details);
            addToast("Sincronização concluída com sucesso!", 'success');
        } catch (error: any) {
            console.error("Erro na sincronização:", error);
            addToast(`Falha na sincronização: ${error.message}`, 'error');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setProgress(0), 1000);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-500" />
                        Sincronização de Planilha
                    </h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
                        Atualize os dados do sistema em massa subindo a planilha mestre consolidada.
                        O sistema atualizará registros existentes e inserirá novos automaticamente baseando-se nos IDs.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div
                        onClick={triggerFileInput}
                        className={`
                            relative border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer
                            flex flex-col items-center justify-center gap-4
                            ${file
                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5'
                                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900'}
                        `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx"
                            className="hidden"
                        />

                        <div className={`p-4 rounded-2xl ${file ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {file ? <Table className="w-12 h-12" /> : <CloudUpload className="w-12 h-12" />}
                        </div>

                        <div className="text-center">
                            {file ? (
                                <span className="font-semibold text-slate-900 dark:text-white text-lg">
                                    {file.name}
                                </span>
                            ) : (
                                <>
                                    <p className="font-semibold text-slate-900 dark:text-white text-lg underline decoration-indigo-500 underline-offset-4">
                                        Clique para selecionar a planilha
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">Formato suportado: Microsoft Excel (.xlsx)</p>
                                </>
                            )}
                        </div>
                    </div>

                    {file && (
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setFile(null)}
                                className="px-6 py-3 rounded-2xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                disabled={isSyncing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className={`
                                    px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2
                                    ${isSyncing
                                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'}
                                `}
                            >
                                {isSyncing ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        Sincronizando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-5 h-5" />
                                        Iniciar Sincronização
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {progress > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-slate-500">Progresso da Operação</span>
                                <span className="text-sm font-bold text-indigo-500">{progress}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {results && (
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-7 h-7" />
                                <h3 className="text-xl font-bold">Relatório de Importação</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {Object.entries(results).map(([table, count]) => (
                                    <div key={table} className="bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 shadow-sm">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            {table.replace('dim_', '').replace('fato_', '')}
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                                            {count as number}
                                        </p>
                                        <p className="text-xs text-emerald-500 font-medium">unidades</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 dark:bg-indigo-950 text-white rounded-3xl p-8 shadow-xl shadow-slate-200 dark:shadow-none">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <Info className="w-5 h-5 text-indigo-400" />
                            Regras de Negócio
                        </h3>
                        <ul className="space-y-4 text-sm text-slate-300">
                            <li className="flex gap-3">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                                <span><b>Nomes Iguais:</b> As abas (ex: dim_clientes) e colunas devem ter exatamente os mesmos nomes do Supabase.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                                <span><b>Sobrescrever:</b> O sistema reescreverá os valores se encontrar um ID correspondente (Upsert).</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                                <span><b>Colaboradores:</b> Sincroniza dados baseando-se no ID ou e-mail.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-3xl p-8">
                        <h3 className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5" />
                            Atenção
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                            Certifique-se de que a planilha mestre está correta. Dados incorretos podem afetar os relatórios financeiros.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSync;
