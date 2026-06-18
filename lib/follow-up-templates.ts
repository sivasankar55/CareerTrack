export type FollowUpTemplate = {
  id: string;
  name: string;
  body: string;
};

export const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: "gentle-reminder",
    name: "Gentle reminder",
    body:
      "Hi [hiring manager],\n\n" +
      "I'm writing to follow up on my application for {{role}} at {{company}}. " +
      "I wanted to reiterate my interest in the role and see if there are any updates " +
      "on the hiring timeline.\n\n" +
      "Happy to provide any additional information that would be helpful.\n\n" +
      "Best regards,\n[Your name]",
  },
  {
    id: "post-interview-thankyou",
    name: "Post-interview thank-you",
    body:
      "Thank you for taking the time to interview me for {{role}} at {{company}}. " +
      "I really appreciated learning more about the team and the work you're doing.\n\n" +
      "I'm very excited about the opportunity and would love to move forward. " +
      "Please let me know if you need anything else from me.\n\n" +
      "Best regards,\n[Your name]",
  },
  {
    id: "status-check",
    name: "Status check",
    body:
      "I wanted to check in on the status of my application for {{role}} at {{company}}. " +
      "I'm still very interested in the role and would love to hear any updates " +
      "about the process.\n\n" +
      "Thanks for your time!\n\n" +
      "Best regards,\n[Your name]",
  },
  {
    id: "custom",
    name: "Custom",
    body: "",
  },
];

export function renderTemplate(template: FollowUpTemplate, company: string, role: string): string {
  return template.body
    .replace(/\{\{company\}\}/g, company)
    .replace(/\{\{role\}\}/g, role);
}
