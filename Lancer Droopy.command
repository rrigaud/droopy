#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/Users/raph/.local/node-v20.18.0-darwin-arm64/bin:$HOME/.cargo/bin:$PATH"

echo "================================================"
echo "              LANCEMENT DE DROOPY"
echo "================================================"
echo ""
echo "Dossier : $(pwd)"
echo "Node    : $(node -v)"
echo "NPM     : $(npm -v)"
echo ""
echo "Démarrage de l'application de bureau Tauri..."
npm run tauri dev
