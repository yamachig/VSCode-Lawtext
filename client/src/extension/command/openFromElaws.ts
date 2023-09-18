import * as vscode from "vscode";
import { parseLawID } from "lawtext/dist/src/law/lawID";
import { lawNumLikeToLawNum } from "lawtext/dist/src/law/lawNum";
import { assertNever } from "lawtext/dist/src/util";

export const openFromElaws = async () => {
    const lawIDOrLawNum = await vscode.window.showInputBox({ placeHolder: "Enter LawID or LawNum to open XML from e-LAWS" });
    if (!lawIDOrLawNum) return;
    const format = await vscode.window.showQuickPick(
        [
            { label: "xml" as const, description: "Standard law XML directly from e-LAWS" },
            { label: "lawtext" as const, description: "Lawtext generated from XML from e-LAWS" },
            { label: "jsonel" as const, description: "JsonEL generated from XML from e-LAWS" },
        ],
        { placeHolder: "Format:" },
    );
    if (!format) return;
    const lawID = parseLawID(lawIDOrLawNum);
    const uriString = [
        "lawtext:/elaws/",
        (lawID ? "lawid/" : "lawnum/"),
        lawNumLikeToLawNum(lawIDOrLawNum),
        (
            (format.label === "xml")
                ? ".xml"
                : (format.label === "lawtext")
                    ? ".law.txt"
                    : (format.label === "jsonel")
                        ? ".json"
                        : assertNever(format)
        ),
    ].join("");
    const uri = vscode.Uri.parse(uriString);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
};

export default openFromElaws;
