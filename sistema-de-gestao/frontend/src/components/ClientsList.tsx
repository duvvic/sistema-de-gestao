// ClientsList.tsx - Lista de Clientes
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { formatDecimalToTime } from '@/utils/normalizers';
import {
  Building2,
  Search,
  Plus,
  Briefcase,
  DollarSign,
  TrendingUp,
  Mail,
  Phone,
  ExternalLink,
  Filter,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

const ClientsList: React.FC = () => {
  const navigate = useNavigate();
  const { clients, projects, timesheetEntries, users } = useDataController();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Calculate metrics per client
  const clientMetrics = useMemo(() => {
    return clients.map(client => {
      const clientProjects = projects.filter(p => p.clientId === client.id && p.active !== false);
      const activeProjects = clientProjects.filter(p => p.status !== 'Concluído' && p.status !== 'Done');

      const totalRevenue = clientProjects.reduce((sum, p) => sum + (p.valor_total_rs || 0), 0);

      const projectIds = clientProjects.map(p => p.id);
      const clientTimesheets = timesheetEntries.filter(e => projectIds.includes(e.projectId));

      const totalCost = clientTimesheets.reduce((sum, e) => {
        const user = users.find(u => u.id === e.userId);
        return sum + (e.totalHours * (user?.hourlyCost || 0));
      }, 0);

      const totalHours = clientTimesheets.reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);
      const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

      return {
        ...client,
        projectCount: clientProjects.length,
        activeProjectCount: activeProjects.length,
        totalRevenue,
        totalCost,
        totalHours,
        margin
      };
    });
  }, [clients, projects, timesheetEntries, users]);

  // Filter and sort
  const filteredClients = useMemo(() => {
    let filtered = clientMetrics.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email_contato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a];
      const bValue = b[sortConfig.key as keyof typeof b];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [clientMetrics, searchTerm, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortConfig.direction === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  // Summary stats
  const summary = useMemo(() => ({
    totalClients: clients.length,
    activeClients: clientMetrics.filter(c => c.activeProjectCount > 0).length,
    totalRevenue: clientMetrics.reduce((sum, c) => sum + c.totalRevenue, 0),
    avgMargin: clientMetrics.length > 0
      ? clientMetrics.reduce((sum, c) => sum + c.margin, 0) / clientMetrics.length
      : 0
  }), [clients, clientMetrics]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-8 py-6 border-b" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>
              Gestão de Clientes
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Visão consolidada de todos os clientes e seus projetos
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/clients/new')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
            style={{ backgroundColor: 'var(--primary)', color: 'white' }}
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>Total de Clientes</span>
            </div>
            <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>
              {summary.totalClients}
            </div>
          </div>

          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4" style={{ color: 'var(--success)' }} />
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>Clientes Ativos</span>
            </div>
            <div className="text-2xl font-black" style={{ color: 'var(--success)' }}>
              {summary.activeClients}
            </div>
          </div>

          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--info)' }} />
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>Receita Total</span>
            </div>
            <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>
              {summary.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
            </div>
          </div>

          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" style={{ color: summary.avgMargin >= 25 ? 'var(--success)' : 'var(--warning)' }} />
              <span className="text-xs font-bold uppercase" style={{ color: 'var(--muted)' }}>Margem Média</span>
            </div>
            <div className="text-2xl font-black" style={{ color: summary.avgMargin >= 25 ? 'var(--success)' : 'var(--warning)' }}>
              {summary.avgMargin.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b flex items-center gap-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none text-sm"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewMode === 'cards' ? 'shadow-sm' : ''
              }`}
            style={{
              backgroundColor: viewMode === 'cards' ? 'var(--primary)' : 'var(--surface-2)',
              color: viewMode === 'cards' ? 'white' : 'var(--text-2)'
            }}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${viewMode === 'table' ? 'shadow-sm' : ''
              }`}
            style={{
              backgroundColor: viewMode === 'table' ? 'var(--primary)' : 'var(--surface-2)',
              color: viewMode === 'table' ? 'white' : 'var(--text-2)'
            }}
          >
            Tabela
          </button>
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar p-8">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <div
                key={client.id}
                onClick={() => navigate(`/admin/clients/${client.id}`)}
                className="p-6 rounded-2xl border cursor-pointer transition-all hover:shadow-xl group"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--primary-soft)' }}
                    >
                      <Building2 className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>
                        {client.name}
                      </h3>
                      {client.cnpj && (
                        <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                          {client.cnpj}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${client.activeProjectCount > 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
                      }`}
                  >
                    {client.activeProjectCount > 0 ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {client.email_contato && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      <Mail className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                      <span className="truncate">{client.email_contato}</span>
                    </div>
                  )}
                  {client.telefone && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      <Phone className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                      <span>{client.telefone}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Briefcase className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Projetos</span>
                    </div>
                    <div className="text-lg font-black" style={{ color: 'var(--text)' }}>
                      {client.projectCount}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>Margem</span>
                    </div>
                    <div
                      className="text-lg font-black"
                      style={{
                        color: client.margin >= 30 ? 'var(--success)' : client.margin >= 20 ? 'var(--warning)' : 'var(--danger)'
                      }}
                    >
                      {client.margin.toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted)' }}>Receita Total</span>
                    <span className="font-black" style={{ color: 'var(--text)' }}>
                      {client.totalRevenue.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--surface-2)' }}>
                <tr>
                  {[
                    { key: 'name', label: 'Cliente' },
                    { key: 'cnpj', label: 'CNPJ' },
                    { key: 'email', label: 'Email' },
                    { key: 'projectCount', label: 'Projetos' },
                    { key: 'activeProjectCount', label: 'Ativos' },
                    { key: 'totalRevenue', label: 'Receita Total' },
                    { key: 'margin', label: 'Margem %' },
                    { key: 'totalHours', label: 'Horas' }
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider cursor-pointer hover:bg-opacity-80 transition-all border-b"
                      style={{
                        color: 'var(--text)',
                        borderColor: 'var(--border)'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        <SortIcon columnKey={col.key} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, idx) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                    className="cursor-pointer hover:bg-opacity-50 transition-all border-b"
                    style={{
                      backgroundColor: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--text)' }}>
                      {client.name}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-2)' }}>
                      {client.cnpj || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)' }}>
                      {client.email_contato || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-center" style={{ color: 'var(--text)' }}>
                      {client.projectCount}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-center" style={{ color: client.activeProjectCount > 0 ? 'var(--success)' : 'var(--muted)' }}>
                      {client.activeProjectCount}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-right" style={{ color: 'var(--text)' }}>
                      {client.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-right" style={{
                      color: client.margin >= 30 ? 'var(--success)' : client.margin >= 20 ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {client.margin.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right" style={{ color: 'var(--text-2)' }}>
                      {formatDecimalToTime(client.totalHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsList;
