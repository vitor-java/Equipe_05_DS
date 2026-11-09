import React, { useEffect, useState } from 'react';
import { userService, type UserProfile } from '../services/userService';
import { FileText, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { EditProfileModal } from '../components/EditProfileModal';
import { useParams } from 'react-router-dom';
import { UserAvatar } from '@/components/UserAvatar';

const LOGO_SRC = `${import.meta.env.BASE_URL}/logo-cin-white.png`;
const EXPERIENCES_PREVIEW = 3;

const RED = '#b91c1c';
const BANNER_HEIGHT = 240;

const AVATAR_SIZE = 170;
const RING = 14; // referente ao anel branco elegante. É a espessura

// Essas são algumas constantes necessárias para fazer o formato elegante atrás do avatar.
// Segue a seguinte lógica: Duas elipses da cor do banner. Uma à esquerda do avatar, e outra à direita do avatar. Bases alinhadas
// com a base do banner. Ambas possuem um ponto de tangência com o avatar.
// Há um retângulo branco (atrás delas), cujos lados esquerdo e direito se alinham com o centro horizontal das elipses.
// O topo do retângulo alinha-se com a altura dos pontos de tangência das elipses com o avatar.
const ELLIPSE_W = 328;
const ELLIPSE_H = 132;
const ELLIPSE_CX = 234;
const ELLIPSE_CY = -81;
const RECT_TOP = -60;
const RECT_BOTTOM = -12;

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  STUDENT: 'Aluno',
  STAFF: 'Servidor',
};

const formatRole = (role?: string | null) => (role ? (ROLE_LABELS[role] ?? role) : '');

// Para os cards com informações.
const Section: React.FC<SectionProps> = ({ title, children }) => (
  <section style={{ width: '100%' }}>
    <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
      {title}
    </h3>
    <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '14px 18px', backgroundColor: '#ffffff' }}>
      {children}
    </div>
  </section>
);

export const ProfilePage: React.FC = () => {
  const { email } = useParams<{ email: string }>();
  const isOwnProfile = !email;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAllExperiences, setShowAllExperiences] = useState(false);


  useEffect(() => {
    setLoading(true);
    const request = email ? userService.getProfileByEmail(email) : userService.getMe();


    request
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar perfil:', err);
        if (!isOwnProfile) {
          setProfile(null);
          setLoading(false);
          return;
        }
      

        // Usuário hipotético para caso a API esteja morta.
        setProfile({
          name: 'Aluno do CIn',
          email: 'acin123@cin.ufpe.br',
          role: 'Aluno',
          photoUrl: '',
          links: [
            {
              label: 'linkedin',
              url: 'linkedin.com/acin123'
            }
          ],
          experiences: [
            {
              description: 'Bolsista de iniciação científica.',
            }
          ],
          projects: [
            {
              name: 'TaskFlow',
              description: 'Plataforma de gerenciamento de tarefas e equipes.',
              url: 'github.com/acin123/taskflow',
            },
            {
              name: 'AutoBot',
              description: 'Automação de tarefas utilizando IA e scripts internos.',
              url: 'github.com/acin123/autobot',
            },
          ],
        });

        setLoading(false);
      });
  }, [email, isOwnProfile]);

  const handleExportPDF = async () => {
    try {
      const blob = await userService.exportPdf(email?? 'me');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'curriculo.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Erro ao exportar como PDF: ' + (err.message || 'Tente novamente mais tarde.'));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>Carregando perfil institucional...</div>;
  }

  const experiences = profile?.experiences ?? [];
  const visibleExperiences = showAllExperiences ? experiences : experiences.slice(0, EXPERIENCES_PREVIEW);
  const hasMoreExperiences = experiences.length > EXPERIENCES_PREVIEW;


  return (

      <div className="profile-page"
        style={{ minHeight: 'calc(100vh - 65px)', backgroundColor: '#ffffff', paddingBottom: '48px' }}
    >

      {/* Banner vermelho com a logo do CIn */}
      <div style={{ height: BANNER_HEIGHT, backgroundColor: RED, position: 'relative', overflow: 'hidden' }}>
        <img
          src={LOGO_SRC}
          alt=""
          draggable={false}
          style={{
            position: 'absolute', right: '60px', top: '20px', height: '210px', pointerEvents: 'none', userSelect: 'none', }}
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '48px', alignItems: 'start' }}>

          {/* Lado esquerdo: avatar, nome, contatos e exportação pra pdf */}
          <div style={{ position: 'relative', width: AVATAR_SIZE, height: AVATAR_SIZE, margin: '-70px 0 0' }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: AVATAR_SIZE / 2,
                top: AVATAR_SIZE / 2,
                width: 0,
                height: 0,
                pointerEvents: 'none',
              }}
            >
              {/* Retângulo branco atrás */}
              <div
                style={{
                  position: 'absolute',
                  left: -ELLIPSE_CX,
                  top: RECT_TOP,
                  width: ELLIPSE_CX * 2,
                  height: RECT_BOTTOM - RECT_TOP,
                  backgroundColor: '#ffffff',
                }}
              />
              {/* Elipses por cima do retângulo */}
              <div
                style={{
                  position: 'absolute',
                  left: -ELLIPSE_CX - ELLIPSE_W / 2,
                  top: ELLIPSE_CY - ELLIPSE_H / 2,
                  width: ELLIPSE_W,
                  height: ELLIPSE_H,
                  borderRadius: '50%',
                  userSelect: 'none',
                  backgroundColor: RED,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: ELLIPSE_CX - ELLIPSE_W / 2,
                  top: ELLIPSE_CY - ELLIPSE_H / 2,
                  width: ELLIPSE_W,
                  height: ELLIPSE_H,
                  borderRadius: '50%',
                  userSelect: 'none',
                  backgroundColor: RED,
                }}
              />
            </div>

            {/* Avatar (em cima da decoração) */}

            <UserAvatar
              photoUrl={profile?.photoUrl}
              name={profile?.name}
              size={AVATAR_SIZE}
              fontSize={64}
              className="border-2 border-[#b91c1c] shadow-[0_0_0_14px_white]"
            />

            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                title="Editar perfil"
                aria-label="Editar perfil"
                style={{
                  position: 'absolute',
                  zIndex: 2,
                  bottom: '6px',
                  right: '6px',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: `1px solid ${RED}`,
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Edit2 size={16} color={RED} />
              </button>
            )}
            

          <h2 style={{ margin: '20px 0 4px 0', color: RED, fontSize: '20px', fontWeight: 700 }}>
            {profile?.name}
          </h2>
          <p style={{ margin: '0 0 2px 0', color: '#4b5563', fontSize: '13px' }}>{profile?.email}</p>
          <span style={{ fontSize: '13px', color: '#6b7280', userSelect: 'none' }}>{formatRole(profile?.role)}</span>

          <button
            type="button"
            onClick={handleExportPDF}
            style={{
              marginTop: '28px',
              width: '190px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#111827',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              userSelect: 'none'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            Exportar como PDF <FileText size={16} />
          </button>
        </div>

          {/* Coluna direita: seções */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '36px' }}>

            <Section title="Links">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#374151' }}>
                {profile?.links?.map((link, idx) => (
                  <div key={link.id ?? idx}>
                    <strong>{link.label}:</strong>{' '}
                    <a href={link.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {link.url.replace(/^https?:\/\//i, '')}
                    </a>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Experiências">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                {visibleExperiences.map((exp, idx) => (
                  <p key={exp.id ?? idx} style={{ margin: 0 }}>{exp.description}</p>
                ))}
              </div>

              {hasMoreExperiences && (
                <button
                  type="button"
                  onClick={() => setShowAllExperiences((v) => !v)}
                  aria-label={showAllExperiences ? 'Mostrar menos experiências' : 'Mostrar mais experiências'}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    marginTop: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                  }}
                >
                  {showAllExperiences ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              )}
            </Section>

            <Section title="Projetos">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {profile?.projects?.map((proj, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1f2937', marginBottom: '2px' }}>
                      {proj.url ? (
                        <a href={proj.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                          {proj.name}
                        </a>
                      ) : (
                        proj.name
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>{proj.description}</p>
                  </div>
                ))}
              </div>
            </Section>

          </div>
        </div>
      </div>

      {isOwnProfile && profile && isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentProfile={profile}
          onSuccess={() => {
            userService.getMe().then((data) => setProfile(data));
          }}
        />
      )}
    </div>
  );
};