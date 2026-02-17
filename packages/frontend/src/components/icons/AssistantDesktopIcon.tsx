import { useCallback, useRef } from 'react';
import { AssistantIcon } from './PixelIcons';
import styles from './AssistantDesktopIcon.module.css';

interface AssistantDesktopIconProps {
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

/**
 * Desk Assistant Desktop Icon Component
 * Fixed position in bottom-left corner
 * Opens the Desk Assistant window when double-clicked
 */
export function AssistantDesktopIcon({
  isSelected,
  onSelect,
  onDoubleClick,
}: AssistantDesktopIconProps) {
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

  const iconClasses = [
    styles.assistantIcon,
    isSelected && styles.selected,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={iconClasses}
      onClick={handleClick}
    >
      <div className={styles.iconImage}>
        <AssistantIcon size={32} />
      </div>
      <div className={`${styles.iconLabel} ${isSelected ? styles.labelSelected : ''}`}>
        <span>Desk Assistant</span>
      </div>
    </div>
  );
}
