// import { UnbodyAdmin } from "unbody/admin";
// import { UnbodyPushAPI } from "unbody/push";
import { Unbody } from "unbody/content";

if (!process.env.UNBODY_API_KEY || !process.env.UNBODY_PROJECT_ID) {
    throw new Error("UNBODY_API_KEY and UNBODY_PROJECT_ID must be set");
}

export const unbody = new Unbody({
    apiKey: process.env.UNBODY_API_KEY,
    projectId: process.env.UNBODY_PROJECT_ID,
});

// export const unbodyAdmin = new UnbodyAdmin({
//     auth: {
//         username: process.env.UNBODY_ADMIN_ID,
//         password: process.env.UNBODY_ADMIN_SECRET,
//     },
// })

// export const unbodyPushApi = (sourceId: string) => {
//     return new UnbodyPushAPI({
//         auth: {
//             apiKey: process.env.UNBODY_API_KEY,
//         },
//         projectId: process.env.UNBODY_PROJECT_ID as string,
//         sourceId: sourceId,
//     })
// }