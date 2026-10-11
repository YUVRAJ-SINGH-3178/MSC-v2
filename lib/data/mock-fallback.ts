export interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  type: string;
  status: 'upcoming' | 'completed';
  date_start: string;
  date_end: string;
  image_url: string;
  banner_url?: string;
  registration_open: boolean;
  show_opening_soon: boolean;
  is_published: boolean;
  max_capacity: number;
  form_requirements: {
    event_pricing: 'free' | 'paid';
    registration_fee?: number; // in INR
    charge_type?: 'per_person' | 'per_team';
    allow_teams?: boolean;
    max_team_size?: number;
    allow_external_students?: boolean;
    req_reg_num?: boolean;
    req_branch?: boolean;
    req_spec?: boolean;
    provide_certificates?: boolean;
    agenda?: { time: string; title: string; desc: string }[];
    speakers?: { name: string; title: string; company: string; image_url?: string }[];
  };
  certificate_html?: string;
  gallery_urls: string[];
}

export interface TeamMemberItem {
  id: string;
  name: string;
  role: string;
  tier: 'chief' | 'board' | 'lead' | 'member';
  category: string;
  email?: string;
  linkedin_url?: string;
  github_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  portfolio_url?: string;
  image_url?: string;
  display_order?: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
  alt_text: string;
}

export const FALLBACK_EVENTS: EventItem[] = [
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    title: 'SYNORA',
    slug: 'synora-26',
    description:
      'It is a fresher-oriented 18-hour technology event that combines 6 hours of orientation and technical talks with a 12-hour intensive hackathon, giving students a complete experience of learning, collaboration, and hands-on project building.',
    location: 'Central Block Auditorium, SRM University AP',
    type: 'Hackathon',
    status: 'upcoming',
    date_start: '2026-09-17T09:00:00Z',
    date_end: '2026-09-18T03:00:00Z',
    image_url: 'https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/hackmsc1.jpg',
    banner_url: 'https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/hackmsc1.jpg',
    registration_open: false,
    show_opening_soon: false,
    is_published: true,
    max_capacity: 400,
    form_requirements: {
      event_pricing: 'free',
      registration_fee: 0,
      charge_type: 'per_team',
      allow_teams: true,
      max_team_size: 4,
      allow_external_students: true,
      req_reg_num: true,
      req_branch: true,
      req_spec: true,
      provide_certificates: false,
      agenda: [
        { time: '09:00 AM', title: 'Check-in & Kit Distribution', desc: 'Badge scan and team kit distribution' },
        { time: '10:00 AM', title: 'Orientation & Technical Talks', desc: '6 hours of keynotes, cloud sessions, and mentor guidance' },
        { time: '04:00 PM', title: 'Hackathon Kick-off', desc: '12-hour intensive project building sprint commences' },
        { time: '10:00 PM', title: 'Midnight Review Checkpoint', desc: 'Technical architecture feedback with mentors' },
        { time: '04:00 AM', title: 'Code Freeze & Grand Finale Pitches', desc: 'Final prototype presentations and awards' },
      ],
      speakers: [
        { name: 'Dr. Murali Krishna Enduri Sir', title: 'Faculty Mentor & Head of Dept', company: 'SRM University AP' },
        { name: 'Dr. CV Tomy Sir', title: 'Faculty Mentor & Professor', company: 'SRM University AP' },
        { name: 'Jayanth Ramakrishnan', title: 'President & Founder', company: 'Microsoft Student Community' },
      ],
    },
    certificate_html: `
      <div style="width: 1000px; height: 700px; padding: 50px; background: #fffdfb; border: 12px solid #0067b8; font-family: 'Segoe UI', system-ui, sans-serif; box-sizing: border-box; position: relative;">
        <div style="border: 2px solid #dceef8; height: 100%; padding: 40px; box-sizing: border-box; text-align: center; position: relative;">
          <h4 style="color: #0067b8; letter-spacing: 4px; text-transform: uppercase; margin: 0; font-size: 14px;">Microsoft Student Community &bull; SRM University AP</h4>
          <h1 style="color: #17253d; font-size: 44px; margin: 20px 0 10px 0; font-weight: 600;">CERTIFICATE OF PARTICIPATION</h1>
          <p style="color: #616161; font-size: 16px; margin-bottom: 30px;">This certificate is proudly awarded to</p>
          <h2 style="color: #0067b8; font-size: 38px; border-bottom: 2px solid #0067b8; display: inline-block; padding-bottom: 8px; margin: 0 0 20px 0;">{{NAME}}</h2>
          <p style="color: #17253d; font-size: 17px; max-width: 700px; margin: 0 auto; line-height: 1.6;">
            for successfully participating and engineering cutting-edge solutions at <strong>{{EVENT_TITLE}}</strong>, representing <strong>{{COLLEGE_NAME}}</strong> held on <strong>{{EVENT_DATE}}</strong>.
          </p>
          <div style="position: absolute; bottom: 30px; left: 40px; right: 40px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="text-align: center;">
              <p style="border-top: 1px solid #737373; width: 180px; padding-top: 6px; font-size: 13px; color: #17253d; margin: 0;">Faculty Advisor<br/><strong>Dr. Murali Krishna Enduri</strong></p>
            </div>
            <div style="text-align: center;">
              <span style="font-size: 12px; color: #737373;">Official MSC Chapter '26 Verification</span>
            </div>
            <div style="text-align: center;">
              <p style="border-top: 1px solid #737373; width: 180px; padding-top: 6px; font-size: 13px; color: #17253d; margin: 0;">Faculty Advisor<br/><strong>Dr. CV Tomy</strong></p>
            </div>
          </div>
        </div>
      </div>
    `,
    gallery_urls: [
      'https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/hackmsc1.jpg',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    id: 'e1000000-0000-0000-0000-000000000002',
    title: 'Quantum Computing Workshop',
    slug: 'quantum-computing-workshop',
    description:
      'Hands-on exploration into quantum circuits, Qiskit algorithms, and qubits. Learn how quantum computational advantages disrupt standard encryption and algorithmic performance.',
    location: 'Lab 4, AL & ML Block, SRM University AP',
    type: 'Workshop',
    status: 'upcoming',
    date_start: '2026-11-05T14:00:00Z',
    date_end: '2026-11-05T18:00:00Z',
    image_url: 'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/QCW.webp',
    banner_url: 'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/QCW.webp',
    registration_open: true,
    show_opening_soon: false,
    is_published: true,
    max_capacity: 120,
    form_requirements: {
      event_pricing: 'free',
      registration_fee: 0,
      allow_teams: false,
      allow_external_students: true,
      req_reg_num: true,
      req_branch: true,
      provide_certificates: true,
      agenda: [
        { time: '02:00 PM', title: 'Qubits & Superposition', desc: 'Mathematical foundations of quantum states' },
        { time: '03:15 PM', title: 'Quantum Gate Operations in Qiskit', desc: 'Hands-on programming using Python' },
        { time: '05:00 PM', title: 'Quantum Circuit Simulation', desc: 'Deploying simulations on IBM Quantum backends' },
      ],
    },
    gallery_urls: [],
  },
  {
    id: 'e1000000-0000-0000-0000-000000000003',
    title: 'Quantum Computing Lab Session',
    slug: 'quantum-computing-lab',
    description:
      "Deep-dive algorithms session implementing Grover's search and Shor's period finding quantum algorithms with circuit optimization.",
    location: 'Advanced Computing Lab, SRM University AP',
    type: 'Workshop',
    status: 'completed',
    date_start: '2026-03-10T10:00:00Z',
    date_end: '2026-03-10T17:00:00Z',
    image_url: 'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/Quantum.webp',
    banner_url: 'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/Quantum.webp',
    registration_open: false,
    show_opening_soon: false,
    is_published: true,
    max_capacity: 250,
    form_requirements: {
      event_pricing: 'free',
      registration_fee: 0,
      provide_certificates: true,
    },
    gallery_urls: [
      'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/Quantum.webp',
    ],
  },
];

export const FALLBACK_TEAM: TeamMemberItem[] = [
  // Tier 1: Chief Board (Spotlight Tier)
  {
    id: 'tm-1',
    name: 'Jayanth Ramakrishnan',
    role: 'President',
    tier: 'chief',
    category: 'Leadership',
    email: 'jayanth@srmap.edu.in',
    linkedin_url: 'https://linkedin.com/in/jayanthramakrishnan',
    github_url: 'https://github.com/jayanthramakrishnan',
    image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    display_order: 1,
  },
  {
    id: 'tm-2',
    name: 'Vice President Name',
    role: 'Vice President',
    tier: 'chief',
    category: 'Leadership',
    email: 'vp@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    github_url: 'https://github.com',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    display_order: 2,
  },
  {
    id: 'tm-3',
    name: 'Managing Director Name',
    role: 'Managing Director',
    tier: 'chief',
    category: 'Leadership',
    email: 'md@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    github_url: 'https://github.com',
    image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    display_order: 3,
  },

  // Tier 2: Board Members (Domain Leads)
  {
    id: 'tm-4',
    name: 'Technical Lead',
    role: 'Technical Lead',
    tier: 'board',
    category: 'Technical',
    email: 'tech.lead@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    github_url: 'https://github.com',
    image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    display_order: 4,
  },
  {
    id: 'tm-5',
    name: 'Design & UI/UX Lead',
    role: 'Design & UI/UX Lead',
    tier: 'board',
    category: 'Design',
    email: 'design.lead@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    instagram_url: 'https://instagram.com',
    image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    display_order: 5,
  },
  {
    id: 'tm-6',
    name: 'Operations Lead',
    role: 'Operations Lead',
    tier: 'board',
    category: 'Operations',
    email: 'operations.lead@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    display_order: 6,
  },
  {
    id: 'tm-7',
    name: 'Events Lead',
    role: 'Events Lead',
    tier: 'board',
    category: 'Events',
    email: 'events.lead@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    image_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80',
    display_order: 7,
  },
  {
    id: 'tm-8',
    name: 'PR & Media Lead',
    role: 'PR & Media Lead',
    tier: 'board',
    category: 'Media',
    email: 'pr.lead@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    twitter_url: 'https://twitter.com',
    image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    display_order: 8,
  },

  // Tier 3: Core Team Members
  {
    id: 'tm-9',
    name: 'Ananya Sharma',
    role: 'Full Stack Cloud Developer',
    tier: 'member',
    category: 'Technical',
    email: 'ananya@srmap.edu.in',
    github_url: 'https://github.com',
    image_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    display_order: 9,
  },
  {
    id: 'tm-10',
    name: 'Varun Teja',
    role: 'Logistics Coordinator',
    tier: 'member',
    category: 'Operations',
    email: 'varun@srmap.edu.in',
    linkedin_url: 'https://linkedin.com',
    image_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80',
    display_order: 10,
  },
];

export const FALLBACK_GALLERY: GalleryItem[] = [
  {
    id: 'hack-2.0',
    title: '<hack>2.0</msc>',
    category: 'Hackathons',
    image_url: 'https://lkbwunzswqbnoygxtilm.supabase.co/storage/v1/object/public/webpage/hackmsc1.jpg',
    alt_text: '48-hour flagship hackathon bringing builders together across SRM University AP.',
  },
  {
    id: 'hack-x',
    title: '<hack>X<msc>',
    category: 'Hackathons',
    image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80',
    alt_text: 'Next-generation innovation sprint tackling real-world problem statements.',
  },
  {
    id: 'msc-tech-fest',
    title: 'MSC Tech Fest',
    category: 'Festivals',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    alt_text: 'Annual technical extravaganza celebrating student engineering excellence and innovation.',
  },
  {
    id: 'quantum-computing-01',
    title: 'Quantum Computing Workshop',
    category: 'Workshops',
    image_url: 'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/QCW.webp',
    alt_text: 'Hands-on exploration into quantum circuits, Qiskit algorithms, and qubits.',
  },
  {
    id: 'quantum-computing-02',
    title: 'Quantum Computing Lab Session',
    category: 'Workshops',
    image_url: 'https://nakwfnivpodkvperbfkf.supabase.co/storage/v1/object/public/Events/Quantum.webp',
    alt_text: "Deep-dive algorithms session implementing Grover's and Shor's quantum algorithms.",
  },
  {
    id: 'zero-jam-hackathon',
    title: 'Zero Jam Hackathon',
    category: 'Hackathons',
    image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1000&q=80',
    alt_text: 'Rapid prototyping sprint where teams build and ship working MVP apps in a single day.',
  },
  {
    id: 'g-7',
    title: 'MLSA Regional Chapter Excellence Award',
    category: 'Awards',
    image_url: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=1000&q=80',
    alt_text: 'SRM AP chapter receiving official Microsoft Learn Student Ambassador distinction.',
  },
  {
    id: 'g-8',
    title: "SYNORA '26 Grand Prize Podium Ceremony",
    category: 'Awards',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80',
    alt_text: 'Top national hackathon teams awarded pooled cash prize.',
  },
];
