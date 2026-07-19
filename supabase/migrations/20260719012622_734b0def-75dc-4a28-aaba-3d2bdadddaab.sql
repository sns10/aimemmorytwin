
-- 1. Per-concept BKT parameters
ALTER TABLE public.concepts
  ADD COLUMN IF NOT EXISTS p_init numeric NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS p_learn numeric NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS p_guess numeric NOT NULL DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS p_slip numeric NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS concept_tags text[] NOT NULL DEFAULT '{}';

-- 2. Wire prerequisites (chain within each chapter)
UPDATE public.concepts SET prerequisite_id = '789fa716-efe2-425e-9b67-ca771b7ad033' WHERE id = 'a2070617-d763-438e-8728-d6de933f3c24'; -- Atomic Mass ← Atomic Structure
UPDATE public.concepts SET prerequisite_id = 'a2070617-d763-438e-8728-d6de933f3c24' WHERE id = '974d1fe7-182b-450b-b114-451e07b6df58'; -- Isotopes ← Atomic Mass
UPDATE public.concepts SET prerequisite_id = '789fa716-efe2-425e-9b67-ca771b7ad033' WHERE id = '736c60b1-d9ec-4b76-81f2-8eac62bec375'; -- Periodic Trends ← Atomic Structure
UPDATE public.concepts SET prerequisite_id = '736c60b1-d9ec-4b76-81f2-8eac62bec375' WHERE id = '18a8dd22-a4f4-434c-a90f-abd6bffbd7c5'; -- Ionic ← Periodic Trends
UPDATE public.concepts SET prerequisite_id = '18a8dd22-a4f4-434c-a90f-abd6bffbd7c5' WHERE id = '2c791840-61d2-4c56-af8a-981a038acc4b'; -- Covalent ← Ionic
UPDATE public.concepts SET prerequisite_id = '2c791840-61d2-4c56-af8a-981a038acc4b' WHERE id = 'bd512564-2839-48ab-a810-e287b6ce5ec7'; -- Acids/Bases ← Covalent
UPDATE public.concepts SET prerequisite_id = 'bd512564-2839-48ab-a810-e287b6ce5ec7' WHERE id = '2205e4a3-9ef2-4c36-bf92-e1429d95934d'; -- pH ← Acids/Bases
UPDATE public.concepts SET prerequisite_id = 'bd512564-2839-48ab-a810-e287b6ce5ec7' WHERE id = '2c74aad1-8dcd-45a0-a62a-1c964c93fcc5'; -- Reactions ← Acids/Bases
UPDATE public.concepts SET prerequisite_id = '2c74aad1-8dcd-45a0-a62a-1c964c93fcc5' WHERE id = 'd4aa57d3-f7e9-41be-9665-976eb3a8257e'; -- Balancing ← Reactions

-- Per-concept BKT tuning by difficulty
UPDATE public.concepts SET p_learn = 0.14, p_guess = 0.22, p_slip = 0.08, concept_tags = ARRAY['atoms','subatomic'] WHERE id = '789fa716-efe2-425e-9b67-ca771b7ad033';
UPDATE public.concepts SET p_learn = 0.11, p_guess = 0.20, p_slip = 0.10, concept_tags = ARRAY['mass','amu'] WHERE id = 'a2070617-d763-438e-8728-d6de933f3c24';
UPDATE public.concepts SET p_learn = 0.09, p_guess = 0.18, p_slip = 0.12, concept_tags = ARRAY['isotopes','nuclide'] WHERE id = '974d1fe7-182b-450b-b114-451e07b6df58';
UPDATE public.concepts SET p_learn = 0.09, p_guess = 0.18, p_slip = 0.12, concept_tags = ARRAY['periodic','trends'] WHERE id = '736c60b1-d9ec-4b76-81f2-8eac62bec375';
UPDATE public.concepts SET p_learn = 0.11, p_guess = 0.20, p_slip = 0.10, concept_tags = ARRAY['bonding','ionic'] WHERE id = '18a8dd22-a4f4-434c-a90f-abd6bffbd7c5';
UPDATE public.concepts SET p_learn = 0.11, p_guess = 0.20, p_slip = 0.10, concept_tags = ARRAY['bonding','covalent'] WHERE id = '2c791840-61d2-4c56-af8a-981a038acc4b';
UPDATE public.concepts SET p_learn = 0.11, p_guess = 0.20, p_slip = 0.10, concept_tags = ARRAY['acids','bases'] WHERE id = 'bd512564-2839-48ab-a810-e287b6ce5ec7';
UPDATE public.concepts SET p_learn = 0.14, p_guess = 0.25, p_slip = 0.08, concept_tags = ARRAY['ph','acidity'] WHERE id = '2205e4a3-9ef2-4c36-bf92-e1429d95934d';
UPDATE public.concepts SET p_learn = 0.11, p_guess = 0.20, p_slip = 0.10, concept_tags = ARRAY['reactions','types'] WHERE id = '2c74aad1-8dcd-45a0-a62a-1c964c93fcc5';
UPDATE public.concepts SET p_learn = 0.08, p_guess = 0.15, p_slip = 0.15, concept_tags = ARRAY['stoichiometry','balancing'] WHERE id = 'd4aa57d3-f7e9-41be-9665-976eb3a8257e';

-- 3. Questions bank
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  difficulty numeric NOT NULL DEFAULT 0.5,
  tags text[] NOT NULL DEFAULT '{}',
  prerequisite_concept_ids uuid[] NOT NULL DEFAULT '{}',
  explanation text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_concept_idx ON public.questions(concept_id, sort_order);

GRANT SELECT ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read questions" ON public.questions FOR SELECT TO anon, authenticated USING (true);

-- 4. Learning events: link to question + capture BKT trajectory
ALTER TABLE public.learning_events
  ADD COLUMN IF NOT EXISTS question_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pre_mastery numeric,
  ADD COLUMN IF NOT EXISTS post_mastery numeric;

-- 5. Seed questions (5 per concept)
INSERT INTO public.questions (concept_id, question, options, correct_index, difficulty, tags, prerequisite_concept_ids, explanation, sort_order) VALUES
-- Atomic Structure
('789fa716-efe2-425e-9b67-ca771b7ad033','Which subatomic particle carries a negative charge?','["Proton","Neutron","Electron","Nucleus"]',2,0.2,ARRAY['subatomic','charge'],'{}','Electrons orbit the nucleus and carry a −1 charge.',1),
('789fa716-efe2-425e-9b67-ca771b7ad033','Where is nearly all of an atom''s mass concentrated?','["Electron cloud","Nucleus","Valence shell","Between shells"]',1,0.3,ARRAY['nucleus','mass'],'{}','Protons and neutrons in the nucleus account for >99.9% of an atom''s mass.',2),
('789fa716-efe2-425e-9b67-ca771b7ad033','An atom of oxygen (Z=8) in ground state has how many electrons?','["6","7","8","16"]',2,0.4,ARRAY['electrons','neutral atom'],'{}','A neutral atom has equal electrons and protons; Z=8 → 8 electrons.',3),
('789fa716-efe2-425e-9b67-ca771b7ad033','Rutherford''s gold-foil experiment concluded that the atom is:','["Uniformly dense","Mostly empty space with a dense nucleus","A plum pudding","Made only of electrons"]',1,0.5,ARRAY['history','rutherford'],'{}','Most α-particles passed through, so the atom is mostly empty space with a small dense nucleus.',4),
('789fa716-efe2-425e-9b67-ca771b7ad033','How many electrons fit in the 2nd (L) shell?','["2","6","8","18"]',2,0.6,ARRAY['shells','capacity'],'{}','2n² gives 2·2²=8 for n=2.',5),

-- Atomic Mass
('a2070617-d763-438e-8728-d6de933f3c24','Atomic mass is measured in what unit?','["Grams","Kilograms","Atomic mass units (u)","Newtons"]',2,0.2,ARRAY['units'],'{}','1 u = 1/12 the mass of a carbon-12 atom.',1),
('a2070617-d763-438e-8728-d6de933f3c24','The mass number of an atom equals:','["Protons only","Electrons only","Protons + neutrons","Protons − neutrons"]',2,0.3,ARRAY['mass number'],ARRAY['789fa716-efe2-425e-9b67-ca771b7ad033']::uuid[],'Mass number A = protons (Z) + neutrons (N).',2),
('a2070617-d763-438e-8728-d6de933f3c24','An atom with 17 protons and 18 neutrons has mass number:','["17","18","35","1"]',2,0.4,ARRAY['calc'],ARRAY['789fa716-efe2-425e-9b67-ca771b7ad033']::uuid[],'17 + 18 = 35 (this is Cl-35).',3),
('a2070617-d763-438e-8728-d6de933f3c24','Chlorine''s average atomic mass is ~35.45. Why is it not a whole number?','["Rounding error","Weighted average of isotopes","Neutrons weigh less than protons","Electrons contribute mass"]',1,0.6,ARRAY['average'],'{}','It is a natural-abundance weighted average of Cl-35 and Cl-37.',4),
('a2070617-d763-438e-8728-d6de933f3c24','If an element has isotopes of mass 10 (20%) and 11 (80%), the average atomic mass is:','["10.2","10.5","10.8","11.0"]',2,0.7,ARRAY['weighted average'],'{}','0.20·10 + 0.80·11 = 10.8.',5),

-- Isotopes
('974d1fe7-182b-450b-b114-451e07b6df58','Isotopes of an element differ in the number of:','["Protons","Electrons","Neutrons","Nuclei"]',2,0.3,ARRAY['definition'],'{}','Same Z, different N → different mass number.',1),
('974d1fe7-182b-450b-b114-451e07b6df58','Carbon-12 and carbon-14 are:','["Different elements","Isotopes","Ions","Allotropes"]',1,0.3,ARRAY['examples'],'{}','Same protons (6), different neutrons.',2),
('974d1fe7-182b-450b-b114-451e07b6df58','Which is true of isotopes of the same element?','["Different chemical behavior","Different atomic number","Same mass number","Same number of protons and electrons"]',3,0.5,ARRAY['properties'],ARRAY['a2070617-d763-438e-8728-d6de933f3c24']::uuid[],'They differ only in neutrons, so Z and typical electron count match.',3),
('974d1fe7-182b-450b-b114-451e07b6df58','U-235 and U-238 differ by how many neutrons?','["1","2","3","5"]',2,0.6,ARRAY['calc'],ARRAY['a2070617-d763-438e-8728-d6de933f3c24']::uuid[],'238 − 235 = 3 extra neutrons in U-238.',4),
('974d1fe7-182b-450b-b114-451e07b6df58','Which isotope is used for radiocarbon dating?','["C-12","C-13","C-14","C-11"]',2,0.6,ARRAY['applications'],'{}','C-14 is radioactive with a ~5,730-year half-life.',5),

-- Periodic Table Trends
('736c60b1-d9ec-4b76-81f2-8eac62bec375','Across a period (left → right), atomic radius:','["Increases","Decreases","Stays the same","Fluctuates randomly"]',1,0.4,ARRAY['radius'],'{}','Effective nuclear charge rises, pulling electrons closer.',1),
('736c60b1-d9ec-4b76-81f2-8eac62bec375','Down a group, ionization energy generally:','["Increases","Decreases","Stays constant","Doubles"]',1,0.4,ARRAY['ionization'],'{}','Outer electrons are farther from and better shielded from the nucleus.',2),
('736c60b1-d9ec-4b76-81f2-8eac62bec375','Which is the most electronegative element?','["Chlorine","Oxygen","Fluorine","Nitrogen"]',2,0.5,ARRAY['electronegativity'],'{}','Fluorine (3.98 on Pauling) is the reference top.',3),
('736c60b1-d9ec-4b76-81f2-8eac62bec375','Which trend explains why Na is more reactive than Li as a metal?','["Higher IE","Lower IE and larger radius","Smaller radius","More protons"]',1,0.6,ARRAY['reactivity'],ARRAY['789fa716-efe2-425e-9b67-ca771b7ad033']::uuid[],'Na''s outer electron is farther out and easier to lose.',4),
('736c60b1-d9ec-4b76-81f2-8eac62bec375','Noble gases have very high ionization energies because:','["They are metals","Their outer shell is full","They are radioactive","They lack neutrons"]',1,0.5,ARRAY['noble gas'],'{}','A stable full octet resists losing an electron.',5),

-- Ionic Bonds
('18a8dd22-a4f4-434c-a90f-abd6bffbd7c5','Ionic bonds form between:','["Two nonmetals","A metal and a nonmetal","Two metals","Two noble gases"]',1,0.3,ARRAY['definition'],'{}','A metal donates electrons to a nonmetal.',1),
('18a8dd22-a4f4-434c-a90f-abd6bffbd7c5','In NaCl, sodium becomes:','["Na⁻","Na⁺","Na²⁺","Neutral Na"]',1,0.3,ARRAY['charges'],'{}','Na loses 1 electron → Na⁺.',2),
('18a8dd22-a4f4-434c-a90f-abd6bffbd7c5','A property typical of ionic compounds is:','["Low melting point","High electrical conductivity when molten","Gas at room temp","Soft and waxy"]',1,0.5,ARRAY['properties'],'{}','Free ions in the melt carry current.',3),
('18a8dd22-a4f4-434c-a90f-abd6bffbd7c5','The formula for magnesium chloride is:','["MgCl","MgCl₂","Mg₂Cl","Mg₂Cl₃"]',1,0.6,ARRAY['formula'],ARRAY['736c60b1-d9ec-4b76-81f2-8eac62bec375']::uuid[],'Mg²⁺ needs two Cl⁻ to balance charge.',4),
('18a8dd22-a4f4-434c-a90f-abd6bffbd7c5','Ionic bonds are held together by:','["Shared electrons","Electrostatic attraction between opposite charges","Metallic sea of electrons","Hydrogen bonding"]',1,0.4,ARRAY['forces'],'{}','+ and − ions attract by Coulomb force.',5),

-- Covalent Bonds
('2c791840-61d2-4c56-af8a-981a038acc4b','A covalent bond involves:','["Transfer of electrons","Sharing of electrons","Loss of protons","Nuclear fusion"]',1,0.3,ARRAY['definition'],'{}','Atoms share one or more pairs of electrons.',1),
('2c791840-61d2-4c56-af8a-981a038acc4b','How many shared pairs are in a double bond?','["1","2","3","4"]',1,0.3,ARRAY['multiplicity'],'{}','A double bond = 2 shared pairs (4 electrons).',2),
('2c791840-61d2-4c56-af8a-981a038acc4b','Which molecule has a polar covalent bond?','["O₂","N₂","HCl","Cl₂"]',2,0.5,ARRAY['polarity'],ARRAY['736c60b1-d9ec-4b76-81f2-8eac62bec375']::uuid[],'H and Cl differ in electronegativity, giving a polar bond.',3),
('2c791840-61d2-4c56-af8a-981a038acc4b','Water''s bent shape is due to:','["Two lone pairs on O","Ionic bonding","One shared electron","Hydrogen''s size"]',0,0.6,ARRAY['geometry'],'{}','Two lone pairs on oxygen bend the H–O–H angle to ~104.5°.',4),
('2c791840-61d2-4c56-af8a-981a038acc4b','How many covalent bonds does carbon typically form?','["1","2","3","4"]',3,0.4,ARRAY['carbon'],'{}','Carbon has 4 valence electrons and forms 4 bonds.',5),

-- Acids and Bases
('bd512564-2839-48ab-a810-e287b6ce5ec7','A Brønsted acid is a:','["Proton acceptor","Proton donor","Electron donor","Neutral species"]',1,0.3,ARRAY['definition'],'{}','Brønsted–Lowry acid donates H⁺.',1),
('bd512564-2839-48ab-a810-e287b6ce5ec7','Which of these is a strong base?','["NH₃","CH₃COOH","NaOH","H₂O"]',2,0.4,ARRAY['strong/weak'],'{}','NaOH fully dissociates in water.',2),
('bd512564-2839-48ab-a810-e287b6ce5ec7','Acid + base typically produces:','["Only water","Salt and water","A gas only","A precipitate only"]',1,0.4,ARRAY['neutralization'],'{}','HA + BOH → BA (salt) + H₂O.',3),
('bd512564-2839-48ab-a810-e287b6ce5ec7','The conjugate base of H₂SO₄ (first proton) is:','["SO₄²⁻","HSO₄⁻","H₃SO₄⁺","H₂SO₃"]',1,0.6,ARRAY['conjugate'],'{}','Remove one H⁺ from H₂SO₄ → HSO₄⁻.',4),
('bd512564-2839-48ab-a810-e287b6ce5ec7','Which indicator turns pink in a base?','["Litmus","Methyl orange","Phenolphthalein","Bromothymol blue"]',2,0.5,ARRAY['indicators'],'{}','Phenolphthalein is colourless in acid, pink above pH ~8.3.',5),

-- pH Scale
('2205e4a3-9ef2-4c36-bf92-e1429d95934d','A pH of 7 is:','["Acidic","Basic","Neutral","Undefined"]',2,0.2,ARRAY['definition'],'{}','Pure water at 25 °C has pH 7.',1),
('2205e4a3-9ef2-4c36-bf92-e1429d95934d','pH is defined as:','["log[H⁺]","−log[H⁺]","[H⁺]/[OH⁻]","−ln[H⁺]"]',1,0.4,ARRAY['formula'],ARRAY['bd512564-2839-48ab-a810-e287b6ce5ec7']::uuid[],'pH = −log₁₀[H⁺].',2),
('2205e4a3-9ef2-4c36-bf92-e1429d95934d','A solution with [H⁺]=1×10⁻³ M has pH:','["3","−3","11","10⁻³"]',0,0.5,ARRAY['calc'],ARRAY['bd512564-2839-48ab-a810-e287b6ce5ec7']::uuid[],'−log(10⁻³) = 3.',3),
('2205e4a3-9ef2-4c36-bf92-e1429d95934d','Moving from pH 4 to pH 2 means [H⁺] is:','["2× larger","10× larger","100× larger","half"]',2,0.6,ARRAY['scale'],'{}','Each pH unit is a 10× change, so 2 units = 100×.',4),
('2205e4a3-9ef2-4c36-bf92-e1429d95934d','Human blood pH is normally about:','["1.5","4.0","7.4","10.5"]',2,0.3,ARRAY['biology'],'{}','Blood is tightly buffered around 7.35–7.45.',5),

-- Chemical Reactions
('2c74aad1-8dcd-45a0-a62a-1c964c93fcc5','In a chemical reaction, mass is:','["Created","Destroyed","Conserved","Sometimes lost as heat"]',2,0.3,ARRAY['conservation'],'{}','Law of conservation of mass: atoms are rearranged, not lost.',1),
('2c74aad1-8dcd-45a0-a62a-1c964c93fcc5','2H₂ + O₂ → 2H₂O is a:','["Decomposition","Synthesis (combination)","Single-displacement","Combustion only"]',1,0.4,ARRAY['types'],'{}','Two substances combine to form one → synthesis (also combustion of H₂).',2),
('2c74aad1-8dcd-45a0-a62a-1c964c93fcc5','CaCO₃ → CaO + CO₂ is a:','["Synthesis","Decomposition","Displacement","Double-displacement"]',1,0.4,ARRAY['types'],'{}','One reactant breaks into two products.',3),
('2c74aad1-8dcd-45a0-a62a-1c964c93fcc5','Zn + CuSO₄ → ZnSO₄ + Cu is a:','["Combustion","Single-displacement","Neutralization","Decomposition"]',1,0.5,ARRAY['types'],ARRAY['bd512564-2839-48ab-a810-e287b6ce5ec7']::uuid[],'A more reactive element displaces a less reactive one.',4),
('2c74aad1-8dcd-45a0-a62a-1c964c93fcc5','An exothermic reaction:','["Absorbs heat","Releases heat","Has no energy change","Cools the surroundings"]',1,0.4,ARRAY['thermodynamics'],'{}','Products have lower enthalpy than reactants; energy leaves the system.',5),

-- Balancing Equations
('d4aa57d3-f7e9-41be-9665-976eb3a8257e','Balance: H₂ + O₂ → H₂O. Coefficients (in order):','["1,1,1","2,1,2","2,2,2","1,2,1"]',1,0.4,ARRAY['calc'],ARRAY['2c74aad1-8dcd-45a0-a62a-1c964c93fcc5']::uuid[],'2H₂ + O₂ → 2H₂O.',1),
('d4aa57d3-f7e9-41be-9665-976eb3a8257e','Why must chemical equations be balanced?','["Aesthetics","To satisfy conservation of mass","To reduce cost","So they''re easier to remember"]',1,0.3,ARRAY['reasoning'],'{}','Atoms cannot be created or destroyed in a reaction.',2),
('d4aa57d3-f7e9-41be-9665-976eb3a8257e','Balance: N₂ + H₂ → NH₃','["1,3,2","2,3,1","1,1,1","1,3,1"]',0,0.6,ARRAY['calc'],ARRAY['2c74aad1-8dcd-45a0-a62a-1c964c93fcc5']::uuid[],'N₂ + 3H₂ → 2NH₃.',3),
('d4aa57d3-f7e9-41be-9665-976eb3a8257e','Balance: CH₄ + O₂ → CO₂ + H₂O','["1,1,1,1","1,2,1,2","2,2,1,2","1,2,2,1"]',1,0.7,ARRAY['combustion'],ARRAY['2c74aad1-8dcd-45a0-a62a-1c964c93fcc5']::uuid[],'CH₄ + 2O₂ → CO₂ + 2H₂O.',4),
('d4aa57d3-f7e9-41be-9665-976eb3a8257e','Balance: Fe + O₂ → Fe₂O₃','["2,3,1","4,3,2","1,1,1","2,1,1"]',1,0.8,ARRAY['tricky'],'{}','4Fe + 3O₂ → 2Fe₂O₃.',5);
