# Manual do Desenvolvedor – Sistema de Gestão e Área do Usuário

## 1. Visão Geral da Arquitetura
O projeto está dividido em duas aplicações principais (estrutura de monorepo):
- **`user-area-back`**: API REST desenvolvida em Node.js com **NestJS 11**, ORM **Prisma**, banco de dados relacional **PostgreSQL** e autenticação via **Keycloak (OIDC/JWT)**.
- **`user-area-front`**: Aplicação de interface web em **React + Vite + TypeScript**, utilizando uma arquitetura modular por domínio (`src/modules/`) e controle de acesso baseado em papéis (*roles*).

O fluxo de dados segue uma direção única (compartilhado → módulo → app), garantindo alta coesão e isolamento entre os domínios de negócio.

---

## 2. Principais Módulos e Funções
- **Camada de Backend (`user-area-back/src/modules/`)**:
  - Organizado em módulos independentes contendo controladores, serviços de regra de negócio e integração com o Prisma Client.
  - Validação rigorosa de payloads de entrada utilizando **Zod**.
  - Testes unitários de alta velocidade integrados com **Vitest**.
- **Camada de Frontend (`user-area-front/src/modules/`)**:
  - Cada módulo agrupa sua própria página, hooks de estado (sobre `useAsync`), serviços de requisição HTTP (`fetchApi`) e tipagens.
  - Controle de acesso em dois níveis: rotas restritas por *roles* no nível de navegação e componentes condicionais `<Can>` para ações específicas na interface.

---

## 3. Configuração e Execução do Ambiente

### Pré-requisitos
- **Node.js** (versão 22 LTS recomendada para o backend e 24.x para o frontend).
- **Docker e Docker Compose** (para subir o banco de dados PostgreSQL e o Keycloak localmente).

### Passo a Passo para Subir o Backend
1. Entre na pasta do backend executando: `cd user-area-back`
2. Instale as dependências: `npm install`
3. Suba os serviços de infraestrutura (PostgreSQL e Keycloak) via Docker: `docker compose up -d`
4. Gere o Prisma Client e execute as migrações no banco: `npm run prisma:generate` e depois `npm run migration:run`
5. Inicie a API em modo de desenvolvimento: `npm run dev`

### Passo a Passo para Subir o Frontend
1. Entre na pasta do frontend executando: `cd user-area-front`
2. Copie o arquivo de configuração de ambiente: `cp .env.example .env`
3. Instale as dependências: `npm install`
4. Inicie a aplicação: `npm run dev`

---

## 4. Testes Automatizados
Para rodar a suíte de testes unitários (configurada com **Vitest**) e garantir a integridade do código durante as refatorações:
- No backend (`user-area-back`), execute: `npm test`
- No frontend (`user-area-front`), execute: `npm test`