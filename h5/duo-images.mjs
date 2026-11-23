/** Return the preferred image type for the current browser viewport. */
export function getDuoImageType() {
  return getViewportLayout(globalThis.window).imageType;
}

/** Report the initial viewport layout and subsequent changes. Returns a cleanup function. */
export function watchDuoLayout(onChange) {
  const viewport = globalThis.window;
  let previousScreenMode;
  let previousImageType;

  function update() {
    const { screenMode, imageType } = getViewportLayout(viewport);
    if (screenMode === previousScreenMode && imageType === previousImageType) return;

    previousScreenMode = screenMode;
    previousImageType = imageType;
    onChange({ screenMode, imageType });
  }

  update();
  viewport?.addEventListener('resize', update);
  return () => viewport?.removeEventListener('resize', update);
}

/**
 * Resolve image candidates from `coverUrl` and optional `duoLandscapeUrl`.
 * Read the current browser viewport. On the server, use the cover.
 */
export function resolveDuoImage(options = {}) {
  const { columns, imageType } = getViewportLayout(globalThis.window, options);
  const sources = getImageSources(options.images ?? options, imageType);
  return { columns, sources };
}

function getViewportLayout(viewport, {
  view = 'single',
  minWidth = 640,
  minHeight = 500,
} = {}) {
  const width = viewport?.innerWidth;
  const height = viewport?.innerHeight;
  const isLarge = width >= minWidth && height >= minHeight;
  const isPair = view === 'pair';
  return {
    columns: isLarge && isPair ? 2 : 1,
    screenMode: isLarge ? 'large' : 'compact',
    imageType: isLarge && !isPair && width > height ? 'duo' : 'cover',
  };
}

function getImageSources(images, imageType) {
  const cover = imageUrl(images.coverUrl);
  const landscape = imageType === 'duo' ? imageUrl(images.duoLandscapeUrl) : '';
  return [...new Set([landscape, cover].filter(Boolean))];
}

function imageUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Bind one page to its image frames. Each item takes a `frame` element, `alt`,
 * `coverUrl`, and optional `duoLandscapeUrl`. The window's resize event
 * triggers selection. The observer defers loading until the frames have size.
 * For a pair, use a grid with this column definition:
 * `repeat(var(--duo-columns, 1), minmax(0, 1fr))`.
 * Call the returned function when unmounting or binding a new set of items.
 */
export function bindDuoImages({ container, items, view = 'single', minWidth, minHeight }) {
  const viewport = container.ownerDocument.defaultView;
  const visible = new Set();
  const frames = items.map(({ frame, alt = '', ...images }) => ({
    frame,
    alt,
    images,
    sources: null,
    displayedUrl: '',
  }));
  let columns;

  function update() {
    if (!visible.has(container)) return;

    const layout = getViewportLayout(viewport, { view, minWidth, minHeight });
    if (columns !== layout.columns) {
      columns = layout.columns;
      container.style.setProperty('--duo-columns', String(columns));
    }
    for (const state of frames) {
      if (visible.has(state.frame)) {
        showImage(state, getImageSources(state.images, layout.imageType));
      }
    }
  }

  const observer = new viewport.ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (contentRect.width && contentRect.height) visible.add(target);
      else visible.delete(target);
    }
    update();
  });

  viewport.addEventListener('resize', update);
  observer.observe(container);
  for (const state of frames) {
    showStatus(state.frame, '图片加载中…');
    observer.observe(state.frame);
  }

  return () => {
    viewport.removeEventListener('resize', update);
    observer.disconnect();
    for (const state of frames) state.sources = null;
  };
}

async function showImage(state, sources) {
  if (state.sources && state.sources[0] === sources[0] && state.sources[1] === sources[1]) {
    return;
  }
  state.sources = sources;

  for (const src of sources) {
    if (state.sources !== sources || state.displayedUrl === src) return;

    const image = state.frame.ownerDocument.createElement('img');
    image.alt = state.alt;
    Object.assign(image.style, { display: 'block', width: '100%', height: '100%', objectFit: 'contain' });
    image.src = src;

    try {
      await image.decode();
    } catch {
      continue;
    }

    if (state.sources !== sources) return;
    state.frame.replaceChildren(image);
    state.displayedUrl = src;
    return;
  }

  if (state.sources !== sources) return;
  state.displayedUrl = '';
  showStatus(state.frame, '图片暂不可用');
}

function showStatus(frame, message) {
  const status = frame.ownerDocument.createElement('span');
  status.setAttribute('role', 'status');
  status.textContent = message;
  frame.replaceChildren(status);
}
