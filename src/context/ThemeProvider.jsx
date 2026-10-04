import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
