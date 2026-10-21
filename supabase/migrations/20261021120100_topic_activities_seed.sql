-- Cloze ("fill in the blank") and match-the-pairs content for all 26 topics.
-- Written by hand so the wording matches the lessons. Safe to re-run.

DELETE FROM public.topic_activities WHERE kind IN ('cloze','match');

INSERT INTO public.topic_activities (concept_id, kind, payload, sort_order)
SELECT c.id, v.kind, v.payload::jsonb, v.sort_order
FROM (VALUES

-- ===================================================== Atoms & Elements
('Atomic Structure','cloze','{"text":"Nearly all the mass of an atom is concentrated in its ___.","answer":"nucleus","options":["nucleus","electron cloud","valence shell","outer orbit"]}',1),
('Atomic Structure','cloze','{"text":"A neutral atom has equal numbers of protons and ___.","answer":"electrons","options":["electrons","neutrons","ions","isotopes"]}',2),
('Atomic Structure','match','{"pairs":[["Proton","Positive charge, in the nucleus"],["Electron","Negative charge, outside the nucleus"],["Neutron","No charge, in the nucleus"],["Atomic number","Number of protons"]]}',3),

('Electronic Configuration','cloze','{"text":"The maximum number of electrons a shell can hold is given by ___.","answer":"2n squared","options":["2n squared","n squared","2n","n + 2"]}',1),
('Electronic Configuration','cloze','{"text":"While it is the outermost shell, a shell cannot hold more than ___ electrons.","answer":"8","options":["8","2","18","32"]}',2),
('Electronic Configuration','match','{"pairs":[["K shell","2 electrons"],["L shell","8 electrons"],["M shell","18 electrons"],["Calcium (Z=20)","2, 8, 8, 2"]]}',3),

('Atomic Mass','cloze','{"text":"Mass number equals the number of protons plus the number of ___.","answer":"neutrons","options":["neutrons","electrons","ions","shells"]}',1),
('Atomic Mass','cloze','{"text":"Atomic mass is measured in ___.","answer":"atomic mass units","options":["atomic mass units","grams","kilograms","moles"]}',2),
('Atomic Mass','match','{"pairs":[["Mass number","Protons + neutrons"],["Atomic number","Protons only"],["1 u","One twelfth of a carbon-12 atom"],["Chlorine 35.45","Weighted average of isotopes"]]}',3),

('Isotopes','cloze','{"text":"Isotopes of an element have the same number of protons but different numbers of ___.","answer":"neutrons","options":["neutrons","electrons","protons","shells"]}',1),
('Isotopes','cloze','{"text":"Because they have the same electron arrangement, isotopes have identical ___ properties.","answer":"chemical","options":["chemical","physical","nuclear","magnetic"]}',2),
('Isotopes','match','{"pairs":[["Carbon-12","6 protons, 6 neutrons"],["Carbon-14","6 protons, 8 neutrons"],["Isotope","Same element, different mass"],["Use of C-14","Dating old objects"]]}',3),

('Valency','cloze','{"text":"For an atom with more than four outer electrons, valency equals 8 minus the number of ___ electrons.","answer":"outer","options":["outer","inner","total","paired"]}',1),
('Valency','cloze','{"text":"The valency of a noble gas is ___.","answer":"0","options":["0","1","2","8"]}',2),
('Valency','match','{"pairs":[["Sodium","Valency 1"],["Magnesium","Valency 2"],["Carbon","Valency 4"],["Neon","Valency 0"]]}',3),

('Mole Concept','cloze','{"text":"One mole of any substance contains ___ particles.","answer":"6.022 x 10^23","options":["6.022 x 10^23","3.011 x 10^23","6.022 x 10^22","1.602 x 10^19"]}',1),
('Mole Concept','cloze','{"text":"Number of moles equals mass divided by ___.","answer":"molar mass","options":["molar mass","density","volume","Avogadro number"]}',2),
('Mole Concept','match','{"pairs":[["1 mole of water","18 g"],["1 mole of carbon","12 g"],["1 mole of O2","32 g"],["Avogadro number","6.022 x 10^23"]]}',3),

('Periodic Table Trends','cloze','{"text":"Across a period from left to right, atomic radius generally ___.","answer":"decreases","options":["decreases","increases","stays the same","doubles"]}',1),
('Periodic Table Trends','cloze','{"text":"Down a group, the number of shells increases, so atomic radius ___.","answer":"increases","options":["increases","decreases","stays the same","halves"]}',2),
('Periodic Table Trends','match','{"pairs":[["Group 1","Alkali metals"],["Group 17","Halogens"],["Group 18","Noble gases"],["Period number","Number of shells"]]}',3),

-- ===================================================== Chemical Bonding
('Ionic Bonds','cloze','{"text":"An ionic bond forms when electrons are ___ from a metal to a non-metal.","answer":"transferred","options":["transferred","shared","destroyed","delocalised"]}',1),
('Ionic Bonds','cloze','{"text":"Sodium chloride conducts electricity when molten because its ___ become free to move.","answer":"ions","options":["ions","electrons","atoms","molecules"]}',2),
('Ionic Bonds','match','{"pairs":[["Metal atom","Loses electrons, forms a cation"],["Non-metal atom","Gains electrons, forms an anion"],["NaCl","Formed by electron transfer"],["Ionic solid","Hard but brittle"]]}',3),

('Covalent Bonds','cloze','{"text":"A covalent bond is formed by the ___ of electrons between atoms.","answer":"sharing","options":["sharing","transfer","loss","gain"]}',1),
('Covalent Bonds','cloze','{"text":"Simple covalent compounds have low melting points because the forces between ___ are weak.","answer":"molecules","options":["molecules","ions","nuclei","electrons"]}',2),
('Covalent Bonds','match','{"pairs":[["Single bond","One shared pair"],["Double bond","Two shared pairs"],["Water","Covalent molecule"],["Diamond","Giant covalent structure"]]}',3),

('Metallic Bonding','cloze','{"text":"In a metal, positive ions sit in a sea of free ___.","answer":"electrons","options":["electrons","protons","neutrons","ions"]}',1),
('Metallic Bonding','cloze','{"text":"Metals are malleable because layers of ions can ___ without breaking the bond.","answer":"slide","options":["slide","melt","evaporate","shatter"]}',2),
('Metallic Bonding','match','{"pairs":[["Free electrons","Electrical conductivity"],["Sliding layers","Malleability"],["Strong attraction","High melting point"],["Surface electrons","Lustre"]]}',3),

('Properties of Ionic & Covalent Compounds','cloze','{"text":"A solid ionic compound does not conduct electricity because its ions cannot ___.","answer":"move","options":["move","exist","bond","charge"]}',1),
('Properties of Ionic & Covalent Compounds','cloze','{"text":"Ionic compounds usually dissolve in water but not in ___.","answer":"petrol","options":["petrol","salt water","dilute acid","alcohol solution"]}',2),
('Properties of Ionic & Covalent Compounds','match','{"pairs":[["Ionic compound","High melting point"],["Simple covalent","Low melting point"],["Molten ionic","Conducts electricity"],["Naphthalene","Dissolves in kerosene"]]}',3),

('Chemical Formulae & Naming','cloze','{"text":"To write a formula you criss-cross the ___ of the two parts.","answer":"valencies","options":["valencies","charges only","masses","atomic numbers"]}',1),
('Chemical Formulae & Naming','cloze','{"text":"When a radical is needed more than once, it is written inside ___.","answer":"brackets","options":["brackets","quotes","a subscript only","capitals"]}',2),
('Chemical Formulae & Naming','match','{"pairs":[["Sulphate","SO4, valency 2"],["Nitrate","NO3, valency 1"],["Calcium nitrate","Ca(NO3)2"],["Aluminium oxide","Al2O3"]]}',3),

-- ============================================ Reactions, Acids & Bases
('Chemical Reactions','cloze','{"text":"A change in which new substances are formed is called a ___ change.","answer":"chemical","options":["chemical","physical","nuclear","thermal"]}',1),
('Chemical Reactions','cloze','{"text":"In a chemical equation, the substances on the left are called ___.","answer":"reactants","options":["reactants","products","catalysts","solvents"]}',2),
('Chemical Reactions','match','{"pairs":[["Reactant","Starting substance"],["Product","Substance formed"],["Precipitate","Insoluble solid formed"],["Catalyst","Speeds up a reaction"]]}',3),

('Balancing Equations','cloze','{"text":"Equations are balanced because mass is ___ in a chemical reaction.","answer":"conserved","options":["conserved","created","destroyed","doubled"]}',1),
('Balancing Equations','cloze','{"text":"To balance an equation you change the ___, never the formulas.","answer":"coefficients","options":["coefficients","subscripts","symbols","charges"]}',2),
('Balancing Equations','match','{"pairs":[["Coefficient","Number in front of a formula"],["Subscript","Number inside a formula"],["Law of conservation of mass","Atoms are neither made nor lost"],["C3H8 + 5O2","Balanced combustion of propane"]]}',3),

('Types of Chemical Reactions','cloze','{"text":"A reaction in which one substance splits into two or more is called ___.","answer":"decomposition","options":["decomposition","combination","displacement","neutralisation"]}',1),
('Types of Chemical Reactions','cloze','{"text":"When two compounds exchange partners, the reaction is called ___ displacement.","answer":"double","options":["double","single","reverse","partial"]}',2),
('Types of Chemical Reactions','match','{"pairs":[["CaO + H2O","Combination"],["CaCO3 heated","Decomposition"],["Zn + CuSO4","Displacement"],["Na2SO4 + BaCl2","Double displacement"]]}',3),

('Oxidation & Reduction','cloze','{"text":"Oxidation is the ___ of electrons.","answer":"loss","options":["loss","gain","sharing","transfer to the nucleus"]}',1),
('Oxidation & Reduction','cloze','{"text":"The substance that is oxidised acts as the ___ agent.","answer":"reducing","options":["reducing","oxidising","neutral","catalytic"]}',2),
('Oxidation & Reduction','match','{"pairs":[["Oxidation","Loss of electrons"],["Reduction","Gain of electrons"],["Rusting","Everyday oxidation"],["OIL RIG","Memory aid for redox"]]}',3),

('Acids and Bases','cloze','{"text":"According to Arrhenius, an acid releases ___ ions in water.","answer":"H+","options":["H+","OH-","Na+","Cl-"]}',1),
('Acids and Bases','cloze','{"text":"A base turns red litmus paper ___.","answer":"blue","options":["blue","red","green","colourless"]}',2),
('Acids and Bases','match','{"pairs":[["Acid","Releases H+ in water"],["Base","Releases OH- in water"],["Litmus","Natural indicator"],["Acid + metal","Hydrogen gas released"]]}',3),

('pH Scale','cloze','{"text":"A solution with pH less than 7 is ___.","answer":"acidic","options":["acidic","basic","neutral","saline"]}',1),
('pH Scale','cloze','{"text":"Pure water at room temperature has a pH of ___.","answer":"7","options":["7","0","14","1"]}',2),
('pH Scale','match','{"pairs":[["pH 1","Strongly acidic"],["pH 7","Neutral"],["pH 13","Strongly basic"],["Universal indicator","Shows pH by colour"]]}',3),

('Salts & Neutralisation','cloze','{"text":"Acid plus base gives salt plus ___.","answer":"water","options":["water","hydrogen","oxygen","carbon dioxide"]}',1),
('Salts & Neutralisation','cloze','{"text":"A salt made from a strong acid and a strong base has a solution that is ___.","answer":"neutral","options":["neutral","acidic","basic","unstable"]}',2),
('Salts & Neutralisation','match','{"pairs":[["Common salt","NaCl"],["Baking soda","NaHCO3"],["Washing soda","Na2CO3.10H2O"],["Plaster of Paris","CaSO4 half H2O"]]}',3),

-- ========================================== Metals & Electrochemistry
('Reactivity Series','cloze','{"text":"Only metals placed ___ hydrogen can displace it from dilute acids.","answer":"above","options":["above","below","beside","outside"]}',1),
('Reactivity Series','cloze','{"text":"Sodium is stored under kerosene because it reacts vigorously with air and ___.","answer":"moisture","options":["moisture","nitrogen","carbon","kerosene"]}',2),
('Reactivity Series','match','{"pairs":[["Potassium","Most reactive"],["Zinc","Displaces copper"],["Copper","Below hydrogen"],["Gold","Found free in nature"]]}',3),

('Extraction of Metals','cloze','{"text":"Highly reactive metals such as aluminium are extracted by ___ of the molten ore.","answer":"electrolysis","options":["electrolysis","roasting","calcination","filtration"]}',1),
('Extraction of Metals','cloze','{"text":"Heating a carbonate ore in limited air is called ___.","answer":"calcination","options":["calcination","roasting","smelting","refining"]}',2),
('Extraction of Metals','match','{"pairs":[["Roasting","Sulphide ore heated in air"],["Calcination","Carbonate ore heated in limited air"],["Electrolysis","For very reactive metals"],["Thermite reaction","Aluminium reduces iron oxide"]]}',3),

('Corrosion & Its Prevention','cloze','{"text":"Rusting of iron needs oxygen and ___.","answer":"water","options":["water","nitrogen","carbon dioxide","sunlight"]}',1),
('Corrosion & Its Prevention','cloze','{"text":"Coating iron with zinc for protection is called ___.","answer":"galvanising","options":["galvanising","painting","alloying","annealing"]}',2),
('Corrosion & Its Prevention','match','{"pairs":[["Rust","Hydrated iron oxide"],["Galvanising","Zinc coating"],["Stainless steel","Alloy with chromium"],["Green coating on copper","Basic copper carbonate"]]}',3),

-- ================================================== Carbon Compounds
('Carbon & Its Covalency','cloze','{"text":"Carbon forms four covalent bonds, a property called ___.","answer":"tetravalency","options":["tetravalency","catenation","allotropy","isomerism"]}',1),
('Carbon & Its Covalency','cloze','{"text":"The ability of carbon to form long chains with itself is called ___.","answer":"catenation","options":["catenation","tetravalency","polymerisation","oxidation"]}',2),
('Carbon & Its Covalency','match','{"pairs":[["Diamond","Hard, three-dimensional network"],["Graphite","Soft, conducts electricity"],["C60","Football-shaped molecule"],["Catenation","Carbon chains and rings"]]}',3),

('Hydrocarbons','cloze','{"text":"Hydrocarbons with only single bonds are called ___.","answer":"saturated","options":["saturated","unsaturated","aromatic","cyclic"]}',1),
('Hydrocarbons','cloze','{"text":"Unsaturated hydrocarbons decolourise ___ water.","answer":"bromine","options":["bromine","lime","chlorine","sugar"]}',2),
('Hydrocarbons','match','{"pairs":[["Alkane","CnH2n+2, single bonds"],["Alkene","CnH2n, double bond"],["Alkyne","CnH2n-2, triple bond"],["Homologous series","Members differ by CH2"]]}',3),

('Functional Groups & Isomerism','cloze','{"text":"The functional group -COOH belongs to ___ acids.","answer":"carboxylic","options":["carboxylic","sulphuric","nitric","amino"]}',1),
('Functional Groups & Isomerism','cloze','{"text":"Compounds with the same molecular formula but different structures are called ___.","answer":"isomers","options":["isomers","isotopes","allotropes","polymers"]}',2),
('Functional Groups & Isomerism','match','{"pairs":[["-OH","Alcohol"],["-CHO","Aldehyde"],["-COOH","Carboxylic acid"],["C4H10","First alkane with isomers"]]}',3),

('Ethanol & Ethanoic Acid','cloze','{"text":"Ethanol reacting with sodium releases ___ gas.","answer":"hydrogen","options":["hydrogen","oxygen","carbon dioxide","chlorine"]}',1),
('Ethanol & Ethanoic Acid','cloze','{"text":"An alcohol and a carboxylic acid react together to form a sweet-smelling ___.","answer":"ester","options":["ester","salt","soap","aldehyde"]}',2),
('Ethanol & Ethanoic Acid','match','{"pairs":[["Ethanol","CH3CH2OH"],["Ethanoic acid","CH3COOH"],["Vinegar","Dilute ethanoic acid"],["Esterification","Alcohol + acid"]]}',3)

) AS v(topic, kind, payload, sort_order)
JOIN public.concepts c ON c.name = v.topic;
