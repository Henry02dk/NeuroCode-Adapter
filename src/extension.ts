// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { profiles, NeuroProfile } from './profile';
import { ProfileManager } from './profileManager';
import { ContextReader } from "./contextReader";
import { PromptBuilder } from "./promptBuilder";
import { AIService } from "./aiService";
import { WebviewRenderer } from "./webviewRenderer";
import { NeuroCodeViewProvider } from "./neurocodeViewProvider";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "neurocode-adapter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('neurocode-adapter.activateAdapter', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('NeuroCode adapter activated!');
	});

	context.subscriptions.push(disposable);

	let selectProfileCommand = vscode.commands.registerCommand(
		'neurocode-adapter.selectProfile',
		async () => {

			const selected = await vscode.window.showQuickPick(
				profiles,
				{
					placeHolder: "Select your neurodiversity learning profile"
				}
			);

			if (selected) {
				await ProfileManager.setProfile(selected as NeuroProfile);

				vscode.window.showInformationMessage(
					`NeuroCode profile set to: ${selected}`
				);
			}

		}
	);

	context.subscriptions.push(selectProfileCommand);

	let showProfileCommand = vscode.commands.registerCommand(
		'neurocode-adapter.showProfile',
		() => {

			const profile = ProfileManager.getProfile();

			vscode.window.showInformationMessage(
				`Current profile: ${profile}`
			);

		}
	);

	context.subscriptions.push(showProfileCommand);

	let readContextCommand = vscode.commands.registerCommand(
		"neurocode-adapter.readContext",
		() => {

			const contextData = ContextReader.getCurrentContext();

			if (contextData) {

				vscode.window.showInformationMessage(
					`File: ${contextData.fileName}`
				);

				console.log("Assignment Context:", contextData);
			}

		}
	);
	context.subscriptions.push(readContextCommand);

	let adaptCommand = vscode.commands.registerCommand(
		"neurocode-adapter.adaptAssignment",
		async () => {

			const contextData = ContextReader.getCurrentContext();

			if (!contextData) {
				return;
			}

			const profile = await ProfileManager.getProfile() ?? "neurotypical";

			const prompt = PromptBuilder.buildPrompt(contextData, profile);

			const result = await AIService.adaptAssignment(prompt);

			vscode.window.showInformationMessage("Assignment adapted!");

			// const doc = await vscode.workspace.openTextDocument({
			// 	content: result,
			// 	language: "markdown"
			// });

			// vscode.window.showTextDocument(doc);
			WebviewRenderer.showAdaptedAssignment(
				"NeuroCode: Adapted Assignment",
				result,
				profile
			);

		}
	);

	context.subscriptions.push(adaptCommand);

	let showPromptCommand = vscode.commands.registerCommand(
		"neurocode-adapter.showPrompt",
		async () => {

			const contextData = ContextReader.getCurrentContext();
			if (!contextData) {
				return;
			}

			const profile = ProfileManager.getProfile() ?? "neurotypical";
			const prompt = PromptBuilder.buildPrompt(contextData, profile);

			const doc = await vscode.workspace.openTextDocument({
				content: prompt,
				language: "markdown"
			});

			vscode.window.showTextDocument(doc);
		}
	);

	context.subscriptions.push(showPromptCommand);

    const provider = new NeuroCodeViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            NeuroCodeViewProvider.viewType,
            provider
        )
    );

	vscode.window.onDidChangeActiveTextEditor(() => {
		// optional future update
	});
	}

// This method is called when your extension is deactivated
export function deactivate() {}
