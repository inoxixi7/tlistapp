// app/context/ListContext.tsx
import React, { createContext, useContext, useState } from 'react';

const ListContext = createContext();

export const ListProvider = ({ children }) => {
  const [savedList, setSavedList] = useState(null);

  const saveList = (list) => {
    setSavedList(list);
  };

  return (
    <ListContext.Provider value={{ savedList, saveList }}>
      {children}
    </ListContext.Provider>
  );
};

export const useList = () => useContext(ListContext);