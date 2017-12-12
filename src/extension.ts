'use strict';

declare var _parse_decorate: any;

import * as vscode from 'vscode';
import * as nunjucks from 'nunjucks';
console.log(__dirname);
nunjucks.configure(__dirname + '/../src/templates');
var parse_decorate = require('../src/parse_decorate');
var fs = require('fs')

let Context = function() {
    var self = this;
    self.data = {};
};
Context.prototype.get = function(key) {
    var self = this;
    return self.data[key];
};
Context.prototype.set = function(key, value) {
    var self = this;
    self.data[key] = value;
    return "";
};

export function activate(context: vscode.ExtensionContext) {

    let previewUri = vscode.Uri.parse('lawtext-preview://authority/lawtext-preview');

    class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

        public provideTextDocumentContent(uri: vscode.Uri): string {
            let editor = vscode.window.activeTextEditor;
            if (!(editor.document.languageId === 'lawtext')) {
                return "Active editor doesn't show a Lawtext document.";
            }
            const lawtext = editor.document.getText();
            var law = parse_decorate.parse_lawtext(lawtext);
            var rendered = nunjucks.render("html.html", {
                "law": law,
                "print": console.log,
                "context": new Context(),
                "style": fs.readFileSync(__dirname + '/../src/static/law.css')
                         + "body { background-color: white; color: black; }",
            });
            return rendered;
        }

        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }

        public update(uri: vscode.Uri) {
            this._onDidChange.fire(uri);
        }
    }

    let provider = new TextDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider('lawtext-preview', provider);

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });

    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
            provider.update(previewUri);
        }
    })

    let disposable = vscode.commands.registerCommand('extension.showLawtextPreview', () => {
        return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'Lawtext Preview').then((success) => {
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    });

    context.subscriptions.push(disposable, registration);
}