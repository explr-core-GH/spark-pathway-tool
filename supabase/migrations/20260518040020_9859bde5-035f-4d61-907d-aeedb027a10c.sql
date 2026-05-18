-- =========================================================
-- Phase 2/3: Catalog tables (internships + camps)
-- =========================================================

CREATE TABLE public.internships (
  slug text PRIMARY KEY,
  name text NOT NULL,
  theme text NOT NULL DEFAULT '',
  lead text,
  outside_partners text NOT NULL DEFAULT '',
  deliverables text NOT NULL DEFAULT '',
  external_url text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '💼',
  riasec text[] NOT NULL DEFAULT '{}',
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internships read all authed" ON public.internships
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "internships admin write" ON public.internships
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.camps (
  slug text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🎒',
  tagline text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  age_range text NOT NULL DEFAULT '',
  overview text NOT NULL DEFAULT '',
  slides text,
  days jsonb NOT NULL DEFAULT '[]'::jsonb,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camps read all authed" ON public.camps
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "camps admin write" ON public.camps
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Touch updated_at on update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER internships_set_updated BEFORE UPDATE ON public.internships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER camps_set_updated BEFORE UPDATE ON public.camps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed internships
INSERT INTO public.internships (slug, name, theme, lead, outside_partners, deliverables, external_url, emoji, riasec, sort_order) VALUES
('adaptive-design','Adaptive Design','BioMed','Zachary Wenz','OT Professor at CSU · OTs in CMSD · Karen Thompson-Repas (Director CMSD OT)','3D designed adaptive tools designed for individuals and educators','https://adaptivedesign.netlify.app/','🩺',ARRAY['I','R'],1),
('nextgen-educators','NextGen Educators','STEM CSU Camps','Angela Powell','VILSAP · CSU','Workshop lesson plans / implementation','https://nextgeneducators.netlify.app/','🎓',ARRAY['S','A'],2),
('webdevai','WebDevAI','Two cohorts · Lead TBD',NULL,'Outside partners TBD','Published website, app, or tool','https://webdevaicsu.netlify.app/','💻',ARRAY['I','A'],3),
('games-for-change','Games for Change','Video Game Design','Julien Medina','Endless Access','Published video game, published assets','https://gamesforchange.netlify.app/','🎮',ARRAY['A','I'],4),
('envsci','EnvSci','Environmental Science Field Data','Yulisa Alvarado','RidAll','Published proposal with data dashboard','https://envscicsu.netlify.app/','🌿',ARRAY['I','R'],5),
('civic-journalism','Civic Journalism','Civic Journalism','Sarah Spinelli','City of Cleveland (TBD)','Published website with articles, videos, and podcasts telling Cleveland stories','https://civicjournalism.netlify.app/','🎙️',ARRAY['A','S'],6);

-- Seed camps
INSERT INTO public.camps (slug, name, emoji, tagline, duration, age_range, overview, slides, days, resources, sort_order) VALUES
('bike-cleveland','Bike Cleveland — Gear Up For STEM','🚲','Bike-powered STEM unit in partnership with Bike Cleveland.','Single unit','Middle school','A standalone STEM unit exploring physics, mechanics, and engineering through bicycles. Includes a single educator guide and slide deck.','GearUpForSTEM_Slides.pptx','[]'::jsonb,'[{"label":"Educator Guide","file":"GearUpForSTEM_EducatorGuide.docx","type":"guide"},{"label":"Slide Deck","file":"GearUpForSTEM_Slides.pptx","type":"slides"}]'::jsonb,1),
('boxcraft','BoxCraft — Cardboard Design','📦','Five days of hands-on cardboard engineering and design thinking.','5 days','Elementary / Middle','Students design, prototype, test, and refine creations from cardboard — practicing tool use, iteration, and showcase presentation skills.',NULL,'[{"day":1,"title":"Tools & Techniques","file":"BoxCraft_Day1_ToolsTechniques.pptx"},{"day":2,"title":"Choose & Plan","file":"BoxCraft_Day2_ChoosePlan.pptx"},{"day":3,"title":"Build & Test","file":"BoxCraft_Day3_BuildTest.pptx"},{"day":4,"title":"Refine & Improve","file":"BoxCraft_Day4_RefineImprove.pptx"},{"day":5,"title":"Finish & Showcase","file":"BoxCraft_Day5_FinishShowcase.pptx"}]'::jsonb,'[{"label":"Teacher Guide","file":"BoxCraft_TeacherGuide.docx","type":"guide"},{"label":"Student Workbook","file":"BoxCraft_StudentWorkbook.docx","type":"workbook"}]'::jsonb,2),
('fashionforge','FashionForge — All Girls','👗','Fashion + tech camp paired with underwater robotics (all-girls cohort).','5 days','Middle school','A creative engineering camp where students design wearables and accessories, exploring textiles, 3D printing, and jewelry design — paired with an underwater robotics track.',NULL,'[{"day":1,"title":"Fashion Meets the Future","file":"Day1_FashionMeetsTheFuture.pptx"},{"day":2,"title":"Jewelry Design Studio","file":"Day2_JewelryDesignStudio.pptx"},{"day":3,"title":"Fabric & Filament","file":"Day3_FabricAndFilament.pptx"},{"day":4,"title":"Accessories Lab","file":"Day4_AccessoriesLab.pptx"},{"day":5,"title":"FashionForge Showcase","file":"Day5_FashionForgeShowcase.pptx"}]'::jsonb,'[{"label":"Teacher Guide","file":"FashionForge_TeacherGuide.docx","type":"guide"},{"label":"Student Workbook","file":"FashionForge_StudentWorkbook.docx","type":"workbook"}]'::jsonb,3),
('fll-challenge','FLL Challenge Camp','🤖','FIRST LEGO League Challenge preparation camp.','Camp unit','Elementary / Middle','Introduces FIRST LEGO League Challenge — robot design, missions, and team collaboration — in a single-deck format.','FLL_Camp_Slide_Deck.pptx','[]'::jsonb,'[{"label":"Teacher Guide","file":"FLL_Camp_Teacher_Guide.docx","type":"guide"},{"label":"Student Workbook","file":"FLL_Camp_Student_Workbook.docx","type":"workbook"},{"label":"Slide Deck","file":"FLL_Camp_Slide_Deck.pptx","type":"slides"}]'::jsonb,4),
('microclimate','MicroClimate (Paired with Seaperch)','🌱','Environmental science camp paired with Seaperch underwater ROV build.','5 days','Middle school','Students explore microclimates, wind, sun, hydroponics, and sensor data — connecting ecological science with the Seaperch ROV track.',NULL,'[{"day":1,"title":"Launch","file":"Day1_Launch.pptx"},{"day":2,"title":"Wind & Sun","file":"Day2_WindSun.pptx"},{"day":3,"title":"Hydroponics","file":"Day3_Hydroponics.pptx"},{"day":4,"title":"Sensors & Data","file":"Day4_SensorsData.pptx"},{"day":5,"title":"Capstone","file":"Day5_Capstone.pptx"}]'::jsonb,'[{"label":"Teacher Curriculum Guide","file":"Teacher_Curriculum_Guide.docx","type":"guide"},{"label":"Student Workbook","file":"Student_Workbook.docx","type":"workbook"}]'::jsonb,5),
('oda-workshop','ODA Workshop','🏛️','CSU workshop proposal — Ohio Department on Aging partnership.','Workshop','See proposal','Working document — a workshop proposal in PDF form. No daily slide breakdown yet.',NULL,'[]'::jsonb,'[{"label":"Workshop Proposal (PDF)","file":"CSU Workshop Proposal_ ODA.pdf","type":"pdf"}]'::jsonb,6),
('robobattles','RoboBattles','⚔️','Five days of competitive robotics design and battles.','5 days','Elementary / Middle','Students design, build, and compete with battle bots — culminating in head-to-head competition. Teacher guide included.',NULL,'[{"day":1,"title":"Day 1","file":"RoboBattles_Day1.pptx"},{"day":2,"title":"Day 2","file":"RoboBattles_Day2.pptx"},{"day":3,"title":"Day 3","file":"RoboBattles_Day3.pptx"},{"day":4,"title":"Day 4","file":"RoboBattles_Day4.pptx"},{"day":5,"title":"Day 5","file":"RoboBattles_Day5.pptx"}]'::jsonb,'[{"label":"Teacher Guide","file":"RoboBattles_Teacher_Guide.docx","type":"guide"}]'::jsonb,7),
('roller-coasters-drones','Roller Coasters & Drones','🎢','Physics of coasters paired with drone coding.','5 days','Middle school','A two-track camp combining roller coaster engineering with drone programming and integration — finishing with a student showcase.',NULL,'[{"day":1,"title":"Foundations","file":"Day1_Foundations.pptx"},{"day":2,"title":"Coaster Engineering","file":"Day2_Coaster_Engineering.pptx"},{"day":3,"title":"Drone Coding","file":"Day3_Drone_Coding.pptx"},{"day":4,"title":"Integration","file":"Day4_Integration.pptx"},{"day":5,"title":"Showcase","file":"Day5_Showcase.pptx"}]'::jsonb,'[{"label":"Camp Curriculum","file":"Roller_Coasters_and_Drones_Camp_Curriculum.docx","type":"guide"},{"label":"Teacher Guide","file":"teacher_guide.docx","type":"guide"},{"label":"Student Workbook","file":"student_workbook.docx","type":"workbook"},{"label":"Journey Upload (XLSX)","file":"journey_upload_rollercoasters_drones.xlsx","type":"data"}]'::jsonb,8),
('seaperch','Seaperch','🌊','Underwater ROV build and competition camp.','5 days','Middle / High','Students build an underwater remotely operated vehicle (ROV) over five days, learning waterproofing, controls, and team engineering.',NULL,'[{"day":1,"title":"Day 1","file":"seaperch-day1-slides.pptx"},{"day":2,"title":"Day 2","file":"seaperch-day2-slides.pptx"},{"day":3,"title":"Day 3","file":"seaperch-day3-slides.pptx"},{"day":4,"title":"Day 4","file":"seaperch-day4-slides.pptx"},{"day":5,"title":"Day 5","file":"seaperch-day5-slides.pptx"}]'::jsonb,'[{"label":"Teacher Guide","file":"seaperch-teacher-guide.docx","type":"guide"},{"label":"Student Workbook","file":"seaperch-student-workbook.docx","type":"workbook"}]'::jsonb,9),
('seamate','SeaMate (Pufferfish ROV)','🐡','SeaMate Pufferfish underwater ROV curriculum.','Camp unit','Middle / High','Pufferfish ROV-based underwater robotics curriculum with combined slide deck, educator guide, student workbook, and standards-alignment documents.','Pufferfish_Combined_Slide_Deck.pptx','[]'::jsonb,'[{"label":"Educator Guide","file":"Pufferfish_Educator_Guide.docx","type":"guide"},{"label":"Student Workbook","file":"Pufferfish_Student_Workbook.docx","type":"workbook"},{"label":"Combined Slide Deck","file":"Pufferfish_Combined_Slide_Deck.pptx","type":"slides"},{"label":"Slide Presentations (PDF)","file":"PPT Presentations.pdf","type":"pdf"},{"label":"General Guide (PDF)","file":"PufferFish General Guide Download.pdf","type":"pdf"},{"label":"Assessments (PDF)","file":"Assessments Pufferfish.pdf","type":"pdf"},{"label":"Standards Alignment (PDF)","file":"Pufferfish_ROV_Standards_Alignment_logos.pdf","type":"pdf"}]'::jsonb,10),
('xrp','XRP Robotics','🚀','Experiential Robotics Platform (XRP) — Orbit Odyssey & Iron Acres.','Camp unit','Middle / High','XRP-based robotics curriculum featuring the Orbit Odyssey and Iron Acres game challenges, 3D-printable robot kit files, and accessory model files.',NULL,'[]'::jsonb,'[{"label":"XRP Camp Guide — Orbit Odyssey","file":"XRPCampGuideOO25 (2).pdf","type":"pdf"},{"label":"Orbit Odyssey Manual V1","file":"Orbit Odyssey Manual V1 (1).pdf","type":"pdf"},{"label":"Playing Field Diagram","file":"XRP_Orbit_ODD_Playing_Field_FIN_MAR_17_2025 (1).jpg","type":"image"},{"label":"2025 Orbit Odyssey Model Files (ZIP)","file":"2025-xrp-game-orbit-odyssey-model_files (2).zip","type":"archive"},{"label":"2026 Iron Acres Model Files (ZIP)","file":"2026-xrp-game-iron-acres-model_files.zip","type":"archive"},{"label":"XRP Robot Kit Model Files (ZIP)","file":"xrp-robot-kit-model_files.zip","type":"archive"},{"label":"ARM XRP Alpha 100 Screwless Robotic Arm (ZIP)","file":"armxrp-alpha-100-screwless-3d-printed-robotic-arm-model_files (1).zip","type":"archive"},{"label":"Controller Bit Holder (ZIP)","file":"holder-for-controllerbit-model_files.zip","type":"archive"},{"label":"XRP Keychain Ornament (ZIP)","file":"keychainornament-xrp-model_files (1).zip","type":"archive"}]'::jsonb,11);

-- =========================================================
-- Phase 4: Career pathways snapshot
-- =========================================================

CREATE TABLE public.career_clusters (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.career_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_clusters read all authed" ON public.career_clusters
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "career_clusters admin write" ON public.career_clusters
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.career_clusters (id, label, description, sort_order) VALUES
('agriculture','Agriculture, Food & Natural Resources','Production, processing, marketing, distribution, financing, and development of agricultural products and resources.',1),
('architecture','Architecture & Construction','Designing, planning, managing, building, and maintaining the built environment.',2),
('arts-av','Arts, A/V Technology & Communications','Designing, producing, exhibiting, performing, writing, and publishing multimedia content.',3),
('business','Business Management & Administration','Planning, organizing, directing, and evaluating business functions essential to efficient and productive operations.',4),
('education','Education & Training','Planning, managing, and providing education and training services and related learning support.',5),
('finance','Finance','Services for financial and investment planning, banking, insurance, and business management.',6),
('government','Government & Public Administration','Executing governmental functions at the local, state, and federal levels.',7),
('health','Health Science','Planning, managing, and providing therapeutic, diagnostic, health-informatics, support, and biotechnology research services.',8),
('hospitality','Hospitality & Tourism','Management, marketing, and operations of restaurants, lodging, attractions, recreation events, and travel.',9),
('human-services','Human Services','Preparing individuals for employment in career pathways that relate to families and human needs.',10),
('it','Information Technology','Building, supporting, securing, and operating the systems that move information through networks and applications.',11),
('law-public-safety','Law, Public Safety, Corrections & Security','Planning, managing, and providing legal, public safety, protective services, and homeland security.',12),
('manufacturing','Manufacturing','Planning, managing, and performing the processing of materials into intermediate or final products.',13),
('marketing','Marketing','Planning, managing, and performing marketing activities to reach organizational objectives.',14),
('stem','Science, Technology, Engineering & Mathematics','Planning, managing, and providing scientific research and professional and technical services.',15),
('transportation','Transportation, Distribution & Logistics','Planning, management, and movement of people, materials, and goods by road, pipeline, air, rail, and water.',16);

CREATE TABLE public.occupations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id text NOT NULL REFERENCES public.career_clusters(id) ON DELETE CASCADE,
  soc_code text,
  title text NOT NULL,
  median_wage integer,
  growth_pct numeric(5,2),
  annual_openings integer,
  education text,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.occupations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "occupations read all authed" ON public.occupations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "occupations admin write" ON public.occupations
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE INDEX idx_occupations_cluster ON public.occupations(cluster_id);

CREATE TABLE public.occupation_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occupation_id uuid NOT NULL REFERENCES public.occupations(id) ON DELETE CASCADE,
  school text NOT NULL,
  program_name text NOT NULL,
  credential text,
  url text,
  sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.occupation_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "occupation_programs read all authed" ON public.occupation_programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "occupation_programs admin write" ON public.occupation_programs
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TABLE public.internship_occupations (
  internship_slug text NOT NULL,
  occupation_id uuid NOT NULL REFERENCES public.occupations(id) ON DELETE CASCADE,
  tagged_by uuid,
  tagged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (internship_slug, occupation_id)
);
ALTER TABLE public.internship_occupations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internship_occupations read all authed" ON public.internship_occupations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "internship_occupations admin write" ON public.internship_occupations
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Seed occupations (snapshot from EXPLR Workforce site; admins can edit/extend later)
INSERT INTO public.occupations (cluster_id, soc_code, title, median_wage, growth_pct, annual_openings, education, description, sort_order) VALUES
-- Health Science
('health','29-1141','Registered Nurse',81220,6.0,193100,'Bachelor''s degree','Provide and coordinate patient care, educate patients about health conditions, and provide advice and emotional support.',1),
('health','31-2011','Occupational Therapy Assistant',64250,21.0,8500,'Associate''s degree','Assist occupational therapists in providing rehabilitation services to patients with mental, physical, emotional, or developmental impairments.',2),
('health','29-1071','Physician Assistant',126010,28.0,12700,'Master''s degree','Provide healthcare services typically performed by a physician, under physician supervision.',3),
('health','29-2055','Surgical Technologist',55960,5.0,8600,'Postsecondary nondegree award','Assist in operating room procedures by preparing equipment and supplies and supporting surgeons.',4),
-- STEM
('stem','15-1252','Software Developer',132270,25.0,153900,'Bachelor''s degree','Design, develop, and test software applications and systems.',1),
('stem','15-2051','Data Scientist',108020,36.0,17700,'Bachelor''s degree','Analyze data using statistical and machine-learning techniques to inform business decisions.',2),
('stem','17-2141','Mechanical Engineer',99510,10.0,19200,'Bachelor''s degree','Design, develop, build, and test mechanical and thermal sensors and devices.',3),
('stem','19-1042','Medical Scientist',100890,11.0,10000,'Doctoral or professional degree','Conduct research aimed at improving overall human health.',4),
-- Information Technology
('it','15-1212','Information Security Analyst',120360,33.0,16800,'Bachelor''s degree','Plan and carry out security measures to protect an organization''s computer networks and systems.',1),
('it','15-1244','Network and Computer Systems Administrator',95360,2.0,21600,'Bachelor''s degree','Install, configure, and support an organization''s local area network, wide area network, and intranet systems.',2),
('it','15-1257','Web Developer',92750,16.0,19000,'Bachelor''s degree','Design and create websites — responsible for the look, technical aspects, and capacity.',3),
-- Arts, A/V & Communications
('arts-av','27-1014','Special Effects Artist and Animator',99060,8.0,7800,'Bachelor''s degree','Create two- and three-dimensional models, animations, and visual effects for games, film, TV, and other media.',1),
('arts-av','27-3023','News Analyst, Reporter and Journalist',57500,-3.0,4600,'Bachelor''s degree','Collect and analyze information about newsworthy events for newspapers, TV, radio, and the web.',2),
('arts-av','27-4032','Film and Video Editor',66600,7.0,4300,'Bachelor''s degree','Edit moving images on film, video, and other media for the entertainment, news, and education industries.',3),
('arts-av','27-2012','Producers and Directors',85320,7.0,13900,'Bachelor''s degree','Create motion pictures, TV shows, live theater, commercials, and other performing arts productions.',4),
-- Education
('education','25-2021','Elementary School Teacher',63680,1.0,107800,'Bachelor''s degree','Teach students basic academic, social, and other formative skills.',1),
('education','25-2031','Secondary School Teacher',65220,1.0,67100,'Bachelor''s degree','Teach academic lessons in a variety of subjects to middle and high school students.',2),
('education','25-9031','Instructional Coordinator',74620,2.0,18900,'Master''s degree','Oversee school curriculums and teaching standards.',3),
-- Architecture & Construction
('architecture','17-1011','Architect',93310,5.0,8200,'Bachelor''s degree','Plan and design houses, factories, office buildings, and other structures.',1),
('architecture','47-2031','Carpenter',56350,4.0,76700,'High school diploma','Construct, repair, and install building frameworks and structures made from wood and other materials.',2),
-- Business Management & Admin
('business','11-1021','General and Operations Manager',101280,3.0,309700,'Bachelor''s degree','Plan, direct, or coordinate the operations of public or private sector organizations.',1),
('business','13-1111','Management Analyst',99410,11.0,98000,'Bachelor''s degree','Recommend ways to improve an organization''s efficiency and reduce costs.',2),
-- Finance
('finance','13-2011','Accountant and Auditor',79880,4.0,126500,'Bachelor''s degree','Prepare and examine financial records; ensure records are accurate and taxes are paid properly.',1),
('finance','13-2052','Personal Financial Advisor',99580,13.0,25600,'Bachelor''s degree','Provide advice to help individuals manage their finances and plan for their financial future.',2),
-- Manufacturing
('manufacturing','51-4041','Machinist',50840,-2.0,33500,'High school diploma','Set up and operate machine tools to produce precision metal parts, instruments, and tools.',1),
('manufacturing','17-2112','Industrial Engineer',96350,12.0,28200,'Bachelor''s degree','Devise efficient systems that integrate workers, machines, materials, information, and energy.',2),
-- Marketing
('marketing','11-2021','Marketing Manager',157620,7.0,35500,'Bachelor''s degree','Plan programs to generate interest in products or services.',1),
('marketing','13-1161','Market Research Analyst',74680,13.0,94600,'Bachelor''s degree','Study market conditions to examine potential sales of products or services.',2),
-- Hospitality & Tourism
('hospitality','11-9051','Food Service Manager',63060,-1.0,46600,'High school diploma','Plan, direct, and coordinate operations of restaurants and other establishments that prepare and serve food.',1),
('hospitality','39-6012','Concierge',38000,5.0,3700,'High school diploma','Assist patrons at hotels, apartments, or office buildings with personal services.',2),
-- Human Services
('human-services','21-1023','Mental Health and Substance Abuse Social Worker',55960,9.0,17300,'Master''s degree','Assess and treat individuals with mental, emotional, or substance abuse problems.',1),
('human-services','25-2011','Preschool Teacher',37130,3.0,55700,'Associate''s degree','Educate and care for children younger than age 5 who have not yet entered kindergarten.',2),
-- Law, Public Safety, Corrections & Security
('law-public-safety','33-3051','Police and Sheriff''s Patrol Officer',74910,3.0,67000,'High school diploma + academy','Maintain order and protect life and property by enforcing laws and ordinances.',1),
('law-public-safety','23-1011','Lawyer',145760,5.0,39100,'Doctoral or professional degree','Advise and represent individuals, businesses, and government agencies on legal issues and disputes.',2),
-- Government & Public Administration
('government','11-1031','Legislator',54900,1.0,2900,'Varies','Develop, introduce, or enact laws and statutes at the local, state, or federal level.',1),
('government','13-1041','Compliance Officer',75670,4.0,32500,'Bachelor''s degree','Examine, evaluate, and investigate eligibility for or conformity with laws and regulations.',2),
-- Transportation
('transportation','53-3032','Heavy and Tractor-Trailer Truck Driver',54320,4.0,241200,'Postsecondary nondegree award','Drive a tractor-trailer combination or a truck with a capacity of at least 26,001 lbs.',1),
('transportation','17-2051','Civil Engineer',95890,6.0,21200,'Bachelor''s degree','Design, build, supervise, operate, and maintain construction projects and systems.',2),
-- Agriculture
('agriculture','45-2092','Farmworkers and Laborers',35470,1.0,124700,'No formal credential','Manually plant, cultivate, and harvest vegetables, fruits, nuts, horticultural specialties, and field crops.',1),
('agriculture','19-1012','Food Scientist and Technologist',82090,8.0,1700,'Bachelor''s degree','Use chemistry, microbiology, engineering, and other sciences to study food principles.',2);

-- Pre-tag internships with the most relevant occupations
WITH occ AS (
  SELECT id, title, cluster_id FROM public.occupations
)
INSERT INTO public.internship_occupations (internship_slug, occupation_id)
SELECT s, o.id FROM (
  VALUES
    ('adaptive-design','Occupational Therapy Assistant'),
    ('adaptive-design','Physician Assistant'),
    ('adaptive-design','Mechanical Engineer'),
    ('adaptive-design','Medical Scientist'),
    ('nextgen-educators','Elementary School Teacher'),
    ('nextgen-educators','Secondary School Teacher'),
    ('nextgen-educators','Instructional Coordinator'),
    ('webdevai','Software Developer'),
    ('webdevai','Web Developer'),
    ('webdevai','Data Scientist'),
    ('webdevai','Information Security Analyst'),
    ('games-for-change','Software Developer'),
    ('games-for-change','Special Effects Artist and Animator'),
    ('games-for-change','Producers and Directors'),
    ('envsci','Medical Scientist'),
    ('envsci','Civil Engineer'),
    ('envsci','Food Scientist and Technologist'),
    ('civic-journalism','News Analyst, Reporter and Journalist'),
    ('civic-journalism','Film and Video Editor'),
    ('civic-journalism','Producers and Directors')
) AS pairs(s, t)
JOIN occ o ON o.title = pairs.t;

-- =========================================================
-- Phase 5: Educator invites + programs/rosters — already
-- have tables (educator_invites, programs, program_educators,
-- unit_rosters) with admin-write RLS. No new tables needed.
-- =========================================================
