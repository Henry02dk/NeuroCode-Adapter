import * as vscode from "vscode";

export interface AssignmentContext {
    fileName: string;
    language: string;
    content: string;
}

export class ContextReader {

    static getCurrentContext(): AssignmentContext | null {

        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
            return null;
        }

        const document = editor.document;

        return {
            fileName: document.fileName,
            language: document.languageId,
            content: document.getText()
        };
    }

}