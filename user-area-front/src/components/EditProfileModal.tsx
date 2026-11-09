import React, { useState } from 'react';
import { userService } from '../services/userService';
import type { UserProfile } from '../services/userService';
import { X, Camera, Lock, Plus, Trash2 } from 'lucide-react';
import { getAvatarUrl, UserAvatar } from './UserAvatar';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  onSuccess: () => void;
}

const PLATE_REGEX = /^[A-Z]{3}[0-9]{4}$/;
const MAX_LINKS = 10;

// para formatar a placa do veiculo. Três letras e quatro numeros.
const formatPlate = (raw: string) => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let letters = '';
  let digits = '';

  for (const ch of clean) {
    if (letters.length < 3 && /[A-Z]/.test(ch)) {
      letters += ch;
    } else if (letters.length === 3 && digits.length < 4 && /[0-9]/.test(ch)) {
      digits += ch;
    }
  }

  return letters + digits;
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '13px',
};

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid #f3f4f6',
  paddingTop: '12px',
};

const addButtonStyle = (disabled = false): React.CSSProperties => ({
  fontSize: '12px',
  color: disabled ? '#9ca3af' : '#2563eb',
  background: 'none',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

const removeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#dc2626',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: '4px',
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onSuccess,
}) => {
  const [vehiclePlate, setVehiclePlate] = useState(currentProfile.vehicles?.[0]?.plate || '');
  const [vehicleModel, setVehicleModel] = useState(currentProfile.vehicles?.[0]?.model || '');
  const [vehicleColor, setVehicleColor] = useState(currentProfile.vehicles?.[0]?.color || '');

  const [avatarPreview, setAvatarPreview] = useState(
    getAvatarUrl(currentProfile.photoUrl) || ''
  );

  const [avatarFile, setAvatarFile] = useState<File | null>(null); // pra exibir temporariamente caso troque

  const [links, setLinks] = useState<{ label: string; url: string }[]>(
    (currentProfile.links || []).map((l) => ({ label: l.label, url: l.url })),
  );
  const [experiences, setExperiences] = useState<string[]>(
    currentProfile.experiences?.map((e) => e.description) || [],
  );
  const [projects, setProjects] = useState(
    (currentProfile.projects || []).map((p) => ({
      name: p.name,
      description: p.description ?? '',
      url: p.url ?? '',
    })),
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (vehiclePlate && !PLATE_REGEX.test(vehiclePlate)) {
      setErrorMessage('A placa deve ter 3 letras e 4 números (ex.: ABC1234).');
      return;
    }

    setLoading(true);

    try {
      if (avatarFile) {
        await userService.uploadAvatar(avatarFile);
      }

      await userService.updateProfile({
        vehicle: { plate: vehiclePlate, model: vehicleModel, color: vehicleColor },
        links,
        experiences,
        projects,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar as alterações do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) =>
    setLinks(links.map((l, i) => (i === index ? { ...l, [field]: value } : l)));

  const updateProject = (index: number, field: 'name' | 'description' | 'url', value: string) =>
    setProjects(projects.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const updateExperience = (index: number, value: string) =>
    setExperiences(experiences.map((exp, i) => (i === index ? value : exp)));


  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Formato de imagem inválido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setErrorMessage('');

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    e.target.value = '';
  };


  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: 600 }}>Editar Perfil</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* foto */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              {avatarPreview.startsWith('blob:') ? (
                <img
                  src={avatarPreview}
                  alt={currentProfile.name}
                  className="h-[90px] w-[90px] rounded-full border-2 border-gray-200 object-cover"
                />
              ) : (
                <UserAvatar
                  photoUrl={avatarPreview || null}
                  name={currentProfile.name}
                  size={90}
                  className="border-2 border-gray-200"
                />
              )}

              <label
                htmlFor="avatar-upload"
                title="Alterar foto de perfil"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  zIndex: 10,
                  backgroundColor: '#cf2929b0',
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <Camera size={15} color="#ffffff" />
              </label>

              <input
                id="avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                disabled={loading}
                style={{ display: 'none' }}
              />

              {loading && (
                <span style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '11px',
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  marginTop: '5px',
                }}>
                  Enviando...
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* nome (somente leitura) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Nome <Lock size={12} color="#9ca3af" />
              </label>
              <input
                type="text"
                value={currentProfile.name}
                disabled
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', borderColor: '#e5e7eb' }}
              />
              <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>Não pode ser alterado.</span>
            </div>

            {/* email (somente leitura) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Email <Lock size={12} color="#9ca3af" />
              </label>
              <input
                type="email"
                value={currentProfile.email}
                disabled
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', borderColor: '#e5e7eb' }}
              />
              <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>Não pode ser alterado.</span>
            </div>

            {/* Veículo */}
            <div style={{ ...sectionStyle, marginTop: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', display: 'block', marginBottom: '8px' }}>
                Veículo para Comunicação Emergencial (Informação Privada)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="ABC1234"
                  maxLength={7}
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(formatPlate(e.target.value))}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Modelo"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Cor"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', padding: '8px' }}
                />
              </div>
            </div>

            {/* Links */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                  Links Profissionais e Portfólio
                </span>
                <button
                  type="button"
                  disabled={links.length >= MAX_LINKS}
                  onClick={() => setLinks([...links, { label: '', url: '' }])}
                  style={addButtonStyle(links.length >= MAX_LINKS)}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              {links.map((link, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Nome (ex: GitHub)"
                    maxLength={50}
                    value={link.label}
                    onChange={(e) => updateLink(index, 'label', e.target.value)}
                    style={{ ...inputStyle, flex: '0 0 130px' }}
                  />
                  <input
                    type="text"
                    placeholder="URL (ex: github.com/usuario)"
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setLinks(links.filter((_, i) => i !== index))}
                    aria-label="Remover link"
                    style={removeButtonStyle}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Experiências */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Experiências Profissionais</span>
                <button type="button" onClick={() => setExperiences([...experiences, ''])} style={addButtonStyle()}>
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              {experiences.map((exp, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={exp}
                    onChange={(e) => updateExperience(index, e.target.value)}
                    placeholder="Ex: Bolsista de iniciação científica"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setExperiences(experiences.filter((_, i) => i !== index))}
                    aria-label="Remover experiência"
                    style={removeButtonStyle}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Projetos */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Projetos</span>
                <button
                  type="button"
                  onClick={() => setProjects([...projects, { name: '', description: '', url: '' }])}
                  style={addButtonStyle()}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              {projects.map((proj, index) => (
                <div
                  key={index}
                  style={{
                    padding: '10px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Nome do Projeto (ex: TaskFlow)"
                      value={proj.name}
                      onChange={(e) => updateProject(index, 'name', e.target.value)}
                      style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      onClick={() => setProjects(projects.filter((_, i) => i !== index))}
                      style={{ ...removeButtonStyle, gap: '4px', fontSize: '12px', fontWeight: 500, marginLeft: '8px' }}
                    >
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Descrição curta"
                    value={proj.description}
                    onChange={(e) => updateProject(index, 'description', e.target.value)}
                    style={{ ...inputStyle, padding: '6px 10px' }}
                  />
                  <input
                    type="text"
                    placeholder="URL (ex: github.com/usuario/projeto)"
                    value={proj.url}
                    onChange={(e) => updateProject(index, 'url', e.target.value)}
                    style={{ ...inputStyle, padding: '6px 10px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Botão de salvar */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '24px',
              width: '100%',
              backgroundColor: '#e50914',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
};