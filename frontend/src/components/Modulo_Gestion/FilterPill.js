import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './UserManager.module.css';

function FilterPopoverMultiSelect({ config, currentValue, onChange, onClose, filterKey, style }) {
  const selected = Array.isArray(currentValue) ? currentValue : [];

  const handleToggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(filterKey, next);
  };

  return (
    <div className={styles.filterPopover} style={style} onClick={(e) => e.stopPropagation()}>
      <div className={styles.filterPopoverSelect}>
        <button
          className={`${styles.filterPopoverOption} ${selected.length === 0 ? styles.filterPopoverOptionActive : ''}`}
          onClick={() => { onChange(filterKey, config.clearValue); onClose(); }}
        >
          {config.defaultLabel}
        </button>
        {config.options.map((opt) => (
          <label key={opt.value} className={styles.filterPopoverCheckLabel}>
            <input
              type="checkbox"
              className={styles.filterPopoverCheckbox}
              checked={selected.includes(opt.value)}
              onChange={() => handleToggle(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FilterPopoverTextWithCheckboxes({ config, currentValue, onChange, onClose, filterKey, style, availableValues }) {
  const selected = Array.isArray(currentValue) ? currentValue : [];

  const [searchText, setSearchText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const filteredValues = searchText
    ? availableValues.filter((v) => v.toLowerCase().includes(searchText.toLowerCase()))
    : availableValues;

  const allSelected = filteredValues.length > 0 && filteredValues.every((v) => selected.includes(v));

  const handleToggle = (val) => {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(filterKey, next);
  };

  const handleToggleAll = () => {
    if (allSelected) {
      onChange(filterKey, selected.filter((v) => !filteredValues.includes(v)));
    } else {
      onChange(filterKey, [...new Set([...selected, ...filteredValues])]);
    }
  };

  const handleClear = () => {
    setSearchText('');
    onChange(filterKey, config.clearValue);
    onClose();
  };

  return (
    <div className={styles.filterPopover} style={style} onClick={(e) => e.stopPropagation()}>
      <div className={styles.filterPopoverTextWrap}>
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={config.placeholder || 'Buscar...'}
          className={styles.filterPopoverInput}
        />
        {searchText && (
          <button className={styles.filterPopoverClear} onClick={() => setSearchText('')} type="button">
            &times;
          </button>
        )}
      </div>
      <div className={styles.filterPopoverCheckList}>
        {availableValues.length === 0 && (
          <p className={styles.filterPopoverInfo}>Sin valores disponibles</p>
        )}
        {availableValues.length > 0 && (
          <label className={styles.filterPopoverCheckLabel}>
            <input
              type="checkbox"
              className={styles.filterPopoverCheckbox}
              checked={allSelected}
              onChange={handleToggleAll}
            />
            <span>{allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}</span>
          </label>
        )}
        {filteredValues.map((val) => (
          <label key={val} className={styles.filterPopoverCheckLabel}>
            <input
              type="checkbox"
              className={styles.filterPopoverCheckbox}
              checked={selected.includes(val)}
              onChange={() => handleToggle(val)}
            />
            <span>{val}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FilterPopoverInfo({ style }) {
  return (
    <div className={styles.filterPopover} style={style} onClick={(e) => e.stopPropagation()}>
      <p className={styles.filterPopoverInfo}>Columna informativa</p>
    </div>
  );
}

function FilterPill({ columnKey, columnLabel, filterConfig, filterValue, onFilterChange, index, variant, availableValues }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const pillRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (pillRef.current && !pillRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updatePopoverPos = useCallback(() => {
    if (!isOpen || !pillRef.current) {
      setPopoverStyle(null);
      return;
    }
    const rect = pillRef.current.getBoundingClientRect();
    setPopoverStyle({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: 180,
    });
  }, [isOpen]);

  useEffect(() => {
    updatePopoverPos();
    if (isOpen) {
      window.addEventListener('scroll', updatePopoverPos, true);
      window.addEventListener('resize', updatePopoverPos);
      return () => {
        window.removeEventListener('scroll', updatePopoverPos, true);
        window.removeEventListener('resize', updatePopoverPos);
      };
    }
  }, [isOpen, updatePopoverPos]);

  const hasActiveFilter = (() => {
    if (!filterConfig?.filterKey) return false;
    if (filterConfig.type === 'multi' || filterConfig.type === 'textMulti') {
      return Array.isArray(filterValue) && filterValue.length > 0;
    }
    return !!filterValue;
  })();

  const isNoFilter = filterConfig?.type === 'none';

  const handlePillClick = () => {
    if (isNoFilter || isDragging) return;
    setIsOpen((prev) => !prev);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ columnKey, index, variant }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const renderPopover = () => {
    if (!isOpen) return null;
    if (isNoFilter) return <FilterPopoverInfo style={popoverStyle} />;

    const baseProps = {
      config: filterConfig,
      currentValue: filterValue,
      onChange: onFilterChange,
      onClose: () => setIsOpen(false),
      filterKey: filterConfig.filterKey,
      style: popoverStyle,
    };

    if (filterConfig.type === 'multi') {
      return <FilterPopoverMultiSelect {...baseProps} />;
    }
    if (filterConfig.type === 'textMulti') {
      return <FilterPopoverTextWithCheckboxes {...baseProps} availableValues={availableValues} />;
    }
    return null;
  };

  return (
    <div
      ref={pillRef}
      data-pill-key={columnKey}
      draggable={!isNoFilter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={[
        styles.pill,
        variant === 'visible' ? styles.pillVisible : styles.pillHidden,
        hasActiveFilter ? styles.pillActive : '',
        isDragging ? styles.pillDragging : '',
        isNoFilter ? styles.pillNoFilter : '',
      ].filter(Boolean).join(' ')}
      onClick={handlePillClick}
    >
      <span className={styles.dragHandle}>&#9776;</span>
      <span>{columnLabel}</span>
      {hasActiveFilter && <span className={styles.pillFilterDot} />}
      {!isNoFilter && <span className={styles.pillArrow}>&#9662;</span>}
      {renderPopover()}
    </div>
  );
}

export default FilterPill;
