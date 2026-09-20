import type { Candidate, Job, Application, Customer, Admin, AccessRequest, InboxItem, AuditEntry, User } from '../types';

export const DEMO_USERS: User[] = [
  { id: 'u1', name: 'Sarah Chen', email: 'sarah@worktrack.io', role: 'platform_owner', initials: 'SC' },
  { id: 'u2', name: 'James Okafor', email: 'james@worktrack.io', role: 'admin', initials: 'JO' },
  { id: 'u3', name: 'Mira Holt', email: 'mira@nordictech.io', role: 'customer', initials: 'MH' },
];

export const CUSTOMERS: Customer[] = [
  {
    id: 'c1', name: 'Nordic Technologies', contactName: 'Mira Holt', email: 'mira@nordictech.io',
    phone: '+44 20 7123 4567', website: 'nordictech.io', status: 'Active',
    openJobs: 4, candidateCount: 31, assignedAdminId: 'u2', lastActivity: '2 hours ago', createdDate: '12 Jan 2025',
  },
  {
    id: 'c2', name: 'Meridian Consulting', contactName: 'Priya Nair', email: 'priya@meridian.co',
    phone: '+44 20 8234 5678', website: 'meridian.co', status: 'Active',
    openJobs: 2, candidateCount: 14, assignedAdminId: 'u2', lastActivity: 'Yesterday', createdDate: '3 Mar 2025',
  },
  {
    id: 'c3', name: 'Arcadia Health', contactName: 'Tom Erickson', email: 'tom@arcadiahealth.com',
    phone: '+44 20 9345 6789', website: 'arcadiahealth.com', status: 'Active',
    openJobs: 1, candidateCount: 8, assignedAdminId: undefined, lastActivity: '4 days ago', createdDate: '18 May 2025',
  },
  {
    id: 'c4', name: 'Solaris Energy', contactName: 'Ingrid Mäkinen', email: 'ingrid@solaris.eu',
    website: 'solaris.eu', status: 'Inactive',
    openJobs: 0, candidateCount: 3, assignedAdminId: undefined, lastActivity: '3 weeks ago', createdDate: '2 Jul 2025',
  },
];

export const ADMINS: Admin[] = [
  {
    id: 'u1', name: 'Sarah Chen', email: 'sarah@worktrack.io', role: 'Platform Owner',
    assignedCustomerIds: ['c1', 'c2', 'c3', 'c4'], status: 'Active',
    lastActivity: '10 minutes ago', initials: 'SC',
    permissions: ['manage_customers', 'create_admins', 'approve_requests', 'access_audit', 'manage_jobs', 'manage_candidates'],
  },
  {
    id: 'u2', name: 'James Okafor', email: 'james@worktrack.io', role: 'Admin',
    assignedCustomerIds: ['c1', 'c2'], status: 'Active',
    lastActivity: 'Yesterday', initials: 'JO',
    permissions: ['manage_customers', 'manage_jobs', 'manage_candidates'],
  },
  {
    id: 'u3', name: 'Lena Vogel', email: 'lena@worktrack.io', role: 'Admin',
    assignedCustomerIds: ['c3'], status: 'Active',
    lastActivity: '5 days ago', initials: 'LV',
    permissions: ['manage_jobs', 'manage_candidates'],
  },
];

export const ACCESS_REQUESTS: AccessRequest[] = [
  {
    id: 'ar1', companyName: 'Vertex Labs', contactName: 'Daniel Osei', email: 'daniel@vertexlabs.io',
    phone: '+44 7890 123456', website: 'vertexlabs.io', hiringNeeds: '8–12 hires over 6 months, primarily backend and ML engineers.',
    status: 'Pending', submittedDate: 'Today, 09:14',
  },
  {
    id: 'ar2', companyName: 'Lumia Digital', contactName: 'Camille Renard', email: 'camille@lumia.fr',
    phone: '+33 1 23 45 67 89', website: 'lumia.fr', hiringNeeds: '3–5 hires per quarter, marketing and design roles.',
    notes: 'Prefers phone contact. Mentioned they are evaluating two other ATS providers.',
    status: 'Needs Information', submittedDate: 'Yesterday, 14:30',
  },
  {
    id: 'ar3', companyName: 'Birchwood Retail', contactName: 'Marcus Webb', email: 'm.webb@birchwoodretail.com',
    phone: '+44 1234 567890', hiringNeeds: 'Seasonal hiring, 20+ roles across store management.',
    status: 'Pending', submittedDate: '15 Sep 2026',
  },
  {
    id: 'ar4', companyName: 'Helix Bio', contactName: 'Fatima Al-Rashid', email: 'fatima@helixbio.com',
    website: 'helixbio.com', hiringNeeds: 'Regulatory and scientific roles, small team.',
    status: 'Approved', submittedDate: '10 Sep 2026',
  },
  {
    id: 'ar5', companyName: 'Fastlane Logistics', contactName: 'Rory Brennan', email: 'r.brennan@fastlane.ie',
    hiringNeeds: 'Driver and warehouse roles at scale.',
    status: 'Rejected', submittedDate: '2 Sep 2026',
  },
];

export const INBOX_ITEMS: InboxItem[] = [
  { id: 'i1', type: 'review_request', title: '2 new access requests pending review', description: 'Vertex Labs and Birchwood Retail submitted access requests within the last 24 hours.', date: 'Today', read: false, priority: 'high' },
  { id: 'i2', type: 'admin_action', title: 'James Okafor created a new Customer account', description: 'Nordic Technologies was provisioned with 5 recruiter seats.', date: 'Yesterday', read: false, priority: 'medium' },
  { id: 'i3', type: 'alert', title: 'Lumia Digital request needs additional information', description: 'Camille Renard\'s request has been flagged and awaits follow-up.', date: '2 days ago', read: true, priority: 'medium' },
  { id: 'i4', type: 'system', title: 'Platform update: AI Assessment improvements deployed', description: 'CV assessment accuracy improved. All new assessments use the updated model.', date: '5 days ago', read: true, priority: 'low' },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: 'al1', date: 'Today, 11:22', user: 'Sarah Chen', userRole: 'Platform Owner', action: 'Approved access request', target: 'Helix Bio', ipAddress: '82.44.12.1' },
  { id: 'al2', date: 'Today, 09:05', user: 'James Okafor', userRole: 'Admin', action: 'Entered Customer context', target: 'Nordic Technologies', ipAddress: '91.122.45.7' },
  { id: 'al3', date: 'Yesterday, 16:44', user: 'Sarah Chen', userRole: 'Platform Owner', action: 'Created Admin account', target: 'Lena Vogel', ipAddress: '82.44.12.1' },
  { id: 'al4', date: 'Yesterday, 14:30', user: 'James Okafor', userRole: 'Admin', action: 'Flagged request as Needs Information', target: 'Lumia Digital', ipAddress: '91.122.45.7' },
  { id: 'al5', date: '2 days ago, 10:12', user: 'Sarah Chen', userRole: 'Platform Owner', action: 'Deactivated Customer', target: 'Solaris Energy', ipAddress: '82.44.12.1' },
  { id: 'al6', date: '3 days ago, 15:30', user: 'James Okafor', userRole: 'Admin', action: 'Created Job', target: 'Nordic Technologies / Senior Backend Engineer', ipAddress: '91.122.45.7' },
];

export const JOBS: Job[] = [
  {
    id: 'j1', title: 'Senior Backend Engineer', department: 'Engineering', location: 'London, UK (Hybrid)',
    type: 'Full-time', status: 'Open', description: 'We are looking for an experienced Backend Engineer to join our core platform team. You will design and build high-availability systems serving millions of users, work closely with our infrastructure team, and mentor junior engineers.',
    requirements: '5+ years backend experience\nStrong PostgreSQL and Redis knowledge\nExperience with AWS or GCP\nPython or Go preferred\nFamiliarity with microservices architecture',
    createdDate: '1 Sep 2026', isPublic: true, publicSlug: 'senior-backend-engineer',
  },
  {
    id: 'j2', title: 'Product Designer', department: 'Design', location: 'Remote (EU)',
    type: 'Full-time', status: 'Open', description: 'Join our design team to shape the future of our flagship SaaS product. You will own end-to-end design for key product areas, collaborate with engineers and PMs, and maintain our design system.',
    requirements: '3+ years product design experience\nStrong Figma skills\nExperience designing data-heavy SaaS products\nPortfolio demonstrating UX problem-solving',
    createdDate: '5 Sep 2026', isPublic: true, publicSlug: 'product-designer',
  },
  {
    id: 'j3', title: 'Head of Engineering', department: 'Engineering', location: 'London, UK',
    type: 'Full-time', status: 'Open', description: 'A leadership role for an exceptional engineer ready to step into management. You will lead a team of 12 engineers, define technical roadmap, and work closely with the CTO.',
    requirements: '8+ years engineering experience\n3+ years engineering management\nTrack record of scaling teams\nStrong communication and stakeholder skills',
    createdDate: '10 Sep 2026', isPublic: false,
  },
  {
    id: 'j4', title: 'Data Analyst', department: 'Data', location: 'Berlin, DE (Hybrid)',
    type: 'Full-time', status: 'Closed', description: 'Closed role. Position filled.',
    requirements: 'SQL, Python, Tableau',
    createdDate: '15 Jul 2026', isPublic: false,
  },
  {
    id: 'j5', title: 'Frontend Engineer', department: 'Engineering', location: 'Remote (EU)',
    type: 'Full-time', status: 'Draft', description: 'Draft — not yet published.',
    requirements: 'React, TypeScript, 3+ years experience',
    createdDate: '18 Sep 2026', isPublic: false,
  },
];

export const CANDIDATES: Candidate[] = [
  { id: 'ca1', name: 'Annet Robson', email: 'annet.robson@gmail.com', phone: '+44 7700 900123', currentRole: 'Design Lead', location: 'London, UK', linkedin: 'linkedin.com/in/annetrobson', cvFile: 'annet_robson_cv.pdf', dateAdded: '1 Nov 2025', initials: 'AR', avatarColor: '#8B5CF6' },
  { id: 'ca2', name: 'Kane East', email: 'kane.east@proton.me', phone: '+44 7700 900456', currentRole: 'QA Engineer', location: 'Manchester, UK', linkedin: 'linkedin.com/in/kaneeast', cvFile: 'kane_east_cv.pdf', dateAdded: '4 Nov 2025', initials: 'KE', avatarColor: '#3B82F6' },
  { id: 'ca3', name: 'Mary Bridges', email: 'mary.bridges@outlook.com', phone: '+44 7800 900789', currentRole: 'UX Writer', location: 'Edinburgh, UK', linkedin: 'linkedin.com/in/marybridges', cvFile: 'mary_bridges_cv.pdf', dateAdded: '3 Nov 2025', initials: 'MB', avatarColor: '#EC4899' },
  { id: 'ca4', name: 'Sergiy Larin', email: 's.larin@gmail.com', phone: '+380 67 234 5678', currentRole: 'Backend Architect', location: 'Kyiv, UA (Remote)', linkedin: 'linkedin.com/in/sergiylarin', cvFile: 'sergiy_larin_cv.pdf', dateAdded: '24 Oct 2025', initials: 'SL', avatarColor: '#059669' },
  { id: 'ca5', name: 'Sonya Pawl', email: 'sonya.pawl@gmail.com', phone: '+49 151 234 56789', currentRole: 'Copywriter', location: 'Berlin, DE', dateAdded: '3 Oct 2025', initials: 'SP', avatarColor: '#F59E0B' },
  { id: 'ca6', name: 'Nick Warter', email: 'nick.warter@icloud.com', phone: '+44 7900 900123', currentRole: 'Head of UX', location: 'London, UK', linkedin: 'linkedin.com/in/nickwarter', cvFile: 'nick_warter_cv.pdf', dateAdded: '17 Sep 2025', initials: 'NW', avatarColor: '#0EA5E9' },
  { id: 'ca7', name: 'Roksa Kors', email: 'roksa@gmail.com', phone: '+31 6 12345678', currentRole: 'UX Team Lead', location: 'Amsterdam, NL', linkedin: 'linkedin.com/in/roksakors', cvFile: 'roksa_kors_cv.pdf', dateAdded: '5 Sep 2025', initials: 'RK', avatarColor: '#EF4444' },
  { id: 'ca8', name: 'Felix Hartmann', email: 'felix.h@proton.me', phone: '+49 170 987 6543', currentRole: 'Senior Python Developer', location: 'Munich, DE', linkedin: 'linkedin.com/in/felixhartmann', cvFile: 'felix_hartmann_cv.pdf', dateAdded: '28 Aug 2025', initials: 'FH', avatarColor: '#10B981' },
  { id: 'ca9', name: 'Isla McKenna', email: 'isla.mckenna@gmail.com', phone: '+44 7500 900321', currentRole: 'Engineering Manager', location: 'Glasgow, UK', cvFile: 'isla_mckenna_cv.pdf', dateAdded: '12 Aug 2025', initials: 'IM', avatarColor: '#6366F1' },
  { id: 'ca10', name: 'Dmitri Volkov', email: 'd.volkov@outlook.com', phone: '+371 29 123456', currentRole: 'Staff Engineer', location: 'Riga, LV (Remote)', linkedin: 'linkedin.com/in/dmitrivolkov', cvFile: 'dmitri_volkov_cv.pdf', dateAdded: '7 Aug 2025', initials: 'DV', avatarColor: '#F97316' },
  { id: 'ca11', name: 'Ama Asante', email: 'ama.asante@gmail.com', phone: '+233 24 456 7890', currentRole: 'Product Designer', location: 'Accra, GH (Remote)', linkedin: 'linkedin.com/in/amaasante', cvFile: 'ama_asante_cv.pdf', dateAdded: '19 Jul 2025', initials: 'AA', avatarColor: '#A855F7' },
  { id: 'ca12', name: 'Luca Ferretti', email: 'l.ferretti@gmail.com', phone: '+39 02 1234 5678', currentRole: 'Backend Engineer', location: 'Milan, IT (Hybrid)', linkedin: 'linkedin.com/in/lucaferretti', cvFile: 'luca_ferretti_cv.pdf', dateAdded: '3 Jul 2025', initials: 'LF', avatarColor: '#14B8A6' },
];

export const APPLICATIONS: Application[] = [
  // Senior Backend Engineer (j1)
  {
    id: 'ap1', candidateId: 'ca4', jobId: 'j1', stage: 'Interview', dateApplied: '26 Oct 2025', lastUpdated: '2 Nov 2025',
    aiStatus: 'complete', aiScore: 87, aiStrengths: ['Strong PostgreSQL expertise (5+ years)', 'AWS certified architect', 'Microservices architecture experience at scale', 'Python and Go proficiency'],
    aiGaps: ['No explicit Kubernetes experience mentioned', 'Redis usage limited to caching; no cluster management'],
    aiEvidence: ['"Designed and maintained a distributed PostgreSQL cluster serving 2M daily active users"', '"AWS Solutions Architect (Professional), certified 2023"', '"Led migration from monolith to 14-service microservices architecture"'],
    aiSummary: 'Strong technical match for the Senior Backend Engineer role. Sergiy demonstrates deep backend systems experience directly aligned with the job requirements. The absence of Kubernetes is a moderate gap but not a dealbreaker given his strong infrastructure fundamentals.',
    notes: 'Excellent phone screen. Articulate about architecture trade-offs. Schedule technical panel for next week.',
    activities: [
      { id: 'act1', date: '2 Nov 2025', user: 'Mira Holt', action: 'Moved to Interview' },
      { id: 'act2', date: '30 Oct 2025', user: 'Mira Holt', action: 'Completed screening call' },
      { id: 'act3', date: '26 Oct 2025', user: 'System', action: 'Application received' },
    ],
  },
  {
    id: 'ap2', candidateId: 'ca8', jobId: 'j1', stage: 'Screening', dateApplied: '29 Aug 2025', lastUpdated: '3 Sep 2025',
    aiStatus: 'complete', aiScore: 74, aiStrengths: ['Python expertise', 'PostgreSQL experience', 'Microservices background'],
    aiGaps: ['No cloud certification', 'Limited leadership experience'],
    aiEvidence: ['"5+ years Python, Django and FastAPI"', '"Built analytics pipeline on AWS Lambda"'],
    aiSummary: 'Good technical foundation with room for growth. Strong Python engineer but lacks the seniority markers expected for this role.',
    activities: [{ id: 'act4', date: '3 Sep 2025', user: 'Mira Holt', action: 'Moved to Screening' }, { id: 'act5', date: '29 Aug 2025', user: 'System', action: 'Application received' }],
  },
  {
    id: 'ap3', candidateId: 'ca12', jobId: 'j1', stage: 'Applied', dateApplied: '5 Jul 2025', lastUpdated: '5 Jul 2025',
    aiStatus: 'idle',
    activities: [{ id: 'act6', date: '5 Jul 2025', user: 'System', action: 'Application received' }],
  },
  {
    id: 'ap4', candidateId: 'ca10', jobId: 'j1', stage: 'Offer', dateApplied: '8 Aug 2025', lastUpdated: '15 Sep 2025',
    aiStatus: 'complete', aiScore: 92, aiStrengths: ['10+ years distributed systems', 'Kubernetes expert', 'AWS, GCP multi-cloud', 'Strong mentorship track record'],
    aiGaps: ['Based in Riga — relocation or remote arrangement required'],
    aiEvidence: ['"Staff Engineer at Stripe, 2019–2024"', '"Led 0→1 build of Kubernetes-based deployment platform"'],
    aiSummary: 'Exceptional technical match. Dmitri exceeds the role requirements across every dimension. The primary practical consideration is remote working arrangements.',
    notes: 'Verbal offer extended. Awaiting formal response.',
    activities: [
      { id: 'act7', date: '15 Sep 2025', user: 'Mira Holt', action: 'Extended verbal offer' },
      { id: 'act8', date: '10 Sep 2025', user: 'Mira Holt', action: 'Moved to Offer' },
      { id: 'act9', date: '8 Aug 2025', user: 'System', action: 'Application received' },
    ],
  },
  {
    id: 'ap5', candidateId: 'ca2', jobId: 'j1', stage: 'Rejected', dateApplied: '5 Nov 2025', lastUpdated: '6 Nov 2025',
    aiStatus: 'complete', aiScore: 31,
    aiStrengths: ['Strong QA fundamentals'],
    aiGaps: ['No backend development experience', 'No cloud infrastructure knowledge', 'Role mismatch'],
    aiSummary: 'QA Engineer profile with no evidence of backend engineering skills required for this role. Not a match.',
    activities: [{ id: 'act10', date: '6 Nov 2025', user: 'Mira Holt', action: 'Application rejected' }, { id: 'act11', date: '5 Nov 2025', user: 'System', action: 'Application received' }],
  },

  // Product Designer (j2)
  {
    id: 'ap6', candidateId: 'ca1', jobId: 'j2', stage: 'Screening', dateApplied: '1 Nov 2025', lastUpdated: '2 Nov 2025',
    aiStatus: 'complete', aiScore: 82, aiStrengths: ['10 years UX/product design experience', 'SaaS design portfolio', 'Design system ownership', 'Cross-functional collaboration'],
    aiGaps: ['Portfolio not yet reviewed', 'Limited evidence of data visualisation work'],
    aiEvidence: ['"UX Lead at Mailchimp"', '"Co-founder of a UX design agency for a decade"'],
    aiSummary: 'Strong candidate with exactly the seniority and SaaS experience this role requires. Recommend progressing to portfolio review and design exercise.',
    activities: [{ id: 'act12', date: '2 Nov 2025', user: 'Mira Holt', action: 'Moved to Screening' }, { id: 'act13', date: '1 Nov 2025', user: 'System', action: 'Application received' }],
  },
  {
    id: 'ap7', candidateId: 'ca3', jobId: 'j2', stage: 'Applied', dateApplied: '3 Nov 2025', lastUpdated: '3 Nov 2025',
    aiStatus: 'idle',
    activities: [{ id: 'act14', date: '3 Nov 2025', user: 'System', action: 'Application received' }],
  },
  {
    id: 'ap8', candidateId: 'ca11', jobId: 'j2', stage: 'Interview', dateApplied: '20 Jul 2025', lastUpdated: '5 Aug 2025',
    aiStatus: 'complete', aiScore: 89,
    aiStrengths: ['5 years product design at growth-stage SaaS companies', 'Figma expert', 'Design system contributor', 'Strong UX research background'],
    aiGaps: ['Less experience with data-heavy dashboards'],
    aiEvidence: ['"Led design for 3 major product launches at Paystack"', '"Maintained Figma component library used by 20+ designers"'],
    aiSummary: 'Ama is an excellent fit. Strong portfolio, SaaS-native background, and clear progression. The data-heavy dashboard experience gap is minor given the strength of her other credentials.',
    activities: [{ id: 'act15', date: '5 Aug 2025', user: 'Mira Holt', action: 'Moved to Interview' }, { id: 'act16', date: '20 Jul 2025', user: 'System', action: 'Application received' }],
  },
  {
    id: 'ap9', candidateId: 'ca7', jobId: 'j2', stage: 'Hired', dateApplied: '6 Sep 2025', lastUpdated: '19 Sep 2025',
    aiStatus: 'complete', aiScore: 91,
    aiStrengths: ['UX Team Lead with 7 years experience', 'Product design leadership', 'Amsterdam-based, EU timezone'],
    aiGaps: [],
    aiSummary: 'Excellent match. Strong leadership background alongside hands-on design skill.',
    activities: [{ id: 'act17', date: '19 Sep 2025', user: 'Mira Holt', action: 'Marked as Hired' }, { id: 'act18', date: '6 Sep 2025', user: 'System', action: 'Application received' }],
  },

  // Head of Engineering (j3)
  {
    id: 'ap10', candidateId: 'ca9', jobId: 'j3', stage: 'Interview', dateApplied: '13 Aug 2025', lastUpdated: '2 Sep 2025',
    aiStatus: 'complete', aiScore: 85,
    aiStrengths: ['Engineering management track record', 'Led teams of 10–15 engineers', 'Strong technical depth in systems engineering'],
    aiGaps: ['Less experience at director/VP level', 'No explicit mention of CTO-level stakeholder management'],
    aiEvidence: ['"Engineering Manager at Skyscanner, managing 12 engineers across 3 squads"'],
    aiSummary: 'Strong candidate for Head of Engineering. Has the technical credibility and management experience the role requires, with some room to grow at the executive stakeholder level.',
    activities: [{ id: 'act19', date: '2 Sep 2025', user: 'Mira Holt', action: 'Moved to Interview' }, { id: 'act20', date: '13 Aug 2025', user: 'System', action: 'Application received' }],
  },
  {
    id: 'ap11', candidateId: 'ca6', jobId: 'j3', stage: 'Applied', dateApplied: '18 Sep 2025', lastUpdated: '18 Sep 2025',
    aiStatus: 'idle',
    activities: [{ id: 'act21', date: '18 Sep 2025', user: 'System', action: 'Application received' }],
  },
];

export const STAGE_ORDER: Application['stage'][] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];

export const STAGE_COLORS: Record<string, string> = {
  Applied: '#3B82F6',
  Screening: '#8B5CF6',
  Interview: '#F59E0B',
  Offer: '#F97316',
  Hired: '#22C55E',
  Rejected: '#9CA3AF',
};

export const STAGE_BG: Record<string, string> = {
  Applied: '#EFF6FF',
  Screening: '#F5F3FF',
  Interview: '#FFFBEB',
  Offer: '#FFF7ED',
  Hired: '#F0FDF4',
  Rejected: '#F9FAFB',
};
