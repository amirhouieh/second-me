import { z } from "zod";
import { tool as _tool } from "ai";
import { DataToolName } from './names';
import { cvSchema, type CVJSON } from '../types.cv';

export const getResumeInputSchema = z.object({
  section: z.enum(["all", "experience", "education", "skills"]).default("all"),
});
export type GetResumeInput = z.infer<typeof getResumeInputSchema>;

export const getResumeOutputSchema = cvSchema;
export type GetResumeOutput = z.infer<typeof getResumeOutputSchema>;

export const def = {
  name: DataToolName.GetResume,
  description: "Get Amir's resume/CV with experience, education, and skills. Use when users ask about work history, education, career background, or when memory indicates shared educational/professional experiences.",
  label: "Reading the resume…",
  doneLabel: "Resume ready",
  inputSchema: getResumeInputSchema,
  outputSchema: getResumeOutputSchema,
};

export const tool = _tool<GetResumeInput, GetResumeOutput>({
  description: def.description,
  inputSchema: def.inputSchema,
  async execute({ section }) {
    const resume: CVJSON = {
      experiences: [
        {
          company: { name: "Unbody", link: "https://unbody.io" },
          positions: [
            {
              title: "Founder & CEO",
              start: "2024-01-01",
              end: null,
              summary: "Founded and leading Unbody, an AI-native full-stack framework to simplify the development of AI-driven products.",
              skills: [
                "Entrepreneurship",
                "Business Strategy",
                "Leadership",
                "Artificial Intelligence (AI)",
                "Large Language Models (LLM)",
                "Software as a Service (SaaS)",
                "Product Innovation",
                "RAG API",
                "Product Strategy",
                "Executive Management",
                "Product Development",
                "Product Launch",
                "Product Management"
              ],
            },
          ],
        },
        {
          company: { name: "Status", link: "https://status.im" },
          positions: [
            {
              title: "Team Lead (Creative Technologies)",
              start: "2022-07-01",
              end: "2024-01-01",
              summary: "Managed multiple web and developer-tool products; built scalable, AI-driven solutions for branding and design; worked directly with C-level.",
              skills: [
                "Open-Source Software",
                "Product Innovation",
                "Product Development",
                "Leadership",
                "Product Design"
              ],
            },
            {
              title: "Creative Technologist",
              start: "2022-02-01",
              end: "2022-12-01",
              summary: "Drove product innovation and hands-on prototyping across web stacks and custom CMS; systems and OSS contributions.",
              skills: [
                "Product Innovation",
                "Web Development",
                "Custom CMS Development",
                "Systems Design",
                "Open-Source Software"
              ],
            },
          ],
        },
        {
          company: { name: "SUSLIB", link: "https://suslib.com" },
          positions: [
            {
              title: "Co-Founder",
              start: "2018-10-01",
              end: "2022-01-01",
              summary: "Built SUSLIB, combining computational design, research, and AI to shape the future of knowledge interaction.",
              skills: [
                "Product Launch",
                "Product Innovation",
                "SaaS",
                "Product Development",
                "Strategic Planning",
                "Creative Strategy",
                "Leadership",
                "Product Management",
                "Artificial Intelligence (AI)",
                "Computer Vision",
                "Smart Cities"
              ],
            },
          ],
        },
        {
          company: { name: "Freelance" },
          positions: [
            {
              title: "Web & AI Developer (Freelance)",
              start: "2018-09-01",
              end: "2022-05-01",
              summary: "Delivered real-world software products using machine learning and web technologies.",
              skills: [
                "Product Innovation",
                "Product Design",
                "Product Management",
                "Product Launch",
                "SaaS",
                "Product Development"
              ],
            },
          ],
        },
        {
          company: { name: "ArtEZ Institute of the Arts" },
          positions: [
            {
              title: "Digital Media Tutor & Curriculum Lead",
              start: "2017-07-01",
              end: "2021-12-01",
              summary: "Taught computational and systematic design; led a new modular program focused on AI/ML, computer vision, and blockchain.",
              skills: [
                "Teaching",
                "Curriculum Development",
                "Computational Design",
                "Machine Learning",
                "Computer Vision",
                "Program Leadership"
              ],
            },
          ],
        },
        {
          company: { name: "Royal Academy of Art, The Hague (KABK)" },
          positions: [
            {
              title: "Creative Coding Tutor",
              start: "2019-02-01",
              end: "2019-04-01",
              summary: "Taught JavaScript, p5.js, Arduino, Raspberry Pi; UI/UX, data visualization, interactive environments.",
              skills: [
                "JavaScript",
                "p5.js",
                "Arduino",
                "Raspberry Pi",
                "UI/UX",
                "Data Visualization",
                "Interactive Environment Design"
              ],
            },
          ],
        },
        {
          company: { name: "RNDR Studio" },
          positions: [
            {
              title: "Fullstack Developer",
              start: "2017-08-01",
              end: "2018-08-01",
              summary: "Built full-stack apps and interactive experiences; research & concept development.",
              skills: [
                "Node.js",
                "React.js",
                "TypeScript",
                "Kotlin",
                "JavaScript (ES6)",
                "Research & Concept Development",
                "UI/UX",
                "Data Visualization",
                "Interactive Environment Design",
                "Product Development",
                "Product Design",
                "Creative Coding",
                "Creative Technology"
              ],
            },
          ],
        },
        {
          company: { name: "Lust Lab" },
          positions: [
            {
              title: "Fullstack Developer",
              start: "2016-07-01",
              end: "2017-12-01",
              summary: "Worked on Node.js/React projects across UI/UX, data visualization, research and concept development; creative coding and digital innovation.",
              skills: [
                "Node.js",
                "React.js",
                "JavaScript (ES6)",
                "UI/UX",
                "Data Visualization",
                "Research & Concept Development",
                "Creative Coding",
                "Concept Design",
                "Digital Innovation",
                "Front-end Development"
              ],
            },
          ],
        },
        {
          company: { name: "MindDesign" },
          positions: [
            {
              title: "Intern — Interactive Designer & Developer",
              start: "2014-10-01",
              end: "2016-02-01",
              summary: "Interned under Niels Schrader exploring the 'dialogue principle'—bridging digital and physical media; contributed to interactive and graphic design.",
              skills: [
                "Interactive Design",
                "Graphic Design",
                "Creative Coding",
                "Prototyping"
              ],
            },
          ],
        },
      ],
      education: [
        {
          title: "Beyond Smart Cities: Emerging Design and Technology",
          org: "MIT Media Lab",
          start: "2023-04-01",
          end: "2023-06-30",
          summary: "Short program on Smart Cities and IoT."
        },
        {
          title: "Bachelor of Arts (B.A.), Graphic Design",
          org: "Royal Academy of Art, The Hague (KABK)",
          start: "2012-01-01",
          end: "2016-12-31",
          summary: "Focus on data analysis/visualization, information design, typography, and interactive design."
        },
        {
          title: "Bachelor of Applied Science (BASc), Computer Software Engineering",
          org: "Azad University of Najafabad (IAUN)",
          start: "2004-01-01",
          end: "2008-12-31"
        }
      ],
      skills: [
        "Entrepreneurship",
        "Business Strategy",
        "Leadership",
        "Artificial Intelligence (AI)",
        "Large Language Models (LLM)",
        "Software as a Service (SaaS)",
        "Product Innovation",
        "RAG API",
        "Product Strategy",
        "Executive Management",
        "Product Development",
        "Product Launch",
        "Product Management",
        "Open-Source Software",
        "Product Design",
        "Web Development",
        "Custom CMS Development",
        "Systems Design",
        "Computer Vision",
        "Smart Cities",
        "Strategic Planning",
        "Creative Strategy",
        "JavaScript",
        "p5.js",
        "Arduino",
        "Raspberry Pi",
        "UI/UX",
        "Data Visualization",
        "Interactive Environment Design",
        "Node.js",
        "React.js",
        "TypeScript",
        "Kotlin",
        "Research & Concept Development",
        "Creative Coding",
        "Creative Technology",
        "Front-end Development",
        "Backend",
        "MLOps",
        "Applied Machine Learning",
        "Team Leadership",
        "Scaled Agile Framework",
        "Large Scale Deployments",
        "Google Cloud Platform (GCP)",
        "LLMOps",
        "Go-to-Market Strategy",
        "Fundraising",
        "Databases",
        "SaaS Development",
        "Curriculum Development",
        "Teaching",
        "Prototyping",
        "Interactive Design",
        "Graphic Design"
      ],
      meta: {
        highlightedExperiences: [0, 1],
        highlightedEducations: [0],
        collapsedByDefault: true,
      }
    };

    switch (section) {
      case "experience":
        return def.outputSchema.parse({ experiences: resume.experiences, education: [], skills: [], meta: resume.meta });
      case "education":
        return def.outputSchema.parse({ experiences: [], education: resume.education, skills: [], meta: resume.meta });
      case "skills":
        return def.outputSchema.parse({ experiences: [], education: [], skills: resume.skills, meta: resume.meta });
      default:
        return def.outputSchema.parse(resume);
    }
  },
});


