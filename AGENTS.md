# AGENTS.md

## Projeto

Sistema web da Igreja Evangélica Assembleia de Deus Tradicional no Estado de Roraima, identificada no site como IEADTRR.

A home foi repaginada com identidade mais acolhedora e o Firebase foi conectado a um projeto real (`ieadtrr-sistema`). Autenticação por e-mail/senha e Firestore já estão ativos; o fluxo de login/cadastro grava perfis de verdade. Storage e as telas administrativas com dados reais ainda estão pendentes.

## Stack atual

- React
- Vite
- TypeScript
- Tailwind CSS via `@tailwindcss/vite`
- React Router
- Firebase conectado (projeto `ieadtrr-sistema`): Authentication e Firestore ativos; Storage pendente
- Fonte serifada Playfair Display via `<link>` no `index.html` (usada nos títulos)
- Dados institucionais em arquivos locais TypeScript

## Como rodar nesta máquina

O Node global pode não estar no PATH do Windows. Há duas formas:

1. Servidor de preview (usado pelo assistente): o `launch.json` aponta para `C:\Users\izael\run-dev-igreja.cmd`, que entra na pasta do projeto e sobe o Vite com o Node interno em `http://localhost:5173`. O caminho do `.cmd` fica fora da pasta do projeto porque o caminho `Sistema da Igreja` tem espaço e quebrava o preview.
2. Manual, com o runtime interno:

```powershell
$env:PATH = "C:\Users\izael\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\izael\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;$env:PATH"
pnpm dev
```

Verificação:

```powershell
pnpm build
pnpm lint
```

Observação: mudanças no `.env` só valem após reiniciar o servidor Vite.

## Estado atual do site

Rotas públicas:

- `/`: página inicial repaginada. Hero com nome curto da igreja em fonte serifada (Playfair Display), texto acolhedor, link `Cadastre-se` e botão `Agenda da Igreja`; banner grande de fotos dos cultos com informações sobrepostas; seção `Atendimento ao público` com banners de eventos/avisos; faixa de contribuição (Pix) e rodapé institucional.
- `/congregacoes`: sede e congregações.
- `/agenda`: agenda pública de cultos e atividades.
- `/doutrina`: página pública com princípios doutrinários resumidos do estatuto.
- `/regras`: rota antiga, redireciona para `/doutrina`.
- `/diretoria-publica`: relação pública da liderança.
- `/cadastro`: sem login, mostra a criação de acesso (nome, e-mail, senha e confirmação). Depois do login, mostra o formulário de tipo de cadastro para a pessoa informar se é visitante, convidado ou membro. Se o usuário logado for admin, redireciona para `/admin`.
- `/login`: tela de entrada apenas para quem já tem cadastro, com e-mail, senha, botão `Entrar` e opção de recuperação de senha (`Esqueci, perdi ou não sei minha senha`). Após entrar, consulta `users/{uid}` e direciona pelo perfil: admin → `/admin`, diretoria → `/diretoria`, visitante → `/visitante`, congregado → `/congregado`, membro ou membro pendente → `/membro`, pendente sem tipo → `/cadastro`.

Rotas de área restrita, agora protegidas por autenticação real (ver seção Autenticação):

- `/membro`: painel inicial do membro. Exige perfil membro, diretoria ou admin.
- `/membro/fundadores`: relação nominal histórica/fundadores, apenas nomes. Mesma exigência de `/membro`.
- `/visitante`: painel do visitante/convidado (`VisitorPanel`). Exige perfil visitante. Exibe o item genérico **Registro de presença**, permitindo escolher Visitante/Convidado, culto/atividade e igreja específica. Limite funcional: em dias comuns há um registro por dia; aos domingos há dois slots (`EBD` e `Culto à noite`). O registro do slot atual pode ser alterado pelo usuário.
- `/congregado`: painel do congregado. Exige perfil congregado. Mostra o formulário de dados completos de congregado (`RegistrationForm fixedTipoPessoa="congregado"`), sem campo de batismo e sem cargo/função. O batismo e a promoção para membro são feitos pelo admin.
- `/diretoria`: painel da diretoria. Exige perfil diretoria ou admin. Contém o **acompanhamento de visitantes e convidados** (`VisitorTracking`): métricas, contagem por congregação e tabela com nome, tipo, congregação, horário registrado e data — lido da coleção `visitRecords`. Abaixo, a escala de cultos (ainda demonstrativa).
- `/admin`: painel administrativo. Exige perfil admin. Já com funções reais:
  - **Registrar presença sem login** (`AdminPresenceRegistration`): lançamento rápido de presença para visitante/convidado sem conta, gravando em `visitRecords` com `source: 'admin'`.
  - **Dashboard de análise de presenças** (`VisitorTracking`): lê `visitRecords` e mostra visitante/convidado, data, horário registrado, culto/atividade, igreja e classificação da igreja, com filtros por data, classificação e igreja; mostra mapa pequeno pela geolocalização da congregação.
  - **Aprovar solicitações de membro** (`MembershipApprovals`): lê `membershipRequests` em tempo real **filtrando só `tipoPessoa === 'membro'`** (visitante/convidado não passam por aprovação), com filtros de status e botões Aprovar/Rejeitar que gravam `status`, `decididoEm`, `decididoPor`.
  - **Cadastro nominal administrativo** (`AdminNominalRegistration`): ferramenta recolhível dentro do `/admin` para registrar visitante, convidado ou membro **sem criar login e senha** para a pessoa. Usa `RegistrationForm mode="admin"` e grava em `membershipRequests`.
  - **Cadastro de congregações** (`CongregationManager`): permite ao admin incluir, editar e suprimir igrejas/congregações, informando classificação (`Igreja da capital`, `Filial na capital`, `Filial no interior`), endereço, responsável, telefone, latitude e longitude. A lista de igrejas no admin tem filtro em botões `Todas`, `Capital` e `Interior`. A supressão marca `ativa: false`.
  - **Progressão espiritual e cargos** (`ProfileProgressionManager`): lista visitantes/convidados, congregados e membros. Admin promove visitante/convidado para congregado, congregado para membro informando data de batismo, e atribui/remove cargo somente em perfil de membro.
  - **Perfis de acesso** (`UserAccessManager`): lista a coleção `users` e permite ao admin mudar o `role` de cada pessoa (pendente/congregado/membro/diretoria/administrador). É aqui que se cria um novo administrador. O admin não pode alterar o próprio perfil (evita se trancar para fora).
  - **Banner público / Cultos da semana** (`BannerManager`): troca as 4 fotos (prévia local, ainda sem Storage).

Cabeçalho: sem login, o canto superior direito mostra **"Cadastre-se"** e **"Entre"**. Com login, o botão **"Meu painel"** aparece **somente para admin** e leva a `/admin`; usuários comuns por enquanto veem apenas nome/e-mail e `Sair`.

Os painéis `/membro` e `/diretoria` ainda têm conteúdo demonstrativo; o `/admin` já opera sobre dados reais nas funções acima.

## Identidade visual atual

- A logo real da igreja está em `public/images/ieadtrr-logo.jpeg`.
- O nome curto correto é `IEADTRR`.
- O menu público usa `Doutrina`, não `Regras gerais`.
- O layout deve ficar mais acolhedor e visual, não seco como sistema administrativo puro.
- O banner principal deve destacar a foto em formato largo de banner.
- A logo no banner deve ficar pequena no canto superior esquerdo, sem competir com a foto.
- A logo do cabeçalho deve aparecer inteira, sem cortar letras.

## Banner público (cultos da semana)

O banner principal da home é uma tela flutuante grande com foto em destaque e informações sobrepostas. Ele exibe os quatro cultos da semana da Sede Administrativa, definidos em `weeklyServices` (`src/data/church.ts`):

- Segunda-feira · Culto de doutrina · 19h30 → `banner-biblia.png`
- Sexta-feira · Culto da família · 19h30 → `banner-comunhao.png`
- Domingo · Escola bíblica · 09h00 → `banner-biblia.png` (placeholder repetido; falta uma 4ª foto própria)
- Domingo · Culto de celebração · 19h30 → `banner-culto.png`

Comportamento:

- Foto grande ocupando o destaque, com dia, nome do culto, horário (em pílula dourada), local e descrição sobrepostos.
- Passa automaticamente a cada 5,5 segundos, com quatro indicadores clicáveis abaixo.
- O texto fixo é `Notícias e avisos · Cultos da semana`.

Imagens disponíveis: `public/images/banner-culto.png`, `banner-comunhao.png`, `banner-biblia.png` (3 fotos para 4 slots; a de escola bíblica reaproveita a da doutrina).

Painel admin:

- Em `/admin`, a seção `Banner público / Cultos da semana` lista as quatro fotos e permite trocar a imagem de cada culto.
- A troca é apenas prévia local (não salva em banco). Futuramente deve gravar no Firebase Storage e metadados no Firestore.

## Congregações e presenças

Congregações:

- Serviço: `src/services/congregations.ts`.
- Coleção: `congregations`.
- O site usa as congregações do Firestore; se a coleção estiver vazia, usa o fallback local de `src/data/church.ts`.
- Campos principais: `nome`, `tipo`, `categoria`, `endereco`, `pastorResponsavel`, `telefone`, `latitude`, `longitude`, `ativa`.
- Categorias: `capital_sede` (`Igreja da capital`), `capital_filial` (`Filial na capital`), `interior_filial` (`Filial no interior`).
- Admin cria/edita/suprime em `/admin` no `CongregationManager`; o visitante só escolhe a igreja específica, sem escolher categoria.
- Mapas pequenos usam iframe do OpenStreetMap a partir de `latitude` e `longitude`.

Registros de presença:

- Serviço: `src/services/visitRecords.ts`.
- Coleção: `visitRecords`.
- Palavra genérica na UI: **Registro de presença**, cobrindo visitante e convidado.
- Usuário visitante/convidado registra pelo `/visitante`; pode alterar o registro do dia/slot.
- Regra funcional no frontend: dias comuns têm `session: 'regular'`; domingos têm `session: 'ebd'` e `session: 'culto_noite'`.
- O ID do registro do usuário logado é determinístico (`uid_data_session`), impedindo duplicidade por slot e permitindo edição.
- Admin pode lançar presença sem login pelo `AdminPresenceRegistration`; nesse caso o documento usa ID automático, `source: 'admin'` e `recordedBy`.
- O dashboard `VisitorTracking` consome `visitRecords`, com filtros por data, igreja e categoria, além de tabela nominal com data, hora e congregação.

## Cadastro

O fluxo de `/cadastro` tem duas etapas:

1. Sem login, a página mostra `CreateAccessPanel` para criar o acesso no Firebase Authentication (`nome`, `e-mail`, `senha`, `confirmar senha`). A conta nasce em `users/{uid}` com `role: 'pendente'`.
2. Depois do login, a página mostra `RegistrationForm`, que é **condicional ao tipo de cadastro** escolhido no topo: visitante, convidado ou membro. O e-mail usado no formulário é o e-mail do login e fica somente leitura. Congregado não é escolhido pelo próprio usuário nessa etapa; o admin promove visitante/convidado para congregado.

No painel `/admin`, o mesmo formulário existe em modo administrativo (`RegistrationForm mode="admin"`): o admin informa os dados da pessoa, inclusive e-mail de contato, mas **não cria usuário no Authentication, nem login, nem senha**. Esse modo serve para registrar presença ou cadastro nominal inicial de alguém pela administração.

**Visitante e Convidado** (formulário enxuto, sem aprovação) — só com:

- Nome completo (obrigatório, nome + sobrenome)
- **Convidado por** (só para Convidado, obrigatório) — nome de quem indicou. A diferença entre os dois: visitante é autônomo; convidado foi indicado por alguém.
- E-mail do acesso (obrigatório, vem do login e fica somente leitura)
- Data de nascimento (obrigatório, não futura)
- Congregação (obrigatório; dica "congregação que está visitando")
- Telefone (obrigatório, com DDD)
- Observações (opcional)
- Consentimento LGPD (obrigatório)
- As seções de endereço, CPF/RG, função eclesiástica e documentos **não aparecem**.

Visitante e convidado **não passam por aprovação** e **não aparecem** no painel de aprovação do admin. No fluxo com login, `completeVisitorProfile` atualiza o próprio `users/{uid}` com `role: 'visitante'`, `tipoPessoa`, `congregacao`, `convidadoPor`, `telefone`, `dataNascimento` e `observacoes`; depois aparecem no acompanhamento da diretoria em `/diretoria`. No modo administrativo, visitante/convidado é salvo em `membershipRequests` como registro nominal e também entra no acompanhamento da diretoria.

**Congregado** — perfil criado somente por promoção do administrador:

- Quando visitante ou convidado aceita Jesus, o admin usa `ProfileProgressionManager` para transformar o `role` em `congregado` e `tipoPessoa` em `congregado`.
- Depois de logado, o congregado acessa `/congregado` e preenche dados equivalentes aos de membro, exceto batismo e cargo/função.
- Dados exigidos no formulário de congregado: nome, CPF, RG, data de nascimento, telefone, WhatsApp, e-mail, congregação, endereço completo, data de aceitação, documentos e LGPD.
- Congregado **não recebe cargo/função**. O cargo só existe associado a um membro.
- Quando for batizado nas águas, o admin informa a data de batismo e promove o congregado para `membro`.

**Membro** (passa por aprovação do admin) — formulário completo, obrigatórios:

- Nome completo, CPF (validado com dígito verificador), RG, Data de nascimento, Congregação (dica "que frequenta"), Telefone (com marcar "tem WhatsApp"), E-mail do acesso.
- Endereço: CEP (com busca automática ViaCEP), Tipo de logradouro (lista: Rua/Avenida/Alameda/...), Nome do logradouro, Número, Complemento (opcional), Bairro, Cidade, Estado.
- Seção **"Vida cristã e função eclesiástica"**: o usuário informa data de batismo (bloqueia se a idade na data for < 12 anos vs. data de nascimento, com mensagem de doutrina) e data de aceitação (opcional). Cargo/função não é informado pelo usuário comum; aparece como aviso de que será atribuído pela administração. Em `mode="admin"`, o formulário ainda permite registrar cargo nominal, mas o cargo oficial do acesso fica no `ProfileProgressionManager`.
- Documentos: Foto — opção **foto única** ou **frente e verso**; Cartas de mudança e recomendação — marcar "tem mais de uma página" para permitir vários arquivos ou um PDF único.

Máscaras aplicadas: CPF `000.000.000-00`, Telefone `(00) 00000-0000`, CEP `00000-000`.

Pendente: e-mail automático de status ao membro (fica para depois — precisa de backend de envio, Cloud Functions/Blaze ou serviço externo). Uploads reais de foto/cartas dependem do Storage (ainda não criado); hoje o formulário guarda apenas os nomes dos arquivos.

Cargos/funções disponíveis:

- Pastor
- Presbítero
- Diácono
- Diaconisa
- Missionário
- Missionária
- Evangelista
- Cooperador
- Obreiro
- Secretário
- Tesoureiro
- Dirigente de congregação
- Professor(a) de EBD
- Líder de jovens
- Líder de mulheres
- Líder de louvor
- Outra função

Com o Firebase conectado, cadastro de membro grava em `membershipRequests` no Firestore (via `src/services/membership.ts`; as regras exigem usuário autenticado) e também marca `tipoPessoa: 'membro'` no próprio `users/{uid}` via `markMemberRegistrationProfile`, mantendo o `role` pendente até aprovação/promoção pelo admin. O cadastro de congregado atualiza o próprio `users/{uid}` via `completeCongregadoProfile`, mantendo `role: 'congregado'` e sem permitir cargo ou batismo. Se o `.env` estiver vazio (`db` nulo), cai em simulação local no `localStorage` (chave `adtrr-membership-requests`).

Nota técnica: o Firestore é iniciado com `initializeFirestore(app, { ignoreUndefinedProperties: true })` em `src/lib/firebase.ts`, porque o `addDoc` rejeita campos `undefined` (ex.: `cargo` quando não há função) e isso quebrava o envio.

## Dados institucionais atuais

Arquivo principal:

- `src/data/institutional.ts`

Dados:

- Nome registrado (uso legal, CNPJ/estatuto): Igreja Evangélica Assembleia de Deus Tradicional no Estado de Roraima (`legalName`)
- Nome de exibição (hero/rodapé): Igreja Evangélica Assembleia de Deus Tradicional de Roraima (`displayName` / `churchDisplayName`)
- Nome curto: IEADTRR
- CNPJ: 12.402.406/0001-80
- Pix: igrejaevangelicaassembleiadedeustradicionalrr@gmail.com
- Tipo da chave Pix: E-mail · Banco: Santander
- Fundação: 31 de julho de 2010
- Endereços (em `churchAddresses`):
  - Base Missionária · Sede Oficial: BR-174, Km 32, Nº 320, PA Nova Amazônia, Boa Vista - RR
  - Sede Administrativa · Cultos centrais: Av. dos Imigrantes, Nº 567, Bairro Buritis, Boa Vista - RR
- Presidente: Pastor Sebastião Salazar Jansem

Fontes usadas:

- `Carnê Pró Construção.doc`
- `Ata e Estatudo da Igreja Assembleia de Deus Tradicional RR.pdf`

## Relação histórica/fundadores

Página:

- `/membro/fundadores`

Exibir apenas nomes. Não exibir CPF, RG ou dados pessoais.

Observação importante: a lista foi extraída da ata registrada como relação nominal histórica. A secretaria deve revisar antes de tratar como lista oficial definitiva de fundadores.

## Autenticação e perfis

Funcionando com o Firebase real:

- `src/context/AuthContext.tsx`: `AuthProvider` e hook `useAuth`, escuta `onAuthStateChanged` e o documento `users/{uid}` no Firestore em tempo real (`onSnapshot`). Trocar o `role` no console reflete no site na hora, sem novo login.
- `src/services/auth.ts`: `signIn`, `signUp`, `sendPasswordReset` e `signOutUser`. `signUp` cria o usuário no Authentication e o perfil em `users/{uid}` sempre com `role: 'pendente'`.
- `src/components/ProtectedRoute.tsx`: exige autenticação e uma lista de perfis permitidos. Sem login → redireciona para `/login`. Logado e pendente sem tipo informado → orienta a completar `/cadastro`. Logado com `tipoPessoa: 'membro'` e `role: 'pendente'` → mostra que o cadastro está em análise. Logado sem o perfil exigido → "Acesso não permitido".
- `firestore.rules`: em `users/{userId}` a condição de auto-cadastro (usuário criando o próprio doc com `role: 'pendente'`) vem **antes** de `isAdmin()` no `create`, para não disparar um `get()` em documento inexistente durante o primeiro cadastro. O próprio usuário pode manter o mesmo `role` em atualizações comuns e pode fazer a transição `pendente` → `visitante` ao concluir cadastro de visitante/convidado. Campos protegidos (`possuiCargo`, `cargo`, `outroCargo`, `dataBatismo`) não podem ser alterados pelo próprio usuário. Só admin altera para `congregado`, `membro`, `diretoria` ou `admin`, informa batismo e atribui cargo.

Perfis: `pendente` (padrão ao criar acesso), `visitante` (visitante/convidado com login próprio), `congregado`, `membro`, `diretoria`, `admin`.

Acesso do visitante/convidado: a pessoa primeiro cria acesso em `/cadastro` ou entra em `/login`; depois informa se é visitante ou convidado no `RegistrationForm`. O envio atualiza o próprio `users/{uid}` com `role: 'visitante'` via `completeVisitorProfile`. Depois de logados, veem o painel `/visitante` (`VisitorPanel`) que permite **apenas atualizar a congregação que estão visitando** (`updateVisitorCongregacao`). Membros continuam indo para `membershipRequests` (aprovação), mas agora sempre depois de login.

Progressão de perfil: quando visitante/convidado passa a congregado, admin usa `promoteVisitorToCongregado`; quando congregado é batizado, admin usa `promoteCongregadoToMembro` com a data de batismo; quando membro recebe ou perde função/cargo, admin usa `updateMemberChurchRole`. Cargo/função só é válido em perfil `membro`.

## Firebase

Projeto real conectado: **`ieadtrr-sistema`** (plano Spark / sem custos).

Estado atual:

- `.env` (na raiz, ignorado pelo git) preenchido com as 6 chaves `VITE_FIREBASE_*` do app web. `isFirebaseConfigured` = true.
- **Authentication**: ativo, provedor **E-mail/senha** habilitado.
- **Firestore**: banco criado em produção, região `southamerica-east1` (São Paulo). Regras do `firestore.rules` **publicadas manualmente** pelo console (aba Regras). Testado: `signUp` grava o perfil `pendente` sem erro.
  - ⚠️ `firestore.rules` foi alterado e **precisa ser republicado no console** para o fluxo novo funcionar: (1) `membershipRequests` exige `signedIn()` no `create` e permite leitura da diretoria; (2) `users` `create` aceita somente o próprio usuário criando `role: 'pendente'`; (3) `users` `update` permite o próprio usuário manter o mesmo `role` ou fazer a transição `pendente` → `visitante`, mas bloqueia alteração própria de `possuiCargo`, `cargo`, `outroCargo` e `dataBatismo`; (4) `users` `read` permite o próprio uid ou diretoria/admin; (5) `visitRecords` permite usuário criar/editar o próprio registro e admin/diretoria ler/lançar presença nominal. Enquanto não republicar, o registro de presença, o dashboard e a progressão de perfis podem falhar.
- **Storage**: **ainda não criado**. Em projetos novos o Storage pode exigir upgrade para o plano Blaze (pago); por isso foi adiado. Login, cadastro e aprovação de membros funcionam só com o Firestore.

Primeira conta admin: **criada e promovida**. `users/{uid}` do presidente (`izaelsrjansem@gmail.com`, uid `OSCMBx74DMaJ9zlym9GAJOigtLX2`) com `role: "admin"`. Acesso a `/admin` confirmado. Novas contas ainda nascem `pendente` e precisam ser promovidas manualmente no Firestore até existir a tela de aprovação.

Ainda falta:

- Criar o Storage e publicar `storage.rules` (quando for tratar uploads).
- Publicar `firestore.indexes.json` se/quando surgirem consultas que exijam índice composto.
- Trocar dados mockados dos painéis por dados reais do Firestore.
- Persistir uploads de foto, cartas e fotos do banner.

Observação sobre deploy de regras: foram publicadas por **cópia manual no console** (não via Firebase CLI). Se editar `firestore.rules` no repositório, lembrar de republicar no console (ou configurar `firebase deploy`).

### Ação obrigatória pendente: republicar regras do Firestore

O arquivo local `firestore.rules` já contém as regras atuais. Elas precisam ser republicadas manualmente no Console do Firebase:

1. Abrir Firebase Console.
2. Entrar no projeto `ieadtrr-sistema`.
3. Ir em Firestore Database.
4. Abrir a aba `Regras`.
5. Apagar o conteúdo atual.
6. Colar exatamente o conteúdo de `firestore.rules`.
7. Clicar em `Publicar`.

Sem essa republicação:

- O cadastro de visitante/convidado pode falhar ao concluir o perfil em `users` (`pendente` → `visitante`).
- O registro de presença em `/visitante` pode falhar ao gravar em `visitRecords`.
- Admin/diretoria podem não conseguir ler o dashboard de presenças.
- Admin pode não conseguir lançar presença nominal sem login.
- Admin pode não conseguir promover visitante/convidado para congregado, congregado para membro ou atribuir cargo.
- `membershipRequests` pode não ficar legível para diretoria.

Teste após publicar:

1. Abrir `/cadastro`.
2. Sem login, criar um acesso com nome, e-mail, senha e confirmação.
3. Já logado, escolher `Convidado` ou `Visitante`.
4. Preencher os dados do perfil e enviar.
5. Confirmar mensagem de cadastro concluído.
6. Confirmar que o login do visitante/convidado direciona para `/visitante` ou abrir `/visitante` diretamente.
7. Alterar congregação e salvar.
8. Entrar como admin/diretoria e verificar a pessoa no acompanhamento de `/diretoria`.
9. Como admin, promover um visitante/convidado para congregado em `/admin`.
10. Entrar com esse usuário, abrir `/congregado`, preencher os dados completos e salvar.

## Progresso desta sessão (2026-07-08)

Concluído:

- Registro de presença do visitante/convidado implementado em `/visitante`, com tipo Visitante/Convidado, culto/atividade, igreja e mapa da congregação.
- Regra funcional de presença: um registro por dia em dias comuns; aos domingos, dois slots (`EBD` e `Culto à noite`). O usuário pode alterar o registro do slot.
- Nova coleção `visitRecords` e serviço `src/services/visitRecords.ts`; dashboard `VisitorTracking` agora consome registros reais de presença.
- Admin ganhou `AdminPresenceRegistration` para lançar presença de visitante/convidado sem login e `CongregationManager` para cadastrar/editar/suprimir congregações.
- Congregações passaram a vir do Firestore (`src/services/congregations.ts`), com fallback local em `src/data/church.ts`, categorias capital/interior, geolocalização para mapa e filtro administrativo `Todas`/`Capital`/`Interior`.
- Fluxo de login/cadastro alterado: cabeçalho sem login mostra **Cadastre-se** e **Entre**; `/login` agora é somente entrada com e-mail/senha e recuperação de senha por `sendPasswordReset`.
- `/cadastro` agora cria o acesso primeiro quando não há login; depois de logado, o usuário informa se é visitante, convidado ou membro.
- Ajuste posterior: após login, o usuário é direcionado pelo perfil; admin vai para `/admin` e não vê o formulário público de `/cadastro`. O botão **Meu painel** no cabeçalho ficou exclusivo para admin.
- Cadastro nominal administrativo adicionado dentro de `/admin` para registrar visitante, convidado ou membro sem criar login/senha. Visitantes/convidados registrados ali aparecem no acompanhamento da diretoria.
- Visitante/convidado não criam mais senha dentro do formulário. O formulário atualiza o próprio perfil em `users/{uid}` via `completeVisitorProfile`, fazendo `role: 'visitante'`.
- Cadastro de membro continua em `membershipRequests`, mas agora exige usuário autenticado e marca `tipoPessoa: 'membro'` no perfil via `markMemberRegistrationProfile`, mantendo o `role` pendente.
- `firestore.rules` atualizado: `membershipRequests.create` exige `signedIn()`, `users.create` aceita somente `role: 'pendente'` para o próprio usuário, e `users.update` permite `pendente` → `visitante`.
- Novo perfil `congregado` implementado: admin promove visitante/convidado para congregado; congregado acessa `/congregado` e completa dados equivalentes aos de membro, exceto batismo e cargo.
- Promoção congregado → membro implementada no `/admin`, exigindo data de batismo informada pelo administrador.
- Cargo/função ministerial passou a ser atribuído apenas pelo admin e apenas para perfil `membro`; o formulário do usuário comum não oferece mais escolha de cargo.
- `firestore.rules` agora bloqueia alteração própria de `possuiCargo`, `cargo`, `outroCargo` e `dataBatismo`, mantendo esses campos sob responsabilidade administrativa.
- Verificação executada: `pnpm build` passou; `pnpm lint` passou com o aviso antigo de Fast Refresh em `src/context/AuthContext.tsx`.

Pendente imediato:

- Republicar `firestore.rules` no Console do Firebase antes de testar cadastro de visitante/convidado, registro de presença, progressão para congregado/membro e atribuição de cargo no projeto real.

## Progresso desta sessão (2026-07-07)

Concluído:

- Redesenho completo da home (hero serifado, banner grande de cultos, seção de avisos, rodapé com dois endereços, Pix + Santander). Ver seções acima.
- Correção do servidor de preview (caminho com espaço) → `run-dev-igreja.cmd`.
- Firebase conectado: `.env` preenchido, Authentication e Firestore ativos. As regras antigas foram publicadas, mas as regras atuais de visitante/convidado precisam ser republicadas.
- Conta admin do presidente criada e promovida (`role: admin`); acesso a `/admin` validado. No caminho houve dois tropeços já resolvidos: (1) o primeiro cadastro criou a conta no Auth mas falhou ao gravar o perfil porque as regras ainda não estavam publicadas; (2) depois, esquecimento de senha resolvido por e-mail de redefinição (`accounts:sendOobCode`).

Também nesta sessão:

- Botão "Meu painel" no cabeçalho (atualmente exibido somente para admin).
- Tela de **aprovação de cadastros** (`membershipRequests`) e **gerenciador de perfis de acesso** (`users`) no `/admin`. Novos serviços: `src/services/users.ts` (`subscribeUsers`, `updateUserRole`) e novas funções em `src/services/membership.ts` (`subscribeMembershipRequests`, `decideMembershipRequest`).

Próximo:

- Faltam as **4 fotos reais** dos cultos (hoje 3 imagens para 4 slots).

## Próximas prioridades

1. Ao aprovar uma solicitação, gerar o registro oficial em `members` (hoje só marca `status`).
2. Vincular solicitação aprovada a um acesso: quando a pessoa também tiver conta em `users` (mesmo e-mail), facilitar a promoção do perfil.
3. Criar o Storage e persistir fotos e documentos (inclusive as fotos do banner).
4. Trocar dados demonstrativos dos painéis `/membro` e `/diretoria` por dados reais.
5. Página pública de agenda/eventos alimentada pelo Firestore (`events`).

## Cuidados

- Não voltar o menu para `Regras gerais`; o termo correto no site é `Doutrina`.
- Não cortar a logo com `object-fit: cover`; usar `contain`.
- Não expor documentos pessoais em área pública.
- Não exibir CPF/RG nas páginas públicas.
- Manter linguagem simples para membros e visitantes.
- Antes de concluir alterações visuais, rodar `pnpm build` e `pnpm lint`.
