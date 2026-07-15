# Divergências e decisões confirmadas

Este documento registra (1) decisões desta implementação que divergem do texto literal de `GENERAL.md`/`AGENTS.md` (v1), e (2) ambiguidades de `docs/specs/SPEC_V2.md` (v2) fechadas com decisões — ambas confirmadas explicitamente com o solicitante do projeto.

## Divergências em relação a GENERAL.md / AGENTS.md (v1)

## 1. Provedor de embeddings: OpenAI no lugar de Voyage AI

`GENERAL.md` (seções 2, 34-36) e `AGENTS.md` especificam Voyage AI como provedor de embeddings. Esta implementação usa **OpenAI `text-embedding-3-small`** (1536 dimensões) em seu lugar.

Impacto:
- `backend/config/openai.js` concentra a configuração do cliente (`OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`).
- O índice `product_vector_index` usa `numDimensions: 1536`.
- OpenAI não possui o conceito de `input_type: document|query` da Voyage; o mesmo modelo é usado tanto no seed (embedding de produto) quanto em tempo de consulta (embedding de query), sem distinção.
- Estendida na v2 (ver seção abaixo, item 7): o mesmo `embeddingService.js` também é reaproveitado no fluxo de escrita (criação/edição de produto via formulário), que a `SPEC_V2.md` supõe usar Voyage AI.

## 2. Busca Híbrida: implementada via Reciprocal Rank Fusion em memória

`GENERAL.md` e `AGENTS.md` pedem que a Busca Híbrida "combine os resultados em um único ranking" e calcule "scores apropriadamente". Esta implementação executa `textSearch` e `vectorSearch` em paralelo (top ~50 cada) e combina os resultados via Reciprocal Rank Fusion (RRF) calculado na camada de serviço (`searchService.hybridSearch`), em vez de depender do estágio agregado `$rankFusion` nativo do Atlas — que pode não estar disponível em todos os tiers/versões do cluster. Cada produto no resultado combinado indica `origin: 'text' | 'vector' | 'both'`.

## 3. Preço do card exibido como "a partir de"

O exemplo de schema em `GENERAL.md` mostra `price` dentro de cada SKU, sem definir qual valor usar no card da listagem principal quando um produto tem múltiplos SKUs com preços diferentes. Foi definido usar o menor preço entre os SKUs do produto, exibido como "a partir de R$X".

## 4. Campo `attributes` adicionado ao schema

O exemplo de documento em `GENERAL.md` (seção 4) não inclui um campo de atributos, mas a página de detalhes (seção 6) exige exibir "atributos". Foi adicionado o campo `attributes` (objeto chave-valor livre, com chaves variando por categoria) para atender esse requisito e demonstrar explicitamente a flexibilidade de schema do MongoDB, que é um dos objetivos centrais da demo (seção 2).

## 5. Filtro de cor: correspondência por "qualquer SKU"

Quando o usuário filtra por uma cor, o produto aparece no resultado se **qualquer** um de seus SKUs tiver essa cor (e não apenas se todos os SKUs corresponderem).

## 6. Identidade visual: tokens reais do LeafyGreen no lugar de uma paleta genérica "inspirada"

`GENERAL.md` (seção 7) e `AGENTS.md` originalmente pediam apenas uma identidade "inspirada" na MongoDB Atlas (verde/branco/cinza/preto) sobre um tema Material UI genérico. Esta implementação foi atualizada para usar os tokens reais do design system público da MongoDB, **LeafyGreen** (mongodb.design), mantendo Material UI como framework de componentes (não houve migração para `@leafygreen-ui/*`):

- **Paleta**: `frontend/src/theme/mongoTheme.js` expõe as escalas completas de cinza/verde/vermelho/amarelo/azul do pacote `palette` do LeafyGreen, não só os 4 tons genéricos anteriores.
- **Tipografia**: a fonte oficial (Euclid Circular A) é proprietária e não pode ser redistribuída livremente; foi usada **Inter** (open-source, `@fontsource/inter`, self-hosted) como substituto visual, com a escala de tamanhos do pacote `tokens`/`typeScales` do LeafyGreen mapeada para as variants do MUI.
- **Ícones**: `@leafygreen-ui/icon` substitui `@mui/icons-material` (os 2 ícones em uso — busca e voltar — usam os glyphs `MagnifyingGlass` e `ArrowLeft`).
- **Grid**: os breakpoints do tema (`mongoTheme.js`) foram alinhados aos do LeafyGreen (`foundation/grid`: 320/768/1024/1440px) no lugar dos breakpoints padrão do MUI.
- **Logo**: o app não é afiliado à MongoDB, então o header usa uma marca neutra estilizada (não o logo oficial da MongoDB) com as cores/tipografia do tema.

## 7. Catálogo de seed restrito a vestuário e calçados, 6 subcategorias

`AGENTS.md` (linha 38) pede que `seed/seed.js` gere **100 produtos** cobrindo um catálogo amplo (a v1 original tinha 10 categorias variadas: Smartphones, Notebooks, Games, TVs, Moda, Calçados, Esportes, Casa, Áudio, Acessórios). A pedido do solicitante, `seed/products.json` cobre exclusivamente o domínio de vestuário e calçados — o total de **100 produtos** da spec original foi mantido, mas redistribuído em só 6 subcategorias: Vestuário (Camisetas, Calças, Camisas) e Calçados (Tênis, Sapatos, Sandálias). Isso substitui uma iteração anterior que tinha reduzido o catálogo para 40 produtos em 10 subcategorias — o corte de subcategorias (não o de produtos) é o que ficou permanente.

Impacto:
- `seed/images.json` permanece reduzido às chaves `moda-*`/`calcados-*` (as demais categorias de imagem foram removidas).
- A demonstração de "flexibilidade de schema" fica mais sutil que na v1: os `attributes` agora variam apenas entre o padrão de vestuário (`material`/`genero`) e o de calçados (`material`/`tipoSola`), em vez de cruzar domínios muito diferentes (ex.: `ram`/`tela` de smartphone vs `pesoKg`/`nivel` de equipamento esportivo).
- **Tamanho (`size`) virou variante de SKU, não atributo de produto**: antes `attributes.tamanho` guardava uma string agregada (ex. `"P, M, G, GG"` ou `"38 ao 44"`) cobrindo todos os tamanhos do produto de uma vez; agora cada entrada de `skus[]` carrega seu próprio `size` (junto de `color`, `price`, `inventory`, `gtin`), do mesmo jeito que cor já era tratada. Reflete melhor o modelo real de e-commerce, onde tamanho e cor juntos definem a SKU comprável.
- Nenhuma mudança de código de busca foi necessária — `backend/config/searchIndexes.js`, os repositórios e o frontend não têm nada hardcoded para as categorias antigas nem para `attributes.tamanho` (era renderizado genericamente via `Object.entries(attributes)`). A tabela de SKUs e o formulário de criação/edição no frontend (`ProductDetailsPage.jsx`, `ProductFormDialog.jsx`) foram atualizados com uma coluna/campo `size` para acompanhar a mudança.
- **Catálogo de marcas restrito a um roster fixo de 11 marcas reais, com nomes de modelo reais**: a pedido do solicitante, cada subcategoria só usa produtos de marcas específicas — Tênis (Nike, Adidas, Puma), Sapatos (Democrata, Ferracini), Sandálias (Havaianas, Ipanema), e Vestuário/Camisetas+Calças+Camisas (Hering, Levi's, Lacoste, Reserva) — em vez do roster amplo e majoritariamente fictício usado nas iterações anteriores do seed. Os nomes de produto (ex. "Nike Air Force 1 '07", "Levi's 501 Original", "Lacoste Polo L.12.12", "Havaianas Top") e as descrições referenciam modelos e características reais de cada marca; cores/tamanhos por SKU e preços continuam sintéticos (gerados), não catálogos oficiais das marcas.

## Decisões de fechamento de ambiguidade da SPEC_V2.md (v2)

`SPEC_V2.md` ainda não foi implementada (ver `CLAUDE.md`). As decisões abaixo fecham pontos que a spec deixava em aberto ou marcados como **[SUPOSIÇÃO]**; elas também estão espelhadas inline na spec como **[DECIDIDO]**.

### 7. Embedding em criação/edição de produto: OpenAI, não Voyage AI

`SPEC_V2.md` (seção 2.1) supõe geração de embedding "via Voyage AI" para produtos criados pelo formulário. Mantendo a divergência 1 (acima), o fluxo de escrita (`POST /products`, `PUT /products/:id` quando `name`/`description` mudam) reaproveita o mesmo `embeddingService.js` já usado por seed e consulta — **OpenAI `text-embedding-3-small`**, não Voyage AI.

### 8. Falha na geração de embedding bloqueia a escrita

Sem definição na spec para esse caso. Decisão: se a chamada ao OpenAI falhar durante `POST /products` ou `PUT /products/:id`, a operação inteira é rejeitada (nada é salvo) e o erro é propagado ao frontend. Evita produtos sem `embedding` no catálogo, às custas de uma demo menos resiliente a rate limit/erro de rede pontual — aceitável dado o volume baixo de escritas de uma demo.

### 9. Marca e categoria restritas a valores já existentes

`SPEC_V2.md` (seção 2.1) não define a origem de `brand`/`categories` no formulário de criação. Decisão: usar um seletor (autocomplete) alimentado pelos valores já presentes no catálogo (via `GET /filters`), não texto livre — evita duplicidade de marca/categoria por variação de digitação (ex.: `"Apple"` vs `"apple"`) e mantém os facets e os campos `token` do índice Atlas Search coerentes. Criar uma marca/categoria nova fica fora do escopo da v2.

### 10. Facets dinâmicos com semântica de multi-seleção clássica

`SPEC_V2.md` (seção 2.5) pede facets via `$facet` sem detalhar a semântica de contagem quando múltiplos filtros estão ativos. Decisão: cada dimensão de filtro (marca, categoria, cor) tem sua contagem calculada ignorando o próprio filtro ativo daquela dimensão, mas respeitando os filtros das demais — padrão usado por e-commerces para permitir trocar de marca/categoria sem perder o restante dos filtros aplicados.

### 11. Código de busca híbrida/RRF removido do backend, não apenas desativado

A v1 implementa busca híbrida via RRF em `searchService.hybridSearch` (divergência 2, acima) e o modo `mode=vector` com over-fetch + paginação em memória (`CANDIDATE_POOL_SIZE`). Como a v2 remove `mode` de `GET /search` por completo, a decisão foi **remover esse código do backend** ao implementar a v2, em vez de deixá-lo desativado no repositório. `/products/:id/similar` (nova seção "produtos semelhantes") usa um caminho de Vector Search novo e mais simples: embedding do próprio produto, sem RRF e sem o padrão de over-fetch de `mode=vector`.
