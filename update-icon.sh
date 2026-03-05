#!/bin/bash

# Script para actualizar el ícono de la app
# Uso: ./update-icon.sh /ruta/a/tu/icono.png

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar la ruta al ícono"
  echo "Uso: ./update-icon.sh /ruta/a/tu/icono.png"
  exit 1
fi

ICON_PATH="$1"

if [ ! -f "$ICON_PATH" ]; then
  echo "❌ Error: El archivo no existe: $ICON_PATH"
  exit 1
fi

echo "🔄 Copiando ícono personalizado..."
cp "$ICON_PATH" resources/icon.png

echo "🎨 Generando todas las variantes de íconos..."
npm run icons:generate

echo "📦 Compilando proyecto..."
npm run build

echo "🔄 Sincronizando con Capacitor..."
npx cap sync

echo "✅ ¡Listo! El ícono ha sido actualizado en todas las plataformas"
echo ""
echo "Para ver los cambios:"
echo "  iOS: npm run cap:open:ios"
echo "  Android: npm run cap:open:android"
