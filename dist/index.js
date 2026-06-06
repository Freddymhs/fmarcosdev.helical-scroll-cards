import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { jsx, jsxs } from 'react/jsx-runtime';

// src/HelicalScrollCards.tsx
var DEFAULT_THEME = {
  gradientStart: "#1e40af",
  gradientMid: "#3b82f6",
  gradientEnd: "#1e40af",
  border: "#60a5fa",
  headerBg: "#1e3a8a",
  headerText: "#fbbf24",
  titleText: "#ffffff",
  dateBg: "#1e3a8a",
  dateText: "#fbbf24",
  dateSubtext: "#e5e7eb",
  footerBg: "#374151",
  footerText: "#9ca3af",
  helixLine: 2450411
};
var HELIX_DEFAULTS = {
  SLOT_COUNT: 15,
  TURNS: 3,
  SEGMENTS: 100,
  // Resolución de la hélice (más = curva más suave)
  HEIGHT_SPAN: 10,
  CARD_SCALE: 0.7,
  MAX_TEXTURE_CACHE: 50,
  // 🎯 Nuevos configurables
  Y_OFFSET: 0.4,
  // Desplazamiento vertical inicial de las cards
  CAMERA_FOV: 50,
  // Ángulo de visión (30=zoom, 70=angular)
  CARD_CANVAS_WIDTH: 200,
  // Ancho del canvas de las cards
  CARD_CANVAS_HEIGHT: 320,
  // Alto del canvas de las cards (ratio 1:1.6)
  TITLE_MAX_LENGTH: 18,
  // Caracteres máx por línea en títulos
  VISIBLE_OFFSET: 2
  // Desde qué slot empiezan a aparecer las cards (0=tope, 2=2 slots abajo)
};
var HelicalScrollCards = ({
  items = [],
  config,
  debug = false,
  hiddenReposition = true,
  clockwise = false,
  scrollSpeed = 0.5,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  theme: customTheme,
  renderCardLabel,
  renderCardTitle,
  renderCardDate,
  loadingText = "Loading more...",
  emptyText = "No items to display",
  className = "",
  autoScroll = false
}) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const theme = { ...DEFAULT_THEME, ...customTheme };
  const helixConfig = {
    slotCount: config?.slotCount ?? HELIX_DEFAULTS.SLOT_COUNT,
    turns: config?.turns ?? HELIX_DEFAULTS.TURNS,
    segments: HELIX_DEFAULTS.SEGMENTS,
    // Interno, siempre 100
    helixHeight: config?.helixHeight ?? HELIX_DEFAULTS.HEIGHT_SPAN,
    cardScale: config?.cardScale ?? HELIX_DEFAULTS.CARD_SCALE,
    yOffset: config?.yOffset ?? HELIX_DEFAULTS.Y_OFFSET,
    cameraFov: config?.cameraFov ?? HELIX_DEFAULTS.CAMERA_FOV,
    topMarginSlots: config?.topMarginSlots ?? HELIX_DEFAULTS.VISIBLE_OFFSET,
    // Card config
    cardCanvasWidth: config?.cardConfig?.canvasWidth ?? HELIX_DEFAULTS.CARD_CANVAS_WIDTH,
    cardCanvasHeight: config?.cardConfig?.canvasHeight ?? HELIX_DEFAULTS.CARD_CANVAS_HEIGHT,
    titleMaxLength: config?.cardConfig?.titleMaxLength ?? HELIX_DEFAULTS.TITLE_MAX_LENGTH
  };
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const targetScrollRef = useRef(0);
  const cardsRef = useRef([]);
  const pointsRef = useRef([]);
  const animationFrameIdRef = useRef(void 0);
  const textureCacheRef = useRef(/* @__PURE__ */ new Map());
  const resizeTimeoutRef = useRef(
    void 0
  );
  const fadeAnimationsRef = useRef(/* @__PURE__ */ new Set());
  const isMountedRef = useRef(true);
  const autoScrollRef = useRef(autoScroll);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef(void 0);
  const lastLoadMoreCallRef = useRef(0);
  const maxScrollRef = useRef(0);
  const itemsRef = useRef(items);
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  const onLoadMoreRef = useRef(onLoadMore);
  const themeRef = useRef(theme);
  const configRef = useRef({
    turns: helixConfig.turns,
    segments: helixConfig.segments,
    helixHeight: helixConfig.helixHeight,
    cardCount: helixConfig.slotCount,
    cardScale: helixConfig.cardScale,
    scrollSensitivity: scrollSpeed,
    transitionThreshold: 0.95,
    yOffset: helixConfig.yOffset,
    cameraFov: helixConfig.cameraFov,
    cardCanvasWidth: helixConfig.cardCanvasWidth,
    cardCanvasHeight: helixConfig.cardCanvasHeight,
    titleMaxLength: helixConfig.titleMaxLength,
    topMarginSlots: helixConfig.topMarginSlots
  });
  useEffect(() => {
    itemsRef.current = items;
    hasMoreRef.current = hasMore;
    loadingMoreRef.current = loadingMore;
    onLoadMoreRef.current = onLoadMore;
    themeRef.current = theme;
    autoScrollRef.current = autoScroll;
    configRef.current = {
      ...configRef.current,
      turns: helixConfig.turns,
      segments: helixConfig.segments,
      helixHeight: helixConfig.helixHeight,
      cardCount: helixConfig.slotCount,
      cardScale: helixConfig.cardScale,
      scrollSensitivity: scrollSpeed,
      yOffset: helixConfig.yOffset,
      cameraFov: helixConfig.cameraFov,
      cardCanvasWidth: helixConfig.cardCanvasWidth,
      cardCanvasHeight: helixConfig.cardCanvasHeight,
      titleMaxLength: helixConfig.titleMaxLength,
      topMarginSlots: helixConfig.topMarginSlots
    };
    const { cardCount, segments } = configRef.current;
    const maxScroll = Math.max(
      0,
      (items.length - cardCount) * (segments / cardCount)
    );
    maxScrollRef.current = maxScroll;
    if (textureCacheRef.current.size > HELIX_DEFAULTS.MAX_TEXTURE_CACHE) {
      const entries = Array.from(textureCacheRef.current.entries());
      const toRemove = entries.slice(
        0,
        entries.length - HELIX_DEFAULTS.MAX_TEXTURE_CACHE
      );
      toRemove.forEach(([key, texture]) => {
        texture.dispose();
        textureCacheRef.current.delete(key);
      });
    }
  }, [items, hasMore, loadingMore, onLoadMore, theme]);
  const getCardLabel = useCallback(
    (item, index) => {
      if (!item) return `#${index + 1}`;
      if (renderCardLabel) return renderCardLabel(item, index);
      return `#${item.id}`;
    },
    [renderCardLabel]
  );
  const getCardTitle = useCallback(
    (item, index) => {
      if (!item) return `Item ${index + 1}`;
      if (renderCardTitle) return renderCardTitle(item);
      return item.title || item.Title || `Item ${index + 1}`;
    },
    [renderCardTitle]
  );
  const getCardDate = useCallback(
    (item) => {
      if (!item) return null;
      if (renderCardDate) return renderCardDate(item);
      const dateStr = item.date || item.publishedAt;
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      return {
        day: date.getDate().toString().padStart(2, "0"),
        month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        year: date.getFullYear().toString()
      };
    },
    [renderCardDate]
  );
  const createCardTexture = useCallback(
    (item, index) => {
      const canvasW = configRef.current.cardCanvasWidth;
      const canvasH = configRef.current.cardCanvasHeight;
      const maxLength = configRef.current.titleMaxLength;
      const cacheKey = item ? `${item.id}-${getCardTitle(item, index)}-${canvasW}x${canvasH}` : `empty-${index}-${canvasW}x${canvasH}`;
      const cached = textureCacheRef.current.get(cacheKey);
      if (cached) return cached;
      const currentTheme = themeRef.current;
      const canvas = Object.assign(document.createElement("canvas"), {
        width: canvasW,
        height: canvasH
      });
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("Canvas 2D context not available");
        return new THREE.CanvasTexture(canvas);
      }
      const centerX = canvasW / 2;
      const titleStartY = canvasH * 0.18;
      const dateY = canvasH * 0.688;
      const dateH = canvasH * 0.188;
      const fontBadge = Math.round(canvasH * 0.0375);
      const fontTitle = Math.round(canvasH * 0.063);
      const fontDateDay = Math.round(canvasH * 0.075);
      const fontDateSub = Math.round(canvasH * 0.0375);
      const lineSpacing = Math.round(canvasH * 0.088);
      const fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
      gradient.addColorStop(0, currentTheme.gradientStart);
      gradient.addColorStop(0.7, currentTheme.gradientMid);
      gradient.addColorStop(1, currentTheme.gradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasW, canvasH);
      const borderWidth = Math.max(2, Math.round(canvasW * 0.01));
      ctx.strokeStyle = currentTheme.border;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(
        borderWidth / 2,
        borderWidth / 2,
        canvasW - borderWidth,
        canvasH - borderWidth
      );
      const badgeText = getCardLabel(item, index);
      ctx.font = `bold ${fontBadge}px ${fontFamily}`;
      const badgeWidth = ctx.measureText(badgeText).width + Math.round(canvasW * 0.06);
      const badgeHeight = Math.round(canvasH * 0.06);
      const badgeX = canvasW - badgeWidth - Math.round(canvasW * 0.05);
      const badgeY = Math.round(canvasH * 0.03);
      ctx.fillStyle = currentTheme.headerBg;
      const radius = Math.round(canvasH * 0.015);
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
      ctx.fill();
      ctx.fillStyle = currentTheme.headerText;
      ctx.textAlign = "center";
      ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight * 0.65);
      const title = getCardTitle(item, index);
      ctx.fillStyle = currentTheme.titleText;
      ctx.font = `bold ${fontTitle}px ${fontFamily}`;
      const words = title.split(" ");
      const lines = [];
      let currentLine = "";
      for (const word of words) {
        if ((currentLine + " " + word).length < maxLength) {
          currentLine += (currentLine ? " " : "") + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      lines.slice(0, 4).forEach((line, idx) => {
        ctx.fillText(line, centerX, titleStartY + idx * lineSpacing);
      });
      const dateInfo = getCardDate(item);
      if (dateInfo) {
        const datePadding = Math.round(canvasW * 0.05);
        ctx.fillStyle = currentTheme.dateBg;
        ctx.fillRect(datePadding, dateY, canvasW - datePadding * 2, dateH);
        ctx.fillStyle = currentTheme.dateText;
        ctx.font = `bold ${fontDateDay}px ${fontFamily}`;
        ctx.fillText(dateInfo.day, centerX, dateY + dateH * 0.42);
        ctx.fillStyle = currentTheme.dateSubtext;
        ctx.font = `${fontDateSub}px ${fontFamily}`;
        ctx.fillText(
          `${dateInfo.month} ${dateInfo.year}`,
          centerX,
          dateY + dateH * 0.75
        );
      }
      const texture = new THREE.CanvasTexture(canvas);
      textureCacheRef.current.set(cacheKey, texture);
      return texture;
    },
    [getCardLabel, getCardTitle, getCardDate]
  );
  const updateCardTexture = useCallback(
    (card, item, index) => {
      const plane = card.children.find(
        (child) => child instanceof THREE.Mesh
      );
      if (plane && plane.material) {
        const material = plane.material;
        const newTexture = createCardTexture(item, index);
        if (material.map !== newTexture) {
          material.map = newTexture;
          material.needsUpdate = true;
        }
      }
    },
    [createCardTexture]
  );
  useEffect(() => {
    if (!isClient || !mountRef.current) return;
    isMountedRef.current = true;
    mountRef.current.innerHTML = "";
    const updateSize = () => {
      const rect = mountRef.current.getBoundingClientRect();
      return {
        width: Math.max(rect.width, 100),
        height: Math.max(rect.height, 100)
      };
    };
    const generateHelixPoints = (w, h) => {
      const isMobile2 = w < 768;
      const isUltrawide2 = w / h > 2;
      const radius2 = isMobile2 ? Math.max(2, w / 200) : Math.max(2.5, Math.min(4, w / 400));
      const { turns, segments: segments2, helixHeight } = configRef.current;
      const direction = clockwise ? 1 : -1;
      const yOffset = configRef.current.yOffset;
      const newPoints = Array.from({ length: segments2 }, (_, i) => {
        const theta = i / segments2 * turns * Math.PI * 2;
        return new THREE.Vector3(
          radius2 * Math.cos(theta),
          i / segments2 * helixHeight + yOffset,
          // Shift UP
          radius2 * Math.sin(theta) * direction
        );
      });
      return { points: newPoints, radius: radius2, isMobile: isMobile2, isUltrawide: isUltrawide2 };
    };
    let { width, height } = updateSize();
    const {
      points: initialPoints,
      radius,
      isMobile,
      isUltrawide
    } = generateHelixPoints(width, height);
    pointsRef.current = initialPoints;
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(
      configRef.current.cameraFov,
      width / height,
      0.1,
      100
    );
    const cameraY = configRef.current.helixHeight * 0.5;
    const cameraDistance = isMobile ? Math.max(radius * 2.5, 8) : isUltrawide ? Math.max(radius * 2.2, 7) : Math.max(radius * 2.5, 9);
    camera.position.set(0, cameraY, cameraDistance);
    camera.lookAt(0, cameraY, 0);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const { segments, cardCount } = configRef.current;
    if (debug) {
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(initialPoints),
          new THREE.LineBasicMaterial({
            color: themeRef.current.helixLine,
            linewidth: 2
          })
        )
      );
    }
    const cardScale = configRef.current.cardScale;
    const { cardCanvasWidth, cardCanvasHeight } = configRef.current;
    const aspectRatio = cardCanvasWidth / cardCanvasHeight;
    const planeHeight = 2.4 * cardScale;
    const planeWidth = planeHeight * aspectRatio;
    const cards = Array.from({ length: cardCount }, (_, i) => {
      const idx = Math.floor(i / cardCount * segments);
      const card = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.8 * cardScale,
          0.4 * cardScale,
          0.05 * cardScale
        ),
        new THREE.MeshPhongMaterial({ color: 14427686, shininess: 50 })
      );
      card.position.copy(initialPoints[idx]);
      const item = itemsRef.current[i];
      const texture = createCardTexture(item, i);
      const numberPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(planeWidth, planeHeight),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true })
      );
      numberPlane.position.z = 0.04;
      card.add(numberPlane);
      card.userData = { index: i, articleIndex: i };
      scene.add(card);
      return card;
    });
    cardsRef.current = cards;
    scene.add(new THREE.AmbientLight(16777215, 0.6));
    const directionalLight = new THREE.DirectionalLight(16777215, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    const handleScroll = (delta) => {
      const scrollDelta = delta * configRef.current.scrollSensitivity;
      const newTarget = targetScrollRef.current + scrollDelta;
      targetScrollRef.current = Math.max(
        0,
        Math.min(newTarget, maxScrollRef.current)
      );
    };
    const pauseAutoScroll = () => {
      isUserScrollingRef.current = true;
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1500);
    };
    const handleWheel = (e) => {
      e.preventDefault();
      pauseAutoScroll();
      handleScroll(e.deltaY > 0 ? 1 : -1);
    };
    let touchStartY = 0;
    let lastTouchY = 0;
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      lastTouchY = touchStartY;
    };
    const handleTouchMove = (e) => {
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;
      if (Math.abs(deltaY) > 2) {
        pauseAutoScroll();
        handleScroll(deltaY > 0 ? 0.3 : -0.3);
      }
    };
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current)
        return;
      const { width: newWidth, height: newHeight } = updateSize();
      const {
        points: newPoints,
        radius: newRadius,
        isMobile: newIsMobile,
        isUltrawide: newIsUltrawide
      } = generateHelixPoints(newWidth, newHeight);
      pointsRef.current = newPoints;
      cameraRef.current.aspect = newWidth / newHeight;
      const newCameraDistance = newIsMobile ? Math.max(newRadius * 2.5, 8) : newIsUltrawide ? Math.max(newRadius * 2.2, 7) : Math.max(newRadius * 2.5, 9);
      cameraRef.current.position.z = newCameraDistance;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(handleResize, 100);
    });
    resizeObserver.observe(mountRef.current);
    const isCardInTransition = (normalizedPos) => {
      const threshold = configRef.current.transitionThreshold;
      return normalizedPos > threshold || normalizedPos < 1 - threshold;
    };
    const tempVec = new THREE.Vector3();
    const tempTangent = new THREE.Vector3();
    const tempLook = new THREE.Vector3();
    const animate = () => {
      if (!isMountedRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (autoScrollRef.current && !isUserScrollingRef.current) {
        targetScrollRef.current = Math.min(
          targetScrollRef.current + 0.03,
          maxScrollRef.current
        );
      }
      scrollOffsetRef.current += (targetScrollRef.current - scrollOffsetRef.current) * 0.12;
      const currentItems = itemsRef.current;
      const { cardCount: cardCount2, segments: segments2 } = configRef.current;
      const scrollInArticles = scrollOffsetRef.current / (segments2 / cardCount2);
      const baseArticleIndex = Math.floor(scrollInArticles);
      const lastVisibleArticle = baseArticleIndex + cardCount2;
      if (lastVisibleArticle >= currentItems.length - 5 && hasMoreRef.current && !loadingMoreRef.current && onLoadMoreRef.current) {
        const now = Date.now();
        if (now - lastLoadMoreCallRef.current > 1e3) {
          lastLoadMoreCallRef.current = now;
          onLoadMoreRef.current();
        }
      }
      if (cardsRef.current.length > 0) {
        const spacing = segments2 / cardCount2;
        cardsRef.current.forEach((card, slotIndex) => {
          const rawPos = slotIndex * spacing + scrollOffsetRef.current;
          let pos = rawPos % segments2;
          if (pos < 0) pos += segments2;
          const normalizedPos = pos / segments2;
          const cyclesCompleted = Math.floor(rawPos / segments2);
          const baseForThisSlot = cyclesCompleted * cardCount2;
          const topMarginSlots = configRef.current.topMarginSlots;
          const offsetInWindow = cardCount2 - 1 - topMarginSlots - slotIndex;
          const articleIndex = baseForThisSlot + offsetInWindow;
          const item = currentItems[articleIndex];
          if (card.userData.articleIndex !== articleIndex) {
            card.userData.articleIndex = articleIndex;
            updateCardTexture(card, item, articleIndex);
          }
          if (!item || articleIndex < 0) {
            card.visible = false;
            return;
          }
          const posIdx = Math.floor(pos);
          const nextIdx = (posIdx + 1) % pointsRef.current.length;
          const fraction = pos - posIdx;
          const shouldHide = hiddenReposition && isCardInTransition(normalizedPos);
          if (shouldHide) {
            card.visible = false;
            card.userData.wasHidden = true;
          } else {
            card.visible = true;
            tempVec.lerpVectors(
              pointsRef.current[posIdx],
              pointsRef.current[nextIdx],
              fraction
            );
            card.position.copy(tempVec);
            tempTangent.subVectors(pointsRef.current[nextIdx], pointsRef.current[posIdx]).normalize();
            tempLook.subVectors(camera.position, card.position).normalize();
            card.lookAt(tempVec.copy(card.position).add(tempLook));
            card.rotateX(
              Math.atan2(
                tempTangent.y,
                Math.sqrt(
                  tempTangent.x * tempTangent.x + tempTangent.z * tempTangent.z
                )
              )
            );
            const material = card.material;
            if (card.userData.wasHidden && material) {
              card.userData.wasHidden = false;
              if (!fadeAnimationsRef.current.has(slotIndex)) {
                fadeAnimationsRef.current.add(slotIndex);
                material.opacity = 0;
                material.transparent = true;
                const fadeIn = () => {
                  if (!isMountedRef.current) {
                    fadeAnimationsRef.current.delete(slotIndex);
                    return;
                  }
                  if (material) {
                    material.opacity = Math.min(1, material.opacity + 0.08);
                    if (material.opacity < 1) {
                      requestAnimationFrame(fadeIn);
                    } else {
                      material.transparent = false;
                      fadeAnimationsRef.current.delete(slotIndex);
                    }
                  }
                };
                fadeIn();
              }
            }
          }
        });
      }
      renderer.render(scene, camera);
    };
    const element = mountRef.current;
    element.addEventListener("wheel", handleWheel, { passive: false });
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("resize", handleResize);
    animate();
    return () => {
      isMountedRef.current = false;
      fadeAnimationsRef.current.clear();
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      window.removeEventListener("resize", handleResize);
      element?.removeEventListener("wheel", handleWheel);
      element?.removeEventListener("touchstart", handleTouchStart);
      element?.removeEventListener("touchmove", handleTouchMove);
      if (animationFrameIdRef.current)
        cancelAnimationFrame(animationFrameIdRef.current);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeObserver.disconnect();
      rendererRef.current?.dispose();
      cardsRef.current.forEach((card) => {
        card.geometry?.dispose();
        card.material?.dispose();
        card.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            child.material?.dispose();
          }
        });
      });
      textureCacheRef.current.forEach((texture) => texture.dispose());
      textureCacheRef.current.clear();
    };
  }, [
    isClient,
    debug,
    hiddenReposition,
    clockwise,
    createCardTexture,
    updateCardTexture
  ]);
  if (!isClient) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: `w-full h-full flex items-center justify-center ${className}`,
        children: /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: emptyText })
      }
    );
  }
  if (items.length === 0 && !loadingMore) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: `w-full h-full flex items-center justify-center ${className}`,
        children: /* @__PURE__ */ jsx("p", { className: "text-gray-500", children: emptyText })
      }
    );
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `w-full h-full flex-1 ${className}`,
      style: {
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        // 🐛 Debug: borde rojo para ver límites del componente
        ...debug && {
          border: "2px solid red",
          boxShadow: "inset 0 0 0 2px rgba(255,0,0,0.3)"
        }
      },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            ref: mountRef,
            className: "w-full h-full flex-1",
            style: {
              position: "relative",
              overflow: "hidden",
              touchAction: "none"
            }
          }
        ),
        loadingMore && /* @__PURE__ */ jsx("div", { className: "absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded-full text-sm shadow-lg", children: loadingText })
      ]
    }
  );
};
var HelicalScrollCards_default = HelicalScrollCards;

export { HelicalScrollCards_default as HelicalScrollCards };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map