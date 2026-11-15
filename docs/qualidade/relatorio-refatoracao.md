# Relatório de Refatoração

## Visão Geral
Nesta etapa da Sprint 3, focamos em melhorar a arquitetura e a testabilidade do sistema (dividido entre o backend NestJS e o frontend React). Usamos a suíte de testes unitários rodando com o **Vitest** como rede de segurança para garantir que nenhuma refatoração quebrasse o comportamento existente.

## Principais Refatorações Aplicadas

### Item DT-01: Desacoplamento de Serviço no Backend
* **Refatoração**: *Extract Function* / Separação de responsabilidades.
* **O que foi feito**: O método principal de manipulação de dados no módulo do backend acumulava validações e queries pesadas do Prisma. Separamos a lógica de validação em funções puras e isolamos as chamadas de banco.
* **Testes**: A suíte do Vitest foi executada antes e depois, mantendo 100% de aprovação e validando a integridade das regras de negócio.

### Item DT-02: Uso Adequado do Container IoC do NestJS
* **Refatoração**: *Dependency Inversion Principle (DIP)*.
* **O que foi feito**: Ajustamos o acoplamento de serviços para utilizar corretamente a injeção de dependência nativa do NestJS, eliminando dependências rígidas.
* **Testes**: Facilitou a criação de mocks nos testes unitários dos módulos, elevando a confiabilidade da camada de serviço.

### Item DT-03: Substituição de Strings Mágicas no Frontend
* **Refatoração**: *Replace Magic Literal* / Centralização de Enums e Constantes.
* **O que foi feito**: Centralizamos as strings de verificação de permissões e status que estavam espalhadas pelo código dos módulos do React em constantes tipadas.
* **Testes**: Componentes validados e testes de interface executados sem regressões.

## Conclusão
O uso do Biome em conjunto com a leitura manual e a ajuda da LLM deu um ótimo equilíbrio. As ferramentas estáticas pegaram bem os problemas locais de formatação e complexidade, enquanto a análise manual e a IA ajudaram a ajustar a arquitetura modular dos serviços NestJS e a organização dos domínios no React.