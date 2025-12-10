import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ImageResizeWrapperProps {
  src: string;
  alt?: string;
  initialWidth?: number;
  initialHeight?: number;
  onResize?: (width: number, height: number) => void;
  onDelete?: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

const ImageResizeWrapper: React.FC<ImageResizeWrapperProps> = ({
  src,
  alt = '',
  initialWidth,
  initialHeight,
  onResize,
  onDelete,
  selected = false,
  onSelect,
}) => {
  const [dimensions, setDimensions] = useState({
    width: initialWidth || 'auto',
    height: initialHeight || 'auto',
  });
  const [isResizing, setIsResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startDimensions = useRef({ width: 0, height: 0 });
  const resizeCorner = useRef<string>('');

  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setAspectRatio(naturalWidth / naturalHeight);
    }
  }, [src]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setAspectRatio(naturalWidth / naturalHeight);
      if (!initialWidth && !initialHeight) {
        setDimensions({
          width: Math.min(naturalWidth, 600),
          height: Math.min(naturalWidth, 600) / aspectRatio,
        });
      }
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    resizeCorner.current = corner;
    startPos.current = { x: e.clientX, y: e.clientY };
    
    if (imageRef.current) {
      startDimensions.current = {
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    let newWidth = startDimensions.current.width;
    let newHeight = startDimensions.current.height;

    const corner = resizeCorner.current;
    
    if (corner.includes('right')) {
      newWidth = startDimensions.current.width + deltaX;
    } else if (corner.includes('left')) {
      newWidth = startDimensions.current.width - deltaX;
    }

    // Maintain aspect ratio
    newHeight = newWidth / aspectRatio;

    // Minimum size
    newWidth = Math.max(50, newWidth);
    newHeight = Math.max(50, newHeight);

    // Maximum size
    newWidth = Math.min(800, newWidth);
    newHeight = newWidth / aspectRatio;

    setDimensions({ width: newWidth, height: newHeight });
  }, [isResizing, aspectRatio]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      if (onResize && typeof dimensions.width === 'number' && typeof dimensions.height === 'number') {
        onResize(dimensions.width, dimensions.height);
      }
    }
  }, [isResizing, dimensions, onResize]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && selected) {
      e.preventDefault();
      onDelete?.();
    }
  };

  return (
    <div
      className={cn('image-wrapper inline-block relative my-4', selected && 'selected')}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        style={{
          width: typeof dimensions.width === 'number' ? `${dimensions.width}px` : dimensions.width,
          height: typeof dimensions.height === 'number' ? `${dimensions.height}px` : dimensions.height,
          maxWidth: '100%',
        }}
        className="rounded-lg"
        draggable={false}
      />
      
      {selected && (
        <>
          <div
            className="resize-handle top-left"
            onMouseDown={(e) => handleMouseDown(e, 'top-left')}
          />
          <div
            className="resize-handle top-right"
            onMouseDown={(e) => handleMouseDown(e, 'top-right')}
          />
          <div
            className="resize-handle bottom-left"
            onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
          />
          <div
            className="resize-handle bottom-right"
            onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
          />
        </>
      )}
    </div>
  );
};

export default ImageResizeWrapper;
