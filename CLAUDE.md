# CLAUDE.md — @fmarcosdev/helical-scroll-cards

## Stack

Librería React + Three.js + TypeScript. Publicada en npm. Compilada con `tsup` (ESM + CJS + DTS).

## Arquitectura interna

- Todo el estado mutable vive en `useRef` — no en `useState` — para evitar re-renders que destruyan la escena Three.js.
- `configRef`, `itemsRef`, `themeRef`, etc. se sincronizan en un único `useEffect` de actualización de refs. No tocar el loop `animate()` para sincronizar props.
- El loop de animación corre via `requestAnimationFrame`. No agregar `setInterval` paralelos que escriban los mismos refs — produce race conditions y doble escritura en el mismo frame.

## Reglas para nuevos props

- Todo prop nuevo debe agregarse al interface `HelicalScrollCardsProps` como opcional (`?:`) con default en el destructuring.
- Si el prop afecta el loop de animación: usar un `ref` (ej. `autoScrollRef`) y leerlo dentro de `animate()`, nunca un `setInterval` externo.
- Si el prop afecta la configuración de la hélice: sincronizarlo en el `useEffect` de refs junto a `configRef`.

## Cleanup en unmount

- `isMountedRef.current = false` en el return del `useEffect` principal.
- Cada `useEffect` con side effects (intervals, listeners) debe tener su propio `clearInterval`/`removeEventListener` en su return — `isMountedRef` no los cancela.

## Publicación npm

- Siempre correr `npm run build` antes de publicar (`prepublishOnly` lo garantiza).
- Versionar con `npm version patch/minor/major` antes del publish.
- `dist/` está en `.gitignore` — no commitear artefactos compilados.
