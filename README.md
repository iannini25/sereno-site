# Sereno · Estúdio de Massagem & Repouso

Landing page premium para uma clínica de massagem/relaxamento, com uma **hero em
scroll-vídeo**: a câmera avança pela sala e depois "desce" para a recepção do andar
de baixo, tocada **quadro a quadro conforme o scroll** (não é `<video>` — são frames
desenhados num `<canvas>`), parecendo um vídeo só, contínuo. O movimento vem de **dois
vídeos finais reais** — `parte1.mp4` (avanço) e `parte2.mp4` (descida) — que já
**emendam** (o último frame da parte 1 é o primeiro da parte 2). Os frames ficam em
`assets/frames-1` + `assets/frames-2` e o motor os amarra ao scroll.

> Marca, copy, paleta e tipografia foram criadas do zero. Tudo em português (pt-BR).

---

## 🚀 Como rodar

O site é HTML/CSS/JS puro. Só precisa de um **servidor estático** (por causa do
`fetch` do manifesto de frames e das fontes):

**VS Code** → instale a extensão **Live Server** → clique direito em `index.html`
→ *Open with Live Server*.

Ou pelo terminal:

```bash
# Python
python3 -m http.server 5173
# ou Node
npx serve .
```

Abra `http://localhost:5173`.

> Abrir o `index.html` direto (file://) também funciona, mas cai no **fallback de
> imagem** (sem o vídeo quadro a quadro), porque o navegador bloqueia `fetch` local.

---

## ✅ O que já está pronto

- **Site inteiro** desenhado e escrito: navbar, hero, **A Casa**, **Rituais**,
  **A Experiência** (galeria horizontal com *pin*), **Planos**, **Vozes**,
  **Visite** (formulário que monta a mensagem de WhatsApp) e rodapé.
- **Design system** completo (CSS): tipografia Cormorant Garamond + Jost, paleta
  tirada da própria foto (creme/blush/rosé/dourado), responsivo e com suporte a
  `prefers-reduced-motion`.
- **Motor do scroll-vídeo** (`js/hero.js`) com **3 níveis automáticos**:
  1. **Frames** — o efeito real, lendo `assets/frames-1` + `assets/frames-2`.
  2. **2 imagens** — `room.jpg → reception.jpg` com avanço + crossfade.
  3. **1 imagem** — só `room.jpg` com Ken-Burns (estado mínimo).
- **Os 2 vídeos finais** (`parte1.mp4` + `parte2.mp4`, na raiz) já processados em
  frames; os pôsteres `assets/img/room.jpg` e `reception.jpg` saem dos **próprios
  vídeos** (1º frame da parte 1 / último da parte 2).

## ✅ Scroll-vídeo ATIVO

O hero abre direto no modo "vídeo quadro a quadro" com **182 frames JPG**
(91 do **avanço** + 91 da **descida**, 1280 px, ~13 MB no total), extraídos dos dois
vídeos finais por `scripts/extract_frames.sh`. `assets/frames.json` traz a contagem
real (`clip1`/`clip2`). A **emenda** avanço→descida é invisível (os vídeos já casam no
frame de corte) e a descida **pousa na recepção**.

Os frames **já vêm prontos** no projeto — o site funciona sem ffmpeg. Para
**re-extrair** (ex.: mais suave ou mais leve), com `ffmpeg` instalado:

```bash
bash scripts/extract_frames.sh
FPS=24 bash scripts/extract_frames.sh            # mais suave (até 121/clip)
FPS=14 WIDTH=960 bash scripts/extract_frames.sh  # mais leve (mobile)
```

> O script lê `parte1.mp4`/`parte2.mp4` da raiz, regenera os frames + pôsteres e
> atualiza `frames.json` pela contagem real. Variáveis: `FPS` (suavidade), `WIDTH`
> (nitidez/peso), `Q` (qualidade JPG). No Windows, instale o ffmpeg
> (`winget install Gyan.FFmpeg`) ou use um build estático — detalhes no cabeçalho
> do script.

---

## 🗺️ Estrutura

```
sereno/
├─ index.html                 # marcação completa do site
├─ parte1.mp4 · parte2.mp4    # os 2 vídeos finais (fonte dos frames do herói)
├─ css/styles.css             # design system + responsivo + reduced-motion
├─ js/
│  ├─ hero.js                 # scroll-vídeo (canvas, 3 níveis de fallback)
│  └─ app.js                  # Lenis, navbar, menu, reveal, pin, WhatsApp
├─ assets/
│  ├─ img/room.jpg            # poster da SALA (1º frame da parte1)
│  ├─ img/reception.jpg       # poster da RECEPÇÃO (último frame da parte2)
│  ├─ frames-1/               # avanço — frames da parte1 (gerados pelo script)
│  ├─ frames-2/               # descida — frames da parte2 (gerados pelo script)
│  ├─ frames.json             # contagem/ext dos frames (atualizado pelo script)
│  └─ favicon.svg
├─ scripts/extract_frames.sh  # extrai frames + pôsteres dos 2 vídeos (precisa ffmpeg)
├─ docs/guia-sites-scroll.md  # o tutorial de scroll cinematográfico
├─ CLAUDE_CODE_PROMPT.md      # prompt original do projeto
└─ README.md
```

---

## ✍️ Ajustes rápidos antes de publicar

- **WhatsApp:** em `js/app.js`, troque `PHONE = '5531999999999'` pelo número real.
- **Endereço / Instagram:** na seção `#visite` do `index.html`.
- **Preços e depoimentos** são ilustrativos (já sinalizado no site).

---

## 🎨 A marca, em uma linha

**Sereno.** *“O mundo pode esperar.”* — um santuário onde a luz é quente, o toque é
preciso e o tempo, enfim, desacelera. *Feito para desacelerar.*
