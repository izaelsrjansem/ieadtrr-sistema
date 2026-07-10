# Prompt detalhado para criar este sistema do zero no Codex

Copie e adapte o prompt abaixo caso queira recriar um sistema semelhante do zero.

---

Quero criar do zero um sistema web para uma igreja evangelica chamada Igreja Evangelica Assembleia de Deus Tradicional de Roraima, identificada no site como IEADTRR.

Sou iniciante em programacao, entao preciso que voce aja como um programador senior e tambem como orientador. Quero que implemente o projeto passo a passo, explicando o que esta fazendo, mas sem parar apenas em teoria. Sempre que houver uma decisao tecnica simples, escolha uma solucao conservadora, gratuita ou de baixo custo, e continue implementando.

## Objetivo do sistema

Criar um site publico e uma area interna para organizar:

- Informacoes publicas da igreja.
- Congregacoes.
- Agenda.
- Doutrina.
- Diretoria publica.
- Cadastro de visitantes, convidados, congregados e membros.
- Registro de presencas.
- Painel administrativo.
- Controle de usuarios, permissoes e membros.

## Stack desejada

Use:

- React.
- Vite.
- TypeScript.
- CSS moderno responsivo.
- React Router.
- Firebase Authentication para login por e-mail e senha.
- Firebase Firestore como banco de dados.
- Firebase Storage no futuro para fotos e documentos.
- OpenStreetMap/Leaflet para mapas.

Organize o codigo de forma simples para um iniciante entender.

## Identidade visual

O site deve parecer acolhedor, moderno e institucional, nao apenas um sistema seco.

Use:

- Cores modernas com verde, dourado e tons claros.
- Logo da igreja no cabecalho e em areas principais.
- Cards, botoes claros e menus bem organizados.
- Pagina inicial com banner grande de noticias e avisos.
- Layout responsivo para celular e computador.

O nome curto correto da igreja e IEADTRR.

## Paginas publicas

Crie as seguintes rotas:

- `/`: pagina inicial.
- `/congregacoes`: lista de congregacoes.
- `/agenda`: agenda publica.
- `/doutrina`: principios doutrinarios.
- `/diretoria-publica`: lideranca publica.
- `/cadastro`: criacao de acesso e formulario de cadastro.
- `/login`: entrada no sistema.

Na home, inclua:

- Hero com o nome da igreja.
- Banner principal chamado "Noticias e avisos".
- Cultos da semana.
- Area de contribuicoes com Pix.
- Enderecos da sede oficial e sede administrativa.
- Rodape institucional.

## Perfis do sistema

Implemente os seguintes perfis:

- `pendente`: usuario criou acesso, mas ainda nao completou cadastro ou aguarda aprovacao.
- `visitante`: visitante ou convidado com cadastro simples.
- `congregado`: pessoa que aceitou Jesus, mas ainda nao foi batizada nas aguas.
- `membro`: membro aprovado.
- `diretoria`: usuario com acesso de diretoria.
- `admin`: administrador geral.

Tambem implemente permissoes por secao administrativa usando um campo `adminSectionAccess`.

Secoes administrativas:

- `cadastros`
- `membros`
- `presencas`
- `congregacoes`
- `usuarios`
- `site`

Admin ve tudo. Usuario com permissoes parciais ve apenas as secoes liberadas.

## Fluxo de login e cadastro

No canto superior direito:

- Se nao houver login, mostrar `Cadastre-se` e `Entre`.
- Se houver login e o usuario for admin ou tiver secao administrativa liberada, mostrar `Painel Administrativo`.
- Usuario comum logado deve ver nome/e-mail e botao `Sair`.

### `/cadastro`

Sem login:

1. Mostrar formulario `Novo acesso`.
2. Campos:
   - Nome completo.
   - E-mail.
   - Senha.
   - Confirmar senha.
3. Criar conta no Firebase Authentication.
4. Criar documento em `users/{uid}` com `role: pendente`.

Depois de logado:

1. Mostrar formulario para escolher tipo:
   - Visitante.
   - Convidado.
   - Membro.
2. Visitante/convidado concluem sem aprovacao.
3. Membro envia para aprovacao administrativa.

### `/login`

Campos:

- E-mail.
- Senha.
- Checkbox: "Salvar acesso para os proximos logins".
- Botao entrar.
- Link/botao para recuperar senha.

Depois do login, redirecionar:

- admin -> `/admin`
- diretoria -> `/diretoria`
- visitante -> `/visitante`
- congregado -> `/congregado`
- membro -> `/membro`
- pendente sem tipo -> `/cadastro`
- pendente com `tipoPessoa: membro` -> mostrar cadastro em analise.

## Cadastro de visitante

Visitante e a pessoa que chegou por conta propria.

Campos:

- Nome completo.
- E-mail do acesso, somente leitura.
- Data de nascimento.
- Sexo: masculino ou feminino.
- Congregacao que esta visitando.
- Telefone.
- Observacoes.
- Consentimento LGPD.

Ao enviar:

- Atualizar `users/{uid}`.
- Definir `role: visitante`.
- Definir `tipoPessoa: visitante`.
- Nao enviar para aprovacao.

## Cadastro de convidado

Convidado e a pessoa que foi convidada por alguem.

Campos:

- Nome completo.
- Convidado por.
- E-mail do acesso, somente leitura.
- Data de nascimento.
- Sexo: masculino ou feminino.
- Congregacao que esta visitando.
- Telefone.
- Observacoes.
- Consentimento LGPD.

Ao enviar:

- Atualizar `users/{uid}`.
- Definir `role: visitante`.
- Definir `tipoPessoa: convidado`.
- Nao enviar para aprovacao.

## Cadastro de membro

Membro passa por aprovacao do administrador.

Campos:

- Nome completo.
- CPF com mascara e validacao.
- RG opcional.
- Data de nascimento.
- Sexo: masculino ou feminino.
- Congregacao que frequenta.
- Telefone.
- Marcar se tem WhatsApp.
- E-mail do acesso, somente leitura.
- Endereco completo:
  - CEP.
  - Tipo de logradouro.
  - Nome do logradouro.
  - Numero.
  - Complemento.
  - Bairro.
  - Cidade.
  - Estado.
- Data de batismo opcional.
- Data de aceitacao opcional.
- Documentos:
  - Foto.
  - Foto verso.
  - Carta de mudanca.
  - Carta de recomendacao.
- Observacoes.
- Consentimento LGPD.

Regras:

- CPF deve ser valido.
- RG nao obrigatorio.
- Sexo obrigatorio.
- Data de batismo aparece para membro, mas nao para congregado.
- Se data de batismo for informada antes de 12 anos de idade, bloquear e mostrar aviso.
- Cargo/funcoes ministeriais nao devem ser escolhidos pelo usuario comum.
- Ao enviar, gravar em `membershipRequests`.
- Atualizar `users/{uid}` com `tipoPessoa: membro`, mantendo `role: pendente`.
- O login continua funcionando, mas o painel de membro fica bloqueado ate aprovacao.

## E-mail e CPF

E-mail:

- E a chave inicial do acesso.
- Normalizar sempre para minusculas.
- Salvar tambem `emailLower`.
- Nao permitir dois cadastros com mesmo e-mail.
- Se repetir e-mail, mostrar mensagem: "Este e-mail ja esta cadastrado. Recupere seu acesso ou use outro e-mail."
- E-mail nao pode ser alterado diretamente no cadastro.

Troca de e-mail:

- Criar ferramenta separada `Trocar e-mail de acesso`.
- Usar `verifyBeforeUpdateEmail` do Firebase.
- Enviar link de confirmacao para o novo e-mail.
- Depois de confirmado e o usuario entrar novamente, sincronizar `users/{uid}.email` e `emailLower`.

CPF:

- E a chave principal do membro oficial.
- Salvar tambem `cpfDigits`.
- Em `members`, usar CPF numerico como ID do documento quando disponivel.
- No painel admin, se CPF ja existir, orientar editar cadastro existente.

## Congregado

Congregado nao e escolhido diretamente pelo usuario no cadastro publico.

Fluxo:

1. Visitante ou convidado aceita Jesus.
2. Administrador promove para congregado.
3. Congregado entra em `/congregado`.
4. Preenche dados completos, sem batismo e sem cargo.
5. Quando for batizado, administrador informa data de batismo e promove para membro.

Congregado nao pode ter cargo ministerial.

## Cargos ministeriais

Cargos so podem ser associados a membros.

Lista de cargos:

- Pastor.
- Presbitero.
- Diacono.
- Diaconisa.
- Missionario.
- Missionaria.
- Evangelista.
- Cooperador.
- Obreiro.
- Secretario.
- Tesoureiro.
- Dirigente de congregacao.
- Professor de EBD.
- Lider de jovens.
- Lider de mulheres.
- Lider de louvor.
- Outra funcao.

Regras:

- Todo cargo pertence a um membro.
- Pode existir membro sem cargo.
- Nao pode existir cargo em visitante, convidado ou congregado.
- Apenas administrador altera cargo.

## Painel do visitante

Rota `/visitante`.

Criar item generico chamado `Registro de presenca`.

Campos:

- Tipo: visitante ou convidado.
- Culto/atividade.
- Congregacao.
- Convidado por, se for convidado.

Regras:

- Dias comuns: uma presenca por dia.
- Domingo: permitir duas presencas:
  - EBD.
  - Culto a noite.
- Permitir editar a presenca do dia/slot.
- Gravar em `visitRecords`.

## Painel do membro

Rota `/membro`.

Mostrar:

- Avisos.
- Agenda.
- Cadastro.
- Fundadores.

Criar editor `Meu cadastro`.

O usuario pode alterar dados cadastrais, exceto e-mail de acesso.

Campos:

- Nome.
- CPF.
- RG.
- Data de nascimento.
- Sexo.
- Congregacao.
- Telefone.
- Endereco.
- Data de batismo.
- Data de aceitacao.
- Documentos.
- Observacoes.

## Painel da diretoria

Rota `/diretoria`.

Mostrar acompanhamento de visitantes/convidados.

Incluir:

- Total de visitantes.
- Total de convidados.
- Filtros por data.
- Filtros por congregacao.
- Filtros por categoria da congregacao.
- Tabela nominal com nome, tipo, data, horario e congregacao.
- Mapa pequeno quando houver geolocalizacao.

## Painel administrativo

Rota `/admin`.

Organizar por secoes, mostrando apenas a secao selecionada.

Secoes:

1. Cadastro.
2. Membros.
3. Presencas.
4. Congregacoes.
5. Usuarios.
6. Auditoria.
7. Site publico.

### Cadastro

Funcionalidades:

- Aprovar solicitacoes de membro.
- Rejeitar solicitacoes.
- Cadastro nominal de membro ou congregado sem criar login.

Visitantes e convidados nao devem ficar nessa aba.

### Membros

Criar tabela numerada.

Colunas:

- Numero.
- Nome.
- Congregacao.
- Telefone.
- Batismo.
- Status.
- Acao.

Controles:

- Status alteravel entre ativo e inativo.
- `Excluir cadastro`, que deve inativar sem apagar definitivamente.
- `Alterar cadastro`.

Ao clicar:

- Abrir editor completo.
- Permitir alterar dados do membro.
- Nao permitir editar e-mail diretamente.
- Se houver `userId`, tentar sincronizar o perfil do usuario.
- Registrar auditoria de alteracao de status, exclusao/inativacao e alteracao de dados cadastrais.

### Presencas

Funcionalidades:

- Registrar presenca sem login.
- Ver dashboard de visitantes e convidados.

### Congregacoes

Funcionalidades:

- Criar.
- Editar.
- Suprimir.

Campos:

- Nome.
- Classificacao:
  - Capital.
  - Interior.
  - Zona Rural.
- Tipo interno:
  - Congregacao.
  - Sede.
- Endereco.
- Responsavel.
- Telefone.
- Latitude.
- Longitude.

Permitir:

- Usar localizacao atual.
- Indicar no mapa.
- Digitar latitude e longitude.

### Usuarios

Funcionalidades:

- Listar usuarios.
- Alterar role.
- Criar administrador.
- Liberar secoes administrativas especificas.

### Site publico

Permitir editar menus e paginas publicas.

Campos:

- Nome do menu.
- Caminho.
- Icone.
- Ordem.
- Visibilidade.
- Tamanho da fonte do menu.
- Negrito.
- Titulo da pagina.
- Conteudo da pagina.
- Tamanho do titulo.
- Negrito do titulo.

### Auditoria

Criar secao propria `Auditoria`.

Ela deve mostrar:

- Quem alterou.
- E-mail de quem alterou.
- Data e horario.
- Acao executada.
- Tipo da entidade.
- ID da entidade.
- Nome da entidade.
- Resumo da alteracao.
- Campos alterados.
- Detalhe de antes e depois.

Criar colecao `auditLogs`.

Ao menos as seguintes acoes devem registrar auditoria:

- Alteracao de status de membro.
- Exclusao/inativacao de cadastro de membro.
- Edicao de cadastro de membro.

## Firestore

Criar colecoes:

### `users`

Campos:

- uid.
- email.
- emailLower.
- nomeCompleto.
- role.
- tipoPessoa.
- adminSectionAccess.
- telefone.
- dataNascimento.
- sexo.
- cpf.
- cpfDigits.
- rg.
- endereco.
- dataBatismo.
- dataAceitacao.
- possuiCargo.
- cargo.
- outroCargo.
- updatedAt.

### `membershipRequests`

Campos:

- Todos os dados do cadastro.
- userId, quando houver login.
- status: pendente, aprovado, rejeitado.
- createdAt.
- decididoEm.
- decididoPor.

### `members`

Cadastro oficial de membros.

Usar CPF numerico como ID quando possivel.

### `congregations`

Cadastro de congregacoes.

### `visitRecords`

Registros de presenca.

### `siteSettings`

Configuracoes de menus e paginas publicas.

### `auditLogs`

Registros de auditoria.

Campos:

- actorUid.
- actorName.
- actorEmail.
- action.
- entityType.
- entityId.
- entityName.
- summary.
- changedFields.
- before.
- after.
- createdAt.

## Regras de seguranca

Implemente regras Firestore para:

- Leitura publica de dados publicos.
- Escrita de site publico apenas por admin/secao site.
- Congregacoes editadas apenas por admin/secao congregacoes.
- Membro criar propria solicitacao autenticado.
- Diretoria/admin ler solicitacoes.
- Admin/secao cadastros aprovar/rejeitar.
- Usuario ler e atualizar o proprio perfil, sem alterar campos protegidos.
- Apenas admin alterar role, cargo e permissoes.
- Membros oficiais lidos/editados por secao membros.
- Presencas lidas por dono, diretoria ou secao presencas.
- Auditoria lida por secao auditoria.
- Logs de auditoria criados por usuario autenticado, vinculando `actorUid` ao proprio `request.auth.uid`.

## Entregaveis esperados

Ao implementar:

1. Criar projeto React/Vite.
2. Criar estrutura de rotas.
3. Implementar layout publico.
4. Implementar Firebase.
5. Criar AuthContext.
6. Criar ProtectedRoute.
7. Criar formularios.
8. Criar servicos Firestore.
9. Criar painel administrativo por secoes.
10. Criar regras Firestore.
11. Rodar build e lint.
12. Documentar como rodar o projeto.

Sempre que terminar uma etapa, explique em linguagem simples o que foi feito e qual o proximo passo.
