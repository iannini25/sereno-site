# Prompt para o Claude Code (modo Ultra)

> Cole o bloco abaixo no Claude Code, com esta pasta (`sereno/`) aberta. Ele tem
> todo o contexto necessário. Os MCPs do Higgsfield já estão configurados na
> conta; se algum link de vídeo tiver expirado, o prompt explica como regenerar.

---

Você é um engenheiro front-end sênior + diretor de arte. Esta pasta é uma landing
page premium ("**Sereno**", clínica de massagem) com uma **hero em scroll-vídeo**:
dois clipes gerados por IA tocados **quadro a quadro conforme o scroll**, como um
vídeo só. O site já está construído e funcionando em modo *fallback*; sua missão é
**ativar o scroll-vídeo real, lapidar tudo e deixar pronto para vender**.

Leia primeiro, nesta ordem:
1. `README.md` — visão geral e como rodar.
2. `higgsfield-assets.json` — job_ids e URLs de TODOS os assets gerados.
3. `docs/guia-sites-scroll.md` — a técnica de scroll cinematográfico (GSAP +
   ScrollTrigger + Lenis + Canvas frame a frame). É a referência do efeito.
4. `js/hero.js` e `js/app.js` — onde mora a lógica.

## Contexto técnico importante
- O agente anterior rodou num ambiente de **rede restrita**: conseguiu **gerar**
  os assets pelo MCP do Higgsfield, mas **não conseguiu baixá-los** nem extrair
  frames. Por isso esse passo ficou para você (sua máquina tem rede livre).
- A **emenda** entre os dois vídeos é invisível por construção: o último frame do
  vídeo 1 e o primeiro do vídeo 2 são a **mesma imagem** (job `B` em
  `higgsfield-assets.json`). Não precisa casar frames na mão.
- `js/hero.js` já decide sozinho entre 3 modos (frames → 2 imagens → 1 imagem)
  lendo `assets/frames.json`. Quando os frames existirem, ele usa o vídeo real.

## Tarefas

### 1) Baixar assets e extrair os frames
- Rode `bash scripts/extract_frames.sh`. Ele baixa os 2 vídeos + a recepção +
  a sala-profunda, extrai os frames para `assets/frames-1` / `assets/frames-2` e
  atualiza `assets/frames.json` com a contagem real.
- **Se algum link der 403/expirado:** os vídeos estão na conta Higgsfield do
  usuário. Reabra-os pelo MCP (`job_display` com os `job_id` em
  `higgsfield-assets.json`) para pegar a URL nova, ou **regenere** com os mesmos
  parâmetros (modelo `kling3_0`, `mode: pro`, `duration: 5`, `sound: false`,
  `aspect_ratio: 16:9`, `start_image`/`end_image` = jobs A→B e B→C). Atualize as
  URLs no script e rode de novo. As imagens A/B/C também têm `job_id` lá.

### 2) Validar o scroll-vídeo
- Suba um servidor estático (Live Server, `python3 -m http.server`, etc.) e role a
  hero devagar **e** rápido. O movimento deve ser contínuo: câmera **avança** pela
  sala e depois **cai/desce** até **pousar na recepção**, sem salto perceptível na
  emenda.
- Verifique a coreografia dos textos em `js/hero.js` (`setOverlays`): o título do
  topo some pouco antes da emenda; o CTA da recepção aparece ao "pousar". Ajuste os
  limiares (`norm(p, a, b)` e a variável `seam`) se o timing não bater com os
  vídeos reais.
- Ajuste **densidade de frames** se quiser mais nitidez no scrub: rode o script com
  `FPS=24 WIDTH=1800 bash scripts/extract_frames.sh`. Mais frames = mais suave e
  mais pesado. Cheque o peso total da pasta `assets/frames-*`.

### 3) Lapidar o visual (capricho de portfólio)
- Confira a hero em telas grandes, notebook e celular. O título tem que respirar na
  faixa limpa do topo (teto/parede), sem cobrir móveis. O CTA da recepção idem, na
  área limpa do alto da imagem da recepção.
- Revise hierarquia tipográfica, espaçamentos, contraste do texto sobre o vídeo
  (`.hero__scrim`) e os *hovers*. Mantenha a estética "quiet luxury" (creme, blush,
  rosé, dourado discreto). **Não** adicione gradientes roxos, sombras pesadas nem
  ícones genéricos.
- Garanta que as animações de entrada (`.reveal`) e a galeria horizontal com *pin*
  (`#experiencia`) estejam suaves e sem "pulos" no recálculo (já há
  `ScrollTrigger.refresh()` no load e no `fonts.ready`).

### 4) Acessibilidade e responsivo
- Teste com **`prefers-reduced-motion`** ligado: a hero deve virar imagem estática
  com o título visível, sem scrub nem pin. (Já implementado — confirme.)
- Navegação por teclado, foco visível, `alt`/`aria` coerentes, e o menu mobile
  abrindo/fechando certo. Ajuste o que precisar.

### 5) Conteúdo real antes de publicar
- Em `js/app.js`, troque `PHONE = '5531999999999'` pelo WhatsApp real (formato
  internacional, só dígitos). Teste o envio: o formulário deve abrir o WhatsApp com
  a mensagem montada (nome, telefone, ritual, dia).
- Atualize endereço, Instagram e horários na seção `#visite` do `index.html`.
- Preços/depoimentos estão marcados como ilustrativos — troque pelos reais quando
  houver.

### 6) (Opcional) Qualidade extra
- Dá para gerar uma versão em **upscale** dos vídeos pelo MCP do Higgsfield antes de
  extrair os frames, se quiser mais resolução.
- Opcional: um `poster` no `<canvas>`/fallback já é o `room.jpg`; pode trocar por
  `room-deep.jpg` se preferir abrir num quadro mais "dentro" da sala.

## Critérios de aceite
- [ ] Rolar a hero mostra **um movimento contínuo** sala → recepção, amarrado ao
      scroll, sem salto na emenda.
- [ ] Título no topo e CTA da recepção aparecem nos momentos certos, sem cobrir
      conteúdo importante das imagens.
- [ ] Funciona em desktop e mobile; respeita `prefers-reduced-motion`.
- [ ] Formulário abre o WhatsApp com a mensagem correta e o número real.
- [ ] Sem erros no console; `ScrollTrigger` recalcula certo após carregar fontes.
- [ ] Visual coeso, premium e "vendável" para clínicas do nicho.

> Mantenha tudo em **português (pt-BR)** e preserve a identidade da marca já
> definida (copy, paleta, tipografia). Não reescreva o site do zero — **lapide**.
