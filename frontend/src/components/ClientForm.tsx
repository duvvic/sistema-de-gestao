// components/ClientForm.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import type { Client, User } from '../types';
import { Save, Upload, Trash2, Handshake, Building2, User as UserIcon, Mail, Phone, Calendar, DollarSign, FileText, CalendarDays, Search, ChevronDown } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import BackButton from './shared/BackButton';
import CalendarPicker from './CalendarPicker';

const ClientForm: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getClientById, createClient, updateClient, deleteClient, clients, users } = useDataController();

  const isEdit = !!clientId;
  const client = clientId ? getClientById(clientId) : null;

  // Initialize type based on URL or existing client
  const [tipo_cliente, setTipoCliente] = useState<'parceiro' | 'cliente_final'>('cliente_final');

  // Common Fields
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [cnpj, setCnpj] = useState('');

  // Partner Specific Fields
  const [razaoSocial, setRazaoSocial] = useState(''); // Consultoria often has different specific legal name
  const [emailFinanceiro, setEmailFinanceiro] = useState('');
  const [emailComercial, setEmailComercial] = useState('');
  const [responsavelComercial, setResponsavelComercial] = useState('');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');

  // Client Specific Fields
  const [partner_id, setPartnerId] = useState('');
  const [segmento, setSegmento] = useState('');
  const [responsavelProduto, setResponsavelProduto] = useState(''); // Product Owner at Client
  const [emailProduto, setEmailProduto] = useState('');
  const [responsavelTecnico, setResponsavelTecnico] = useState(''); // Tech Contact at Client (optional)

  // Internal Management (Both)
  const [responsavel_interno_id, setResponsavelInternoId] = useState(''); // Our Account Manager/PM

  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Searchable Partner Select States
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Memoized Partners List (Filtered & Sorted)
  const partners = useMemo(() => {
    return clients
      .filter((c: Client) => c.tipo_cliente === 'parceiro')
      .sort((a: Client, b: Client) => a.name.localeCompare(b.name));
  }, [clients]);

  const filteredPartners = useMemo(() => {
    return partners.filter((p: Client) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [partners, searchTerm]);

  const selectedPartner = useMemo(() => {
    return partners.find((p: Client) => p.id === partner_id);
  }, [partners, partner_id]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryTipo = urlParams.get('tipo') as 'parceiro' | 'cliente_final';
    if (queryTipo) setTipoCliente(queryTipo);

    const queryPartnerId = urlParams.get('partnerId');
    if (queryPartnerId) {
      setPartnerId(queryPartnerId);
    } else if (queryTipo === 'cliente_final' && !isEdit) {
      // Se for novo cliente e não tiver partnerId na URL, tenta pegar o primeiro parceiro da lista se já carregado
      const firstPartner = clients.find((c: Client) => c.tipo_cliente === 'parceiro');
      if (firstPartner) setPartnerId(firstPartner.id);
    }
  }, [clients, isEdit]);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setLogoUrl(client.logoUrl || '');
      setCnpj(client.cnpj || '');
      setTipoCliente(client.tipo_cliente || 'cliente_final');
      setPartnerId(client.partner_id || '');
      setResponsavelInternoId(client.responsavel_interno_id || '');

      // Map other fields from generic JSON or specific columns if they existed
      // For now we map to existing fields or state
      // Assuming 'email_contato' serves as primary contact
      if (client.tipo_cliente === 'parceiro') {
        setEmailComercial(client.email_contato || '');
        setResponsavelComercial(client.responsavel_externo || '');
        // If you have extended columns in DB, map them here. 
        // For this demo, we use the standard fields adaptable.
      } else {
        setEmailProduto(client.email_contato || '');
        setResponsavelProduto(client.responsavel_externo || '');
      }
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Nome é obrigatório');

    if (tipo_cliente === 'cliente_final' && !partner_id) {
      return alert('É obrigatório vincular este cliente a um parceiro.');
    }

    try {
      setLoading(true);

      const payload = {
        name,
        logoUrl,
        cnpj,
        tipo_cliente,
        partner_id: tipo_cliente === 'cliente_final' ? partner_id : null,
        responsavel_interno_id: responsavel_interno_id || null,

        // Mapping specific roles to the unified DB columns
        email_contato: tipo_cliente === 'parceiro' ? emailComercial : emailProduto,
        responsavel_externo: tipo_cliente === 'parceiro' ? responsavelComercial : responsavelProduto,

        // We could store extra metadata in a JSON column if needed, or simply extended columns
        // For now, ensuring core connectivity
      };

      if (isEdit && clientId) {
        await updateClient(clientId, payload);
        alert('Atualizado com sucesso!');
      } else {
        await createClient({
          ...payload,
          active: true,
          // Pass extra data if your createClient supports it, or use standard fields
        });
        alert(`${tipo_cliente === 'parceiro' ? 'Parceiro' : 'Cliente'} criado com sucesso!`);
      }
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo');
      const subTab = urlParams.get('sub');

      if (returnTo) {
        if (returnTo === 'dashboard') {
          navigate(`/admin/clients?tab=parceiros`);
        } else {
          // Se veio do AdminDashboard (Parceiros), o returnTo é o partnerId
          // Verificamos se a subTab é uma das abas do dashboard de parceiros
          const dashboardTabs = ['clientes', 'resumo', 'info', 'parceiros'];
          if (subTab && dashboardTabs.includes(subTab)) {
            navigate(`/admin/clients?tab=parceiros&partnerId=${returnTo}&sub=${subTab}`);
          } else {
            // Caso contrário, vai para a visão detalhada individual
            navigate(`/admin/clients/${returnTo}${subTab ? `?sub=${subTab}` : ''}`);
          }
        }
      } else if (isEdit && clientId) {
        // Se for edição e não tiver returnTo, tenta retornar conforme o tipo
        if (tipo_cliente === 'parceiro') {
          navigate(`/admin/clients?tab=parceiros&partnerId=${clientId}${subTab ? `&sub=${subTab}` : ''}`);
        } else {
          navigate(`/admin/clients/${clientId}${subTab ? `?sub=${subTab}` : ''}`);
        }
      } else {
        const defaultTab = tipo_cliente === 'parceiro' ? 'parceiros' : 'operacional';
        navigate(`/admin/clients?tab=${defaultTab}`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      await deleteClient(clientId);
      alert('Excluído com sucesso!');
      navigate('/admin/clients');
    } catch (error) {
      alert('Erro ao excluir. Verifique vínculos.');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg)]">
      {/* Header Distinct per Type */}
      <div className="px-8 py-6 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <BackButton fallbackRoute="/admin/clients" />
          <div>
            <h2 className="text-xl font-bold text-[var(--text-title)] flex items-center gap-2">
              {tipo_cliente === 'parceiro' ? <Handshake className="text-purple-500" /> : <Building2 className="text-blue-500" />}
              {isEdit ? `Editar ${tipo_cliente === 'parceiro' ? 'Parceiro' : 'Cliente'} ` : `Novo ${tipo_cliente === 'parceiro' ? 'Parceiro' : 'Cliente'} `}
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {tipo_cliente === 'parceiro'
                ? 'Cadastre uma consultoria/parceiro de negócios'
                : 'Cadastre uma conta cliente vinculada a um parceiro'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`px-6 py-2.5 text-white rounded-lg font-bold shadow hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 ${tipo_cliente === 'parceiro' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar Cadastro'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">

          {/* -- FIELDS FOR PARTNER -- */}
          {tipo_cliente === 'parceiro' && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Dados da Consultoria</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Nome Fantasia (Parceiro) *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-bold text-[var(--text)] focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ex: Tech Solutions Consultoria" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">CNPJ</label>
                    <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-purple-500 outline-none" placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">URL do Logo</label>
                    <div className="flex gap-2">
                      <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="flex-1 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-purple-500 outline-none" placeholder="https://..." />
                      {logoUrl && <img src={logoUrl} alt="Preview" className="w-12 h-12 object-contain bg-white rounded-lg border p-1" />}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Pontos de Contato (Parceiro)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Responsável Comercial</label>
                    <input type="text" value={responsavelComercial} onChange={e => setResponsavelComercial(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] outline-none focus:border-purple-500" placeholder="Nome do contato principal" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Email Comercial</label>
                    <input type="email" value={emailComercial} onChange={e => setEmailComercial(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] outline-none focus:border-purple-500" placeholder="contato@consultoria.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Email Financeiro (Faturamento)</label>
                    <input type="email" value={emailFinanceiro} onChange={e => setEmailFinanceiro(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] outline-none focus:border-purple-500" placeholder="financeiro@consultoria.com" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Dados Contratuais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
                  <div className="relative">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Início Vigência</label>
                    <div className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                      <input
                        type="date"
                        value={contractStart}
                        onChange={e => setContractStart(e.target.value)}
                        className="bg-transparent outline-none text-[var(--text)] w-full cursor-pointer"
                        onClick={(e) => { e.preventDefault(); setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }}
                      />
                      <CalendarDays className="w-4 h-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }} />
                    </div>
                    {showStartCalendar && (
                      <CalendarPicker
                        selectedDate={contractStart}
                        onSelectDate={(date) => {
                          setContractStart(date);
                        }}
                        onClose={() => setShowStartCalendar(false)}
                      />
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Fim Vigência (Opcional)</label>
                    <div className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                      <input
                        type="date"
                        value={contractEnd}
                        onChange={e => setContractEnd(e.target.value)}
                        className="bg-transparent outline-none text-[var(--text)] w-full cursor-pointer"
                        onClick={(e) => { e.preventDefault(); setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }}
                      />
                      <CalendarDays className="w-4 h-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }} />
                    </div>
                    {showEndCalendar && (
                      <CalendarPicker
                        selectedDate={contractEnd}
                        onSelectDate={(date) => {
                          setContractEnd(date);
                        }}
                        onClose={() => setShowEndCalendar(false)}
                      />
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* -- FIELDS FOR CLIENT -- */}
          {tipo_cliente === 'cliente_final' && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Dados da Empresa (Cliente Final)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Nome da Empresa *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl font-bold text-[var(--text)] focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Indústria XYZ S.A." required />
                  </div>
                  <div className="col-span-2">
                    {/* VINCULO COM PARCEIRO - CRUCIAL */}
                    <label className="block text-xs font-bold text-blue-500 mb-2 uppercase tracking-wide">Vinculado ao Parceiro * (Quarterização)</label>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full p-4 bg-[var(--bg)] border-2 rounded-xl text-[var(--text)] font-bold transition-all flex items-center justify-between outline-none ${isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-blue-500/20 hover:border-blue-500/40'}`}
                      >
                        {selectedPartner ? (
                          <div className="flex items-center gap-3">
                            {selectedPartner.logoUrl ? (
                              <img src={selectedPartner.logoUrl} alt={selectedPartner.name} className="w-8 h-8 object-contain rounded-lg border bg-white p-1" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg border bg-[var(--surface)] flex items-center justify-center">
                                <Handshake className="w-4 h-4 opacity-30" />
                              </div>
                            )}
                            <span className="truncate">{selectedPartner.name}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] font-normal">Selecione um Parceiro Responsável...</span>
                        )}
                        <ChevronDown className={`w-5 h-5 text-blue-500/50 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg)]/50 backdrop-blur-sm sticky top-0">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                              <input
                                autoFocus
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Procurar parceiro por nome..."
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-2">
                            {filteredPartners.length > 0 ? (
                              filteredPartners.map((p: Client) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setPartnerId(p.id);
                                    setIsDropdownOpen(false);
                                    setSearchTerm('');
                                  }}
                                  className={`w-full p-3 flex items-center gap-4 rounded-xl transition-all text-left ${partner_id === p.id ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'hover:bg-blue-500/10'}`}
                                >
                                  {p.logoUrl ? (
                                    <img src={p.logoUrl} alt={p.name} className={`w-10 h-10 object-contain rounded-lg border p-1.5 bg-white ${partner_id === p.id ? 'border-transparent' : ''}`} />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${partner_id === p.id ? 'bg-white/20 border-transparent' : 'bg-[var(--bg)]'}`}>
                                      <Handshake className={`w-5 h-5 ${partner_id === p.id ? 'text-white' : 'opacity-20'}`} />
                                    </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold truncate text-sm">{p.name}</span>
                                    {p.cnpj && <span className={`text-[10px] uppercase tracking-wider opacity-60 ${partner_id === p.id ? 'text-blue-50' : ''}`}>{p.cnpj}</span>}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <div className="p-3 bg-red-50 rounded-full mb-3">
                                  <Search className="w-6 h-6 text-red-500 opacity-50" />
                                </div>
                                <p className="text-sm font-bold text-[var(--text-title)]">Nenhum parceiro encontrado</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Tente buscar por outro termo ou nome</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--muted)] mt-1.5 ml-1">Obrigatório selecionar a consultoria responsável por este cliente.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Segmento / Indústria</label>
                    <input type="text" value={segmento} onChange={e => setSegmento(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Varejo, Bancário..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">CNPJ</label>
                    <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-blue-500 outline-none" placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">URL do Logo</label>
                    <div className="flex gap-2">
                      <input type="text" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="flex-1 p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                      {logoUrl && <img src={logoUrl} alt="Preview" className="w-12 h-12 object-contain bg-white rounded-lg border p-1" />}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Responsáveis no Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Product Owner / Contato Principal</label>
                    <input type="text" value={responsavelProduto} onChange={e => setResponsavelProduto(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] outline-none focus:border-blue-500" placeholder="Nome do PO" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Email do PO</label>
                    <input type="email" value={emailProduto} onChange={e => setEmailProduto(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] outline-none focus:border-blue-500" placeholder="po@cliente.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Responsável Técnico (Opcional)</label>
                    <input type="text" value={responsavelTecnico} onChange={e => setResponsavelTecnico(e.target.value)} className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] outline-none focus:border-blue-500" placeholder="Tech Lead do cliente" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Dados Contratuais (Opcional)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
                  <div className="relative">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Início Vigência (Projeto Único)</label>
                    <div className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                      <input
                        type="date"
                        value={contractStart}
                        onChange={e => setContractStart(e.target.value)}
                        className="bg-transparent outline-none text-[var(--text)] w-full cursor-pointer"
                        onClick={(e) => { e.preventDefault(); setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }}
                      />
                      <CalendarDays className="w-4 h-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => { setShowStartCalendar(!showStartCalendar); setShowEndCalendar(false); }} />
                    </div>
                    {showStartCalendar && (
                      <CalendarPicker
                        selectedDate={contractStart}
                        onSelectDate={(date) => {
                          setContractStart(date);
                        }}
                        onClose={() => setShowStartCalendar(false)}
                      />
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Fim Vigência (Previsão)</label>
                    <div className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl">
                      <input
                        type="date"
                        value={contractEnd}
                        onChange={e => setContractEnd(e.target.value)}
                        className="bg-transparent outline-none text-[var(--text)] w-full cursor-pointer"
                        onClick={(e) => { e.preventDefault(); setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }}
                      />
                      <CalendarDays className="w-4 h-4 opacity-40 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => { setShowEndCalendar(!showEndCalendar); setShowStartCalendar(false); }} />
                    </div>
                    {showEndCalendar && (
                      <CalendarPicker
                        selectedDate={contractEnd}
                        onSelectDate={(date) => {
                          setContractEnd(date);
                        }}
                        onClose={() => setShowEndCalendar(false)}
                      />
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* -- INTERNAL MANAGEMENT (COMMON) -- */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-[var(--text)]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Gestão Interna (Nossa Equipe)</h3>
            </div>
            <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm">
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 uppercase">Gestor da Conta / PMO Responsável</label>
              <select
                value={responsavel_interno_id}
                onChange={e => setResponsavelInternoId(e.target.value)}
                className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--brand)] outline-none"
              >
                <option value="">Selecione um gestor interno...</option>
                {users.filter((u: User) => u.active !== false).map((u: User) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="mr-auto px-6 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir Cadastro
              </button>
            )}
          </div>

        </form>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Cadastro"
        message={`Tem certeza que deseja excluir "${name}" ? `}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        confirmText={loading ? 'Excluindo...' : 'Excluir'}
        confirmColor="red"
        disabled={loading}
      />
    </div>
  );
};

export default ClientForm;
