"use client";

import { WindowInstance } from "@/core/window/types";
import { useWindowManager } from "@/core/window/hooks";

type Props = {
    window: WindowInstance;
};

export function Window({ window }: Props) {

    const manager = useWindowManager();

    return (
        <div
            className="
                absolute
                overflow-hidden
                rounded-xl
                border
                border-zinc-700
                bg-zinc-900
                shadow-2xl
                select-none
            "
            style={{
                left: window.x,
                top: window.y,
                width: window.width,
                height: window.height,
                zIndex: window.zIndex,
            }}
            onMouseDown={() => manager.focus(window.id)}
        >

            <div
                className="
                    flex
                    items-center
                    justify-between
                    border-b
                    border-zinc-700
                    bg-zinc-800
                    px-4
                    py-3
                "
            >

                <span className="font-medium">
                    {window.title}
                </span>

                <button
                    onClick={() => manager.close(window.id)}
                    className="
                        rounded
                        px-2
                        transition
                        hover:bg-red-600
                    "
                >
                    ✕
                </button>

            </div>

            <div
                className="h-[calc(100%-52px)] overflow-auto"
            >
                {window.content}
            </div>

        </div>
    );
}