# Guia: Sites cinematográficos com scroll

### Como funcionam o Fanta, o Logitech, o Iron Man e o Amaro.fy — e como fazer o seu

Este guia destrincha os **4 sites de referência**: que bibliotecas usam, quais efeitos
criam, as técnicas por trás de cada um e, no fim, uma **receita passo a passo** pra você
montar um site novo no mesmo estilo.

Todos eles pertencem à mesma família: **scroll-driven storytelling** — a página conta uma
história conforme você rola, com imagens, vídeos e elementos reagindo à rolagem. A diferença
entre eles é só *quais técnicas* combinam e *com qual stack*.

---

## 1. O kit de ferramentas

Antes das técnicas, entenda as peças. Você quase nunca usa todas — escolhe conforme o efeito.

| Ferramenta | O que faz | Quando usar |
|---|---|---|
| **GSAP** | Motor de animação JS. Anima qualquer propriedade de qualquer elemento, com timelines precisas. | Praticamente sempre que tiver animação séria. |
| **ScrollTrigger** (plugin do GSAP) | Liga animações ao scroll: dispara, "prende" (pin) e faz *scrub* (animação amarrada à posição da rolagem). | Qualquer efeito controlado pelo scroll. |
| **Lenis** | "Smooth scroll": amortece a rolagem, deixando o movimento pesado e fluido (efeito "deslizar de manteiga"). | Pra dar sensação premium ao site inteiro. |
| **Framer Motion** (`motion`) | Animação declarativa **pra React**. Equivalente ao GSAP, mas em componentes. | Em projetos React/Next. |
| **Canvas API** (nativa) | Desenha pixels numa `<canvas>`. Usada pra "tocar" sequências de imagem no scroll. | Pro efeito de scroll-vídeo (frame a frame). |
| **Tailwind CSS** | Estilização por classes utilitárias. | Opcional — só agiliza o CSS. |

> **Regra de ouro:** GSAP + ScrollTrigger + Lenis resolvem 90% desses efeitos em HTML/CSS/JS
> puro, **sem framework**. React/Framer só compensa quando o site é grande e componentizado.

---

## 2. As técnicas-núcleo (com código real)

Aqui estão os efeitos que aparecem nesses sites. Cada um é uma "peça de lego".

### A) Smooth scroll — a base fluida (Lenis)

Intercepta a rolagem e a interpola, então cada scroll "desliza" em vez de pular. É o que dá
a sensação cara. Sozinho já transforma um site comum.

```js
import Lenis from "lenis";
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
// integra com o GSAP pra tudo andar no mesmo "relógio":
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

### B) Elementos que viajam entre seções — *scrub* (técnica do **Fanta**)

O coração do Fanta. Os produtos (laranja, garrafa, folhas) ficam em **posição absoluta** e uma
**timeline com `scrub: true`** anima `top/left/width/rotate` conforme você rola — então eles
*viajam e escalam de uma seção pra outra*. O truque-chave: os valores de `top` passam de 100%
(`120%`, `160%`...) porque o elemento é absoluto dentro da 1ª seção, mas é empurrado pra baixo,
caindo dentro das seções seguintes. Trecho **real** do Fanta:

```js
var tl = gsap.timeline({ scrollTrigger:{
    trigger: ".two", start: "0% 95%", end: "70% 50%", scrub: true
}});
tl.to("#fanta",  { top: "120%", left: "0%"  }, 'orange'); // o label 'orange'…
tl.to("#orange", { width: "15%", top: "160%", right: "10%" }, 'orange'); // …sincroniza tudo
tl.to("#leaf",   { top: "110%", rotate: "130deg", left: "70%" }, 'orange');
```

- **`scrub: true`** = a animação é "rolada" pela barra de scroll (vai e volta com você).
- **Label** (`'orange'`) = vários elementos animam **ao mesmo tempo**.
- **`.from(...)`** = o elemento *entra* de uma posição (ex.: `left: "-100%"`, `rotate: "-90deg"`)
  até a posição final — usado pra peças "voarem" pelas laterais.

### C) Scroll-vídeo: sequência de frames no `<canvas>` (técnica do **Logitech** e **Iron Man**)

O efeito mais impressionante e o mais incompreendido. **Não é um `<video>` tocando.** Um vídeo
é exportado em centenas de **JPGs** (o Logitech usa 241; o Iron Man, 2× 169). Os frames são
pré-carregados e **desenhados num `<canvas>`**; o índice do frame é mapeado à posição do scroll.

**Por que não usar `<video>`?** Porque "pular" pro `currentTime` exato trava e varia entre
navegadores/hospedagens. JPG já decodificado desenhado no canvas é **liso e confiável**.

A "anatomia" (padrão real do Logitech):

```js
const FRAME_COUNT = 241;
const framePath = i => `assets/frames/f_${String(i).padStart(3,'0')}.jpg`;
const frames = []; let target = 0, eased = 0, lastDrawn = -1, ready = false;

// 1) Pré-carrega tudo (com barra de progresso)
frames[i] = new Image(); frames[i].src = framePath(i+1);

// 2) Desenha um frame com "cover" (preenche a tela, sem bordas brancas)
function draw(f){
  const img = frames[Math.round(f)];
  const scale = Math.max(cw/img.naturalWidth, ch/img.naturalHeight); // ← cover
  ctx.drawImage(img, (cw-img.naturalWidth*scale)*0.5,
                     (ch-img.naturalHeight*scale)*0.5,
                     img.naturalWidth*scale, img.naturalHeight*scale);
}

// 3) Mapeia scroll → índice do frame
function progress(){
  const rect = hero.getBoundingClientRect();
  return clamp(-rect.top / (hero.offsetHeight - innerHeight), 0, 1);
}
function onScroll(){ target = progress() * (FRAME_COUNT - 1); }

// 4) Suaviza num loop (a "manteiga"): persegue o alvo, 18% por frame
function tick(){
  eased += (target - eased) * 0.18;
  if (Math.round(eased) !== lastDrawn){ draw(eased); lastDrawn = Math.round(eased); }
  requestAnimationFrame(tick);
}
```

Três detalhes que fazem a diferença: a **seção do herói é mais alta que a tela** (ex.: `300vh`)
e tem o canvas **`sticky`** dentro — é a "distância de rolagem" que toca o vídeo; o desenho usa
**`Math.max` (cover)** pra nunca aparecer borda; e o **easing por `requestAnimationFrame`**
(`eased += (target-eased)*0.18`) é o que deixa o movimento sedoso em vez de travado.

### D) Pin + scroll horizontal

Você "prende" uma seção na tela (`pin`) e, enquanto o usuário rola pra baixo, o conteúdo se
move **na horizontal**. Ótimo pra galerias/carrosséis premium.

```js
gsap.to(track, {
  x: () => -(track.scrollWidth - innerWidth),
  ease: "none",
  scrollTrigger: {
    trigger: ".galeria", start: "top top",
    end: () => "+=" + (track.scrollWidth - innerWidth),
    scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true
  }
});
```

### E) Parallax

Camadas (geralmente imagens) andam em velocidades diferentes, criando profundidade.

```js
gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: "none",
  scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }});
```
> Dica: deixe a imagem com `transform: scale(1.1)` no CSS pra a margem extra esconder as bordas
> quando ela desliza.

### F) Desenhar um traço SVG no scroll (o "fio" do **Amaro.fy**)

Um caminho SVG que "se desenha" conforme você rola. Funciona com `stroke-dasharray` +
`stroke-dashoffset`: começa todo "escondido" e vai revelando.

```js
const L = path.getTotalLength();
path.style.strokeDasharray = L;
function knit(){
  const prog = scrollY / (document.documentElement.scrollHeight - innerHeight);
  path.style.strokeDashoffset = L * (1 - prog); // L → 0 conforme rola
}
```
> Use `vector-effect="non-scaling-stroke"` pro traço manter a espessura ao esticar o SVG.

### G) Reveal no scroll

Texto/blocos que aparecem (fade + sobe) quando entram na tela. Barato e elegante.

```js
ScrollTrigger.batch(".reveal", { start: "top 86%",
  onEnter: els => gsap.to(els, { opacity:1, y:0, stagger:.09, ease:"power3.out" })
});
```

### H) Degradação graciosa (não pule isso)

Sites assim precisam funcionar sem JS e pra quem tem enjoo de movimento:

```js
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
// se reduzir movimento: não liga Lenis, não faz scrub, desenha 1 frame estático,
// e mostra tudo visível (sem as animações de entrada).
```

---

## 3. Os 4 sites destrinchados

### 🟠 Fanta India — *elementos viajando entre seções*
- **Stack:** HTML/CSS/JS puro + **GSAP + ScrollTrigger**. Fontes locais (Product Sans), PNGs dos produtos.
- **Assinatura:** timelines com `scrub` movendo elementos absolutos entre seções (técnica **B**).
- **Vale aprender:** sincronizar várias animações com *labels*; usar `top > 100%` pra "jogar"
  elementos pra seções de baixo.
- **Simplicidade:** é o mais fácil de copiar. Nenhuma sequência de imagem, nenhum framework.

### ⌨️ Logitech — *scroll-vídeo frame a frame*
- **Stack:** HTML/CSS/JS puro + **Canvas API** (sem framework!). 241 JPGs (~50KB cada) + barra de loader.
- **Assinatura:** sequência de frames no canvas amarrada ao scroll (técnica **C**) — o herói "explode"
  o teclado conforme você desce.
- **Vale aprender:** pré-carregar frames, `cover` no canvas, easing por rAF, herói `sticky`
  numa seção alta.
- **Curiosidade:** o vídeo do teclado foi **gerado por IA** — imagem no **Nano Banana** + animação
  no **Kling 3.0** — e depois fatiado em frames.

### 🦾 Iron Man — *o mesmo, turbinado em React*
- **Stack:** **Next.js + React + TypeScript + Tailwind** + **Framer Motion** (`framer-motion`) +
  **Lenis**. Fonte Geist, ícones Phosphor.
- **Assinatura:** **duas** sequências de frames (2× 169) em momentos diferentes da página +
  **Lenis** pra fluidez + overlays estilo HUD. Componentizado (`Hero`, `CinematicReveal`,
  `SmoothScrollProvider`...).
- **Vale aprender:** como a *mesma* técnica de frames vira componentes reutilizáveis; usar
  **mais de um momento cinematográfico** numa página; smooth scroll global.
- **Quando faz sentido:** site grande, com time, precisando de organização e reuso.

### 🧶 Amaro.fy — *a combinação dos três* (o seu)
- **Stack:** HTML/CSS/JS puro + **GSAP 3.12 + ScrollTrigger** + **Lenis 1.1**. Fontes Google
  (Cormorant + Jost).
- **O que combinei:**
  - **Lenis** como base fluida (técnica A).
  - **Herói em canvas com sequência de frames** (técnica C) — os ~182 frames vêm de **dois
    vídeos finais** (avanço pela sala + descida até a recepção) extraídos com ffmpeg, tocados
    quadro a quadro e emendados num movimento só, contínuo.
  - **GSAP/ScrollTrigger** pra *reveals* (G), *parallax* (E) e **galeria horizontal com pin** (D).
  - **Fio SVG** que se tricota na margem conforme o scroll (técnica F) — a assinatura da marca.
  - **Formulário que monta a mensagem e abre o WhatsApp** já preenchido.
  - **Degradação graciosa** (H) + responsivo + acessível.
- **Por que puro e não React:** site de uma página, sem necessidade de componentização. Mais
  leve, abre só dando dois cliques, e qualquer um edita.

---

## 4. O pipeline de assets (o segredo do scroll-vídeo)

A parte que ninguém conta: o efeito do Logitech/Iron Man depende de **transformar um vídeo em
frames**. Dois caminhos pra conseguir o vídeo:

**1. Filmar** (mais autêntico pra produto real): movimento **único, lento e contínuo** (sem
cortes), câmera estável (tripé/slider/gimbal), fundo limpo, 4–8 segundos.

**2. Gerar por IA** (como o Logitech): uma imagem-base no **Nano Banana** (ou similar) → animar
no **Kling** (img-to-video fica bem melhor que texto puro) → exportar o vídeo.
*(Configuração do MCP, modelos e ajustes de realismo: **seção 5**.)*

Depois, **fatie em frames** com FFmpeg:

```bash
# extrai ~150 frames de largura 1280, qualidade boa:
ffmpeg -i video.mp4 -vf "fps=150/DURACAO_EM_SEGUNDOS,scale=1280:-1" -q:v 4 frames/f_%03d.jpg
```

**Matemática dos frames:** `fps = nº_de_frames / duração`. Mais frames = mais suave, porém mais
peso. Sweet spot: **100–240 frames**, cada um **40–120KB** (redimensione pra ~940–1280px e use
qualidade ~72). Mantenha a nomenclatura `f_001.jpg`, `f_002.jpg`… e ajuste a constante
`FRAME_COUNT` no código pra bater com a quantidade real.

---

## 5. Gerando os assets com o Higgsfield (MCP, modelos e realismo)

A parte mais "fria" de criar o scroll-vídeo é arrumar o vídeo. O Higgsfield resolve isso gerando
imagem/vídeo por IA — e dá pra acionar **direto da conversa** via MCP.

### 5.1 O que é MCP e como conectar

**MCP** (Model Context Protocol) é um padrão que deixa a IA (Claude Code, Claude Desktop, claude.ai)
chamar ferramentas externas — aqui, gerar imagem/vídeo no Higgsfield sem sair do chat.

> **URL do servidor:** `https://mcp.higgsfield.ai/mcp`

- **No claude.ai (web/app):** Configurações → Conectores → adicionar Higgsfield → autenticar (OAuth) na sua conta.
- **No Claude Code (terminal):**
  ```bash
  claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp
  ```
  Depois, **dentro** do Claude Code, rode `/mcp` → `higgsfield` → **Authenticate** → Allow (login na sua conta).
  Use `--scope user` pra valer em todos os projetos.
- **No Claude Desktop:** Configurações → Conectores → Adicionar conector personalizado → cole a URL → autentique.

**Confira:** `claude mcp list` (terminal) ou `/mcp` (dentro). Se aparecer "conectado" mas com 0 ferramentas,
falta autenticar.

**Créditos:** gerar gasta crédito. Use a ferramenta **`balance`** pra ver saldo, **`get_cost: true`**
em qualquer geração pra ver o custo **antes** de gastar, e **`transactions`** pra histórico.

**Tool Search:** o cliente carrega as ferramentas do Higgsfield **sob demanda** (são muitas) — normal
elas não aparecerem todas de cara.

### 5.2 Os modelos (o que usar pra cada coisa)

| Tipo | Modelo | Pra quê |
|---|---|---|
| Imagem | **Nano Banana Pro** (`nano_banana_2`) | Fotorrealismo, texto na imagem, até **4K**. Produto/cenário. |
| Imagem | **Seedream** (`seedream_v4_5` / `v5_lite`) | Fashion, editorial, fotos. |
| Imagem | **Soul** (`soul_2`) | Pessoas com **identidade consistente** (com Soul Characters). |
| Imagem | **DTC / Marketing** (`marketing_studio_image`) | Anúncios de produto. |
| Vídeo | **Kling 3.0** (`kling3_0`) | Melhor qualidade/movimento; multi-shot, áudio. |
| Vídeo | **Kling 3.0 Turbo** (`kling3_0_turbo`) | Rápido; texto→vídeo ou anima **1 frame inicial**. |
| Vídeo | **Seedance 2.0** (`seedance_2_0`) | Bom pra manter identidade. |
| Acabamento | `upscale_image` (2K/4K), `upscale_video` (Topaz/ByteDance), `remove_background`, `outpaint_image`, `reframe`, `motion_control` | Nitidez, recorte, mudar proporção, transferir movimento. |

> Rode a ferramenta **`models_explore`** pra ver o catálogo **atual** — modelos e parâmetros mudam com o
> tempo, e ela mostra as proporções (`aspect_ratio`) e os papéis de mídia que cada modelo aceita.

### 5.3 Configs pra ficar REALISTA (o que mais importa)

A IA erra mais em pele, mãos e texturas (crochê é justamente textura) — por isso estes ajustes valem ouro:

1. **Imagem→vídeo, nunca texto→vídeo.** Gere primeiro uma **imagem** fotorrealista e **anime ela**
   (passe o `job_id` da imagem como `start_image` no `generate_video`). Dá controle de enquadramento e
   mata o aspecto "IA genérica". Texto→vídeo só pra rascunho.
2. **Use referências reais.** Pra um produto/peça real, **suba uma foto sua** (`media_upload_widget`) e
   use como referência — fica muito mais autêntico que gerar do zero. Pra a **mesma pessoa** em vários
   takes, treine um **Soul Character** (5–20 fotos) ou crie um **Reference Element** e referencie nas
   gerações pra manter a identidade.
3. **Gere alto e dê upscale.** Imagem em **4K** (Nano Banana Pro), vídeo no máximo do modelo, e depois
   passe no **upscale** (Topaz/ByteDance). Frame nítido = scroll-vídeo premium. Nunca faça upscale de
   frame borrado.
4. **Prompt fotográfico, não "render".** Descreva como foto: lente/abertura (`85mm, f/1.8, shallow depth
   of field`), luz (`soft natural window light, golden hour`), material real (`handmade cream cotton
   crochet`), clima (`editorial, fine film grain`). **Evite** `3D render`, `CGI`, `illustration`,
   `cartoon` — puxam pro artificial.
5. **Movimento contínuo e lento.** Pro scrub, peça **um movimento único, suave, sem cortes**
   (`slow continuous dolly-out, no cuts, steady camera`). Corte e tranco arruínam o efeito.
6. **Diga o que evitar** (quando o modelo aceitar): `plastic, waxy skin, distorted hands, extra fingers,
   warped texture, oversaturated`.
7. **Itere barato.** `count: 1` + `get_cost: true` antes; gere variações da imagem, escolha a melhor,
   só então anime.

**Fluxo realista, do começo ao fim:**
```
1) generate_image  → model nano_banana_2, resolution "4K", aspect_ratio "3:4",
                     prompt fotográfico (lente + luz + material real + film grain)
                     [+ referência da sua foto/Soul pra autenticidade]   →  pega o job_id
2) generate_video  → model kling3_0, start_image = job_id, aspect_ratio "9:16",
                     prompt "slow continuous pull-back, smooth steady, no cuts, cinematic"
3) upscale_video   → Topaz/ByteDance (1080p/4K)
4) baixa o .mp4    → extrai os frames com FFmpeg (seção 6) → pronto pro herói
```

---

## 6. Qualidade de vídeo e fluidez

Os "botões" que controlam como o scroll-vídeo se sente:

- **Quantidade de frames** (o principal): mais frames = mais suave, mais peso.
  - **60–80** → leve, ideal pra mobile / movimentos curtos.
  - **100–150** → o sweet spot pra desktop.
  - **200–240** → ultra-suave (Logitech), só se o peso permitir.
  - Conta: `fps_de_extração = nº_de_frames ÷ duração_do_vídeo`.
- **Peso por frame:** mire **40–120KB** cada. Redimensione pro tamanho real de exibição (**940–1280px**
  de largura basta) e qualidade ~72. **Total do conjunto idealmente < 8–15MB.**
- **Formato:** JPG **progressivo** é o padrão. **WebP** corta ~30% do tamanho com a mesma qualidade
  (suporte universal hoje) — vale a troca se quiser leveza. Evite PNG (pesado pra foto).
- **Suavização (easing):** o `0.18` do loop (`eased += (target - eased) * 0.18`) é a "manteiga":
  **menor** (0.10) = mais suave e "preguiçoso"; **maior** (0.25) = mais grudado no scroll e responsivo.
- **DPR:** `Math.min(devicePixelRatio, 2)`. Sem limitar, telas retina desenham 3–4× mais pixels e travam.
  No mobile dá pra baixar pra **1.5**.
- **Pré-carregamento:** conjunto pequeno (≤150) → pré-carregue tudo com barra de progresso. Conjunto
  grande → carregue **1 a cada N frames** primeiro (preview) e preencha o resto, pra o início não travar.
- **Resolução de origem:** gere/film o vídeo em **alta** (≥1080p, ideal 2K) e só então reduza na extração.
- **fps "cinematográfico":** vídeo a **24fps** tem cara de cinema; o scrub redistribui isso pelo scroll,
  então não precisa de fps alto no vídeo final — precisa de **frames bem distribuídos** e nítidos.

---

## 7. Mobile, tablet e desktop (o que muda)

Esses efeitos **não podem ser iguais nos três** — o que encanta no desktop trava no celular.

**Scroll-vídeo (canvas):**
- **Desktop:** conjunto cheio (100–240 frames), 1280px, herói longo (`~300vh`).
- **Tablet:** conjunto médio (~100 frames), 960–1080px.
- **Mobile:** conjunto enxuto (60–80 frames), 720–940px, herói mais curto (`~200vh`). Em aparelho fraco,
  troque o canvas por uma **imagem-pôster** (ou um vídeo curto em loop) e pule o scrub.
- Sirva **proporções diferentes**: frames **retrato (9:16)** no mobile e **paisagem (16:9)** no desktop
  encaixam melhor. Gere as duas versões e troque por `matchMedia` — ou use a ferramenta **`reframe`** do
  Higgsfield pra adaptar um vídeo já pronto a outra proporção sem regerar.

**Galeria horizontal com pin:**
- **Desktop/tablet:** pin + scroll horizontal (lindo).
- **Mobile:** **não use pin** — o redimensionamento da barra de endereço causa "pulos". Troque por
  **swipe nativo** (`overflow-x:auto; scroll-snap`). Ligue o pin só no desktop com
  `matchMedia("(min-width: 861px)")`.

**Smooth scroll (Lenis):**
- `smoothWheel: true` no desktop, mas **deixe o toque nativo** no mobile — o momentum do próprio celular
  é melhor; forçar smooth no touch atrapalha. (O Lenis já não suaviza toque por padrão.)

**Altura de tela (o bug dos `100vh` no mobile):**
- A barra de endereço some/aparece e bagunça o `100vh`. Use **`100svh` / `100dvh`** (small/dynamic
  viewport height) pro herói não pular.

**Animações e parallax:**
- Reduza no mobile: menos camadas, parallax mais sutil ou desligado, menos coisas animando ao mesmo
  tempo (CPU de celular é mais fraca). `will-change` com parcimônia.

**Interação:**
- **Hover não existe no touch** — não esconda informação atrás de `:hover`. Alvos de toque **≥ 44px**,
  fontes e espaçamento maiores no mobile.

**Conexão:**
- Mobile costuma ter rede pior. `loading="lazy"` nas fotos, assets menores, e dá pra ler
  `navigator.connection` (`saveData`, `effectiveType`) pra servir o conjunto **leve** de frames em 3G.

**Como trocar por dispositivo** — `gsap.matchMedia()` é o caminho limpo:
```js
const mm = gsap.matchMedia();
mm.add("(min-width: 861px)", () => { /* pin, frames cheios, parallax forte */ });
mm.add("(max-width: 860px)", () => { /* swipe nativo, frames enxutos, sem pin */ });
```
E pra trocar a fonte dos frames, aponte o `framePath` pra `frames-mobile/` ou `frames-desktop/`
conforme `window.innerWidth`.

---

## 8. Guia de decisão rápido

- **Vanilla (HTML/CSS/JS) ou React?**
  Uma/poucas páginas, entrega simples → **vanilla** (Fanta, Logitech, Amaro.fy).
  App grande, muitos componentes, time → **React/Next + Framer Motion** (Iron Man).
- **Scroll-vídeo (frames) ou elementos viajando (scrub)?**
  Quer "tocar" um vídeo/animação no scroll → **frames no canvas** (C).
  Quer objetos deslizando/reposicionando entre seções → **timeline com scrub** (B).
  Os dois juntos = o efeito mais rico (foi o que fiz no seu).
- **Sempre adicione:** Lenis (fluidez), reveals (G) e degradação graciosa (H). É barato e
  multiplica a sensação de qualidade.

---

## 9. Receita pra um site novo (passo a passo)

1. **Estrutura primeiro.** Liste as seções e o que cada uma comunica. Decida quais terão
   "momento cinematográfico" (1–2 no máximo, pra não cansar).
2. **Monte o esqueleto** em HTML semântico + um sistema de design (variáveis CSS pra cores,
   2 fontes: uma de display e uma de texto, espaçamento generoso).
3. **Ligue o Lenis** e integre com o GSAP (snippet A).
4. **Faça o herói.** Se for scroll-vídeo: prepare os frames (seções 4–6) e implemente o canvas
   (snippet C), com herói `sticky` numa seção de `~300vh`.
5. **Adicione os efeitos** onde fizerem sentido: scrub entre seções (B), galeria horizontal (D),
   parallax (E), um traço SVG de assinatura (F).
6. **Reveals** em todos os blocos de texto (G).
7. **Degradação graciosa** + responsivo + teste no celular (H).
8. **Otimize:** comprima imagens, carregue bibliotecas por CDN, `loading="lazy"` nas fotos.

### Esqueleto mínimo (ponto de partida)

```html
<!-- CDNs -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js"></script>

<section id="hero" style="height:300vh">
  <div style="position:sticky;top:0;height:100vh;overflow:hidden">
    <canvas id="heroCanvas" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
    <h1 style="position:absolute;z-index:2">Seu título</h1>
  </div>
</section>
```
```js
// 1) Lenis + GSAP (snippet A)  2) Canvas scrub (snippet C)
// 3) ScrollTrigger.batch pros reveals (snippet G)
gsap.registerPlugin(ScrollTrigger);
// ...cole os snippets das seções acima e adapte
```

---

## 10. Erros comuns & performance

- **Não use `<video>` pra scrub** — use frames. Vídeo trava ao buscar o tempo exato.
- **Pré-carregue os frames** e mostre uma barra; sem isso o herói pisca vazio.
- **`Math.min(devicePixelRatio, 2)`** no canvas — sem limitar o DPR, telas "retina" matam o desempenho.
- **`scrub` x animação disparada:** `scrub` segue o scroll (vai e volta); sem `scrub`, a animação
  roda uma vez ao entrar. Não troque um pelo outro sem querer.
- **`invalidateOnRefresh: true`** em pins/horizontais pra recalcular tamanhos ao redimensionar.
- **Imagens pesadas = site travado.** Redimensione pra o tamanho real de exibição e comprima.
- **Sempre respeite `prefers-reduced-motion`** — acessibilidade e nada de enjoo no usuário.
- **Carregue scripts no fim do `<body>`** e estilos no `<head>` pra não bloquear a renderização.

---

### Resumo de uma linha

> **GSAP + ScrollTrigger** animam, **Lenis** deixa fluido, e o **canvas com sequência de frames**
> faz o "scroll-vídeo". Combine essas três peças (em HTML puro ou React) e você reproduz qualquer
> um desses sites.
