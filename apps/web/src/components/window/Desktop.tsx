"use client";

import { useWindowManager } from "@/core/window/hooks";

import { Window } from "./Window";

export function Desktop() {

    const manager = useWindowManager();

    return (
        <>

            {manager.windows.map(window => (

                <Window
                    key={window.id}
                    window={window}
                />

            ))}

        </>
    );
}