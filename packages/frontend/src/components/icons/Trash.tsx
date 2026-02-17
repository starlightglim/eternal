import { useCallback, useRef } from 'react';
import { TrashEmptyIcon, TrashFullIcon } from './PixelIcons';
import styles from './Trash.module.css';

interface TrashProps {
  isFull: boolean;
  isSelected: boolean;
  isDropTarget: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

/**
 * Trash Icon Component
 * Fixed position in bottom-right corner
 * Shows empty/full state based on contents
 * Acts as a drop target for deleting items
 */
export function Trash({
  isFull,
  isSelected,
  isDropTarget,
  onSelect,
  onDoubleClick,
  onDragOver,
  onDrop,
}: TrashProps) {
  const clickTimeoutRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      clickCountRef.current += 1;

      if (clickCountRef.current === 1) {
        clickTimeoutRef.current = window.setTimeout(() => {
          clickCountRef.current = 0;
          onSelect();
        }, 250);
      } else if (clickCountRef.current === 2) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickCountRef.current = 0;
        onDoubleClick();
      }
    },
    [onSelect, onDoubleClick]
  );

  const trashClasses = [
    styles.trash,
    isSelected && styles.selected,
    isDropTarget && styles.dropTarget,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={trashClasses}
      onClick={handleClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.iconImage}>
        {isFull ? <TrashFullIcon size={32} /> : <TrashEmptyIcon size={32} />}
      </div>
      <div className={`${styles.iconLabel} ${isSelected ? styles.labelSelected : ''}`}>
        <span>Trash</span>
      </div>
    </div>
  );
}
