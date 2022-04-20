import React from "react";
import { createRoot } from "react-dom/client";
import { HTMLAnyELs } from "lawtext/dist/src/renderer/rules/any";
import htmlCSS from "lawtext/dist/src/renderer/rules/htmlCSS";
import { HTMLOptions } from "lawtext/dist/src/renderer/common/html";
import { EL, JsonEL, loadEl } from "lawtext/dist/src/node/el";
import * as std from "lawtext/dist/src/law/std";

interface PreviewerStateJSON {
    els: JsonEL[],
    htmlOptions: HTMLOptions,
}

interface PreviewerState {
    els: EL[],
    htmlOptions: HTMLOptions,
}

const toStateJSON = (state: PreviewerState): PreviewerStateJSON => {
    return {
        els: state.els.map(el => el.json(true)),
        htmlOptions: state.htmlOptions,
    };
};

const toState = (stateJSON: PreviewerStateJSON): PreviewerState => {
    return {
        els: stateJSON.els.map(loadEl),
        htmlOptions: stateJSON.htmlOptions,
    };
};

const vscode = acquireVsCodeApi<PreviewerStateJSON>();
const previousState = toState(vscode.getState() ?? { els: [], htmlOptions: {} });

const App = () => {
    const [state, _setState] = React.useState<PreviewerState>(previousState);
    const setState = React.useCallback((newState: PreviewerState) => {
        vscode.setState(toStateJSON(newState));
        _setState(newState);
    }, []);
    const { els, htmlOptions } = state;

    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onMessage = (event: any) => {
            if (event.data?.command === "setState") {
                const newStateJSON = event.data.state as PreviewerStateJSON;
                setState(toState(newStateJSON));
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [setState]);

    return (<>
        <style>
            {htmlCSS}
        </style>
        <HTMLAnyELs
            els={els as (string | std.StdEL | std.__EL)[]}
            indent={0}
            {...{ htmlOptions }}
        />
    </>);
};

const rootElement = document.getElementById("root");

if (rootElement) {
    createRoot(rootElement).render(<App/>);
}


