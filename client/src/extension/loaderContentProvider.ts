import * as vscode from "vscode";
import FetchElawsLoader from "lawtext/dist/src/data/loaders/FetchElawsLoader";
import path from "path";
import { Timing, toLawData } from "lawtext/dist/src/data/lawdata";
import { renderLawtext } from "lawtext/dist/src/renderer/lawtext";
import { fetchLawData } from "lawtext/dist/src/elawsApi";

export const lawtextScheme = "lawtext";

export class LoaderContentProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {
    public constructor() {
        this.elawsLoader = new FetchElawsLoader();
        this.disposables.add(vscode.workspace.onDidCloseTextDocument(this.onDidCloseTextDocument.bind(this)));
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
        this.disposables.clear();
    }

    private disposables: Set<vscode.Disposable> = new Set();
    public elawsLoader: FetchElawsLoader;
    public pictURLCache: Map<string, Map<string, {url: string, type: string}>> = new Map();
    public onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public onDidChange = this.onDidChangeEmitter.event;

    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        const { base, dir } = path.parse(uri.path);


        const [loaderType, searchType] = dir.replace(/^\/+/, "").split("/");

        if (loaderType === "elaws") {

            const [, name, ext] = /^([^.]*)(.*)$/.exec(base) ?? [base, base, ""];

            return vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                cancellable: true,
            }, async (progress, progressToken) => {

                if (!["lawid", "lawnum"].includes(searchType)) {
                    throw new Error(`Unsupported search type: ${searchType}`);
                }

                progress.report({ message: "e-Gov 法令APIから法令XMLを取得しています..." });
                const lawXMLStruct = await fetchLawData(name);

                if (ext.endsWith(".xml")) {
                    return lawXMLStruct.xml;
                } else {
                    if (token.isCancellationRequested || progressToken.isCancellationRequested) return "cancelled";
                    const lawData = await toLawData(
                        {
                            xml: lawXMLStruct.xml,
                            lawXMLStruct,
                        },
                        (message) => {
                            console.log(message);
                            progress.report({ message });
                        },
                        new Timing(),
                    );
                    if (!lawData.ok) {
                        throw new Error(`Failed to parse law XML: ${lawData.error}`);
                    }
                    if (ext.endsWith(".json")) {
                        return JSON.stringify(lawData.lawData.el.json(), undefined, 2);
                    } else {
                        this.pictURLCache.set(uri.toString(), lawData.lawData.pictURL);
                        return renderLawtext(lawData.lawData.el);
                    }
                }
            });
        } else {
            throw new Error(`Unsupported loader type: ${loaderType}`);
        }
    }

    private onDidCloseTextDocument(document: vscode.TextDocument) {
        console.log("LoaderContentProvider.onDidCloseTextDocument");
        const documentURIStr = document.uri.toString();
        if (!this.pictURLCache.has(documentURIStr)) return;
        const documents = vscode.workspace.textDocuments.filter(e => e.uri.toString() === documentURIStr);
        if (documents.length > 0) return;
        console.log(`Deleting pictures cache for ${documentURIStr}`);
        this.pictURLCache.delete(documentURIStr);
    }
}

export const loaderContentProvider = new LoaderContentProvider();

export default loaderContentProvider;
