#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/Users/raph/.local/node-v20.18.0-darwin-arm64/bin:$HOME/.cargo/bin:$PATH"

echo "================================================================"
echo "          LANCEMENT DE DROOPY (MODE TEST PREMIER LANCEMENT)     "
echo "================================================================"
echo ""
echo "Ce lanceur simule un démarrage 100% vierge (nouvel utilisateur)."
echo "Vos vraies données et réglages (133 élèves, Dropbox, Source)"
echo "restent TOTALEMENT préservés dans votre profil normal."
echo ""
echo "Réinitialisation des données de test..."
rm -rf ~/Library/WebKit/fr.droopy.test ~/Library/Application\ Support/fr.droopy.test 2>/dev/null

echo "Démarrage de Droopy sur le profil de test isolé..."
npx tauri dev -c '{"identifier": "fr.droopy.test", "build": {"devUrl": "http://localhost:1421", "beforeDevCommand": "npm run dev -- --port 1421"}, "app": {"windows": [{"title": "Droopy v5 (Profil Vierge de Test)", "width": 1600, "height": 1200}]}}'
