# Log de Uso de Ferramentas e LLMs

Registro do processo de auditoria e busca por problemas de qualidade no código da equipe para a Sprint 3.

## Ferramentas Empregadas
1. **Biome**: Utilizado para varredura estática de formatação, linter e detecção de complexidade de código no monorepo (`user-area-back` e `user-area-front`).
2. **Leitura Manual Orientada**: Inspeção sistemática nos diretórios `src/modules/` do backend (NestJS) e frontend (React) focando nos princípios SOLID, encapsulamento e coesão dos módulos.
3. **Assistência de LLM**: Empregada para auditar o acoplamento entre os serviços do NestJS e o Prisma Client, além de sugerir melhorias na injeção de dependências.

## Prompts Utilizados com a LLM
* **Para a camada de serviço (NestJS)**:
  > *"Analise este serviço do NestJS na pasta `user-area-back/src/modules/` e aponte onde estamos misturando chamadas ao Prisma com validações de regra de negócio, violando o princípio de responsabilidade única (SRP)."*
* **Para a arquitetura modular do Frontend**:
  > *"Verifique a estrutura dos módulos em `user-area-front/src/modules/todos/` e aponte possíveis melhorias na separação entre componentes de UI, hooks de estado com `useAsync` e services de requisição."*

## Falsos Positivos Descartados
* O Biome apontou avisos de complexidade em alguns helpers de formatação de data e token JWT, mas após a revisão manual constatamos que a lógica condicional era estritamente necessária para tratar os fallbacks de sessão do Keycloak, não justificando alterações estruturais.