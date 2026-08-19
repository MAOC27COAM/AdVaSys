import React, { useRef, useState } from 'react';
import FilterPill from './FilterPill';
import styles from './UserManager.module.css';

function ColumnBar({ droppableId, columnKeys, allColumns, filterConfigs, filterValues, onFilterChange, barLabel, variant, onDrop, availableFilterValues }) {
  const barRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropIndexRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (barRef.current) {
      const barRect = barRef.current.getBoundingClientRect();
      const mouseX = e.clientX - barRect.left;
      const pills = barRef.current.querySelectorAll('[data-pill-key]');
      let targetIndex = pills.length;
      for (let i = 0; i < pills.length; i++) {
        const pillRect = pills[i].getBoundingClientRect();
        const pillMidX = pillRect.left - barRect.left + pillRect.width / 2;
        if (mouseX < pillMidX) {
          targetIndex = i;
          break;
        }
      }
      dropIndexRef.current = targetIndex;
    }

    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (barRef.current && !barRef.current.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const destIndex = dropIndexRef.current ?? columnKeys.length;
      if (onDrop) {
        onDrop(data, droppableId, destIndex);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      ref={barRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        styles.columnBar,
        variant === 'visible' ? styles.columnBarVisible : styles.columnBarHidden,
        isDragOver ? styles.columnBarDragOver : '',
      ].filter(Boolean).join(' ')}
    >
      <span className={styles.columnBarLabel}>{barLabel}</span>
      <div className={styles.columnBarInner}>
        {columnKeys.map((key, index) => {
          const col = allColumns.find((c) => c.key === key);
          const config = filterConfigs[key];
          const filterValue = config?.filterKey ? filterValues[config.filterKey] : '';
          const availableValues = config?.type === 'textMulti' && availableFilterValues
            ? availableFilterValues[key] || []
            : [];
          return (
            <FilterPill
              key={key}
              columnKey={key}
              columnLabel={col?.header || key}
              filterConfig={config}
              filterValue={filterValue}
              onFilterChange={onFilterChange}
              index={index}
              variant={variant}
              availableValues={availableValues}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ColumnBar;
