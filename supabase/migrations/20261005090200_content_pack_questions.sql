-- Content pack part 3: 80 practice questions (5 per new topic), each with an
-- explanation and a difficulty, so the adaptive picker has a real range to
-- choose from. Distractors are written around common misconceptions.

INSERT INTO public.questions (concept_id, question, options, correct_index, difficulty, tags, prerequisite_concept_ids, explanation, sort_order) VALUES

-- Electronic Configuration
('aaaa0001-1111-4111-8111-000000000001','How many electrons can the L shell (n = 2) hold?','["2","8","18","32"]',1,0.2,ARRAY['shells'],'{}','Capacity = 2n(squared) = 2 x 4 = 8.',1),
('aaaa0001-1111-4111-8111-000000000001','The electronic configuration of sodium (Z = 11) is:','["2, 9","2, 8, 1","8, 2, 1","2, 7, 2"]',1,0.3,ARRAY['configuration'],'{}','Fill K with 2, L with 8, and the last electron goes to M: 2, 8, 1.',2),
('aaaa0001-1111-4111-8111-000000000001','An element has the configuration 2, 8, 7. It belongs to which group and period?','["Group 7, period 2","Group 17, period 3","Group 3, period 7","Group 2, period 8"]',1,0.5,ARRAY['periodic table'],'{}','Three shells means period 3; seven outer electrons puts it in group 17 (the halogens).',3),
('aaaa0001-1111-4111-8111-000000000001','Why is the configuration of calcium (Z = 20) written 2, 8, 8, 2 and not 2, 8, 10?','["M shell holds only 8 electrons in total","The outermost shell cannot hold more than 8","Calcium has only 3 shells","Electrons prefer the N shell"]',1,0.6,ARRAY['filling rule'],'{}','The M shell can hold 18, but while it is outermost it cannot exceed 8, so the next electrons enter N.',4),
('aaaa0001-1111-4111-8111-000000000001','Which element is chemically unreactive because of its configuration?','["2, 8, 1","2, 8, 7","2, 8, 8","2, 8, 2"]',2,0.4,ARRAY['noble gas'],'{}','A complete outer shell of 8 (argon) means no tendency to gain, lose or share electrons.',5),

-- Valency
('aaaa0001-1111-4111-8111-000000000002','The valency of magnesium (2, 8, 2) is:','["1","2","6","8"]',1,0.2,ARRAY['valency'],'{}','With 2 outer electrons (4 or fewer), valency equals the number of outer electrons.',1),
('aaaa0001-1111-4111-8111-000000000002','The valency of nitrogen (2, 5) is:','["5","3","2","8"]',1,0.4,ARRAY['valency'],'{}','More than 4 outer electrons, so valency = 8 - 5 = 3.',2),
('aaaa0001-1111-4111-8111-000000000002','The valency of a noble gas such as neon is:','["0","1","2","8"]',0,0.3,ARRAY['noble gas'],'{}','Its outer shell is already complete, so it has no combining capacity.',3),
('aaaa0001-1111-4111-8111-000000000002','Element X has valency 3 and element Y has valency 2. The formula of their compound is:','["XY","X2Y3","X3Y2","XY2"]',1,0.6,ARRAY['criss-cross'],'{}','Criss-cross the valencies: X takes 2, Y takes 3, giving X2Y3.',4),
('aaaa0001-1111-4111-8111-000000000002','Which statement about valency is correct?','["Valency always carries a + or - sign","Valency is the number of electrons gained, lost or shared","Valency equals the atomic number","Valency is always equal to 8"]',1,0.5,ARRAY['definition'],'{}','Valency is a combining capacity and has no sign; charge has a sign.',5),

-- Mole Concept
('aaaa0001-1111-4111-8111-000000000003','The value of the Avogadro number is:','["6.022 x 10^22","6.022 x 10^23","3.011 x 10^23","1.602 x 10^19"]',1,0.2,ARRAY['avogadro'],'{}','One mole contains 6.022 x 10(23) particles.',1),
('aaaa0001-1111-4111-8111-000000000003','The mass of 1 mole of water (H2O) is:','["10 g","16 g","18 g","22 g"]',2,0.3,ARRAY['molar mass'],'{}','(2 x 1) + 16 = 18, so one mole weighs 18 g.',2),
('aaaa0001-1111-4111-8111-000000000003','How many moles are present in 44 g of CO2?','["0.5","1","2","4"]',1,0.5,ARRAY['calculation'],'{}','Molar mass of CO2 = 12 + 32 = 44, so 44/44 = 1 mole.',3),
('aaaa0001-1111-4111-8111-000000000003','The number of atoms in 1 mole of oxygen gas (O2) is:','["6.022 x 10^23","1.2044 x 10^24","3.011 x 10^23","32"]',1,0.7,ARRAY['atoms vs molecules'],'{}','One mole has 6.022 x 10(23) molecules, and each O2 molecule has 2 atoms, so twice that many atoms.',4),
('aaaa0001-1111-4111-8111-000000000003','What is the mass of 0.25 mole of calcium carbonate (CaCO3, molar mass 100)?','["4 g","25 g","40 g","100 g"]',1,0.6,ARRAY['calculation'],'{}','mass = moles x molar mass = 0.25 x 100 = 25 g.',5),

-- Metallic Bonding
('aaaa0001-1111-4111-8111-000000000004','In the metallic bond model, metal atoms are described as:','["Neutral atoms in fixed positions","Positive ions in a sea of free electrons","Negative ions surrounded by protons","Molecules held by shared pairs"]',1,0.3,ARRAY['model'],'{}','Metal atoms release outer electrons, leaving positive ions in a mobile electron sea.',1),
('aaaa0001-1111-4111-8111-000000000004','Metals are malleable because:','["Their bonds are weak","Layers of ions slide without breaking the bond","They contain water","Their ions repel each other"]',1,0.5,ARRAY['malleability'],'{}','The electron sea flows around displaced layers, so the structure does not shatter.',2),
('aaaa0001-1111-4111-8111-000000000004','An ionic solid shatters when hammered because:','["It has no electrons","Like charges come together and repel","Its bonds are metallic","It melts instantly"]',1,0.6,ARRAY['comparison'],'{}','Displacing a layer brings ions of the same charge side by side, and the repulsion splits the crystal.',3),
('aaaa0001-1111-4111-8111-000000000004','A metal wire carrying current is chemically unchanged because:','["Electrons move without breaking bonds","Protons carry the charge","Ions move through the wire","Current does not flow in metals"]',0,0.5,ARRAY['conduction'],'{}','Conduction in metals is by free electrons only, so no reaction takes place.',4),
('aaaa0001-1111-4111-8111-000000000004','Which bond involves electrons shared by all the atoms in the structure?','["Ionic","Covalent","Metallic","Hydrogen"]',2,0.4,ARRAY['comparison'],'{}','Ionic transfers, covalent shares between two atoms, metallic shares across the whole lattice.',5),

-- Properties of Ionic & Covalent Compounds
('aaaa0001-1111-4111-8111-000000000005','Solid sodium chloride does not conduct electricity because:','["It has no ions","Its ions cannot move","It is covalent","It is a gas"]',1,0.4,ARRAY['conductivity'],'{}','The ions exist but are locked in the lattice; melting or dissolving frees them.',1),
('aaaa0001-1111-4111-8111-000000000005','Simple covalent compounds have low melting points because:','["Covalent bonds are weak","Forces between separate molecules are weak","They contain ions","They are metals"]',1,0.6,ARRAY['melting point'],'{}','Melting separates molecules, not the strong covalent bonds inside them.',2),
('aaaa0001-1111-4111-8111-000000000005','Which compound is most likely to dissolve in kerosene rather than water?','["Sodium chloride","Potassium nitrate","Naphthalene","Copper sulphate"]',2,0.5,ARRAY['solubility'],'{}','Like dissolves like: a non-polar covalent solid dissolves in a non-polar solvent.',3),
('aaaa0001-1111-4111-8111-000000000005','Diamond has a very high melting point because:','["It is ionic","Melting requires breaking covalent bonds in a giant network","It contains free electrons","It is a molecular solid"]',1,0.7,ARRAY['giant covalent'],'{}','In a giant covalent structure the covalent bonds themselves must be broken.',4),
('aaaa0001-1111-4111-8111-000000000005','Which set of properties fits an ionic compound?','["Low melting point, non-conducting, soft","High melting point, conducts when molten, brittle","Low melting point, conducts as a solid, soft","High melting point, never conducts, malleable"]',1,0.5,ARRAY['summary'],'{}','Strong lattice means high melting point and brittleness; free ions when molten mean conduction.',5),

-- Chemical Formulae & Naming
('aaaa0001-1111-4111-8111-000000000006','The formula of calcium chloride is:','["CaCl","CaCl2","Ca2Cl","Ca2Cl3"]',1,0.3,ARRAY['formula'],'{}','Ca has valency 2 and Cl has valency 1, so one Ca needs two Cl.',1),
('aaaa0001-1111-4111-8111-000000000006','The correct formula of calcium nitrate is:','["CaNO3","Ca(NO3)2","Ca2NO3","Ca(NO3)"]',1,0.6,ARRAY['radicals'],'{}','Nitrate (valency 1) is needed twice, and a repeated radical must be bracketed.',2),
('aaaa0001-1111-4111-8111-000000000006','The valency of the sulphate radical (SO4) is:','["1","2","3","4"]',1,0.4,ARRAY['radicals'],'{}','Sulphate carries a charge of 2-, so its valency is 2.',3),
('aaaa0001-1111-4111-8111-000000000006','Magnesium (valency 2) and oxygen (valency 2) form:','["Mg2O2","MgO","MgO2","Mg2O"]',1,0.5,ARRAY['reduce ratio'],'{}','Criss-crossing gives Mg2O2, which must be reduced to MgO.',4),
('aaaa0001-1111-4111-8111-000000000006','The compound Na2CO3 is named:','["Sodium carbide","Sodium carbonate","Disodium carbon oxide","Sodium bicarbonate"]',1,0.4,ARRAY['naming'],'{}','The CO3 radical is carbonate; -ide endings are for simple non-metal ions.',5),

-- Types of Chemical Reactions
('aaaa0001-1111-4111-8111-000000000007','2H2 + O2 -> 2H2O is an example of:','["Decomposition","Combination","Displacement","Double displacement"]',1,0.2,ARRAY['combination'],'{}','Two substances combine to give a single product.',1),
('aaaa0001-1111-4111-8111-000000000007','CaCO3 -> CaO + CO2 on heating is:','["Thermal decomposition","Combination","Displacement","Neutralisation"]',0,0.3,ARRAY['decomposition'],'{}','One compound splits into two using heat.',2),
('aaaa0001-1111-4111-8111-000000000007','Na2SO4 + BaCl2 -> BaSO4 + 2NaCl is:','["Combination","Displacement","Double displacement","Decomposition"]',2,0.5,ARRAY['double displacement'],'{}','Two compounds exchange partners, and barium sulphate appears as a white precipitate.',3),
('aaaa0001-1111-4111-8111-000000000007','Which reaction type always has an element and a compound as reactants?','["Combination","Decomposition","Displacement","Double displacement"]',2,0.6,ARRAY['classification'],'{}','In a displacement reaction a free element replaces another element in a compound.',4),
('aaaa0001-1111-4111-8111-000000000007','Silver chloride turning grey in sunlight is an example of:','["Thermal decomposition","Photochemical decomposition","Combination","Displacement"]',1,0.6,ARRAY['decomposition'],'{}','Light supplies the energy, so it is photochemical decomposition.',5),

-- Oxidation & Reduction
('aaaa0001-1111-4111-8111-000000000008','Oxidation can be defined as:','["Gain of electrons","Loss of electrons","Gain of hydrogen","Loss of oxygen"]',1,0.3,ARRAY['definition'],'{}','OIL RIG: Oxidation Is Loss of electrons.',1),
('aaaa0001-1111-4111-8111-000000000008','In ZnO + C -> Zn + CO, carbon acts as the:','["Oxidising agent","Reducing agent","Catalyst","Solvent"]',1,0.5,ARRAY['agents'],'{}','Carbon gains oxygen (is oxidised), so it reduces the zinc oxide.',2),
('aaaa0001-1111-4111-8111-000000000008','In Zn + CuSO4 -> ZnSO4 + Cu, the copper ion is:','["Oxidised","Reduced","Unchanged","Acting as reducing agent"]',1,0.6,ARRAY['electrons'],'{}','Cu(2+) gains two electrons to become copper metal, which is reduction.',3),
('aaaa0001-1111-4111-8111-000000000008','Which everyday change is an oxidation?','["Melting of ice","Rusting of iron","Dissolving sugar","Boiling water"]',1,0.3,ARRAY['everyday'],'{}','Iron combines with oxygen and water to form rust, an oxidation.',4),
('aaaa0001-1111-4111-8111-000000000008','In a redox reaction, the substance that is oxidised is called the:','["Oxidising agent","Reducing agent","Catalyst","Precipitate"]',1,0.7,ARRAY['agents'],'{}','By losing electrons it supplies them to the other substance, reducing it.',5),

-- Salts & Neutralisation
('aaaa0001-1111-4111-8111-000000000009','Acid + base gives:','["Salt + hydrogen","Salt + water","Salt + oxygen","Acid + salt"]',1,0.2,ARRAY['neutralisation'],'{}','Neutralisation always produces a salt and water.',1),
('aaaa0001-1111-4111-8111-000000000009','The salt formed from sulphuric acid and potassium hydroxide is:','["Potassium chloride","Potassium sulphate","Potassium nitrate","Potassium carbonate"]',1,0.4,ARRAY['naming'],'{}','The negative part comes from the acid: sulphuric acid gives sulphates.',2),
('aaaa0001-1111-4111-8111-000000000009','An aqueous solution of sodium carbonate (from a weak acid and a strong base) is:','["Acidic","Neutral","Basic","Always pH 7"]',2,0.6,ARRAY['salt pH'],'{}','A salt of a weak acid and a strong base gives a basic solution, pH above 7.',3),
('aaaa0001-1111-4111-8111-000000000009','The chemical name of baking soda is:','["Sodium carbonate","Sodium hydrogencarbonate","Sodium chloride","Calcium carbonate"]',1,0.3,ARRAY['common salts'],'{}','Baking soda is NaHCO3, sodium hydrogencarbonate (bicarbonate).',4),
('aaaa0001-1111-4111-8111-000000000009','Plaster of Paris is obtained by heating gypsum. Its formula is:','["CaSO4.2H2O","CaSO4.1/2H2O","CaCO3","CaOCl2"]',1,0.7,ARRAY['common salts'],'{}','Gypsum (CaSO4.2H2O) is heated to about 100 degrees C to give CaSO4.1/2H2O.',5),

-- Reactivity Series
('aaaa0001-1111-4111-8111-00000000000a','Which metal is the most reactive?','["Copper","Zinc","Potassium","Silver"]',2,0.2,ARRAY['order'],'{}','Potassium stands at the top of the reactivity series.',1),
('aaaa0001-1111-4111-8111-00000000000a','Copper does not release hydrogen from dilute hydrochloric acid because:','["Copper is too soft","Copper is below hydrogen in the series","HCl is too weak","Copper is a non-metal"]',1,0.5,ARRAY['acids'],'{}','Only metals above hydrogen can displace it from dilute acids.',2),
('aaaa0001-1111-4111-8111-00000000000a','Which reaction will take place?','["Cu + ZnSO4 -> CuSO4 + Zn","Fe + CuSO4 -> FeSO4 + Cu","Ag + CuSO4 -> AgSO4 + Cu","Au + FeSO4 -> Au2SO4 + Fe"]',1,0.6,ARRAY['displacement'],'{}','Iron is above copper, so it displaces copper from its salt solution.',3),
('aaaa0001-1111-4111-8111-00000000000a','Sodium is stored under kerosene because:','["It is heavier than kerosene","It reacts vigorously with air and moisture","Kerosene dissolves it","It is radioactive"]',1,0.4,ARRAY['storage'],'{}','Sodium reacts so readily with oxygen and water that it must be kept away from air.',4),
('aaaa0001-1111-4111-8111-00000000000a','Gold and platinum occur in nature in the free state because they are:','["Very reactive","Least reactive","Light metals","Radioactive"]',1,0.3,ARRAY['occurrence'],'{}','Unreactive metals do not combine with other elements, so they are found uncombined.',5),

-- Extraction of Metals
('aaaa0001-1111-4111-8111-00000000000b','Aluminium is extracted from its ore by:','["Reduction with carbon","Electrolysis of molten alumina","Heating in air","Displacement with iron"]',1,0.4,ARRAY['electrolysis'],'{}','Aluminium is too reactive for carbon reduction, so electrolysis is used.',1),
('aaaa0001-1111-4111-8111-00000000000b','Heating a sulphide ore strongly in the presence of air is called:','["Calcination","Roasting","Smelting","Refining"]',1,0.4,ARRAY['roasting'],'{}','Roasting converts a sulphide to the oxide: 2ZnS + 3O2 -> 2ZnO + 2SO2.',2),
('aaaa0001-1111-4111-8111-00000000000b','Calcination differs from roasting because it is carried out:','["In excess air","In limited air, on carbonate ores","Under water","At room temperature"]',1,0.6,ARRAY['calcination'],'{}','Carbonate ores are heated in limited air: ZnCO3 -> ZnO + CO2.',3),
('aaaa0001-1111-4111-8111-00000000000b','In the thermite reaction, Fe2O3 + 2Al -> 2Fe + Al2O3, aluminium acts as:','["An oxidising agent","A reducing agent","A catalyst","An impurity"]',1,0.7,ARRAY['thermite'],ARRAY['aaaa0001-1111-4111-8111-000000000008']::uuid[],'Aluminium takes the oxygen from iron oxide, so it reduces it; the heat released melts the iron.',4),
('aaaa0001-1111-4111-8111-00000000000b','Moderately reactive metals such as zinc are obtained from their oxides by:','["Electrolysis","Reduction with carbon","Simple heating of the ore","Dissolving in acid"]',1,0.5,ARRAY['reduction'],'{}','Carbon is a cheap reducing agent and works for metals of middle reactivity.',5),

-- Corrosion & Its Prevention
('aaaa0001-1111-4111-8111-00000000000c','Rusting of iron requires:','["Oxygen only","Water only","Both oxygen and water","Carbon dioxide only"]',2,0.2,ARRAY['conditions'],'{}','Iron in dry air or in air-free boiled water does not rust.',1),
('aaaa0001-1111-4111-8111-00000000000c','Galvanising protects iron because zinc:','["Is harder than iron","Is more reactive and corrodes first","Seals the iron permanently","Is a non-metal"]',1,0.6,ARRAY['galvanising'],ARRAY['aaaa0001-1111-4111-8111-00000000000a']::uuid[],'Zinc is above iron in the reactivity series, so it is sacrificed first - even if the coating is scratched.',2),
('aaaa0001-1111-4111-8111-00000000000c','The green coating on an old copper vessel is:','["Copper oxide","Basic copper carbonate","Copper sulphide","Rust"]',1,0.5,ARRAY['corrosion'],'{}','Copper reacts with moist air and carbon dioxide to form basic copper carbonate.',3),
('aaaa0001-1111-4111-8111-00000000000c','Rusting continues deep into an iron object because rust is:','["Smooth and protective","Flaky, exposing fresh metal","Water-repellent","A good conductor"]',1,0.6,ARRAY['why it continues'],'{}','Unlike aluminium oxide, rust flakes off and leaves new metal exposed.',4),
('aaaa0001-1111-4111-8111-00000000000c','Stainless steel resists rusting because it is:','["Painted","An alloy of iron with chromium and nickel","Pure iron","Coated with zinc"]',1,0.4,ARRAY['alloying'],'{}','Alloying changes the surface chemistry so the metal does not rust.',5),

-- Carbon & Its Covalency
('aaaa0001-1111-4111-8111-00000000000d','Carbon forms covalent bonds rather than ions because:','["It has 8 outer electrons","Gaining or losing 4 electrons needs too much energy","It is a metal","It has no outer electrons"]',1,0.5,ARRAY['tetravalency'],'{}','With 4 outer electrons, sharing is far easier than transferring four of them.',1),
('aaaa0001-1111-4111-8111-00000000000d','The ability of carbon to form long chains with itself is called:','["Isomerism","Catenation","Allotropy","Polymerisation"]',1,0.3,ARRAY['catenation'],'{}','Catenation is self-linking, and carbon does it better than any other element.',2),
('aaaa0001-1111-4111-8111-00000000000d','Graphite conducts electricity but diamond does not because in graphite:','["Carbon is ionic","Each atom bonds to 3 others, leaving one free electron","The bonds are weaker","It contains metal atoms"]',1,0.7,ARRAY['allotropes'],'{}','The fourth electron of each carbon is delocalised and free to move.',3),
('aaaa0001-1111-4111-8111-00000000000d','Diamond and graphite are allotropes, which means they:','["Have different formulas","Are the same element with different structures","Are compounds of carbon","Are isotopes"]',1,0.5,ARRAY['allotropes'],'{}','Same element, different arrangement of atoms, hence different properties.',4),
('aaaa0001-1111-4111-8111-00000000000d','Most carbon compounds are poor conductors of electricity because they:','["Are ionic","Are covalent molecules with no free ions or electrons","Contain metals","Are always solid"]',1,0.4,ARRAY['properties'],'{}','Covalent molecules carry no mobile charge, so no current flows.',5),

-- Hydrocarbons
('aaaa0001-1111-4111-8111-00000000000e','The general formula of alkanes is:','["CnH2n","CnH(2n+2)","CnH(2n-2)","CnHn"]',1,0.3,ARRAY['general formula'],'{}','Saturated hydrocarbons follow CnH(2n+2): CH4, C2H6, C3H8.',1),
('aaaa0001-1111-4111-8111-00000000000e','Which compound decolourises bromine water?','["CH4","C2H6","C2H4","C3H8"]',2,0.5,ARRAY['test'],'{}','Only unsaturated hydrocarbons add bromine, removing its colour.',2),
('aaaa0001-1111-4111-8111-00000000000e','Vegetable oil is converted to vanaspati by:','["Substitution with chlorine","Addition of hydrogen over a nickel catalyst","Oxidation with KMnO4","Dehydration"]',1,0.6,ARRAY['addition'],'{}','Hydrogenation saturates the double bonds, turning the oil into a solid fat.',3),
('aaaa0001-1111-4111-8111-00000000000e','Unsaturated hydrocarbons burn with a yellow sooty flame because they:','["Contain more hydrogen","Contain a higher percentage of carbon","Are ionic","Contain oxygen"]',1,0.7,ARRAY['combustion'],'{}','Incomplete combustion of the extra carbon produces soot particles that glow yellow.',4),
('aaaa0001-1111-4111-8111-00000000000e','Successive members of a homologous series differ by:','["CH2","CH4","C2H2","H2"]',0,0.4,ARRAY['homologous series'],'{}','Each member adds one CH2 unit, so properties change in a regular way.',5),

-- Functional Groups & Isomerism
('aaaa0001-1111-4111-8111-00000000000f','The functional group -COOH belongs to:','["Alcohols","Aldehydes","Carboxylic acids","Ketones"]',2,0.3,ARRAY['groups'],'{}','-COOH is the carboxylic acid group, as in ethanoic acid.',1),
('aaaa0001-1111-4111-8111-00000000000f','A compound named propanol contains:','["3 carbons and an -OH group","2 carbons and a -COOH group","3 carbons and a -CHO group","4 carbons and a -CO- group"]',0,0.5,ARRAY['naming'],'{}','The stem prop- gives 3 carbons and the ending -ol gives the alcohol group.',2),
('aaaa0001-1111-4111-8111-00000000000f','Isomers are compounds with the same:','["Structure but different formula","Molecular formula but different structure","Formula and structure","Number of isotopes"]',1,0.4,ARRAY['isomerism'],'{}','Same atoms, connected differently, so the properties differ.',3),
('aaaa0001-1111-4111-8111-00000000000f','The smallest alkane that shows structural isomerism is:','["C2H6","C3H8","C4H10","CH4"]',2,0.7,ARRAY['isomerism'],'{}','With four carbons you can have a straight chain or a branched chain.',4),
('aaaa0001-1111-4111-8111-00000000000f','The chemical behaviour of a carbon compound is decided mainly by its:','["Chain length","Functional group","Colour","Density"]',1,0.4,ARRAY['groups'],'{}','The functional group is the reactive site; the chain mostly carries it.',5),

-- Ethanol & Ethanoic Acid
('aaaa0001-1111-4111-8111-000000000010','Ethanol reacting with sodium produces:','["Oxygen","Hydrogen","Carbon dioxide","Chlorine"]',1,0.4,ARRAY['reactions'],'{}','2Na + 2CH3CH2OH -> 2CH3CH2ONa + H2, a test for the -OH group.',1),
('aaaa0001-1111-4111-8111-000000000010','Heating ethanol with hot concentrated sulphuric acid at 170 degrees C gives:','["Ethane","Ethene","Ethanoic acid","Ester"]',1,0.6,ARRAY['dehydration'],'{}','The acid removes water, leaving the unsaturated compound ethene.',2),
('aaaa0001-1111-4111-8111-000000000010','Ethanoic acid reacting with sodium carbonate gives brisk effervescence of:','["Hydrogen","Oxygen","Carbon dioxide","Sulphur dioxide"]',2,0.5,ARRAY['reactions'],'{}','Acid + carbonate -> salt + water + CO2, which distinguishes an acid from an alcohol.',3),
('aaaa0001-1111-4111-8111-000000000010','The sweet-smelling compound formed from ethanol and ethanoic acid is:','["An ester","An aldehyde","A ketone","A soap"]',0,0.5,ARRAY['esterification'],'{}','Esterification gives ethyl ethanoate, used in perfumes and flavourings.',4),
('aaaa0001-1111-4111-8111-000000000010','Ethanoic acid is called a weak acid because it:','["Is dilute","Ionises only partially in water","Has no hydrogen","Does not react with metals"]',1,0.7,ARRAY['weak acid'],'{}','Only some molecules release H+, so it conducts less than HCl of the same concentration.',5);
