import { Unbody } from "unbody/content";

if (!process.env.NEXT_PUBLIC_UNBODY_API_KEY || !process.env.NEXT_PUBLIC_UNBODY_PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_UNBODY_API_KEY and NEXT_PUBLIC_UNBODY_PROJECT_ID must be set for client-side usage");
}

export const unbodyClient = new Unbody({
    apiKey: process.env.NEXT_PUBLIC_UNBODY_API_KEY,
    projectId: process.env.NEXT_PUBLIC_UNBODY_PROJECT_ID,
});
