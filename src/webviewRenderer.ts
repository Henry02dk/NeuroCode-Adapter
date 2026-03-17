import * as vscode from "vscode";

export class WebviewRenderer {

    static showAdaptedAssignment(title: string, content: string, profile: string) {

        const panel = vscode.window.createWebviewPanel(
            "neurocodeAdaptedView",
            title,
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        );

        panel.webview.html = this.getHtml(content, profile);
    }

    private static getHtml(content: string, profile: string): string {

        const escaped = this.escapeHtml(content).replace(/\n/g, "<br>");

        const color = this.getProfileColor(profile);

        return `
<!DOCTYPE html>
<html>
<head>

<style>

body {
    font-family: Arial;
    padding: 24px;
    line-height: 1.6;
}

.header {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 10px;
}

.profile {
    padding: 6px 10px;
    display: inline-block;
    background: ${color};
    color: white;
    border-radius: 6px;
    font-size: 12px;
}

.content {
    margin-top: 20px;
    font-size: 15px;
}

.card {
    margin-top: 20px;
    padding: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fafafa;
}

</style>

</head>

<body>

<div class="header">
Adaptive Assignment
</div>

<div class="profile">
Profile: ${profile}
</div>

<div class="card">
<div class="content">
${escaped}
</div>
</div>

</body>
</html>
`;
    }

    private static getProfileColor(profile: string): string {

        switch (profile) {

            case "adhd":
                return "#ff7a18";

            case "dyslexia":
                return "#007acc";

            case "autism":
                return "#6a5acd";

            default:
                return "#444";
        }
    }

    private static escapeHtml(text: string): string {

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

}