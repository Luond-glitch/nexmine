export const PORTALS = {
  miner: {
    path: "miner", label: "Gold miner", blurb: "Learn the rules, find an EIA expert and mine safely.",
    idLabel: "Username", idType: "text", bg: "/images/miner-bg.png",
    register: [
      ["username", "Username", "text", true], ["phone", "Phone number", "tel", true],
    ],
    nav: ["Home", "AI Mining Assistant", "Environmental Regulations", "EIA Experts", "My Requests", "Authorities", "Map", "Mining Safety",
          "Environmental Protection", "Self-Assessment", "Rehabilitation Log", "Mining Education", "Community Stories", "Share Your Story", "Contact and Support"],
  },
  expert: {
    path: "expert", label: "Environmental expert", blurb: "Offer EIA and compliance services to mining communities.",
    idLabel: "Registered email or full name", idType: "text", bg: "/images/expert-bg.jpg",
    register: [
      ["full_name", "Full name", "text", true], ["email", "Professional email", "email", true],
      ["firm_name", "Consultancy or firm name (if any)", "text", false], ["phone", "Phone number", "tel", true],
      ["location", "Physical location", "text", true], ["county", "County", "text", true],
      ["eia_licence_no", "EIA licence number", "text", true], ["qualifications", "Professional qualifications", "text", false],
      ["expertise", "Areas of expertise", "text", false], ["years_experience", "Years of experience", "number", false],
    ],
    nav: ["Dashboard", "My Profile", "Environmental Regulations", "Available Clients", "Consultation Requests",
          "Messages", "Map", "Community Stories", "Share Your Story", "My Services", "Professional Resources", "Notifications", "Reports and Records"],
  },
  researcher: {
    path: "researcher", label: "Student or researcher", blurb: "Study, discuss and share mining and environment research.",
    idLabel: "Registered email or full name", idType: "text", bg: "/images/researcher-bg.jpg",
    register: [
      ["full_name", "Full name", "text", true], ["email", "Email address", "email", true],
      ["institution", "Institution or university", "text", false], ["discipline", "Course or discipline", "text", false],
      ["interests", "Research interests", "text", false], ["county", "County or location", "text", false],
      ["phone", "Phone number (optional, for password reset)", "tel", false],
    ],
    nav: ["Home", "AI Research Assistant", "Mining Topics", "Research Library", "Community Stories", "Map",
          "Share Your Story", "Research Discussions", "Environmental Education", "My Profile"],
  },
  admin: { path: "admin", label: "Administrator", blurb: "", idLabel: "Admin email", idType: "text", bg: "/images/expert-bg.jpg", register: [], nav: [] },
};
