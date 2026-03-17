import * as vscode from "vscode";
import { ContextReader } from "./contextReader";
import { ProfileManager } from "./profileManager";
import { PromptBuilder } from "./promptBuilder";
import { AIService } from "./aiService";
import { profiles, NeuroProfile } from "./profile";

export class NeuroCodeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "neurocodeView";

    private _view?: vscode.WebviewView;

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtml({
            profile: ProfileManager.getProfile() ?? "neurotypical",
            fileName: "No file selected",
            language: "-",
            result: "Welcome to NeuroCode.\n\nSelect a profile, read the current context, and adapt the assignment."
        });

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "selectProfile": {
                    const selected = await vscode.window.showQuickPick(
                        profiles,
                        {
                            placeHolder: "Select your neurodiversity learning profile"
                        }
                    );

                    if (selected) {
                        await ProfileManager.setProfile(selected as NeuroProfile);

                        const contextData = ContextReader.getCurrentContext();

                        this.updateView({
                            profile: selected,
                            fileName: contextData?.fileName ?? "No file selected",
                            language: contextData?.language ?? "-",
                            result: `Profile selected: ${selected}`
                        });
                    }
                    break;
                }

                case "showProfile": {
                    const profile = ProfileManager.getProfile() ?? "neurotypical";
                    const contextData = ContextReader.getCurrentContext();

                    this.updateView({
                        profile,
                        fileName: contextData?.fileName ?? "No file selected",
                        language: contextData?.language ?? "-",
                        result: `Current profile: ${profile}`
                    });
                    break;
                }

                case "readContext": {
                    const profile = ProfileManager.getProfile() ?? "neurotypical";
                    const contextData = ContextReader.getCurrentContext();

                    if (!contextData) {
                        this.updateView({
                            profile,
                            fileName: "No file selected",
                            language: "-",
                            result: "No active editor found."
                        });
                        return;
                    }

                    this.updateView({
                        profile,
                        fileName: contextData.fileName,
                        language: contextData.language,
                        result:
                            `Context loaded successfully.\n\n` +
                            `Preview:\n${contextData.content.substring(0, 800)}`
                    });
                    break;
                }

                case "adapt": {
                    const profile = ProfileManager.getProfile() ?? "neurotypical";
                    const contextData = ContextReader.getCurrentContext();

                    if (!contextData) {
                        this.updateView({
                            profile,
                            fileName: "No file selected",
                            language: "-",
                            result: "No active editor found. Please open a file first."
                        });
                        return;
                    }

                    this.updateView({
                        profile,
                        fileName: contextData.fileName,
                        language: contextData.language,
                        result: "Adapting assignment..."
                    });

                    const prompt = PromptBuilder.buildPrompt(contextData, profile);
                    const result = await AIService.adaptAssignment(prompt);

                    this.updateView({
                        profile,
                        fileName: contextData.fileName,
                        language: contextData.language,
                        result
                    });
                    break;
                }
            }
        });
    }

    public updateView(data: {
        profile: string;
        fileName: string;
        language: string;
        result: string;
    }): void {
        if (this._view) {
            this._view.webview.html = this.getHtml(data);
        }
    }

    private getHtml(data: {
        profile: string;
        fileName: string;
        language: string;
        result: string;
    }): string {
        const escapedResult = this.escapeHtml(data.result).replace(/\n/g, "<br>");
        const badgeColor = this.getProfileColor(data.profile);

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 12px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }

                h3 {
                    margin-top: 0;
                    margin-bottom: 12px;
                }

                .badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 999px;
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                    background: ${badgeColor};
                    margin-bottom: 12px;
                }

                .section {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 12px;
                    background: var(--vscode-sideBar-background);
                }

                .section-title {
                    font-size: 13px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }

                .meta {
                    font-size: 12px;
                    line-height: 1.5;
                    word-break: break-word;
                }

                .button-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 12px;
                }

                button {
                    padding: 8px 10px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                }

                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }

                .result-box {
                    white-space: normal;
                    line-height: 1.6;
                    font-size: 13px;
                    word-break: break-word;
                }
            </style>
        </head>
        <body>
            <h3>NeuroCode</h3>

            <div class="badge">Profile: ${this.escapeHtml(data.profile)}</div>

            <div class="section">
                <div class="section-title">Actions</div>
                <div class="button-row">
                    <button onclick="selectProfile()">Select Profile</button>
                    <button onclick="showProfile()">Show Profile</button>
                    <button onclick="readContext()">Read Context</button>
                    <button onclick="adapt()">Adapt Assignment</button>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Current Context</div>
                <div class="meta"><strong>File:</strong> ${this.escapeHtml(data.fileName)}</div>
                <div class="meta"><strong>Language:</strong> ${this.escapeHtml(data.language)}</div>
            </div>

            <div class="section">
                <div class="section-title">Result</div>
                <div class="result-box">${escapedResult}</div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();

                function selectProfile() {
                    vscode.postMessage({ command: "selectProfile" });
                }

                function showProfile() {
                    vscode.postMessage({ command: "showProfile" });
                }

                function readContext() {
                    vscode.postMessage({ command: "readContext" });
                }

                function adapt() {
                    vscode.postMessage({ command: "adapt" });
                }
            </script>
        </body>
        </html>
        `;
    }

    private getProfileColor(profile: string): string {
        switch (profile) {
            case "adhd":
                return "#ff7a18";
            case "dyslexia":
                return "#007acc";
            case "autism":
                return "#6a5acd";
            default:
                return "#444444";
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
}