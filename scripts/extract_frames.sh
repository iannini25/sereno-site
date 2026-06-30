#!/usr/bin/env bash
# =============================================================
#  SERENO · extract_frames.sh
#  Extrai os frames do scroll-video do herói a partir dos DOIS
#  VIDEOS FINAIS que ficam na raiz do projeto:
#
#     parte1.mp4  = AVANCO  (camera anda pra frente, ate perto da maca)
#     parte2.mp4  = DESCIDA (camera desce pelo piso e chega na recepcao)
#
#  Eles ja emendam (ultimo frame da parte1 = primeiro da parte2). O motor
#  js/hero.js toca frames-1 e depois frames-2 amarrado ao scroll.
#
#  Tambem gera os posteres/fallbacks a partir dos PROPRIOS videos:
#     assets/img/room.jpg       = 1o frame da parte1 (poster da sala)
#     assets/img/reception.jpg  = ultimo frame da parte2 (fallback/preview)
#
#  Requisitos: ffmpeg.  (Os frames ja vem extraidos no projeto — isto so
#  e necessario pra RE-extrair, ex.: mais suave/leve. O site funciona sem.)
#     macOS:    brew install ffmpeg
#     Linux:    sudo apt install ffmpeg
#     Windows:  winget install Gyan.FFmpeg   (ou choco install ffmpeg)
#               — ou um build estatico de https://www.gyan.dev/ffmpeg/builds/
#
#  Uso:
#     bash scripts/extract_frames.sh
#     FPS=24 bash scripts/extract_frames.sh            # mais suave (max 121/clip)
#     FPS=14 WIDTH=960 bash scripts/extract_frames.sh  # mais leve (mobile)
# =============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

FPS="${FPS:-18}"        # frames por segundo extraidos (18 = ~91 por video)
WIDTH="${WIDTH:-1280}"  # largura dos frames (altura mantem proporcao)
Q="${Q:-4}"            # qualidade JPG dos frames (2=melhor ... 6=menor)
POSTER_W="${POSTER_W:-1600}"
POSTER_Q="${POSTER_Q:-3}"

command -v ffmpeg >/dev/null || { echo "ERRO: ffmpeg nao encontrado. Veja o cabecalho deste script."; exit 1; }
[ -f parte1.mp4 ] || { echo "ERRO: parte1.mp4 nao esta na raiz do projeto."; exit 1; }
[ -f parte2.mp4 ] || { echo "ERRO: parte2.mp4 nao esta na raiz do projeto."; exit 1; }

mkdir -p assets/frames-1 assets/frames-2 assets/img

echo "==> Limpando frames antigos..."
rm -f assets/frames-1/*.jpg assets/frames-2/*.jpg

echo "==> AVANCO (parte1) -> assets/frames-1  (FPS=$FPS, WIDTH=$WIDTH, Q=$Q)"
ffmpeg -y -loglevel error -i parte1.mp4 \
  -vf "fps=${FPS},scale=${WIDTH}:-2:flags=lanczos" -q:v "$Q" assets/frames-1/%04d.jpg
echo "==> DESCIDA (parte2) -> assets/frames-2"
ffmpeg -y -loglevel error -i parte2.mp4 \
  -vf "fps=${FPS},scale=${WIDTH}:-2:flags=lanczos" -q:v "$Q" assets/frames-2/%04d.jpg

echo "==> Posteres/fallbacks (a partir dos proprios videos)..."
ffmpeg -y -loglevel error -i parte1.mp4 -frames:v 1 \
  -vf "scale=${POSTER_W}:-2" -q:v "$POSTER_Q" assets/img/room.jpg
ffmpeg -y -loglevel error -sseof -0.1 -i parte2.mp4 -frames:v 1 \
  -vf "scale=${POSTER_W}:-2" -q:v "$POSTER_Q" assets/img/reception.jpg

N1=$(ls assets/frames-1/*.jpg | wc -l | tr -d ' ')
N2=$(ls assets/frames-2/*.jpg | wc -l | tr -d ' ')
cat > assets/frames.json <<JSON
{
  "clip1": ${N1},
  "clip2": ${N2},
  "pad": 4,
  "ext": "jpg",
  "dir1": "assets/frames-1",
  "dir2": "assets/frames-2"
}
JSON

echo ""
echo "==> Pronto!  avanco: ${N1} frames | descida: ${N2} frames | total: $((N1+N2))"
echo "    assets/frames.json atualizado. Suba um servidor estatico e recarregue."
