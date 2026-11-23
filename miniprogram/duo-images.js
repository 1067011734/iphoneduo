function readWindowSize(runtime) {
  if (!runtime) return;

  try {
    if (typeof runtime.getWindowInfo === 'function') {
      return runtime.getWindowInfo();
    }

    if (typeof runtime.getSystemInfoSync === 'function') {
      return runtime.getSystemInfoSync();
    }
  } catch (error) {
    // An unavailable viewport falls back to the cover until it can be read.
    return undefined;
  }
}

function getViewportLayout(size) {
  const { windowWidth, windowHeight } = size || {};
  const isLarge = windowWidth >= 640 && windowHeight >= 500;
  return {
    screenMode: isLarge ? 'large' : 'compact',
    imageType: isLarge && windowWidth > windowHeight ? 'duo' : 'cover',
  };
}

/** Return the preferred image type for the current Mini Program window. */
function getDuoImageType() {
  const runtime = typeof wx === 'undefined' ? undefined : wx;
  return getViewportLayout(readWindowSize(runtime)).imageType;
}

/** Report the initial layout and subsequent changes. Returns a cleanup function. */
function watchDuoLayout(onChange) {
  const runtime = typeof wx === 'undefined' ? undefined : wx;
  const supportsResize = runtime && typeof runtime.onWindowResize === 'function'
    && typeof runtime.offWindowResize === 'function';
  let previousScreenMode;
  let previousImageType;

  function report(size) {
    const { screenMode, imageType } = getViewportLayout(size);
    if (screenMode === previousScreenMode && imageType === previousImageType) return;

    previousScreenMode = screenMode;
    previousImageType = imageType;
    onChange({ screenMode, imageType });
  }

  function handleResize(event) {
    report((event && event.size) || readWindowSize(runtime));
  }

  report(readWindowSize(runtime));
  if (supportsResize) runtime.onWindowResize(handleResize);

  return () => {
    if (supportsResize) runtime.offWindowResize(handleResize);
  };
}

module.exports = { getDuoImageType, watchDuoLayout };
