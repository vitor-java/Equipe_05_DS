import React, { useState, useEffect, useRef } from 'react';
import { adminService, CATEGORY_OPTIONS, type RecipientOption, type AlertItem } from '../services/adminService'; 
import { Users, Send, CheckCircle, Trash2, X, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

export const AdminDashboard: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('HIGH');

  const [selectedRecipients, setSelectedRecipients] = useState<RecipientOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecipientOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Estado para controlar quais alertas estão com os destinatários abertos
  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({});

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  useEffect(() => {
    loadAlerts(1);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAlerts = async (page: number) => {
    try {
      setLoading(true);
      // Força limite de 5 itens por página
      const result = await adminService.getAlerts(page, 5);
      setAlerts(result.items);
      setTotalPages(result.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchRecipients = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsDropdownOpen(false);
        return;
      }

      const selectedIds = selectedRecipients.map(r => r.id);
      const results = await adminService.searchRecipients(searchQuery, selectedIds);
      setSearchResults(results);
      setIsDropdownOpen(results.length > 0);
    };

    const timer = setTimeout(fetchRecipients, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedRecipients]);

  const handleAddRecipient = (recipient: RecipientOption) => {
    if (recipient.type === 'CATEGORY') {
      const filtered = selectedRecipients.filter(item => item.role !== recipient.role);
      setSelectedRecipients([...filtered, recipient]);
    } else if (recipient.type === 'USER') {
      const matchingCategory = CATEGORY_OPTIONS.find(cat => cat.role === recipient.role);
      if (matchingCategory && selectedRecipients.some(item => item.id === matchingCategory.id)) {
        alert(`Este utilizador já está abrangido pela categoria "${matchingCategory.name}".`);
        setSearchQuery('');
        setIsDropdownOpen(false);
        return;
      }
      setSelectedRecipients([...selectedRecipients, recipient]);
    } else {
      setSelectedRecipients([...selectedRecipients, recipient]);
    }

    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleRemoveRecipient = (id: string) => {
    setSelectedRecipients(selectedRecipients.filter(item => item.id !== id));
  };

  const toggleExpandAlert = (id: string) => {
    setExpandedAlerts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || selectedRecipients.length === 0) {
      alert('Preencha o assunto, a mensagem e selecione pelo menos um destinatário.');
      return;
    }

    setLoading(true);
    try {
      const globalCategory = selectedRecipients.find(r => r.type === 'CATEGORY');

      let payload: any;
      if (globalCategory) {
        payload = {
          subject: title,
          message,
          severity,
          audience: globalCategory.id as 'ALL' | 'STUDENTS' | 'STAFF',
          recipientIds: [],
        };
      } else {
        payload = {
          subject: title,
          message,
          severity,
          audience: 'USERS',
          recipientIds: selectedRecipients.map(r => r.id),
        };
      }

      await adminService.createAlert(payload);

      setTitle('');
      setMessage('');
      setSelectedRecipients([]);
      setSuccessMessage('Alerta emitido com sucesso!');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadAlerts(1);
    } catch (err: any) {
      console.error('Erro ao publicar alerta:', err);
      alert(err.message || 'Erro ao publicar alerta.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await adminService.deleteAlert(id);
      loadAlerts(currentPage);
    } catch (err) {
      console.error('Erro ao apagar alerta:', err);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 40px 24px', fontFamily: 'Inter, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px 0' }}>
          Emitir Alerta
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Selecione múltiplos públicos-alvo ou usuários específicos por nome ou placa do veículo.
        </p>
      </div>

      {successMessage && (
        <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#16a34a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}


      {/* Formulário */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '32px' }}>
        <form onSubmit={handleSendAlert} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Pesquisa */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Para:
            </label>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                minHeight: '48px',
                cursor: 'text'
              }}
              onClick={() => setIsDropdownOpen(true)}
            >
              {selectedRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f3f4f6',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#1f2937',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <UserAvatar
                    photoUrl={recipient.photoUrl}
                    name={recipient.name}
                    size={20}
                  />
                  <span>{recipient.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveRecipient(recipient.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              <input
                type="text"
                placeholder={selectedRecipients.length === 0 ? "Pesquisar por nome ou placa do veículo..." : ""}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '180px', border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent' }}
              />
            </div>

            {isDropdownOpen && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 50,
                maxHeight: '240px',
                overflowY: 'auto'
              }}>
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddRecipient(item)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    {item.type === 'CATEGORY' ? (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Users size={26} color="#4b5563" />
                      </div>
                    ) : (
                        <UserAvatar
                          photoUrl={item.photoUrl}
                          name={item.name}
                          size={32}
                        />
                    )}
                    

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                        {item.name}
                      </span>

                      {item.type === 'USER' ? (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          {item.email}
                          {item.vehicle
                            ? ` | Veículo: ${item.vehicle.plate} (${item.vehicle.model})`
                            : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#2563eb' }}>
                          Categoria
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nível de Severidade */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Nível de Severidade:
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', backgroundColor: '#f9fafb' }}
            >
              <option value="HIGH">Alto</option>
              <option value="MEDIUM">Médio</option>
              <option value="LOW">Baixo</option>
            </select>
          </div>

          {/* Assunto */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Assunto:
            </label>
            <input
              type="text"
              placeholder="Ex: Toyota Corolla - Estacionamento Irregular"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', backgroundColor: '#f9fafb' }}
            />
          </div>

          {/* Mensagem */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Mensagem:
            </label>
            <textarea
              rows={4}
              placeholder="Descreva o conteúdo do aviso..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', backgroundColor: '#f9fafb', resize: 'vertical' }}
            />
          </div>

          {/* Botão Enviar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 24px', backgroundColor: '#38bdf8', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <Send size={16} />
              {loading ? 'A enviar...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico de Alertas (Paginado) */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>Comunicados Emitidos Recentemente</h3>
        </div>

        {loading && safeAlerts.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            A carregar histórico...
          </div>
        ) : safeAlerts.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            Nenhum alerta registado no sistema.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {safeAlerts.map((alert, idx) => {
              const isSingleUser = alert.audience === 'USERS' && alert.recipientsPreview && alert.recipientsPreview.length === 1;
              const singleRecipient = isSingleUser ? alert.recipientsPreview![0] : null;
              const isExpanded = !!expandedAlerts[alert.id];

              return (
                <div
                  key={alert.id || idx}
                  style={{ padding: '16px 20px', borderBottom: idx < safeAlerts.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
                >
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{alert.subject}</span>

                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '12px', fontWeight: 500 }}>
                        {isSingleUser && singleRecipient ? singleRecipient.name : alert.audience}
                      </span>

                      {alert.severity && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: alert.severity === 'HIGH' ? '#ffeeec' : '#fff7ed', color: alert.severity === 'HIGH' ? '#dc2626' : '#c2410c', borderRadius: '12px', fontWeight: 500 }}>
                          {alert.severity}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#4b5563', lineHeight: '1.4' }}>
                      {alert.message}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: '#9ca3af', marginBottom: '8px', alignItems: 'center' }}>
                      <span>Emitido em: {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'N/A'}</span>
                      {alert.recipientsCount !== undefined && <span>Qtd. Destinatários: {alert.recipientsCount}</span>}

                      {/* Se for um único usuário, exibe só a confirmação de visto */}
                      {isSingleUser && singleRecipient && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#9ca3af',
                            fontWeight: 500
                          }}
                          // O title vai na tag span (envolve o ícone e a data)
                          title={singleRecipient.readAt ? `Lido em ${new Date(singleRecipient.readAt).toLocaleString()}` : 'Não visto'}
                        >
                          <CheckCheck
                            size={16}
                            color={singleRecipient.readAt ? '#16a34a' : '#9ca3af'}
                          // O 'title' foi removido daqui para evitar o erro do TypeScript
                          />
                          {singleRecipient.readAt && (
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                              {new Date(singleRecipient.readAt).toLocaleString()}
                            </span>
                          )}
                        </span>
                      )}

                      {/* Botão de abrir e fechar o bloco expansivel */}
                      {alert.audience === 'USERS' && alert.recipientsPreview && alert.recipientsPreview.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleExpandAlert(alert.id)}
                          style={{ background: 'none', border: 'none', color: '#afafaf', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? 'Fechar detalhes' : 'Abrir detalhes'}
                        </button>
                      )}
                    </div>

                    {/* Bloco expansivel p ver detalhes dos destinatários + quem viu */}
                    {alert.audience === 'USERS' && alert.recipientsPreview && alert.recipientsPreview.length > 1 && isExpanded && (
                      <div style={{ marginTop: '8px', padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                          Estado dos Destinatários:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {alert.recipientsPreview.map((recipient: any) => (
                            <span
                              key={recipient.id}
                              style={{
                                fontSize: '11px',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                backgroundColor: recipient.readAt ? '#f0fdf4' : '#fef2f2',
                                color: '#374151',
                                border: `1px solid ${recipient.readAt ? '#bbf7d0' : '#fecaca'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              
                              // diferente do usuario unico, aqui a data de leitura
                              // aparece repousando o mouse em cima (pra não ficar muita poluição visual)

                              title={recipient.readAt ? `Lido em: ${new Date(recipient.readAt).toLocaleString()}` : 'Ainda não leu'}
                            >
                              <span style={{ fontWeight: 600 }}>{recipient.name}</span>

                              <CheckCheck
                                size={14}
                                color={recipient.readAt ? '#16a34a' : '#9ca3af'}
                              />

                              {recipient.readAt && (
                                <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                                  {new Date(recipient.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }}
                    title="Apagar comunicado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Controles de paginação */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <button
              onClick={() => loadAlerts(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              style={{ padding: '6px 14px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: currentPage <= 1 ? 0.5 : 1 }}
            >
              Anterior
            </button>

            <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => loadAlerts(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              style={{ padding: '6px 14px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }}
            >
              Seguinte
            </button>
          </div>
        )}
      </div>

    </div>
  );
};