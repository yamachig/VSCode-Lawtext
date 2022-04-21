import * as vscode from "vscode";
import FetchElawsLoader from "lawtext/dist/src/data/loaders/FetchElawsLoader";
import path from "path";
import { LawInfo } from "lawtext/dist/src/data/lawinfo";
import { Timing, toLawData } from "lawtext/dist/src/data/lawdata";
import { renderLawtext } from "lawtext/dist/src/renderer/lawtext";

export const lawtextScheme = "lawtext";

export class LoaderContentProvider implements vscode.TextDocumentContentProvider {
    public constructor() {
        this.elawsLoader = new FetchElawsLoader();
    }

    public elawsLoader: FetchElawsLoader;
    public onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    public onDidChange = this.onDidChangeEmitter.event;

    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        console.log(uri);
        const { base, dir } = path.parse(uri.path);


        const [loaderType, searchType] = dir.replace(/^\/+/, "").split("/");
        const loader = (loaderType === "elaws") ? this.elawsLoader : undefined;
        if (!loader) throw new Error(`Unsupported loader type: ${loaderType}`);

        const [, name, ext] = /^([^.]*)(.*)$/.exec(base) ?? [base, base, ""];

        let lawInfo: LawInfo | null;
        if (searchType === "lawnum") {
            const lawNum = name;
            lawInfo = await loader.getLawInfoByLawNum(lawNum);
            if (!lawInfo) throw new Error(`Law not found for lawNum "${lawNum}".`);
        } else if (searchType === "lawid") {
            const lawID = name;
            lawInfo = await loader.getLawInfoByLawID(lawID);
            if (!lawInfo) throw new Error(`Law not found for lawID "${lawID}".`);
        } else {
            throw new Error(`Unsupported search type: ${searchType}`);
        }

        if (token.isCancellationRequested) return "cancelled";

        const lawXMLStruct = await loader.loadLawXMLStructByInfo(lawInfo);
        if (ext.endsWith(".xml")) {
            return lawXMLStruct.xml;
        } else {
            if (token.isCancellationRequested) return "cancelled";
            const lawData = await toLawData({
                xml: lawXMLStruct.xml,
                lawXMLStruct,
            }, console.log, new Timing());
            if (!lawData.ok) throw new Error("Failed to parse law XML.");
            return renderLawtext(lawData.lawData.el);
        }
    }
}

export const loaderContentProvider = new LoaderContentProvider();

export default loaderContentProvider;
