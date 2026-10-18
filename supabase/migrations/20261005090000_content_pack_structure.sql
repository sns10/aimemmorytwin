-- Content pack part 1: grow Class 10 Chemistry from 10 to 26 topics.
-- Adds 2 chapters, 16 topics (with BKT parameters and prerequisites) and
-- knowledge states for existing students. Lessons and questions for the new
-- topics arrive in parts 2 and 3. Existing topics, states and events are
-- left untouched.

-- ---------------------------------------------------------------- chapters
DO $$
DECLARE
  subj_id uuid;
  ch1 uuid; ch2 uuid; ch3 uuid; ch4 uuid; ch5 uuid;
BEGIN
  SELECT id INTO subj_id FROM public.subjects ORDER BY sort_order LIMIT 1;
  SELECT id INTO ch1 FROM public.chapters WHERE name = 'Atoms & Elements';
  SELECT id INTO ch2 FROM public.chapters WHERE name = 'Chemical Bonding';
  SELECT id INTO ch3 FROM public.chapters WHERE name = 'Reactions, Acids & Bases';

  INSERT INTO public.chapters (subject_id, name, summary, sort_order)
  VALUES (subj_id, 'Metals & Electrochemistry',
          'How reactive metals are, how they are won from their ores, and how they corrode.', 4)
  RETURNING id INTO ch4;

  INSERT INTO public.chapters (subject_id, name, summary, sort_order)
  VALUES (subj_id, 'Carbon Compounds',
          'Why carbon forms so many compounds: chains, functional groups and everyday organic chemistry.', 5)
  RETURNING id INTO ch5;

  -- ------------------------------------------------------------- new topics
  -- Fixed UUIDs so parts 2 and 3 can reference them.
  INSERT INTO public.concepts
    (id, name, subject, difficulty, question, options, correct_index, sort_order,
     chapter_id, learning_objectives, p_init, p_learn, p_guess, p_slip, concept_tags)
  VALUES
    ('aaaa0001-1111-4111-8111-000000000001','Electronic Configuration','Chemistry',0.45,
      'The maximum number of electrons that the M shell (n = 3) can hold is:',
      '["2","8","18","32"]'::jsonb,2,2,ch1,
      'Write the shell-wise electron arrangement of the first 20 elements and link it to group and period.',
      0.15,0.12,0.20,0.10,ARRAY['shells','configuration']),

    ('aaaa0001-1111-4111-8111-000000000002','Valency','Chemistry',0.5,
      'What is the valency of an element whose atom has 6 electrons in its outermost shell?',
      '["2","4","6","8"]'::jsonb,0,5,ch1,
      'Work out the valency of an element from its electronic configuration.',
      0.15,0.11,0.20,0.10,ARRAY['valency','outer shell']),

    ('aaaa0001-1111-4111-8111-000000000003','Mole Concept','Chemistry',0.7,
      'How many molecules are present in 2 moles of a gas?',
      '["6.022 x 10^23","1.2044 x 10^24","3.011 x 10^23","2"]'::jsonb,1,6,ch1,
      'Convert between mass, moles and number of particles using molar mass and the Avogadro number.',
      0.12,0.08,0.18,0.14,ARRAY['mole','avogadro']),

    ('aaaa0001-1111-4111-8111-000000000004','Metallic Bonding','Chemistry',0.5,
      'Metals conduct electricity because they contain:',
      '["Free electrons","Free protons","Mobile neutrons","Fixed ions only"]'::jsonb,0,10,ch2,
      'Describe the sea-of-electrons model and use it to explain conduction, malleability and lustre.',
      0.15,0.12,0.22,0.10,ARRAY['metallic','sea of electrons']),

    ('aaaa0001-1111-4111-8111-000000000005','Properties of Ionic & Covalent Compounds','Chemistry',0.55,
      'Which property is typical of ionic compounds but not of simple covalent compounds?',
      '["Low melting point","Conducts electricity when molten","Soluble in petrol","Exists as a gas at room temperature"]'::jsonb,1,11,ch2,
      'Compare melting point, solubility and conductivity of ionic and covalent compounds and explain why they differ.',
      0.15,0.11,0.20,0.10,ARRAY['properties','comparison']),

    ('aaaa0001-1111-4111-8111-000000000006','Chemical Formulae & Naming','Chemistry',0.6,
      'The formula of aluminium oxide is:',
      '["AlO","Al2O3","Al3O2","AlO2"]'::jsonb,1,12,ch2,
      'Write formulae of simple compounds by balancing valencies, and name them correctly.',
      0.13,0.10,0.18,0.12,ARRAY['formulae','nomenclature']),

    ('aaaa0001-1111-4111-8111-000000000007','Types of Chemical Reactions','Chemistry',0.5,
      'CaO + H2O -> Ca(OH)2 is an example of a:',
      '["Decomposition reaction","Combination reaction","Displacement reaction","Double displacement reaction"]'::jsonb,1,15,ch3,
      'Classify a reaction as combination, decomposition, displacement or double displacement from its equation.',
      0.15,0.12,0.20,0.10,ARRAY['reaction types','classification']),

    ('aaaa0001-1111-4111-8111-000000000008','Oxidation & Reduction','Chemistry',0.6,
      'In the reaction CuO + H2 -> Cu + H2O, the substance oxidised is:',
      '["CuO","H2","Cu","H2O"]'::jsonb,1,16,ch3,
      'Identify what is oxidised and what is reduced in a redox reaction, using oxygen/hydrogen and electron transfer.',
      0.13,0.10,0.18,0.12,ARRAY['redox','electron transfer']),

    ('aaaa0001-1111-4111-8111-000000000009','Salts & Neutralisation','Chemistry',0.5,
      'The salt formed when hydrochloric acid reacts with sodium hydroxide is:',
      '["Sodium sulphate","Sodium chloride","Sodium carbonate","Sodium nitrate"]'::jsonb,1,19,ch3,
      'Predict the salt formed in a neutralisation reaction and state whether its solution is acidic, basic or neutral.',
      0.15,0.11,0.20,0.10,ARRAY['salts','neutralisation']),

    ('aaaa0001-1111-4111-8111-00000000000a','Reactivity Series','Chemistry',0.5,
      'Which metal can displace copper from copper sulphate solution?',
      '["Gold","Silver","Zinc","Platinum"]'::jsonb,2,20,ch4,
      'Use the reactivity series to predict whether a displacement reaction will happen.',
      0.15,0.12,0.20,0.10,ARRAY['reactivity','displacement']),

    ('aaaa0001-1111-4111-8111-00000000000b','Extraction of Metals','Chemistry',0.65,
      'Highly reactive metals such as sodium and aluminium are extracted by:',
      '["Reduction with carbon","Electrolysis of the molten ore","Heating in air","Displacement with zinc"]'::jsonb,1,21,ch4,
      'Match an extraction method to a metal based on its position in the reactivity series.',
      0.12,0.09,0.18,0.13,ARRAY['metallurgy','extraction']),

    ('aaaa0001-1111-4111-8111-00000000000c','Corrosion & Its Prevention','Chemistry',0.45,
      'Rusting of iron needs:',
      '["Oxygen only","Water only","Both oxygen and water","Neither oxygen nor water"]'::jsonb,2,22,ch4,
      'Explain the conditions needed for rusting and compare the methods used to prevent corrosion.',
      0.18,0.13,0.22,0.09,ARRAY['corrosion','rusting']),

    ('aaaa0001-1111-4111-8111-00000000000d','Carbon & Its Covalency','Chemistry',0.55,
      'Carbon forms a very large number of compounds mainly because of:',
      '["Its high reactivity","Catenation and tetravalency","Its metallic nature","Its large atomic size"]'::jsonb,1,23,ch5,
      'Explain tetravalency and catenation, and why carbon forms covalent rather than ionic bonds.',
      0.15,0.11,0.20,0.10,ARRAY['carbon','catenation']),

    ('aaaa0001-1111-4111-8111-00000000000e','Hydrocarbons','Chemistry',0.6,
      'Which of these is an unsaturated hydrocarbon?',
      '["CH4","C2H6","C2H4","C3H8"]'::jsonb,2,24,ch5,
      'Tell saturated and unsaturated hydrocarbons apart and write formulae for simple alkanes, alkenes and alkynes.',
      0.13,0.10,0.18,0.12,ARRAY['hydrocarbons','saturation']),

    ('aaaa0001-1111-4111-8111-00000000000f','Functional Groups & Isomerism','Chemistry',0.7,
      'The functional group present in ethanol is:',
      '["-COOH","-OH","-CHO","-CO-"]'::jsonb,1,25,ch5,
      'Identify common functional groups and draw structural isomers of simple compounds.',
      0.12,0.08,0.18,0.14,ARRAY['functional groups','isomerism']),

    ('aaaa0001-1111-4111-8111-000000000010','Ethanol & Ethanoic Acid','Chemistry',0.6,
      'Ethanoic acid turns blue litmus red because it:',
      '["Is a base","Releases H+ ions in water","Contains an -OH group only","Is insoluble in water"]'::jsonb,1,26,ch5,
      'Describe the important properties and reactions of ethanol and ethanoic acid, including esterification.',
      0.13,0.10,0.18,0.12,ARRAY['ethanol','ethanoic acid']);
END $$;

-- ------------------------------------------------- re-order existing topics
UPDATE public.concepts SET sort_order = 1  WHERE name = 'Atomic Structure';
UPDATE public.concepts SET sort_order = 3  WHERE name = 'Atomic Mass';
UPDATE public.concepts SET sort_order = 4  WHERE name = 'Isotopes';
UPDATE public.concepts SET sort_order = 7  WHERE name = 'Periodic Table Trends';
UPDATE public.concepts SET sort_order = 8  WHERE name = 'Ionic Bonds';
UPDATE public.concepts SET sort_order = 9  WHERE name = 'Covalent Bonds';
UPDATE public.concepts SET sort_order = 13 WHERE name = 'Chemical Reactions';
UPDATE public.concepts SET sort_order = 14 WHERE name = 'Balancing Equations';
UPDATE public.concepts SET sort_order = 17 WHERE name = 'Acids and Bases';
UPDATE public.concepts SET sort_order = 18 WHERE name = 'pH Scale';

-- ------------------------------------------------------------ prerequisites
UPDATE public.concepts SET prerequisite_id = (SELECT id FROM public.concepts WHERE name = 'Atomic Structure')
  WHERE id = 'aaaa0001-1111-4111-8111-000000000001';                                  -- Electronic Configuration
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-000000000001'
  WHERE id = 'aaaa0001-1111-4111-8111-000000000002';                                  -- Valency
UPDATE public.concepts SET prerequisite_id = (SELECT id FROM public.concepts WHERE name = 'Atomic Mass')
  WHERE id = 'aaaa0001-1111-4111-8111-000000000003';                                  -- Mole Concept
UPDATE public.concepts SET prerequisite_id = (SELECT id FROM public.concepts WHERE name = 'Covalent Bonds')
  WHERE id = 'aaaa0001-1111-4111-8111-000000000004';                                  -- Metallic Bonding
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-000000000004'
  WHERE id = 'aaaa0001-1111-4111-8111-000000000005';                                  -- Properties of compounds
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-000000000002'
  WHERE id = 'aaaa0001-1111-4111-8111-000000000006';                                  -- Formulae & Naming
UPDATE public.concepts SET prerequisite_id = (SELECT id FROM public.concepts WHERE name = 'Balancing Equations')
  WHERE id = 'aaaa0001-1111-4111-8111-000000000007';                                  -- Types of Reactions
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-000000000007'
  WHERE id = 'aaaa0001-1111-4111-8111-000000000008';                                  -- Oxidation & Reduction
UPDATE public.concepts SET prerequisite_id = (SELECT id FROM public.concepts WHERE name = 'pH Scale')
  WHERE id = 'aaaa0001-1111-4111-8111-000000000009';                                  -- Salts & Neutralisation
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-000000000008'
  WHERE id = 'aaaa0001-1111-4111-8111-00000000000a';                                  -- Reactivity Series
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-00000000000a'
  WHERE id = 'aaaa0001-1111-4111-8111-00000000000b';                                  -- Extraction of Metals
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-00000000000a'
  WHERE id = 'aaaa0001-1111-4111-8111-00000000000c';                                  -- Corrosion
UPDATE public.concepts SET prerequisite_id = (SELECT id FROM public.concepts WHERE name = 'Covalent Bonds')
  WHERE id = 'aaaa0001-1111-4111-8111-00000000000d';                                  -- Carbon & Its Covalency
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-00000000000d'
  WHERE id = 'aaaa0001-1111-4111-8111-00000000000e';                                  -- Hydrocarbons
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-00000000000e'
  WHERE id = 'aaaa0001-1111-4111-8111-00000000000f';                                  -- Functional Groups
UPDATE public.concepts SET prerequisite_id = 'aaaa0001-1111-4111-8111-00000000000f'
  WHERE id = 'aaaa0001-1111-4111-8111-000000000010';                                  -- Ethanol & Ethanoic Acid

-- --------------------------------------- knowledge states for every student
INSERT INTO public.knowledge_states (student_id, concept_id, mastery_probability, memory_stability, next_revision_at)
SELECT s.id, c.id, c.p_init, 1.0, now()
FROM public.students s
CROSS JOIN public.concepts c
WHERE c.id::text LIKE 'aaaa0001-%'
ON CONFLICT (student_id, concept_id) DO NOTHING;
