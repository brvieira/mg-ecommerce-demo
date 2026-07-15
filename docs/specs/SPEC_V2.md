# SPEC.md — MongoDB Atlas E-commerce Catalog Demo (v2)

> Este documento estende a v1 (busca textual/vetorial/híbrida). Seções não mencionadas aqui permanecem como na v1. Itens marcados **[SUPOSIÇÃO]** são decisões que tomei para fechar a spec — ajuste como preferir. Itens marcados **[DECIDIDO]** eram `[SUPOSIÇÃO]` revisadas e confirmadas explicitamente em 2026-07-14 (ver `docs/DIVERGENCES.md` para o detalhamento de cada uma).
>
> **Mudança de comportamento em relação à v1**: a barra de busca principal deixa de ter seletor de modo (Texto/Vetorial/Híbrido) e passa a usar **apenas Atlas Search**. Vector Search deixa de ser acionado pela busca e passa a ser usado exclusivamente na seção "Produtos semelhantes" (item 2.3).
>
> **Fora do escopo desta v2**: Atlas Triggers + Auto-Taxonomy Classifier (classificação automática de produtos via LLM disparada por trigger). Fica planejado para uma v3.

---

## 1. Objetivo da v2

Além de demonstrar Atlas Search (busca) e Vector Search (recomendação), a v2 passa a demonstrar:

- **Atlas Search dedicado à busca textual** — a barra de busca principal usa exclusivamente Atlas Search, sem alternância de modo.
- **Vector Search aplicado a recomendação** — não mais um modo de busca alternativo, e sim o motor da seção "produtos semelhantes" na página de detalhes.
- **Flexibilidade de schema** na prática — criação e edição de produtos com atributos variáveis, sem migração.
- **Transparência do dado** — painel de debug que expõe o JSON bruto retornado pelo MongoDB em qualquer tela.
- **Escrita, não só leitura** — simulação de compra gerando documentos reais na collection `orders`.

A aplicação continua sem autenticação real. **[SUPOSIÇÃO]** "Comprar" é uma simulação de um clique (sem carrinho, sem formulário de pagamento) — só grava o pedido.

---

## 2. Novas Funcionalidades

### 2.0 Busca principal — apenas Atlas Search **[ALTERADO]**

- O seletor de modo de busca (Texto / Vetorial / Híbrido) do header é **removido**.
- `GET /search` deixa de aceitar o parâmetro `mode` — passa a rodar sempre um pipeline de **Atlas Search** (`$search`) contra `name`, `description`, `brand.name`, `categories.name`, como já definido na v1.
- O badge nos cards indicando origem do resultado (Texto/Vetorial/Ambos) é **removido** da listagem principal — não faz mais sentido, já que só existe um mecanismo de busca ali. Esse conceito de "origem do resultado" fica restrito à seção de produtos semelhantes, se você quiser reaproveitar o badge lá (ver 2.3).
- O antigo "Painel de Diagnóstico" (scores textual/vetorial/híbrido da v1) deixa de fazer sentido como estava e é absorvido pelo novo Painel de Debug (2.4), que mostra o JSON bruto — incluindo o score do Atlas Search, quando presente.
- **[DECIDIDO]** A implementação de busca híbrida/RRF (`searchService.hybridSearch`, `RRF_K`, `origin: 'text'|'vector'|'both'`) é **removida do backend**, não apenas desativada — nenhuma rota volta a expor `mode=vector`/`mode=hybrid`. A seção "produtos semelhantes" (2.3) usa um caminho de Vector Search novo e mais simples (embedding do próprio produto, sem RRF, sem o padrão de over-fetch + paginação em memória usado pelo antigo `mode=vector`).

### 2.1 Adicionar novo produto

- Formulário no frontend para criar um produto do zero.
- Campos mínimos obrigatórios: `name`, `description`, `brand`, `categories`, pelo menos 1 SKU (`sku`, `color`, `price`, `inventory`).
- **[DECIDIDO]** `brand` e `categories` são selecionados a partir dos valores já existentes no catálogo (autocomplete alimentado por `GET /filters`), não texto livre — evita duplicidade (ex.: `"Apple"` vs `"apple"`) e mantém facets e índices consistentes. Criar uma marca/categoria nova fica fora do escopo da v2.
- **[DECIDIDO]** Embedding do novo produto é gerado automaticamente no backend a partir de `name + description`, no momento da criação, reaproveitando o `embeddingService` já usado por seed/consulta (**OpenAI**, não Voyage AI — divergência já registrada na v1 e agora estendida ao fluxo de escrita, ver `docs/DIVERGENCES.md`). Se a chamada ao provedor falhar, a criação é **bloqueada** (erro devolvido ao frontend, nada é salvo).
- **[DECIDIDO]** Imagens: um único campo de URL (texto), reaproveitado tanto no produto quanto em todos os seus SKUs — mesmo padrão já usado pelos dados de seed. Sem upload de arquivo.

### 2.2 Editar produto existente / adicionar atributos livres

- Tela/modal de edição a partir da página de detalhes.
- Permite editar campos existentes (nome, descrição, preço, estoque, etc).
- **[DECIDIDO]** Edição de SKUs: permite editar `price`/`inventory` (e demais campos) dos SKUs já existentes e **adicionar novos SKUs** ao produto. Exclusão de SKU fica fora do escopo da v2.
- Permite **adicionar atributos arbitrários** (chave/valor) ao documento do produto — este é o ponto central da demo de flexibilidade de schema. Ex: adicionar `"voltagem": "110V"` a um produto que nunca teve esse campo.
- **[SUPOSIÇÃO]** Esses atributos livres ficam num campo `attributes: { [key]: value }` no documento, para não colidir com os campos estruturados (`brand`, `categories`, `skus`).
- Se `name` ou `description` forem editados, o embedding é **regenerado** (mesmo provedor e mesma regra de falha bloqueante da seção 2.1).

### 2.3 Produtos semelhantes (página de detalhes)

- Nova seção na página de detalhes: "Produtos semelhantes".
- **Único ponto da aplicação que usa Atlas Vector Search** (ver 2.0) — consulta via Vector Search usando o embedding do produto atual, excluindo ele mesmo (`$ne` no `_id`).
- **[SUPOSIÇÃO]** Exibir 4-6 produtos, mesmo card usado na listagem principal.
- **[SUPOSIÇÃO]** Sem filtro de categoria — a graça é mostrar que a similaridade é semântica, pode cruzar categorias (ex: um carregador aparecer como "semelhante" a um smartphone).

### 2.4 Painel de Debug (JSON bruto)

- Substitui/generaliza o "Painel de Diagnóstico" da v1 (que mostrava apenas scores de busca).
- Ícone/botão fixo (ex: canto inferior direito) que abre um painel lateral ou modal.
- Conteúdo do painel é **contextual à tela atual**:
  - Na home/listagem: JSON do array de resultados retornado por `/search` ou `/products` (incluindo scores, se houver).
  - Na página de detalhes: JSON completo do documento do produto, incluindo o campo `embedding` (**[SUPOSIÇÃO]** truncado/colapsado por ser grande, com opção de expandir).
  - Após uma compra: JSON do documento inserido em `orders`.
- **[SUPOSIÇÃO]** JSON exibido com syntax highlighting e indentação (ex: biblioteca `react-json-view` ou similar).

### 2.5 Filtros dinâmicos

- V1 tinha filtros fixos (categoria, marca, faixa de preço, cor). Na v2, as **opções de cada filtro são calculadas a partir dos produtos atualmente carregados/retornados**, não de uma lista estática.
- Endpoint `GET /filters` passa a aceitar os mesmos parâmetros de busca/filtro já aplicados (`q`, filtros já selecionados — sem `mode`, ver seção 4) e retornar as opções **restantes coerentes com o resultado atual** (facets).
- **[DECIDIDO]** Semântica de faceta multi-seleção clássica de e-commerce: a contagem de cada dimensão de filtro **ignora o próprio filtro ativo daquela dimensão**, mas respeita os filtros das demais dimensões. Ex.: com `categories=Smartphones` selecionado, a faceta de "Marca" já respeita esse filtro de categoria, mas a faceta de "Categoria" o ignora e mostra a contagem de todas as categorias dentro do restante dos filtros ativos — permite trocar de categoria sem perder os demais filtros.
- Implementado via `$facet` no aggregation pipeline do MongoDB (um sub-pipeline por dimensão, cada um aplicando os filtros de todas as *outras* dimensões), retornando contagem por opção (ex: "Smartphones (12)").

### 2.6 Simular compra

- Botão "Comprar" nos cards de produto e/ou na página de detalhes (por SKU).
- Ao clicar: cria um documento na collection **`orders`**, sem checkout, sem pagamento.
- **[SUPOSIÇÃO]** Estrutura do documento de pedido:

```json
{
  "_id": "...",
  "productId": "...",
  "sku": "IPH16-BLK-128",
  "productName": "Apple iPhone 16",
  "price": 6999,
  "quantity": 1,
  "createdAt": "2026-07-14T12:00:00Z",
  "status": "simulated"
}
```

- **Decrementa o estoque real**: ao confirmar a compra, o backend decrementa `inventory` do SKU correspondente no documento do produto (operação atômica, ex: `$inc` com filtro garantindo `inventory > 0` — ver regra de estoque zero abaixo).
- **Regra de estoque zero**: não é permitido comprar um SKU com `inventory = 0`.
  - Frontend: botão "Comprar" desabilitado (ou trocado por "Esgotado") quando `inventory = 0`.
  - Backend: mesmo com o frontend bloqueando, a API de `POST /orders` deve **revalidar o estoque no momento da escrita** (checagem no servidor, não só na UI) e rejeitar a criação do pedido se `inventory <= 0` ou insuficiente para a quantidade pedida — evita condição de corrida e reforça a demo de integridade de dado.
  - Resposta de erro nesse caso: HTTP 409 (conflito), com mensagem clara para o frontend exibir (ex: "Produto sem estoque disponível").
- Feedback visual simples (toast/confirmação) após a compra, e opcionalmente abrir o painel de debug já mostrando o pedido criado.

---

## 3. Modelo de Dados (mudanças)

### Collection `products` (evolução)

Adiciona campo livre:

```json
{
  "...": "campos da v1 inalterados",
  "attributes": {
    "voltagem": "110V",
    "material": "alumínio"
  }
}
```

### Nova collection `orders`

```json
{
  "_id": "...",
  "productId": "...",
  "sku": "...",
  "productName": "...",
  "price": 0,
  "quantity": 1,
  "createdAt": "ISODate",
  "status": "simulated"
}
```

---

## 4. APIs (novas/alteradas)

```
GET /search
```

**[ALTERADO]** Parâmetro `mode` removido. Sempre executa Atlas Search (`$search`). Vector Search deixa de ser acessível por este endpoint.

```
POST /products
```

Cria produto. Gera embedding no backend.

```
PUT /products/:id
```

Atualiza produto (campos estruturados + `attributes` livres). Regenera embedding se `name`/`description` mudarem.

```
GET /products/:id/similar
```

Retorna produtos semelhantes via Vector Search a partir do embedding do produto `:id`.

```
GET /filters
```

**[ALTERADO]** Agora aceita os mesmos query params de `/search` (sem `mode`, já que só existe Atlas Search) e retorna facets calculados dinamicamente (via `$facet`), não uma lista fixa.

```
POST /orders
```

Cria um pedido simulado **e decrementa o estoque do SKU** (`$inc: { "skus.$.inventory": -quantity }`, com filtro `skus.sku: sku, skus.inventory: { $gte: quantity }` para garantir atomicidade).

Se o estoque for insuficiente/zero no momento da escrita, retorna `409 Conflict` e **não cria** o documento em `orders`.

**Painel de Debug — sem endpoint dedicado.** O frontend reaproveita a resposta bruta das chamadas já feitas (`/products/:id`, `/search`, `/orders`, etc) e a exibe diretamente no painel — sem round-trip extra. É literalmente o que veio do banco na chamada que a tela já fez.

---

## 5. Interface (mudanças)

- **Header/barra de busca**: seletor de modo de busca (Texto/Vetorial/Híbrido) **removido** — busca única via Atlas Search.
- **Badge de origem do resultado**: removido dos cards da listagem principal.
- **Botão/ícone de Debug**: presente em todas as páginas, estado global de "aberto/fechado" com o conteúdo trocando conforme a tela.
- **Botão "Adicionar Produto"**: no header ou na listagem principal.
- **Botão "Editar"**: na página de detalhes, abre modal/tela com formulário + seção de atributos livres (par chave/valor, com botão "+ adicionar atributo").
- **Seção "Produtos semelhantes"**: abaixo dos detalhes do produto, via Vector Search.
- **Filtros da sidebar**: passam a exibir contagem dinâmica e se atualizam a cada busca.
- **Botão "Comprar"**: nos cards e na página de detalhes.

---

## 6. Fora do escopo (v2, reforçando a v1)

- Autenticação/login de usuário
- Carrinho persistente multi-item
- Checkout/pagamento real
- Upload de arquivo de imagem (só URL)
- Edição/exclusão de pedidos

---

## 7. Critérios de aceite (adicionais à v1)

A aplicação deverá:

- permitir criar um produto novo, que passa a aparecer na busca (Atlas Search) e como candidato em "produtos semelhantes" (Vector Search)
- restringir a barra de busca principal exclusivamente a Atlas Search, sem alternância de modo
- permitir editar um produto e adicionar atributos que não existiam no schema original, sem quebrar outros documentos
- exibir produtos semelhantes via Vector Search na página de detalhes
- exibir um painel de debug com o JSON bruto correspondente ao contexto da tela atual
- calcular as opções de filtro dinamicamente com base no conjunto de produtos atualmente exibido
- permitir simular uma compra, criando um documento correspondente na collection `orders` e decrementando o estoque real do SKU
- nunca permitir a compra de um SKU com `inventory = 0` (bloqueio na UI e revalidação no backend)
