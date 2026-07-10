# Documentacao do Sistema IEADTRR

## 1. Objetivo do sistema

Este sistema foi criado para organizar informacoes publicas e internas da Igreja Evangelica Assembleia de Deus Tradicional de Roraima, identificada no site como IEADTRR.

Ele atende tres frentes principais:

- Publico geral: visitantes do site sem login.
- Pessoas cadastradas: visitante, convidado, congregado e membro.
- Administracao: diretorias, administradores e pessoas com acesso liberado a secoes especificas.

O sistema ainda esta em evolucao. Hoje ele ja possui autenticacao, cadastro, painel administrativo, cadastro de congregacoes, registro de presencas, membros, aprovacao de cadastro de membro e configuracoes publicas do site.

## 2. Tecnologias usadas

- React: construcao das telas.
- Vite: servidor local e build do projeto.
- TypeScript: programacao com tipos para reduzir erros.
- Tailwind/Vite CSS e CSS proprio: visual do sistema.
- React Router: navegacao entre paginas.
- Firebase Authentication: login por e-mail e senha.
- Firebase Firestore: banco de dados.
- OpenStreetMap/Leaflet: mapas e localizacao de congregacoes.

## 3. Estrutura principal de acesso

O sistema trabalha com os seguintes perfis:

- `pendente`: usuario criou login, mas ainda nao completou ou ainda aguarda aprovacao.
- `visitante`: visitante ou convidado que ja concluiu cadastro simples.
- `congregado`: pessoa que aceitou Jesus, mas ainda nao foi batizada nas aguas.
- `membro`: pessoa aprovada como membro da igreja.
- `diretoria`: acesso restrito para acompanhamento e funcoes internas.
- `admin`: administrador geral do sistema.

Tambem existe permissao por secao administrativa. Um usuario pode nao ser administrador geral, mas receber acesso apenas a uma area, como membros, presencas, congregacoes ou site publico.

## 4. Paginas publicas

### `/`

Pagina inicial do site.

Mostra:

- Nome e identidade da igreja.
- Banner principal com noticias e avisos.
- Cultos da semana.
- Informacoes publicas.
- Pix para ofertas.
- Enderecos principais.
- Links de cadastro e login.

### `/congregacoes`

Lista as congregacoes/sedes cadastradas.

Mostra:

- Nome da congregacao.
- Classificacao.
- Endereco.
- Responsavel.
- Telefone.
- Mapa pequeno quando houver geolocalizacao.

### `/agenda`

Agenda publica com cultos e atividades.

### `/doutrina`

Pagina publica com principios doutrinarios da igreja.

### `/diretoria-publica`

Pagina publica com a relacao da lideranca.

### `/cadastro`

Fluxo de cadastro.

Sem login:

1. A pessoa informa nome completo, e-mail, senha e confirmacao.
2. O sistema cria uma conta no Firebase Authentication.
3. A conta nasce como `pendente`.

Depois de logado:

1. A pessoa escolhe se e visitante, convidado ou membro.
2. O formulario muda conforme o tipo escolhido.
3. Visitante/convidado conclui direto.
4. Membro envia cadastro para aprovacao do administrador.

### `/login`

Tela de entrada para quem ja tem cadastro.

Contem:

- E-mail.
- Senha.
- Opcao de salvar acesso para proximos logins.
- Recuperacao de senha.

Depois do login, o sistema direciona conforme o perfil.

## 5. Fluxo de cadastro

### 5.1 Visitante

Visitante e a pessoa que chegou por conta propria.

Campos principais:

- Nome completo.
- E-mail do acesso.
- Data de nascimento.
- Sexo: masculino ou feminino.
- Congregacao que esta visitando.
- Telefone.
- Observacoes.
- Consentimento LGPD.

Nao passa por aprovacao do administrador.

### 5.2 Convidado

Convidado e a pessoa que foi convidada por alguem.

Campos principais:

- Nome completo.
- Quem convidou.
- E-mail do acesso.
- Data de nascimento.
- Sexo: masculino ou feminino.
- Congregacao que esta visitando.
- Telefone.
- Observacoes.
- Consentimento LGPD.

Nao passa por aprovacao do administrador.

### 5.3 Congregado

Congregado e a pessoa que aceitou Jesus, mas ainda nao foi batizada nas aguas.

O usuario nao escolhe ser congregado diretamente no cadastro publico. Quem promove visitante/convidado para congregado e o administrador.

Depois disso, o congregado pode preencher dados mais completos.

Campos principais:

- Nome completo.
- CPF.
- RG opcional.
- Data de nascimento.
- Sexo.
- Telefone e WhatsApp.
- E-mail.
- Congregacao.
- Endereco completo.
- Data de aceitacao.
- Documentos.
- Consentimento LGPD.

Congregado nao possui cargo/funcoes ministeriais.

### 5.4 Membro

Membro e a pessoa que sera analisada e aprovada pela administracao.

Campos principais:

- Nome completo.
- CPF.
- RG opcional.
- Data de nascimento.
- Sexo.
- Congregacao.
- Telefone e WhatsApp.
- E-mail.
- Endereco completo.
- Data de batismo opcional.
- Data de aceitacao.
- Documentos.
- Consentimento LGPD.

O cadastro de membro passa por aprovacao.

Enquanto nao for aprovado:

- O login continua existindo.
- O usuario consegue entrar no sistema.
- As funcoes de membro ficam bloqueadas.
- A pagina mostra `Cadastro em analise`.

Quando aprovado:

- Cria/atualiza o registro oficial em `members`.
- O perfil do usuario passa para `membro`.

## 6. Regras importantes de cadastro

### E-mail

O e-mail e a chave inicial do acesso.

Regras:

- O mesmo e-mail nao pode ter dois acessos.
- O sistema normaliza e-mail para letras minusculas.
- Novos registros salvam tambem `emailLower`.
- Se o e-mail ja existir, o sistema orienta a recuperar acesso ou usar outro e-mail.
- O e-mail nao pode ser alterado diretamente no cadastro.

Para trocar e-mail:

1. O usuario acessa o painel.
2. Usa a ferramenta `Trocar e-mail de acesso`.
3. Informa o novo e-mail.
4. O Firebase envia link de confirmacao.
5. A troca so acontece depois da confirmacao.
6. Depois de entrar novamente, o sistema sincroniza o novo e-mail no perfil.

### CPF

O CPF e a chave principal do cadastro oficial de membro.

Regras:

- CPF e validado com digito verificador.
- O sistema salva `cpfDigits`, apenas numeros.
- O documento oficial em `members` usa o CPF numerico como identificador.
- No painel administrativo, antes de criar cadastro nominal, o sistema verifica se o CPF ja existe.
- Se existir, orienta o administrador a editar o cadastro existente.

### Sexo

O cadastro possui campo obrigatorio:

- Masculino.
- Feminino.

Esse campo aparece para visitante, convidado, congregado e membro.

## 7. Painel do visitante

Rota: `/visitante`

O visitante/convidado pode registrar presenca.

O item se chama `Registro de presenca`, pois serve para visitante e convidado.

Regras:

- Em dias comuns: uma presenca por dia.
- Aos domingos: duas possibilidades:
  - Escola Biblica Dominical.
  - Culto a noite.
- O usuario pode alterar o registro do dia/horario.

Dados gravados:

- Usuario.
- Nome.
- Tipo: visitante ou convidado.
- Congregacao.
- Data.
- Horario/atividade.
- Origem do registro.

## 8. Painel do membro

Rota: `/membro`

Mostra:

- Avisos.
- Agenda.
- Cadastro.
- Fundadores.

Tambem possui o editor `Meu cadastro`.

O membro pode alterar dados cadastrais, como:

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

O e-mail de acesso aparece bloqueado. Para alterar e-mail, usa a ferramenta de troca com confirmacao.

## 9. Painel do congregado

Rota: `/congregado`

O congregado preenche dados completos, sem campo de batismo e sem cargo.

Quando for batizado, o administrador promove para membro informando data de batismo.

## 10. Painel da diretoria

Rota: `/diretoria`

Contem acompanhamento de visitantes e convidados.

Mostra:

- Metricas de presencas.
- Visitantes.
- Convidados.
- Congregacao.
- Data.
- Horario.
- Classificacao da congregacao.
- Mapa pequeno quando houver localizacao.

## 11. Painel administrativo

Rota: `/admin`

O painel administrativo e dividido por secoes.

Secoes atuais:

- Cadastro.
- Membros.
- Presencas.
- Congregacoes.
- Usuarios.
- Auditoria.
- Site publico.

Admin ve tudo. Usuarios com permissao parcial veem somente as secoes liberadas.

### Cadastro

Serve para:

- Aprovar solicitacoes de membro.
- Fazer cadastro nominal de membro ou congregado sem criar login.

Visitantes e convidados nao ficam nessa aba de cadastro nominal.

### Membros

Mostra a relacao oficial de membros.

Hoje aparece como tabela numerada, com:

- Numero.
- Nome.
- Congregacao.
- Telefone.
- Data de batismo.
- Status.
- Botao `Excluir cadastro`.
- Botao `Alterar cadastro`.

Os botoes da tabela sao compactos. As larguras das colunas podem ser ajustadas manualmente no CSS pelas variaveis `--member-col-*` da classe `.member-table`.

O administrador pode abrir o cadastro completo e alterar os dados.

Quando o membro oficial tem `userId`, o sistema tenta sincronizar as alteracoes tambem no perfil de login.

O status do cadastro pode ser alterado diretamente entre `ativo` e `inativo`. A exclusao do cadastro de membro e feita como inativacao. O membro sai da lista de ativos, mas o historico permanece no banco com `status: inativo`, `deletedAt` e `deletedBy`. Se houver conta de acesso vinculada, o sistema tenta retirar o acesso de membro voltando o usuario para `pendente`.

Alteracoes de status, exclusoes/inativacoes e edicoes de cadastro geram registros em `auditLogs`.

A progressao espiritual fica em uma aba propria dentro da secao Membros. Ela mostra:

- Visitantes/convidados que podem ser tornados congregados.
- Quais dados precisarao ser completados apos a promocao.
- Congregados que podem ser promovidos a membros.
- Quais dados faltam para promover a membro.
- Membros que podem receber cargo ou funcao.
- Pendencias para atribuir cargo, como data de batismo ou descricao da funcao quando for "Outra funcao".
- Atalho `Editar cadastro` ou `Resolver pendencia` dentro do aviso de pendencia, abrindo o editor da pessoa na propria aba.

### Presencas

Permite:

- Registrar presenca de visitante/convidado sem login.
- Acompanhar dashboard de visitantes e convidados.

### Congregacoes

Permite:

- Criar congregacao.
- Editar congregacao.
- Suprimir congregacao.
- Informar classificacao:
  - Capital.
  - Interior.
  - Zona Rural.
- Informar endereco.
- Informar responsavel.
- Informar telefone.
- Usar localizacao atual.
- Indicar no mapa.
- Digitar latitude/longitude.

### Usuarios

Permite:

- Listar usuarios.
- Alterar perfil de acesso.
- Definir administrador.
- Liberar secoes administrativas especificas.

### Auditoria

Mostra quem alterou o sistema, quando alterou e o que foi alterado.

Cada registro informa:

- Usuario que alterou.
- E-mail do usuario.
- Data e horario.
- Acao executada.
- Entidade alterada.
- ID da entidade.
- Nome da entidade, quando existir.
- Resumo da alteracao.
- Campos alterados.
- Detalhe de antes e depois.

Hoje a auditoria registra principalmente manutencoes no cadastro oficial de membros:

- Alteracao de status ativo/inativo.
- Exclusao/inativacao.
- Edicao de dados cadastrais.

### Site publico

Permite editar menus publicos e conteudos de paginas.

O administrador pode configurar:

- Nome do menu.
- Caminho.
- Icone.
- Ordem.
- Visibilidade.
- Tamanho do texto.
- Negrito.
- Titulo da pagina.
- Conteudo da pagina.

## 12. Colecoes principais no Firestore

### `users`

Guarda perfis de acesso.

Exemplos de campos:

- `uid`
- `email`
- `emailLower`
- `nomeCompleto`
- `role`
- `tipoPessoa`
- `adminSectionAccess`
- `telefone`
- `dataNascimento`
- `sexo`
- `cpf`
- `endereco`

### `membershipRequests`

Guarda solicitacoes de cadastro de membro e cadastros nominais.

Exemplos de campos:

- Dados pessoais.
- CPF.
- E-mail.
- Sexo.
- Congregacao.
- Status: pendente, aprovado ou rejeitado.
- `userId`, quando veio de usuario logado.

### `members`

Cadastro oficial de membros.

Documento usa CPF numerico como ID quando disponivel.

### `congregations`

Cadastro de congregacoes.

### `visitRecords`

Registro de presencas de visitantes e convidados.

### `siteSettings`

Configuracoes de menus, paginas e conteudos publicos.

### `auditLogs`

Registros de auditoria das principais alteracoes administrativas.

Campos principais:

- `actorUid`
- `actorName`
- `actorEmail`
- `action`
- `entityType`
- `entityId`
- `entityName`
- `summary`
- `changedFields`
- `before`
- `after`
- `createdAt`

## 13. O que ainda falta evoluir

- Upload real de fotos e documentos no Firebase Storage.
- E-mail automatico de status de aprovacao.
- Melhorar paineis de membro e diretoria com mais dados reais.
- Criar relatorios exportaveis.
- Melhorar historico/auditoria das alteracoes.
- Criar tela especifica para solicitacoes de troca de e-mail, se a administracao quiser acompanhar manualmente.
