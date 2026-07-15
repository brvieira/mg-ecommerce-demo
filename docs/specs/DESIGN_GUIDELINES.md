# Especificação de implementação: MyRetailOnline.com

## Visão geral

Especificação completa para implementar, em uma aplicação real, um e-commerce. Cobre: catálogo com filtros e busca, página de detalhes do produto com produtos semelhantes, criação e edição de produto, e um painel de debug recolhível exibindo o JSON bruto carregado em cada tela.

## Sobre este documento

Este documento especifica, com fidelidade total (cores, tipografia, espaçamento, layout, estados e comportamento), o layout a ser implementado. O arquivo HTML incluído (`Ecommerce Prototipo.dc.html`) é a referência visual/funcional de como cada tela deve se comportar — implemente-o como aplicação real no ambiente do projeto de destino (React, Vue, mobile nativo etc., usando os padrões e bibliotecas já estabelecidos ali, ou o framework mais adequado caso não exista um ainda), e não apenas embuti-lo ou linkar o arquivo HTML diretamente.

## Telas / Views

### 1. Catálogo (tela inicial)

- **Propósito**: navegar e filtrar os produtos do catálogo.
- **Layout**: grid de 2 colunas (`240px` sidebar de filtros + `1fr` conteúdo), `max-width: 1360px` centralizado, `gap: 36px`, padding `36px 32px 80px`.
  - Sidebar: coluna flex, `gap: 28px`, com blocos de filtro empilhados.
  - Grid de produtos: `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))`, `gap: 22px`.
- **Componentes**:
  - **Header fixo (sticky top)**: logo "ARBOR STUDIO" (serifado, 22px, peso 600, letter-spacing 0.04em) + barra de busca central (input pill, ícone de lupa) + nav com link "Catálogo" e botão primário "+ Novo Produto". Fundo `oklch(99% 0.005 85 / 0.92)` com `backdrop-filter: blur(10px)`, borda inferior `1px solid oklch(90% 0.01 85)`.
  - **Filtro Categoria**: chips (pills) multi-seleção, um por categoria. Ativo: borda/texto no accent, fundo `oklch(58% 0.11 55 / 0.12)`. Inativo: borda neutra `oklch(87% 0.01 85)`.
  - **Filtro Faixa de preço**: dois inputs numéricos (mín/máx) lado a lado.
  - **Filtro Disponibilidade**: toggle switch (pill 38x22px) "Somente em estoque".
  - **Card de produto**: imagem quadrada (placeholder listrado diagonal), rótulo mono com SKU, categoria+marca (uppercase, 11px), nome (serifado 17px/600), preço (15px/600) e etiqueta de estoque (12px, verde-neutro se disponível / vermelho se indisponível). Fundo branco, borda `1px solid oklch(91% 0.01 85)`, `border-radius: 14px`. Clique abre a página de detalhes.
  - **Estado vazio**: texto centralizado "Nenhum produto encontrado com os filtros atuais."

### 2. Detalhes do produto

- **Propósito**: ver informações completas do produto e navegar para produtos semelhantes.
- **Layout**: `max-width: 1200px`, breadcrumb "Catálogo / {categoria}", grid 2 colunas (`1fr 1fr`, `gap: 52px`) para imagem + info. Seção "Produtos semelhantes" abaixo, grid `repeat(auto-fill, minmax(230px,1fr))`.
- **Componentes**:
  - Imagem grande (placeholder listrado, `border-radius: 16px`).
  - Categoria+marca (uppercase 12px), título (serifado 34px/600), preço (26px/600).
  - Descrição (15px, `line-height: 1.7`).
  - Linha de metadados (SKU, status de estoque) com bordas superior/inferior.
  - Botões: "Editar produto" (primário, preto) e "Voltar ao catálogo" (outline).
  - Cards de produtos semelhantes: mesma estrutura do card de catálogo, em versão compacta.
  - **Critério de similaridade**: mesma categoria do produto atual e preço dentro de ±40%; se houver menos de 3 resultados, completa com os produtos de preço mais próximo (até 4 itens).

### 3. Cadastro / Edição de produto (mesmo formulário, título e rótulo do botão mudam)

- **Propósito**: criar um novo produto ou editar um existente.
- **Layout**: `max-width: 760px`, breadcrumb + título (serifado 28px/600), cartão de formulário (`border-radius: 16px`, padding 32px, fundo branco, borda neutra).
- **Campos**: Nome (texto), Categoria (select), Marca (texto), Preço R$ (número), Estoque (número), SKU (texto — auto-gerado no cadastro, formato `PRD-XXX`), Descrição (textarea, 4 linhas).
- **Validação** (ao submeter): Nome obrigatório; Marca obrigatória; Preço deve ser número > 0; Estoque deve ser número ≥ 0. Erros aparecem como texto vermelho (`oklch(55% 0.15 25)`) abaixo do campo, e a borda do campo fica vermelha.
- **Ações**: "Cadastrar produto" / "Salvar alterações" (botão primário preto) e "Cancelar" (outline, volta ao catálogo sem salvar).
- **Confirmação**: ao salvar com sucesso, exibe um banner verde no topo da página ("Produto cadastrado/atualizado com sucesso.") que some sozinho após ~3,5s.

### 4. Painel de debug (global, fixo em todas as telas)

- **Propósito**: exibir o JSON bruto dos dados carregados na tela atual, para fins de demonstração/depuração.
- **Posição**: fixo no canto inferior direito (`bottom: 20px; right: 20px`), acima de todo o conteúdo (`z-index: 50`).
- **Estado fechado**: botão pill escuro "</> debug".
- **Estado aberto**: painel `420px` de largura, até `55vh` de altura, fundo quase-preto (`oklch(16% 0.01 85)`), cabeçalho com rótulo do arquivo (`catalog.json` / `product-detail.json` / `edit-form.json` / `create-form.json`) e botão de fechar; corpo com `<pre>` monoespaçado, texto verde (`oklch(88% 0.03 145)`), scroll interno.
- **Conteúdo por tela**:
  - Catálogo: filtros ativos + total de produtos + lista filtrada.
  - Detalhes: objeto completo do produto selecionado.
  - Cadastro/Edição: estado do formulário + erros de validação + id em edição (se houver).

## Interações & comportamento

- Navegação é uma SPA simulada (troca de "página" sem reload), com um breadcrumb "Catálogo" clicável para voltar.
- Clique no card de produto → tela de Detalhes.
- Clique em "Editar produto" (na tela de Detalhes) → formulário pré-preenchido com os dados do produto.
- Clique em "+ Novo Produto" (header) → formulário em branco.
- Busca (header) filtra por nome, categoria e marca (case-insensitive, em tempo real).
- Toggle de categoria: seleção múltipla; nenhuma categoria selecionada = mostra todas.
- Toggle "Somente em estoque": esconde produtos com estoque 0.
- Não há estados de loading (dados estão todos em memória) nem paginação — a demonstração assume um catálogo pequeno (20 produtos).

## Gerenciamento de estado

Estado necessário (nível de aplicação):

- `page`: `'catalog' | 'detail' | 'edit' | 'create'`
- `selectedId`, `editingId`: id do produto em foco
- `search`, `selectedCategories[]`, `minPrice`, `maxPrice`, `inStockOnly`: filtros do catálogo
- `products[]`: array de produtos (fonte de dados única, em memória)
- `form`: objeto do formulário (name, category, brand, price, stock, description, sku)
- `formErrors`: objeto de erros de validação por campo
- `toast`: mensagem de confirmação temporária
- `debugOpen`: visibilidade do painel de debug

Modelo de produto:

```json
{
  "id": 1,
  "name": "Poltrona Konvex",
  "category": "Cadeiras",
  "brand": "Nordik",
  "price": 3480,
  "stock": 8,
  "sku": "CDR-001",
  "description": "Poltrona de linhas escultóricas em madeira maciça..."
}
```

Categorias fixas: `Cadeiras, Mesas, Iluminação, Estofados, Decoração, Têxteis`.

## Design Tokens

### Cores (OKLCH)

| Token                        | Valor                                                                                           | Uso                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| `bg` (fundo de página)       | `oklch(97% 0.012 85)`                                                                           | fundo geral                         |
| `surface` (cartões/inputs)   | `oklch(99% 0.005 85)`                                                                           | cards, inputs, header               |
| `surface-muted`              | `oklch(96% 0.005 85)`                                                                           | campo readonly (SKU)                |
| `border`                     | `oklch(91% 0.01 85)` / `oklch(88% 0.01 85)`                                                     | bordas de cards/inputs              |
| `border-neutral-chip`        | `oklch(87% 0.01 85)`                                                                            | borda de chip inativo               |
| `ink` (texto principal)      | `oklch(18% 0.01 85)`                                                                            | títulos, texto forte                |
| `ink-secondary`              | `oklch(30%–35% 0.01 85)`                                                                        | labels, texto secundário            |
| `muted` (texto apagado)      | `oklch(45%–55% 0.015 85)`                                                                       | metadados, categoria/marca          |
| `accent` (bronze)            | `oklch(58% 0.11 55)`                                                                            | ações/seleções em destaque          |
| `accent-bg`                  | `oklch(58% 0.11 55 / 0.12)`                                                                     | fundo de chip ativo                 |
| `accent-fg`                  | `oklch(40% 0.11 55)`                                                                            | texto de chip ativo                 |
| `success` (toast/estoque ok) | `oklch(94% 0.06 145)` fundo / `oklch(28% 0.08 145)` texto / `oklch(40% 0.09 145)` label estoque | confirmações                        |
| `danger` (erro/indisponível) | `oklch(55% 0.15 25)`                                                                            | erros de formulário, "Indisponível" |
| `debug-bg`                   | `oklch(16% 0.01 85)`                                                                            | painel de debug                     |
| `debug-text`                 | `oklch(88% 0.03 145)` (JSON) / `oklch(85% 0.01 85)` (label)                                     | conteúdo do painel                  |
| placeholder de imagem        | listras diagonais `oklch(93% 0.015 85)` / `oklch(95% 0.012 85)`, 135deg                         | imagens de produto                  |

### Tipografia

- **Display/serif**: "Playfair Display" (500/600/700) — logo, títulos de página (h1/h2), nome do produto nos cards e na página de detalhes.
- **Corpo/sans**: "Work Sans" (400/500/600) — todo o restante (labels, botões, inputs, texto corrido, metadados).
- Escala usada: 11px (rótulos mono de SKU) · 12–13px (labels, metadados, chips) · 14–15px (corpo, botões) · 17px (nome do produto no card) · 22–30px (títulos de seção/página) · 34px (título do produto na página de detalhes).

### Espaçamento & Raio

- Raio de cards/imagens: `14px`–`16px`. Raio de inputs/botões: `8px`. Raio de chips/pills/toggle: `999px` (pill total).
- Gaps principais: `36px` (colunas do catálogo), `22px` (grid de cards), `28px` (blocos de filtro), `16–20px` (campos de formulário).
- Sombra do painel de debug: `0 12px 40px rgba(0,0,0,0.35)`. Sombra do botão de debug: `0 6px 20px rgba(0,0,0,0.25)`.

### Botões

- **Primário**: fundo `oklch(18% 0.01 85)` (quase preto), texto `oklch(98% 0.005 85)`, `border-radius: 8px`, padding `13px 26px` (ou `11px 20px` no header).
- **Secundário/outline**: fundo transparente, texto `oklch(30% 0.01 85)`, borda `1px solid oklch(85% 0.01 85)`.

## Assets

Nenhum asset de imagem real foi usado — todas as imagens de produto são **placeholders** (listras diagonais CSS + rótulo do SKU em fonte monoespaçada, ex. `CDR-001.jpg`). No desenvolvimento final, substituir pelos assets reais de fotografia de produto, mantendo a mesma proporção quadrada (`aspect-ratio: 1`).

## Arquivos

- `Ecommerce Prototipo.dc.html` — referência visual e funcional completa do layout especificado, incluída neste pacote.
