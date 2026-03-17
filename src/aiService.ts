export class AIService {

    static async adaptAssignment(prompt: string): Promise<string> {

        const adapted = `
# Adapted Assignment

## Summary
This assignment has been adapted to improve clarity and readability for the selected learner profile.

## Adapted Instructions
- Read the assignment carefully.
- Focus on the main programming goal.
- Implement the required C# functionality step by step.
- Test your solution after each major step.

## Task List
1. Read the problem statement
2. Identify the required input and output
3. Implement the solution
4. Test your program
5. Review and improve your code

## Key Points
- Do not change the required functionality
- Keep your code readable
- Make sure your solution matches the assignment requirements

---

## Debug Prompt Preview
${prompt.substring(0, 800)}
`;

        return adapted;
    }
}

// export class AIService {

//     static async adaptAssignment(prompt: string): Promise<string> {

//         try {

//             const response = await fetch("http://localhost:3000/adapt", {

//                 method: "POST",

//                 headers: {
//                     "Content-Type": "application/json"
//                 },

//                 body: JSON.stringify({
//                     prompt: prompt
//                 })

//             });

//             const data = await response.json();

//             return data.result;

//         } catch (error) {

//             console.error("AI request failed:", error);

//             return "Error contacting AI service.";

//         }

//     }

// }