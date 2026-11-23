/**
 * Resolve the layout and image candidates using CSS pixel dimensions.
 * `width` and `height` describe the page content area. The image box can have
 * its own dimensions. `view` is either `single` or `pair`.
 */
export function resolveDuoImage({
  width,
  height,
  imageWidth = width,
  imageHeight = height,
  view = 'single',
  minWidth = 640,
  minHeight = 500,
  images = {},
}) {
  const isLarge = width >= minWidth && height >= minHeight;
  const isPair = view === 'pair';
  const columns = isLarge && isPair ? 2 : 1;
  const cover = imageUrl(images.coverUrl);

  if (!isLarge || isPair) {
    return { columns, sources: cover ? [cover] : [] };
  }

  const directionUrl = imageWidth > imageHeight
    ? images.duoLandscapeUrl
    : images.duoPortraitUrl;
  const preferred = imageUrl(directionUrl);
  const sources = [preferred, cover].filter(Boolean);
  return { columns, sources: [...new Set(sources)] };
}

function imageUrl(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Bind one page to its image frames. Each item takes a `frame` element, `alt`,
 * `coverUrl`, and optional `duoLandscapeUrl` and `duoPortraitUrl`.
 * Give the container and frames CSS-defined sizes so image loading cannot change
 * the measured layout. For a pair, use a grid with this column definition:
 * `repeat(var(--duo-columns, 1), minmax(0, 1fr))`.
 * Call the returned function when unmounting or binding a new set of items.
 */
export function bindDuoImages({ container, items, view = 'single', minWidth, minHeight }) {
  const { ResizeObserver } = container.ownerDocument.defaultView;
  const sizes = new Map();
  const frames = items.map(({ frame, alt = '', ...images }) => ({
    frame,
    alt,
    images,
    sources: null,
    displayedUrl: '',
  }));
  let columns;

  const observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      sizes.set(target, contentRect);
    }

    const content = sizes.get(container);
    if (!content?.width || !content.height) return;

    for (const state of frames) {
      const box = sizes.get(state.frame);
      const layout = resolveDuoImage({
        width: content.width,
        height: content.height,
        imageWidth: box?.width,
        imageHeight: box?.height,
        view,
        minWidth,
        minHeight,
        images: state.images,
      });

      if (columns !== layout.columns) {
        columns = layout.columns;
        container.style.setProperty('--duo-columns', String(columns));
      }

      if (box?.width && box.height) showImage(state, layout.sources);
    }
  });

  observer.observe(container);
  for (const state of frames) {
    showStatus(state.frame, '图片加载中…');
    observer.observe(state.frame);
  }

  return () => {
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
