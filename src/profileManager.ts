import * as vscode from 'vscode';
import { NeuroProfile } from './profile';

export class ProfileManager {

    private static key = "neurocode.profile";

    static async setProfile(profile: NeuroProfile) {
        await vscode.workspace
            .getConfiguration()
            .update(this.key, profile, vscode.ConfigurationTarget.Global);
    }

    static getProfile(): NeuroProfile | undefined {
        return vscode.workspace
            .getConfiguration()
            .get<NeuroProfile>(this.key);
    }

}