import React, { useEffect, useRef } from 'react';
import { bindDuoImages } from './duo-images.mjs';
import './duo-image-viewer.css';

export default function DuoImageViewer({
  photo,
  secondaryPhoto,
  minWidth,
  minHeight,
  className,
}) {
  const containerRef = useRef(null);
  const firstFrameRef = useRef(null);
  const secondFrameRef = useRef(null);

  const hasPhoto = photo != null;
  const isPair = secondaryPhoto != null;
  const { coverUrl, duoLandscapeUrl, alt } = photo ?? {};
  const { coverUrl: secondCoverUrl, alt: secondAlt } = secondaryPhoto ?? {};

  useEffect(() => {
    if (!hasPhoto) return;

    const items = [{
      frame: firstFrameRef.current,
      coverUrl,
      duoLandscapeUrl,
      alt: alt ?? '',
    }];

    if (isPair) {
      items.push({
        frame: secondFrameRef.current,
        coverUrl: secondCoverUrl,
        alt: secondAlt ?? '',
      });
    }

    return bindDuoImages({
      container: containerRef.current,
      view: isPair ? 'pair' : 'single',
      items,
      minWidth,
      minHeight,
    });
  }, [
    hasPhoto, isPair, coverUrl, duoLandscapeUrl, alt,
    secondCoverUrl, secondAlt, minWidth, minHeight,
  ]);

  if (!hasPhoto) return null;

  const viewerClassName = ['duo-viewer', isPair && 'duo-viewer--pair', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className={viewerClassName}>
      <div className="duo-viewer__grid">
        <div ref={firstFrameRef} className="duo-frame" />
        {isPair && <div ref={secondFrameRef} className="duo-frame" />}
      </div>
    </div>
  );
}
