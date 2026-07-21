export type SiteConfig = {
  eventName: string;
  theme: string;
  date: string;
  dateIso: string;
  eventStartIso: string;
  eventEndIso: string;
  timezone: string;
  venue: string;
  registrationPath: `/${string}`;
  registrationOpen: boolean;
  ticketPrefix: string;
  calendarDescription: string;
  manifesto: {
    lead: string;
    paragraphs: string[];
  };
  closing: {
    title: string;
    paragraphs: string[];
  };
  expectations: string[];
  speakersIntro: string;
  directionsUrl: string;
};

export const siteConfig: SiteConfig = {
  eventName: "UnboxMed Conference",
  theme: "Beyond the Syllabus",
  date: "15th August, 2026",
  dateIso: "2026-08-15",
  eventStartIso: "2026-08-15T10:00:00+01:00",
  eventEndIso: "2026-08-15T14:00:00+01:00",
  timezone: "Africa/Lagos",
  venue: "Cine 21, #10 Factory Rd, Aba",
  registrationPath: "/register",
  registrationOpen: true,
  ticketPrefix: "UC26",
  calendarDescription:
    "Beyond the Syllabus is an UnboxMed gathering for students and young professionals exploring ambition beyond a single title.",
  manifesto: {
    lead: "For years, we’ve been taught to follow a path.",
    paragraphs: [
      "Study hard, pass your exams, earn the degree, then your life begins. But somewhere along the way, many of us quietly put parts of ourselves on hold. The ideas we’ve always wanted to build. The skills we’ve wanted to learn. The passions that don’t fit neatly inside a lecture hall or a curriculum.",
      "But what if|Your degree wasn’t the finish line? What if it was only one chapter of your story?",
      "At UnboxMed, we believe your profession and your passions don’t have to compete. They can grow together. The doctor who builds startups. The pharmacist who tells stories through film. The economist who creates, designs, teaches, leads, or inspires.",
    ],
  },
  closing: {
    title: "You can actually do more",
    paragraphs: [
      "Beyond the Syllabus is a gathering for students and young professionals who know there’s more to them than what’s printed on their student ID. It’s a room full of people proving that excellence in your field and ambition beyond it can exist side by side.",
      "This isn’t about abandoning your profession, it’s about refusing to shrink yourself to a single title.",
      "Come curious, you’ll definitely leave inspired. Bring your questions, your ideas, and the parts of yourself you’ve been waiting to explore, because the most interesting thing about you was never just your degree.",
    ],
  },
  expectations: [
    "Hear real stories",
    "Honest conversations",
    "Fun games",
    "A good time",
    "Connect with your people",
    "Movie time",
  ],
  speakersIntro:
    "We’ll be unveiling the speakers within the days, feel free to take a guess at who you think we’re bringing.",
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=Cine+21%2C+10+Factory+Road%2C+Aba",
};
