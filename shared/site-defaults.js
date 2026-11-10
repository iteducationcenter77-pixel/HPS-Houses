// ============================================
// Website content — starting values
// ============================================
// Carried over from the old school site (hpsassam.org, November 2026).
// Everything here can be changed from Admin → Website; saved changes are
// stored in MongoDB and override these values.

const person = (name, role, qualification, experience, photo = '') => ({ name, role, qualification, experience, photo });
const fac = (slug) => `/images/faculty/${slug}.jpg`;

export const SITE_DEFAULTS = {
  general: {
    name: 'Howly Public School',
    short_name: 'HPS',
    tagline: 'A School For Your Genius',
    logo_url: '/images/site/logo.png',
    crest_url: '/hps-logo.png',
    established: '2024',
    address_line1: 'Lachit Road, Howly',
    address_line2: 'Barpeta, Assam 781316',
    phone: '+91 80993 75516',
    phone2: '+91 80999 44631',
    email: 'admissions@hpsassam.org',
    email2: 'info@hpsassam.org',
    whatsapp: '918099375516',
    office_days: 'Monday – Saturday',
    office_hours: '8:45 AM – 3:00 PM',
    facebook_url: 'https://www.facebook.com/howlypublicschool/',
    instagram_url: 'https://www.instagram.com/hpsassam/',
    prospectus_url: '',
    map_url: '',
    footer_about: 'Since 2024, Howly Public School has been a premier institution committed to excellence in education.',
  },

  notice: {
    enabled: 'yes',
    text: 'Admission Open 2026 (Nursery to VIII)',
  },

  hero: {
    eyebrow: 'A CBSE Curriculum School',
    title: 'A School For Your Genius',
    text: 'A CBSE curriculum school blending academics with skills like spoken English, IT proficiency, and critical thinking to prepare students for success.',
    image: '/images/site/hero.jpg',
  },

  highlights: {
    items: [
      { title: 'Excellence in Education', text: 'Comprehensive and holistic study experience with individual focus.' },
      { title: 'Competitive Success', text: 'Preparing kids for competitive exams like science and math olympiad.' },
      { title: 'Modern Facilities', text: 'State of the art laboratories and learning facilities.' },
    ],
  },

  about: {
    heading: 'About Howly Public School',
    lead: 'A premier English Medium CBSE Curriculum School',
    paragraphs: [
      "Founded by Alam Foundation, the pioneers of Howly's first private school, Howly Public School (HPS) was established in 2024 to nurture future leaders.",
      "HPS offers an English-medium, NEP-aligned CBSE curriculum that combines academics with skill development in spoken English, IT proficiency, and critical thinking. We also prepare students for competitive exams, ensuring they are ready for life's challenges.",
      'At HPS, education extends beyond textbooks. We instill confidence, strong values, and a growth mindset, preparing students to thrive in a rapidly changing world. More than a school, we are a family dedicated to shaping brighter futures.',
    ],
    image: '/images/gallery/photo-2.jpg',
    stats: [
      { value: '2024', label: 'Founded' },
      { value: 'Nursery – VIII', label: 'Classes Offered' },
      { value: 'NEP-Aligned', label: 'CBSE Curriculum' },
      { value: 'English', label: 'Medium of Instruction' },
    ],
  },

  messages: {
    heading: 'Leadership Messages',
    items: [
      {
        role: "MD's Message",
        greeting: 'Dear Parents, Students, and Well-wishers,',
        text: 'At Howly Public School, we are committed to providing world-class education that shapes future leaders and responsible citizens. Quality teaching is our priority, and we strive to empower every student to excel in life.',
        name: 'Dr. Shamsul Alam',
        credentials: 'Managing Director',
        photo: fac('shamsul-alam'),
      },
      {
        role: "Principal's Message",
        greeting: 'Dear Parents, Students, and Friends,',
        text: "It's not about books and classrooms. Curiosity is what all it takes to be a good learner. And I believe we are championing it at HPS.",
        name: 'Insimamul Haoque',
        credentials: 'Principal, MA (Kerela)',
        photo: fac('insimamul-haoque'),
      },
      {
        role: "Vice-Principal's Message",
        greeting: 'Dear Parents, Students, and Friends,',
        text: 'Guided by the belief that every child holds limitless potential, my vision at Howly Public School is to cultivate a learning environment that inspires innovation, resilience, and ethical leadership for a brighter tomorrow.',
        name: 'Pranay Saha',
        credentials: 'Vice-Principal, M.Sc.',
        photo: fac('pranay-saha'),
      },
    ],
  },

  academics: {
    heading: 'Academic Excellence',
    intro: 'At Howly Public School, we follow the CBSE curriculum aligned with National Education Policy (NEP) 2020, focusing on developing critical thinking and problem-solving skills.',
    groups: [
      {
        title: 'Nursery to KG',
        points: [
          'NEP-aligned CBSE curriculum',
          'Activity-based learning approach',
          'Focus on foundational literacy and numeracy',
          'Development of social and emotional skills',
          'Building communication abilities',
          'English immersion environment',
        ],
      },
      {
        title: 'Classes I to VIII',
        points: [
          'NCERT textbooks and CBSE curriculum',
          'English as medium of instruction',
          'Skill development in spoken English',
          'IT proficiency training',
          'Preparation for competitive exams',
          'Development of critical thinking skills',
        ],
      },
    ],
    programs_intro: 'Our educational programs are designed to provide a holistic learning experience, preparing students for both academic excellence and real-world challenges.',
    programs: [
      { title: 'STEM Education', text: 'Our STEM program integrates science, technology, engineering, and mathematics to develop critical thinking, problem-solving skills, and innovation. Students participate in hands-on activities, experiments, and projects that foster a deep understanding of these subjects.' },
      { title: 'IT Proficiency', text: "In today's digital age, IT skills are essential. Our comprehensive IT curriculum teaches students computer basics, coding, digital literacy, and responsible use of technology, preparing them for the demands of the modern world." },
      { title: 'English Language Skills', text: 'Our English language program focuses on developing strong communication skills - speaking, listening, reading, and writing. Through interactive sessions, debates, and presentations, students gain confidence in expressing themselves clearly and effectively.' },
      { title: 'Competitive Exam Preparation', text: 'We prepare students for various competitive examinations with specialized training sessions, practice tests, and personalized guidance. Our approach builds not just knowledge but also exam strategies and confidence.' },
    ],
    assessment_intro: 'Our assessment system follows the CBSE guidelines with a focus on continuous and comprehensive evaluation.',
    assessment: [
      { title: 'Formative Assessment', text: 'Regular assessments through classwork, homework, projects and activities to monitor student progress.' },
      { title: 'Summative Assessment', text: 'Periodic and term-end examinations to evaluate overall understanding and retention.' },
      { title: 'Holistic Evaluation', text: 'Assessment of co-scholastic areas including life skills, attitudes, and values.' },
    ],
    calendar: [
      { date: '1st June', title: 'Academic Year Begins' },
      { date: '15th June', title: 'First Unit Test' },
      { date: '1st Sept', title: 'Mid-Term Examinations' },
      { date: '15th Sept', title: 'Science Exhibition' },
      { date: '1st Dec', title: 'Pre-Board Examinations' },
      { date: '15th Dec', title: 'Winter Break' },
    ],
  },

  facilities: {
    heading: 'State-of-the-Art Facilities',
    intro: 'Modern facilities designed to enhance the learning experience.',
    items: [
      { title: 'Audio-Visual Classrooms', text: 'Adequately equipped classrooms with projectors and modern teaching aids for interactive learning.' },
      { title: 'Computer Class', text: 'A dedicated IT lab where students learn valuable digital skills.' },
      { title: 'Science Lab', text: 'Well-equipped science lab for practical learning and experiments.' },
      { title: 'Art Class', text: 'Offering an outlet for creativity through various forms of art.' },
      { title: 'Spoken English Classes', text: 'Focus on building fluency and confidence in English communication.' },
      { title: 'Mentoring Program', text: 'Personalized mentorship for academic guidance and personal development.' },
      { title: 'Remedial Classes', text: 'Extra help for students requiring additional academic support.' },
      { title: 'House System', text: 'Students divided into four houses to bring a sense of competitiveness.' },
      { title: 'First Aid', text: 'A well-equipped first aid facility ensuring student safety.' },
    ],
    infrastructure: [
      'Clean Drinking Water & Cafe',
      'Diesel Generator Backup',
      'CCTV Surveillance',
      'Well-equipped Laboratories',
    ],
  },

  houses: {
    heading: 'Four Houses. One Spirit.',
    text: 'Every student belongs to one of four houses — Orion, Titans, Phoenix and Spartans. Through sports, academics and cultural competitions, they earn points for their house all year long.',
  },

  faculty: {
    heading: 'Meet Our Expert Faculty',
    intro: 'Learn from distinguished teachers who are leaders in their respective fields.',
    items: [
      person('Dr. Shamsul Alam', 'Managing Director', 'Doctor, Assam Health Services', '30+ years experience', fac('shamsul-alam')),
      person('Insimamul Haoque', 'Principal', 'MA (Education), Kerela', '12+ years experience', fac('insimamul-haoque')),
      person('Pranay Saha', 'Vice Principal', 'M.Sc, B.Ed', '10+ years experience', fac('pranay-saha')),
      person('Mina Nath', 'Teacher', 'B.A, D.El.Ed', '26+ years experience', fac('mina-nath')),
      person('Sabibar Rahman', 'Assistant Teacher', 'B.A, D.El.Ed', '', fac('sabibar-rahman')),
      person('Akbar Ali', 'Assistant Teacher', 'B.A, D.El.Ed', '', fac('akbar-ali')),
      person('Azhar Ali Khan', 'Assistant Teacher', 'MM in Arabic, D.El.Ed', 'Since 2011', fac('azhar-ali-khan')),
      person('Habibar Rahman', 'Assistant Teacher', 'MA (History)', 'Since 2024', fac('habibar-rahman')),
      person('Sukur Ali', 'Assistant Teacher', 'D.El.Ed, B.Ed, M.M', 'Since 2017', fac('sukur-ali')),
      person('Saddam Hussain', 'Assistant Teacher', 'M.Sc (Maths), B.Ed, D.El.Ed', 'Since 2022', fac('saddam-hussain')),
      person('Ayesha Anjuma', 'Assistant Teacher', 'M.A (Hindi)', 'Since 2022'),
      person('Hamidul Islam', 'Assistant Teacher', 'B.Com', 'Since 2024', fac('hamidul-islam')),
      person('Dimpi Dutta', 'Assistant Teacher', 'MA in English', 'Since 2024', fac('dimpi-dutta')),
      person('Kritika Nath', 'Assistant Teacher', 'B.Sc (Statistics)', 'Since 2024', fac('kritika-nath')),
      person('Chunumoni Nath', 'Assistant Teacher', 'M.A in Philosophy', 'Since 2024', fac('chunumoni-nath')),
      person('Sujan Talukdar', 'Assistant Teacher', 'Bachelor of Business Administration', 'Since 2024', fac('sujan-talukdar')),
      person('Sidhi Saha', 'Assistant Teacher', 'B.Com (Accountancy), PGDCA', 'Since 2024'),
      person('Jaya Nath', 'Assistant Teacher', 'B.A.', 'Since 2024', fac('jaya-nath')),
      person('Parchi Das', 'Assistant Teacher', 'D.El.Ed', 'Since 2024', fac('parchi-das')),
      person('Baishali Mandal', 'Assistant Teacher', 'M.A (Economics), PGDCA', 'Since 2024', fac('baishali-mandal')),
      person('Manjit Das', 'Assistant Teacher', 'MA, D.El.Ed', 'Since 2024', fac('manjit-das')),
      person('Amina Khanam', 'Accountant', 'PGDCA', 'Since 2015'),
      person('Nilay Sharma', 'Office Staff', 'BA, DCA', 'Since 2024'),
      person('Kayem Uddin', 'Non-Teaching Staff', '', 'Since 1997'),
      person('Archana Devi', 'Non-Teaching Staff', '', 'Since 2019'),
      person('Minuti Karmakar', 'Non-Teaching Staff', '', 'Since 2023'),
      person('Pompi Hazarika', 'Non-Teaching Staff', '', 'Since 2024'),
      person('Manjuwara Khanam', 'Non-Teaching Staff', '', 'Since 2024'),
    ],
  },

  gallery: {
    heading: 'Campus Life at HPS',
    intro: 'Experience the vibrant atmosphere and facilities that make HPS a leading public school.',
    items: [
      { image: '/images/gallery/campus-1.jpg', title: 'Laboratories', category: 'Facilities', text: 'Science labs equipped for practical learning and experiments.' },
      { image: '/images/gallery/campus-2.jpg', title: 'Library', category: 'Academic', text: 'A collection of digital and print resources for reading and research.' },
      { image: '/images/gallery/campus-3.jpg', title: 'House System', category: 'Activities', text: 'Four houses that bring students together in friendly competition.' },
      { image: '/images/gallery/campus-4.jpg', title: 'Smart Classrooms', category: 'Academic', text: 'Interactive learning spaces with modern teaching aids.' },
      { image: '/images/gallery/campus-5.jpg', title: 'Cultural Events', category: 'Activities', text: 'Regular events celebrating science, arts, and culture.' },
      { image: '/images/gallery/campus-6.jpg', title: 'Awards Ceremony', category: 'Activities', text: 'Celebrating achievements in academic and extra-curricular activities.' },
      { image: '/images/gallery/photo-1.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-2.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-3.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-4.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-5.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-6.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-7.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-8.jpg', title: '', category: 'Campus', text: '' },
      { image: '/images/gallery/photo-9.jpg', title: '', category: 'Campus', text: '' },
    ],
  },

  news: {
    heading: 'Notices & Updates',
    intro: 'Stay informed about our latest achievements, events, and announcements.',
    items: [
      { title: 'Admission Open 2026 (Nursery to VIII)', date: '', category: 'Admissions', text: 'Admissions are open for Nursery to Class VIII. Contact the school office or message us on WhatsApp for details.' },
    ],
  },

  admissions: {
    heading: 'Admissions',
    intro: 'Join our vibrant community of learners at Howly Public School.',
    steps: [
      { title: 'Submit Application', text: 'Send us an enquiry or visit the school office to collect and submit the application form.' },
      { title: 'Document Verification', text: 'Bring the required documents to the office for verification.' },
      { title: 'Entrance Test', text: 'Your child takes a simple, age-appropriate entrance test.' },
      { title: 'Final Admission', text: 'Complete the formalities and welcome to the HPS family.' },
    ],
    dates: [],
    documents: [
      'Birth Certificate',
      'Previous school marksheets',
      'Transfer Certificate (TC)',
      'Passport-sized photographs',
      'Address & ID proof',
    ],
  },
};
