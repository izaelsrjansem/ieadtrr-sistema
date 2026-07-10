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
- Após usuário comum enviar cadastro como membro, o acesso continua funcionando, mas `users/{uid}` permanece com `role: 'pendente'` e `tipoPessoa: 'membro'`; `/cadastro` passa a mostrar **Cadastro em análise** e `/membro` mostra o bloqueio de aprovação até o admin validar.
- `/login`: tela de entrada apenas para quem já tem cadastro, com e-mail, senha, botão `Entrar` e opção de recuperação de senha (`Esqueci, perdi ou não sei minha senha`). Após entrar, consulta `users/{uid}` e direciona pelo perfil: admin → `/admin`, diretoria → `/diretoria`, visitante → `/visitante`, congregado → `/congregado`, membro ou membro pendente → `/membro`, pendente sem tipo → `/cadastro`.

Rotas de área restrita, agora protegidas por autenticação real (ver seção Autenticação):

- `/membro`: painel inicial do membro. Exige perfil membro, diretoria ou admin.
- `/membro/fundadores`: relação nominal histórica/fundadores, apenas nomes. Mesma exigência de `/membro`.
- `/visitante`: painel do visitante/convidado (`VisitorPanel`). Exige perfil visitante. Exibe o item genérico **Registro de presença**, permitindo escolher Visitante/Convidado, culto/atividade e igreja específica. Limite funcional: em dias comuns há um registro por dia; aos domingos há dois slots (`EBD` e `Culto à noite`). O registro do slot atual pode ser alterado pelo usuário.
- `/congregado`: painel do congregado. Exige perfil congregado. Mostra o formulário de dados completos de congregado (`RegistrationForm fixedTipoPessoa="congregado"`), sem campo de batismo e sem cargo/função. O batismo e a promoção para membro são feitos pelo admin.
- `/diretoria`: painel da diretoria. Exige perfil diretoria ou admin. Contém o **acompanhamento de visitantes e convidados** (`VisitorTracking`): métricas, contagem por congregação e tabela com nome, tipo, congregação, horário registrado e data — lido da coleção `visitRecords`. Abaixo, a escala de cultos (ainda demonstrativa).
- `/admin`: painel administrativo. Exige perfil admin **ou** usuário com pelo menos uma seção administrativa liberada em `adminSectionAccess`. O painel agora é compartimentado: mostra botões de seção e renderiza apenas a seção selecionada. Seções atuais: `Cadastro`, `Membros`, `Presenças`, `Congregações`, `Usuários` e `Site público`. Admin vê tudo; usuários não-admin veem somente as seções liberadas.
  - **Registrar presença sem login** (`AdminPresenceRegistration`): lançamento rápido de presença para visitante/convidado sem conta, gravando em `visitRecords` com `source: 'admin'`.
  - **Dashboard de análise de presenças** (`VisitorTracking`): lê `visitRecords` e mostra visitante/convidado, data, horário registrado, culto/atividade, igreja e classificação da igreja, com filtros por data, classificação e igreja; mostra mapa pequeno pela geolocalização da congregação.
  - **Aprovar solicitações de membro** (`MembershipApprovals`): lê `membershipRequests` em tempo real **filtrando só `tipoPessoa === 'membro'`** (visitante/convidado não passam por aprovação), com filtros de status e botões Aprovar/Rejeitar. Ao aprovar, uma operação em lote cria/atualiza o registro oficial em `members/{requestId}`, marca a solicitação como aprovada e promove para membro a conta vinculada por `userId`. Contas de diretoria/admin preservam o perfil de acesso.
  - **Cadastro oficial de membros** (`MemberDirectory`): lista em tempo real a coleção `members`, mostra total de ativos e permite buscar por nome, congregação, e-mail ou telefone. CPF e RG não são exibidos na listagem.
  - **Cadastro de membros e congregados** (`AdminNominalRegistration`): ferramenta recolhível dentro da seção `Cadastro` para registrar **somente membro ou congregado** sem criar login e senha para a pessoa. Usa `RegistrationForm mode="admin" allowedPersonTypes={['membro', 'congregado']}` e grava em `membershipRequests`. Visitantes e convidados ficam fora desta aba e devem ser tratados pela seção de presenças/visitantes.
  - **Cadastro de congregações** (`CongregationManager`): permite ao admin incluir, editar e suprimir igrejas/congregações, informando classificação (`Capital`, `Interior`, `Zona Rural de Boa Vista`), endereço, responsável, telefone e localização (opcional) via "Usar localização atual", "Indicar no mapa" (Leaflet) ou digitação de latitude/longitude. A lista de igrejas no admin tem filtro em botões `Todas`, `Capital`, `Interior` e `Zona Rural`. A supressão marca `ativa: false`.
  - **Progressão espiritual e cargos** (`ProfileProgressionManager`): lista visitantes/convidados, congregados e membros. Admin promove visitante/convidado para congregado, congregado para membro informando data de batismo, e atribui/remove cargo somente em perfil de membro.
  - **Usuários e permissões por seção** (`UserAccessManager`): lista a coleção `users` e permite ao admin mudar o `role` de cada pessoa (pendente/congregado/membro/diretoria/administrador), além de liberar/remover acesso por seção administrativa (`adminSectionAccess`). É aqui que se cria um novo administrador e também se compartimenta o acesso ao painel. O admin não pode alterar o próprio perfil (evita se trancar para fora).
  - **Banner público / Cultos da semana** (`BannerManager`): troca as 4 fotos (prévia local, ainda sem Storage).

Cabeçalho: sem login, o canto superior direito mostra **"Cadastre-se"** e **"Entre"**. Com login, o botão **"Painel Administrativo"** aparece para admin ou para usuário com ao menos uma seção administrativa liberada; usuários comuns por enquanto veem apenas nome/e-mail e `Sair`.

Estado de navegação: o item correspondente à página atual usa fundo verde em degradê, texto branco, sombra discreta e pequeno deslocamento para baixo. Isso se aplica ao menu público e ao botão `Painel Administrativo`. Na rota `/admin`, o cabeçalho da página mostra apenas o título grande `Administração`, sem a etiqueta `Área restrita`.

Menus públicos e conteúdo das páginas principais agora são parametrizáveis pelo administrador em `/admin`, na seção **Menus e páginas públicas** (`NavigationManager`). Os dados ficam em `siteSettings/navigation` no Firestore, com leitura pública e escrita restrita ao admin pelas regras já existentes de `siteSettings`. O admin pode editar os menus atuais (`Início`, `Congregações`, `Agenda`, `Doutrina`, `Diretoria`) e criar novos itens. Campos configuráveis: nome do menu, caminho da página, ícone, ordem, visibilidade, tamanho do texto do menu, negrito do menu, título da página, conteúdo da página, tamanho do título e negrito do título. Itens novos viram páginas públicas simples renderizadas pela rota dinâmica `/:customSlug`; os itens principais continuam usando suas páginas especiais, mas obedecem ao título/conteúdo/formatação configurados.

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
- Classificação (`categoria`): `capital` (`Capital`), `interior` (`Interior`), `zona_rural` (`Zona Rural de Boa Vista`). Valores legados (`capital_sede`/`capital_filial` → `capital`, `interior_filial` → `interior`) são convertidos na leitura por `normalizeCongregationCategory` em `src/services/congregations.ts`.
- Admin cria/edita/suprime em `/admin` no `CongregationManager`; o visitante só escolhe a igreja específica, sem escolher categoria. Filtro da lista: `Todas`/`Capital`/`Interior`/`Zona Rural`.
- Tipo interno: `congregacao` (padrão) ou `sede`; a lista mostra Congregação primeiro.
- Localização (opcional): botões **Usar localização atual** (geolocalização do navegador) e **Indicar no mapa** (mapa interativo Leaflet, carregado via CDN no `index.html`, clique fixa o marcador). Nos dois casos, além de latitude/longitude, o **endereço é preenchido automaticamente** (rua, número, bairro, cidade) por geocodificação reversa via Nominatim/OpenStreetMap (`reverseGeocode` em `App.tsx`). Latitude/longitude também podem ser digitadas à mão e **não são obrigatórias**.
- Mapas pequenos de exibição usam iframe do OpenStreetMap a partir de `latitude` e `longitude`.

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

No painel `/admin`, o formulário existe em modo administrativo para a seção **Cadastro** (`RegistrationForm mode="admin" allowedPersonTypes={['membro', 'congregado']}`): o admin informa os dados completos da pessoa, inclusive e-mail de contato, mas **não cria usuário no Authentication, nem login, nem senha**. Essa aba serve para cadastrar e classificar a pessoa como membro ou congregado. Visitantes e convidados não aparecem nessa aba.

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
- Dados exigidos no formulário de congregado: nome, CPF, data de nascimento, telefone, WhatsApp, e-mail, congregação, endereço completo, data de aceitação, documentos e LGPD. RG é opcional.
- Congregado **não recebe cargo/função**. O cargo só existe associado a um membro.
- Quando for batizado nas águas, o admin informa a data de batismo e promove o congregado para `membro`.

**Membro** (passa por aprovação do admin) — formulário completo, obrigatórios:

- Nome completo, CPF (validado com dígito verificador), Data de nascimento, Congregação (dica "que frequenta"), Telefone (com marcar "tem WhatsApp"), E-mail do acesso. RG é opcional.
- E-mail é a chave inicial do acesso/cadastro. A criação de acesso normaliza o e-mail para minúsculas e o Firebase Authentication impede dois acessos com o mesmo e-mail. Novos registros também salvam `emailLower`. O formulário consulta `members`, `membershipRequests` e `users`; se o e-mail já existir, bloqueia o envio e orienta a recuperar acesso ou usar outro e-mail.
- CPF é a chave principal da pessoa no cadastro oficial. Novos registros salvam também `cpfDigits` (somente números) e, ao aprovar membro, o documento em `members` passa a usar o CPF numérico como ID. No cadastro administrativo de membro/congregado, antes de gravar, o sistema consulta `members`, `membershipRequests` e `users`; se o CPF já existir, bloqueia a criação e orienta o administrador a editar o cadastro existente com aviso logo abaixo do campo CPF e também no fim do formulário. Essa consulta de duplicidade fica restrita ao modo administrador, porque usuário comum não tem permissão para listar essas coleções; no fluxo público, duplicidade deve ser analisada pelo admin na aprovação.
- Endereço: CEP (com busca automática ViaCEP), Tipo de logradouro (lista: Rua/Avenida/Alameda/...), Nome do logradouro, Número, Complemento (opcional), Bairro, Cidade, Estado.
- Seção **"Vida cristã e função eclesiástica"**: para membro, a data de batismo aparece sempre como campo próprio e opcional; para congregado, o campo de batismo não aparece. Ao cadastrar como membro, o formulário valida a idade pela data de nascimento: se a pessoa ainda não tem 12 anos, ou se a data de batismo informada ocorreu antes dos 12 anos, o formulário mostra aviso inline no campo de batismo e o envio é bloqueado com uma tela flutuante explicando que ela não pode ser cadastrada como membro por não ter idade doutrinária para o batismo ou por ainda não ter sido batizada. Se a pessoa tem 12 anos ou mais e deixar batismo vazio, o cadastro pode ir para aprovação do admin. Cargo/função não é informado pelo usuário comum; aparece como aviso de que será atribuído pela administração. Em `mode="admin"`, o formulário ainda permite registrar cargo nominal, mas o cargo oficial do acesso fica no `ProfileProgressionManager`.
- Documentos: Foto — opção **foto única** ou **frente e verso**; Cartas de mudança e recomendação — marcar "tem mais de uma página" para permitir vários arquivos ou um PDF único.

Máscaras aplicadas: CPF `000.000.000-00`, Telefone `(00) 00000-0000`, CEP `00000-000`.

Indicação de obrigatoriedade: campos exigidos exibem uma etiqueta discreta **"Campo obrigatório"** (classe `.required-hint`) numa linha própria, entre o rótulo e o campo (fora do input; o exemplo/placeholder fica dentro). Campos opcionais podem trazer `(opcional)` ao lado do rótulo (`.optional-tag`). No `RegistrationForm`, após tentativa de envio, campos obrigatórios vazios ou inválidos recebem destaque visual com `.field-control-error`, e o termo LGPD usa `.required-field-missing-line`; o destaque é removido assim que o campo é corrigido. Aplicado no `RegistrationForm` (conforme o tipo/perfil) e no `CongregationManager`. Componente `RequiredHint` existe local em `App.tsx` e em `RegistrationForm.tsx`.

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
- `/login` possui a opção **"Salvar acesso para os próximos logins"**. Quando marcada, `signIn` usa `browserLocalPersistence`; quando desmarcada, usa `browserSessionPersistence`.
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
- **Firestore**: banco criado em produção, região `southamerica-east1` (São Paulo). A versão atual de `firestore.rules` (com `hasAdminSection` e acesso por seção) foi **publicada/republicada pelo console** e validada: o admin lê sem erro `users`, `members`, `membershipRequests`, `congregations`, `visitRecords` e `siteSettings`.
- **Storage**: **ainda não criado**. Em projetos novos o Storage pode exigir upgrade para o plano Blaze (pago); por isso foi adiado. Login, cadastro e aprovação de membros funcionam só com o Firestore.

Primeira conta admin: **criada e promovida**. `users/{uid}` do presidente (`izaelsrjansem@gmail.com`, uid `0SCMBx74DMaJ9zlym9GAJOigtLX2`) com `role: "admin"`. Acesso a `/admin` confirmado. A promoção de perfis e a liberação de seções administrativas hoje são feitas pelo `UserAccessManager` na seção Usuários do `/admin`.

Ainda falta:

- Criar o Storage e publicar `storage.rules` (quando for tratar uploads).
- Publicar `firestore.indexes.json` se/quando surgirem consultas que exijam índice composto.
- Trocar dados mockados dos painéis por dados reais do Firestore.
- Persistir uploads de foto, cartas e fotos do banner.

Observação sobre deploy de regras: foram publicadas por **cópia manual no console** (não via Firebase CLI). Se editar `firestore.rules` no repositório, lembrar de republicar no console (ou configurar `firebase deploy`).

### Regras do Firestore publicadas

A versão vigente (com `adminSectionAccess` / `hasAdminSection` liberando operações por seção — `site`, `congregacoes`, `cadastros`, `presencas`, `membros`, `usuarios`) já está **publicada** no console e validada com acesso de admin. Quando `firestore.rules` for alterado novamente, substituir todo o conteúdo na aba **Firestore Database → Regras** e clicar em **Publicar**.

Falta ainda validar o acesso compartimentado com um usuário **não-admin** que tenha `adminSectionAccess` (ex.: só `cadastros`), confirmando que ele vê apenas a seção liberada.

Teste funcional restante:

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
- Ajuste posterior: após login, o usuário é direcionado pelo perfil; admin vai para `/admin` e não vê o formulário público de `/cadastro`. O botão **Painel Administrativo** no cabeçalho ficou exclusivo para admin.
- Cadastro administrativo dentro de `/admin` agora fica na seção **Cadastro** e registra somente membro ou congregado sem criar login/senha. Visitantes e convidados ficam fora dessa aba e devem ser tratados pela seção de presenças.
- Visitante/convidado não criam mais senha dentro do formulário. O formulário atualiza o próprio perfil em `users/{uid}` via `completeVisitorProfile`, fazendo `role: 'visitante'`.
- Cadastro de membro continua em `membershipRequests`, mas agora exige usuário autenticado e marca `tipoPessoa: 'membro'` no perfil via `markMemberRegistrationProfile`, mantendo o `role` pendente.
- `firestore.rules` atualizado: `membershipRequests.create` exige `signedIn()`, `users.create` aceita somente `role: 'pendente'` para o próprio usuário, e `users.update` permite `pendente` → `visitante`.
- Novo perfil `congregado` implementado: admin promove visitante/convidado para congregado; congregado acessa `/congregado` e completa dados equivalentes aos de membro, exceto batismo e cargo.
- Promoção congregado → membro implementada no `/admin`, exigindo data de batismo informada pelo administrador.
- Cargo/função ministerial passou a ser atribuído apenas pelo admin e apenas para perfil `membro`; o formulário do usuário comum não oferece mais escolha de cargo.
- `firestore.rules` agora bloqueia alteração própria de `possuiCargo`, `cargo`, `outroCargo` e `dataBatismo`, mantendo esses campos sob responsabilidade administrativa.
- Aprovação de membro agora cria o registro oficial em `members`, vincula a solicitação ao acesso e promove automaticamente a conta correspondente. Novas solicitações de usuário autenticado guardam também o `userId`; solicitações nominais sem `userId` não promovem conta de acesso.
- Painel admin ganhou a relação **Membros da igreja**, alimentada em tempo real por `src/services/members.ts`, com total de ativos e busca.
- Verificação executada: `pnpm build` passou; `pnpm lint` passou com o aviso antigo de Fast Refresh em `src/context/AuthContext.tsx`.

Pendente imediato:

- Testar gravações com contas de teste: cadastro de visitante/convidado, registro de presença e progressão para congregado/membro.
- Migrar a solicitação aprovada antiga para a coleção `members`.

## Progresso desta sessão (2026-07-07)

Concluído:

- Redesenho completo da home (hero serifado, banner grande de cultos, seção de avisos, rodapé com dois endereços, Pix + Santander). Ver seções acima.
- Correção do servidor de preview (caminho com espaço) → `run-dev-igreja.cmd`.
- Firebase conectado: `.env` preenchido, Authentication e Firestore ativos. As regras antigas foram publicadas, mas as regras atuais de visitante/convidado precisam ser republicadas.
- Conta admin do presidente criada e promovida (`role: admin`); acesso a `/admin` validado. No caminho houve dois tropeços já resolvidos: (1) o primeiro cadastro criou a conta no Auth mas falhou ao gravar o perfil porque as regras ainda não estavam publicadas; (2) depois, esquecimento de senha resolvido por e-mail de redefinição (`accounts:sendOobCode`).

Também nesta sessão:

- Botão "Painel Administrativo" no cabeçalho (atualmente exibido somente para admin).
- Tela de **aprovação de cadastros** (`membershipRequests`) e **gerenciador de perfis de acesso** (`users`) no `/admin`. Novos serviços: `src/services/users.ts` (`subscribeUsers`, `updateUserRole`) e novas funções em `src/services/membership.ts` (`subscribeMembershipRequests`, `decideMembershipRequest`).

Próximo:

- Faltam as **4 fotos reais** dos cultos (hoje 3 imagens para 4 slots).

## Pendências (a fazer depois)

### Seção "Vida cristã e função eclesiástica" do cadastro (`RegistrationForm`)

Ajustar a seção de cargo/batismo no cadastro de **membro**:

- A pergunta sobre cargo deve ser uma **seleção Sim/Não** ("Possui cargo ou função ministerial?").
  - **Sim** → abre a **lista suspensa** para escolher qual cargo (e "outra função" quando for `outro`).
  - **Não** → segue sem cargo para o próximo passo.
- **Data de batismo passa a ser OBRIGATÓRIA quando o cadastro é de membro** (hoje está como opcional). Manter a validação de idade (batismo só a partir dos 12 anos).
- No cadastro de **congregado**, essa seção de cargo **não deve aparecer** (congregado não ocupa cargo; o batismo é informado depois, quando promovido a membro).
- Observação: hoje o seletor de cargo só aparece em `mode="admin"` (`canAdminAssignCargo = isAdminMode && isMembro`); rever se a pergunta Sim/Não deve valer também fora do modo admin, conforme decisão do usuário.

### Refatorar `src/App.tsx` (3.370 linhas)

Quebrar em componentes/arquivos menores (páginas públicas, painéis e cada gerenciador do admin), de forma incremental (extrair → build → commit → push), para facilitar manutenção e reduzir conflito com edições feitas no Codex.

## Próximas prioridades

1. Migrar a aprovação antiga e testar o fluxo real de criação em `members` e promoção do acesso.
2. Criar o Storage e persistir fotos e documentos (inclusive as fotos do banner).
3. Trocar dados demonstrativos dos painéis `/membro` e `/diretoria` por dados reais.
4. Página pública de agenda/eventos alimentada pelo Firestore (`events`).

## Cuidados

- Não voltar o menu para `Regras gerais`; o termo correto no site é `Doutrina`.
- Não cortar a logo com `object-fit: cover`; usar `contain`.
- Não expor documentos pessoais em área pública.
- Não exibir CPF/RG nas páginas públicas.
- Manter linguagem simples para membros e visitantes.
- Antes de concluir alterações visuais, rodar `pnpm build` e `pnpm lint`.
