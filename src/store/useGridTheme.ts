import { useMemo, useState, useEffect } from 'react';
import { type GridOptions } from '@ag-grid-community/core';
import { useAppSelector } from './hooks';

export const useGridTheme = () => {
  const { theme } = useAppSelector((state) => state.auth);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    if (theme === 'system_default') {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        setSystemPrefersDark(mediaQuery.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const gridTheme = useMemo(() => {
    if (theme === 'system_default') {
      return systemPrefersDark ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';
    }
    return theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine';
  }, [theme, systemPrefersDark]);

  const gridOptions: GridOptions = useMemo(() => ({
    pagination: false,
    animateRows: true,
    suppressDragLeaveHidesColumns: true,
    suppressHorizontalScroll: false,
    // defaultColDef: {
    //   resizable: true,
    //   sortable: true,
    //   filter: true,
    //   minWidth: 120,
    //   flex: 1,
    //   cellStyle: {
    //     // padding: '12px 16px',
    //     // fontSize: '14px',
    //     // lineHeight: '1.5',
    //     // color: 'inherit',
    //   },
    //   // headerClass: 'font-semibold',
    // },
    enableCellTextSelection: true,
    // headerHeight: 48,
    // rowHeight: 48,
  }), []);

  return { gridTheme, gridOptions };
};