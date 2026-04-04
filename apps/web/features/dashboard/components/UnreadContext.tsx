"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface UnreadContextValue {
	totalUnread: number;
	setTotalUnread: (n: number) => void;
}

const UnreadContext = createContext<UnreadContextValue>({
	totalUnread: 0,
	setTotalUnread: () => {},
});

export function UnreadProvider({ children }: { children: ReactNode }) {
	const [totalUnread, setTotalUnread] = useState(0);
	return (
		<UnreadContext.Provider value={{ totalUnread, setTotalUnread }}>
			{children}
		</UnreadContext.Provider>
	);
}

export function useUnread() {
	return useContext(UnreadContext);
}
