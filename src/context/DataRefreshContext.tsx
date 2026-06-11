import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface DataRefreshContextValue {
    refreshSignal: number;
    triggerRefresh: () => void;
    lastRefreshed: Date | null;
}

const DataRefreshContext = createContext<DataRefreshContextValue>({
    refreshSignal: 0,
    triggerRefresh: () => {},
    lastRefreshed: null,
});

export const useDataRefresh = () => useContext(DataRefreshContext);

const POLL_INTERVAL = 15_000;

export const DataRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const isPolling = useRef(true);

    const triggerRefresh = useCallback(() => {
        setRefreshSignal(s => s + 1);
        setLastRefreshed(new Date());
    }, []);

    useEffect(() => {
        if (!isPolling.current) return;
        const interval = setInterval(() => {
            setRefreshSignal(s => s + 1);
            setLastRefreshed(new Date());
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <DataRefreshContext.Provider value={{ refreshSignal, triggerRefresh, lastRefreshed }}>
            {children}
        </DataRefreshContext.Provider>
    );
};
