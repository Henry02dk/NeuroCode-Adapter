import { AssignmentContext } from "./contextReader";
import { NeuroProfile } from "./profile";

export class PromptBuilder {

    static buildPrompt(context: AssignmentContext, profile: NeuroProfile): string {
        const profileInstructions = this.getProfileInstructions(profile);

        return `
You are an assistant helping students understand programming assignments.

Your task is to adapt the assignment for a student with the following learning profile:
${profile}

General requirements:
- Keep the original meaning of the assignment.
- Do not change the programming task itself.
- Only improve the presentation, structure, and readability.
- Make the adapted output clear, concise, and easy to follow.
- Use markdown formatting.

Profile-specific instructions:
${profileInstructions}

Assignment file:
${context.fileName}

Programming language:
${context.language}

Assignment content:
${context.content}

Please produce:
1. A short summary of the assignment
2. A clearer adapted version of the instructions
3. A step-by-step task list
4. Key points or warnings the student should pay attention to
`;
    }

    private static getProfileInstructions(profile: NeuroProfile): string {
        switch (profile) {
            case "dyslexia":
                return `
- Use short sentences.
- Avoid dense paragraphs.
- Break information into small chunks.
- Highlight important keywords clearly.
- Use simple and direct wording.
`;

            case "adhd":
                return `
- Break the task into small actionable steps.
- Use checklists when possible.
- Emphasize immediate next actions.
- Reduce unnecessary detail.
- Highlight priorities and task order.
`;

            case "autism":
                return `
- Use a clear and predictable structure.
- Avoid ambiguity.
- Explain expectations explicitly.
- Present information in a logical hierarchy.
- Keep terminology consistent throughout the output.
`;

            case "neurotypical":
            default:
                return `
- Present the assignment clearly and logically.
- Improve readability and structure.
- Keep the explanation balanced and concise.
`;
        }
    }
}