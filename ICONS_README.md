# Configuración de Íconos de la App

## ✅ Estado Actual

Capacitor ha sido configurado exitosamente con todos los íconos nativos generados para iOS y Android.

### Íconos Generados:

**iOS:**
- ✅ `ios/App/App/Assets.xcassets/AppIcon.appiconset/` - Todos los tamaños de iOS (1024x1024)

**Android:**
- ✅ `android/app/src/main/res/mipmap-*` - Todas las densidades (ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- ✅ Adaptive icons (foreground + background)
- ✅ Round icons

**PWA:**
- ✅ `public/icon.png` - Ícono principal
- ✅ `public/icons/` - Todas las variantes WebP (48, 72, 96, 128, 192, 256, 512)

## 🔄 Cómo Reemplazar el Ícono con tu Imagen Personalizada

Si quieres usar tu ícono personalizado (como el símbolo de % que adjuntaste):

### Opción 1: Reemplazar y Regenerar (Recomendado)

1. **Guarda tu ícono personalizado:**
   ```bash
   # Coloca tu imagen como resources/icon.png
   # Debe ser PNG de al menos 1024x1024px con transparencia
   ```

2. **Regenera todos los íconos:**
   ```bash
   npx @capacitor/assets generate --iconBackgroundColor '#00B9AE' --iconBackgroundColorDark '#00B9AE' --logoSplashScale 0.5
   ```

3. **Sincroniza con Capacitor:**
   ```bash
   npx cap sync
   ```

### Opción 2: Usando tu Imagen Directamente

```bash
# 1. Copia tu imagen (debe ser PNG de 1024x1024px)
cp /ruta/a/tu/icono.png resources/icon.png

# 2. Regenera todos los tamaños
npx @capacitor/assets generate --iconBackgroundColor '#00B9AE'

# 3. Copia a public para PWA
cp resources/icon.png public/icon.png

# 4. Sincroniza
npx cap sync
```

## 📱 Verificar los Íconos

### iOS:
```bash
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

### Android:
```bash
ls -la android/app/src/main/res/mipmap-xxxhdpi/
```

### PWA:
```bash
ls -la public/icon.png
ls -la public/icons/
```

## 🚀 Comandos de Capacitor

```bash
# Build del proyecto web
npm run build

# Sincronizar cambios con las apps nativas
npx cap sync

# Abrir en Xcode (iOS)
npx cap open ios

# Abrir en Android Studio
npx cap open android

# Actualizar solo iOS
npx cap sync ios

# Actualizar solo Android
npx cap sync android
```

## 📝 Notas Importantes

- El ícono debe ser PNG con transparencia
- Tamaño recomendado: 1024x1024px
- El color de fondo (#00B9AE) se usa para adaptive icons en Android
- Los íconos se regeneran automáticamente en todos los tamaños necesarios
- Después de cambiar el ícono, siempre ejecuta `npm run build` antes de `npx cap sync`

## 🎨 Personalizar Splash Screens

Los splash screens también se generaron automáticamente. Para personalizarlos:

1. Crea `resources/splash.png` (2732x2732px)
2. Ejecuta `npx @capacitor/assets generate`
3. Sincroniza con `npx cap sync`
