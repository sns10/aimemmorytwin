-- Content pack part 2: a written lesson and a revision summary for each of
-- the 16 new topics, plus one assignment each. Written in plain language with
-- worked examples, because the earlier lessons were auto-generated one-liners.

INSERT INTO public.lesson_content (concept_id, kind, title, body, duration_min, sort_order) VALUES

('aaaa0001-1111-4111-8111-000000000001','reading','Read: how electrons are arranged', $r$
Electrons are not scattered randomly around the nucleus. They sit in shells, numbered n = 1, 2, 3, 4 from the nucleus outwards (also called K, L, M, N).

How many fit in each shell? Use 2n(squared):
- K shell (n=1): 2 x 1 = 2 electrons
- L shell (n=2): 2 x 4 = 8 electrons
- M shell (n=3): 2 x 9 = 18 electrons

One extra rule for Class 10: the outermost shell never holds more than 8 electrons, so shells fill in the order K, L, then 8 in M, then the next two go to N before M fills up to 18.

Worked example - calcium (Z = 20): put 2 in K, 8 in L, 8 in M, and the last 2 go to N. So the configuration is 2, 8, 8, 2.

Why it matters: the number of electrons in the outermost shell decides the chemistry of the element. Sodium (2, 8, 1) loses one electron easily. Chlorine (2, 8, 7) needs one. Argon (2, 8, 8) is full, so it reacts with almost nothing.

Reading the periodic table from it: the number of shells tells you the period, and the outermost electrons tell you the group. Calcium has 4 shells and 2 outer electrons, so it is period 4, group 2.
$r$, 6, 1),

('aaaa0001-1111-4111-8111-000000000001','summary','Quick revision', $r$
- Shell capacity = 2n(squared); outermost shell holds at most 8.
- Fill order: K, L, M (up to 8), N, then M up to 18.
- Number of shells = period. Outermost electrons = group (for main-group elements).
- Full outer shell = unreactive (noble gases).
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000002','reading','Read: valency without memorising', $r$
Valency is the combining capacity of an atom - how many electrons it gives, takes or shares to reach a full outer shell.

The rule: if the outermost shell has 4 or fewer electrons, valency = number of outer electrons. If it has more than 4, valency = 8 - (number of outer electrons).

Worked examples:
- Sodium (2, 8, 1): 1 outer electron, so valency 1. It loses that electron.
- Magnesium (2, 8, 2): valency 2.
- Carbon (2, 4): valency 4. It shares.
- Oxygen (2, 6): 8 - 6 = 2, so valency 2. It gains 2.
- Chlorine (2, 8, 7): 8 - 7 = 1, so valency 1.
- Neon (2, 8): outer shell already full, so valency 0.

Using valency to build a formula: criss-cross the valencies. Aluminium (valency 3) and oxygen (valency 2) give Al(2)O(3) - written Al2O3. Always reduce the ratio if possible: magnesium (2) and oxygen (2) gives Mg2O2, which reduces to MgO.

Common mistake: treating valency as a charge. Valency has no sign. Oxygen's valency is 2, while its ion is O(2-).
$r$, 6, 1),

('aaaa0001-1111-4111-8111-000000000002','summary','Quick revision', $r$
- Valency = outer electrons if 4 or fewer, otherwise 8 - outer electrons.
- Noble gases have valency 0.
- Criss-cross valencies to write a formula, then reduce the ratio.
- Valency is a number without a sign; charge has a sign.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000003','reading','Read: the mole, counted simply', $r$
Chemists cannot count atoms one by one, so they count in moles, the way a shopkeeper counts in dozens.

1 mole = 6.022 x 10(23) particles. This is the Avogadro number.

1 mole of any substance has a mass in grams equal to its atomic or molecular mass:
- 1 mole of carbon atoms = 12 g
- 1 mole of water (H2O: 2 + 16 = 18) = 18 g
- 1 mole of oxygen gas (O2: 32) = 32 g

Three formulas do all the work:
- moles = mass / molar mass
- number of particles = moles x 6.022 x 10(23)
- mass = moles x molar mass

Worked example - how many moles are in 36 g of water? moles = 36 / 18 = 2 moles. And the number of molecules = 2 x 6.022 x 10(23) = 1.2044 x 10(24).

Worked example the other way - what is the mass of 0.5 mole of CO2? Molar mass of CO2 = 12 + 32 = 44, so mass = 0.5 x 44 = 22 g.

Watch out: 1 mole of O2 molecules contains 6.022 x 10(23) molecules but 2 x 6.022 x 10(23) atoms. Always check whether the question asks for atoms or molecules.
$r$, 8, 1),

('aaaa0001-1111-4111-8111-000000000003','summary','Quick revision', $r$
- 1 mole = 6.022 x 10(23) particles = molar mass in grams.
- moles = mass / molar mass; particles = moles x Avogadro number.
- Molar mass of a compound = sum of atomic masses.
- Distinguish atoms from molecules in diatomic gases (O2, H2, N2).
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000004','reading','Read: the sea of electrons', $r$
In a metal, the atoms give up their outer electrons. What is left is a regular arrangement of positive ions sitting in a shared pool of electrons that can move freely through the whole piece of metal. This is the sea-of-electrons model, and the attraction between the positive ions and the moving electrons is the metallic bond.

Almost every familiar property of metals follows from it:
- Electrical conductivity: free electrons drift when a voltage is applied, so current flows. No new bonds are made or broken, so the metal is unchanged.
- Thermal conductivity: the same mobile electrons carry kinetic energy quickly through the metal.
- Malleability and ductility: push a layer of ions sideways and the electron sea simply flows around them, so the bond is not broken. The metal bends instead of shattering. In an ionic solid the same push brings like charges together and the crystal cracks.
- Lustre: free electrons at the surface re-emit light that falls on them.
- High melting point: the attraction is strong and spread through the whole structure.

Compare the three bonds: ionic = electrons transferred; covalent = electrons shared between two atoms; metallic = electrons shared by every atom at once.
$r$, 6, 1),

('aaaa0001-1111-4111-8111-000000000004','summary','Quick revision', $r$
- Metallic bond = positive ions held in a sea of free electrons.
- Free electrons explain conduction, lustre and heat transfer.
- Layers slide without breaking bonds, so metals are malleable and ductile.
- Ionic solids crack under the same force because like charges meet.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000005','reading','Read: telling the two kinds of compound apart', $r$
Ionic compounds (such as NaCl) are giant lattices of ions. Simple covalent compounds (such as water, carbon dioxide, iodine) are small separate molecules.

Melting and boiling point: breaking an ionic lattice means overcoming strong attraction between many ions, so melting points are high (NaCl melts at 801 degrees C). In a covalent substance you only have to pull weakly attracting molecules apart, not break the covalent bonds inside them, so melting points are low and many are liquids or gases at room temperature.

Electrical conductivity: an ionic compound does not conduct as a solid, because the ions are locked in place. Melt it or dissolve it in water and the ions are free to move, so it conducts. Covalent compounds have no ions, so they do not conduct in any state. (Exceptions: acids, which form ions in water, and graphite, which has free electrons.)

Solubility: a rough rule is "like dissolves like". Ionic compounds usually dissolve in water, which is polar, and not in petrol or kerosene. Most covalent compounds are the other way round.

Hardness: ionic solids are hard but brittle. Molecular covalent solids are soft.

Note the odd ones out: giant covalent structures such as diamond and quartz have very high melting points, because here you really do have to break covalent bonds.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-000000000005','summary','Quick revision', $r$
- Ionic: high melting point, conducts when molten or dissolved, water-soluble, hard and brittle.
- Simple covalent: low melting point, non-conducting, soluble in organic solvents, soft.
- Solid ionic compounds do not conduct - the ions cannot move.
- Diamond and quartz are giant covalent, so they break the "low melting point" rule.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000006','reading','Read: writing and naming formulae', $r$
A formula is written by balancing valencies so that the compound as a whole is neutral.

Step by step for calcium chloride: write the symbols with valencies, Ca(2) and Cl(1). Criss-cross them: Ca gets 1, Cl gets 2, so the formula is CaCl2.

Radicals (ions made of more than one atom) behave as a single unit and keep their own valency: sulphate SO4 (2), nitrate NO3 (1), carbonate CO3 (2), hydroxide OH (1), ammonium NH4 (1).

When more than one of a radical is needed, put it in brackets: calcium (2) with nitrate (1) gives Ca(NO3)2 - not CaNO32, which would mean something else entirely.

Naming: the metal or positive part comes first, unchanged. The non-metal ending changes to -ide for a simple element (sodium chloride, magnesium oxide) and stays -ate or -ite for radicals containing oxygen (sodium sulphate, calcium carbonate).

Worked example - aluminium oxide: Al(3) and O(2), criss-cross gives Al2O3.
Worked example - ammonium sulphate: NH4(1) and SO4(2), criss-cross gives (NH4)2SO4.

Common mistake: forgetting to reduce. Mg(2) with O(2) criss-crosses to Mg2O2, which must be written MgO.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-000000000006','summary','Quick revision', $r$
- Criss-cross the valencies, then reduce the ratio.
- Radicals act as one unit; use brackets when more than one is needed.
- Simple non-metal takes -ide; oxygen-containing radicals keep -ate or -ite.
- Metal or positive part is named first.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000007','reading','Read: the four reaction types', $r$
Combination: two or more substances join to form one product. A + B -> AB.
Example: CaO + H2O -> Ca(OH)2 (quicklime to slaked lime, giving out heat).

Decomposition: one substance splits into two or more. AB -> A + B. The energy can come from heat (thermal), electricity (electrolytic) or light (photochemical).
Example: CaCO3 -> CaO + CO2 on heating. Silver chloride turning grey in sunlight is a photochemical one.

Displacement: a more reactive element pushes a less reactive one out of its compound. A + BC -> AC + B.
Example: Zn + CuSO4 -> ZnSO4 + Cu. The blue colour fades and a reddish deposit appears, because zinc is above copper in the reactivity series.

Double displacement: two compounds swap partners. AB + CD -> AD + CB. If one product is insoluble it appears as a precipitate.
Example: Na2SO4 + BaCl2 -> BaSO4 (white precipitate) + 2NaCl.

How to recognise the type quickly: count the substances on each side. Many in and one out means combination. One in and many out means decomposition. An element plus a compound means displacement. Two compounds in and two compounds out means double displacement.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-000000000007','summary','Quick revision', $r$
- Combination: A + B -> AB. Decomposition: AB -> A + B.
- Displacement: more reactive element replaces a less reactive one.
- Double displacement: compounds exchange partners, often forming a precipitate.
- Count substances on each side to identify the type.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000008','reading','Read: oxidation and reduction together', $r$
Two ways of defining the same pair of changes.

By oxygen and hydrogen: oxidation is gain of oxygen or loss of hydrogen; reduction is loss of oxygen or gain of hydrogen.
By electrons: oxidation is loss of electrons; reduction is gain of electrons. The memory aid is OIL RIG - Oxidation Is Loss, Reduction Is Gain.

They always happen together, which is why such reactions are called redox reactions. The substance that is oxidised causes the other to be reduced, so it is the reducing agent, and the other is the oxidising agent.

Worked example: CuO + H2 -> Cu + H2O.
Copper oxide loses oxygen, so it is reduced and acts as the oxidising agent. Hydrogen gains oxygen, so it is oxidised and acts as the reducing agent.

Worked example with electrons: Zn + CuSO4 -> ZnSO4 + Cu.
Zinc loses 2 electrons (oxidised, reducing agent) and the copper ion gains them (reduced, oxidising agent).

Everyday redox: rusting of iron, burning of fuels, food turning rancid, and the blackening of silver ornaments are all oxidation.

Common mistake: calling the substance that is oxidised the "oxidising agent". It is the opposite.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-000000000008','summary','Quick revision', $r$
- Oxidation: gain of oxygen, loss of hydrogen, or loss of electrons (OIL).
- Reduction: loss of oxygen, gain of hydrogen, or gain of electrons (RIG).
- The two always occur together in a redox reaction.
- The substance oxidised is the reducing agent, and vice versa.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000009','reading','Read: salts and neutralisation', $r$
Acid + base -> salt + water. That single line is neutralisation.

Example: HCl + NaOH -> NaCl + H2O. The H+ from the acid and the OH- from the base join to make water, and the leftover ions make the salt.

The name of the salt comes from its parents: the positive part from the base and the negative part from the acid. Hydrochloric acid gives chlorides, sulphuric acid gives sulphates, nitric acid gives nitrates.

Not every salt solution is neutral. It depends on the strength of the acid and base that formed it:
- Strong acid + strong base (HCl + NaOH -> NaCl): neutral, pH 7.
- Strong acid + weak base (HCl + NH4OH -> NH4Cl): acidic, pH below 7.
- Weak acid + strong base (CH3COOH + NaOH -> CH3COONa): basic, pH above 7.

Salts you should know: common salt NaCl (food, and the raw material for the chlor-alkali industry), washing soda Na2CO3.10H2O, baking soda NaHCO3 (used in baking and in fire extinguishers), bleaching powder CaOCl2, plaster of Paris CaSO4.1/2H2O (sets into a hard solid with water, used for plaster casts).

Everyday neutralisation: an antacid tablet for acidity in the stomach, lime spread on acidic soil, and baking soda on a bee sting.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-000000000009','summary','Quick revision', $r$
- Acid + base -> salt + water.
- Positive part of the salt comes from the base, negative part from the acid.
- Strong + strong = neutral; strong acid + weak base = acidic; weak acid + strong base = basic.
- Know NaCl, Na2CO3.10H2O, NaHCO3, CaOCl2 and plaster of Paris.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-00000000000a','reading','Read: the reactivity series', $r$
Metals are not equally eager to react. Arranged from most to least reactive:

K, Na, Ca, Mg, Al, Zn, Fe, Pb, (H), Cu, Hg, Ag, Au.

A common mnemonic in India is "Please Stop Calling Me A Zebra, I Like Her Cute Golden Hair" for a similar order; use whichever you can recall under exam pressure.

What the order predicts:
- Displacement: a metal higher in the list displaces one lower down from its salt solution. Zn + CuSO4 -> ZnSO4 + Cu works. Cu + ZnSO4 does not.
- Reaction with water: potassium, sodium and calcium react with cold water; magnesium with hot water; iron with steam; copper and below not at all.
- Reaction with acids: metals above hydrogen displace hydrogen gas from dilute acids. Copper, silver and gold do not, which is why copper vessels are safe for mildly acidic food.
- Occurrence in nature: very reactive metals are always found as compounds, while gold and platinum are found free.

Worked example: will iron displace silver from silver nitrate solution? Iron is above silver, so yes - Fe + 2AgNO3 -> Fe(NO3)2 + 2Ag, and silver deposits on the iron.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-00000000000a','summary','Quick revision', $r$
- Order: K, Na, Ca, Mg, Al, Zn, Fe, Pb, (H), Cu, Hg, Ag, Au.
- Higher metal displaces lower one from its salt solution.
- Only metals above hydrogen release H2 from dilute acids.
- Reactive metals occur as compounds; unreactive ones occur free.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-00000000000b','reading','Read: getting metals out of their ores', $r$
Ores are impure. Extraction has three stages: concentration of the ore, reduction to the metal, and refining.

Which reduction method depends on where the metal sits in the reactivity series:
- Highly reactive (K, Na, Ca, Mg, Al): electrolysis of the molten ore. Carbon cannot pull the oxygen away, because the metal holds it too strongly. Aluminium is obtained by electrolysing molten alumina.
- Moderately reactive (Zn, Fe, Pb, Cu): first convert the ore to the oxide - by roasting if it is a sulphide, by calcination if it is a carbonate - then reduce the oxide with carbon. ZnO + C -> Zn + CO.
- Least reactive (Ag, Au, Pt): found free or obtained by simple heating of the ore.

Roasting means heating the sulphide ore strongly in air: 2ZnS + 3O2 -> 2ZnO + 2SO2. Calcination means heating the carbonate ore in limited air: ZnCO3 -> ZnO + CO2.

Thermite reaction: aluminium is such a good reducing agent that Fe2O3 + 2Al -> 2Fe + Al2O3 releases enough heat to melt the iron, which is used to weld railway tracks.

Refining is usually done by electrolysis, with the impure metal as the anode and the pure metal as the cathode.
$r$, 8, 1),

('aaaa0001-1111-4111-8111-00000000000b','summary','Quick revision', $r$
- Stages: concentration, reduction, refining.
- Reactive metals: electrolysis. Moderate: roast or calcine, then reduce with carbon. Unreactive: found free.
- Roasting = sulphide ore in air; calcination = carbonate ore in limited air.
- Thermite reaction uses aluminium to reduce iron oxide, welding rails.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-00000000000c','reading','Read: corrosion and how to stop it', $r$
Corrosion is the slow eating away of a metal by air, moisture and chemicals around it. It is an oxidation.

Rusting of iron needs both oxygen and water. Iron left in dry air or in boiled water sealed from air does not rust. Rust is hydrated iron(III) oxide, Fe2O3.xH2O, and it is flaky, so fresh metal keeps getting exposed and the rusting continues all the way through. Salt and acidic gases speed it up, which is why vehicles rust faster near the coast.

Other metals corrode differently: copper forms a green coating of basic copper carbonate, and silver turns black with silver sulphide. Aluminium is special - its oxide layer sticks tightly and protects the metal underneath.

Prevention works by keeping out air and moisture, or by sacrificing another metal:
- Painting, greasing or oiling: cheap, but fails once scratched.
- Galvanising: coating iron with zinc. Zinc is more reactive, so it corrodes first and protects the iron even if the coating is scratched. This is sacrificial protection.
- Electroplating: a thin layer of chromium, tin or nickel for protection and appearance.
- Alloying: stainless steel is iron with chromium and nickel, and it does not rust.

Cost matters: corrosion destroys a large fraction of the iron produced every year, so prevention is an economic problem, not only a chemical one.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-00000000000c','summary','Quick revision', $r$
- Rusting needs both oxygen and water; salt speeds it up.
- Rust = Fe2O3.xH2O, flaky, so corrosion goes on under it.
- Galvanising gives sacrificial protection because zinc is more reactive than iron.
- Other methods: painting, oiling, electroplating, alloying (stainless steel).
$r$, 2, 2),

('aaaa0001-1111-4111-8111-00000000000d','reading','Read: why carbon is different', $r$
Carbon has 4 electrons in its outer shell. Losing or gaining 4 electrons would need far too much energy, so carbon shares - it forms four covalent bonds. This is tetravalency.

Catenation is carbon's second special ability: carbon atoms bond strongly to other carbon atoms, forming long chains, branched chains and rings. Silicon can do this only a little; carbon does it almost without limit. Together these two properties are why there are millions of carbon compounds and only thousands of compounds of most other elements.

Because carbon compounds are covalent molecules, they generally have low melting and boiling points and do not conduct electricity.

Allotropes - same element, different structures:
- Diamond: each carbon bonded to four others in a rigid 3-D network. Hardest natural substance, non-conducting.
- Graphite: flat layers of carbon, each atom bonded to three others, layers held weakly. Soft, slippery, and a good conductor because the fourth electron is free.
- Buckminsterfullerene (C60): a hollow football-shaped molecule.

Same element, completely different properties - the difference is only in how the atoms are arranged.
$r$, 7, 1),

('aaaa0001-1111-4111-8111-00000000000d','summary','Quick revision', $r$
- Tetravalency: carbon forms 4 covalent bonds.
- Catenation: carbon-carbon chains, branches and rings.
- Carbon compounds are covalent: low melting point, poor conductors.
- Allotropes: diamond (hard, 3-D), graphite (soft, conducting layers), C60.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-00000000000e','reading','Read: hydrocarbons', $r$
Hydrocarbons contain only carbon and hydrogen.

Saturated hydrocarbons (alkanes) have only single bonds. General formula CnH(2n+2): methane CH4, ethane C2H6, propane C3H8, butane C4H10. They burn with a clean blue flame and are fairly unreactive, which is why they are used as fuels.

Unsaturated hydrocarbons have a double bond (alkenes, CnH2n: ethene C2H4, propene C3H6) or a triple bond (alkynes, CnH(2n-2): ethyne C2H2). The multiple bond is a weak point, so unsaturated compounds are more reactive - they undergo addition reactions, for instance adding hydrogen over a nickel catalyst to become saturated. This is exactly how vegetable oils are hardened into vanaspati.

A useful test: unsaturated hydrocarbons decolourise bromine water; saturated ones do not. Unsaturated hydrocarbons also burn with a yellow sooty flame, because of their higher carbon percentage.

Saturated hydrocarbons undergo substitution reactions instead - in sunlight, methane and chlorine react, with chlorine atoms replacing hydrogen atoms one by one.

Homologous series: each member differs from the next by CH2, so the formulas follow a pattern, properties change gradually, and the chemistry stays the same across the series.
$r$, 8, 1),

('aaaa0001-1111-4111-8111-00000000000e','summary','Quick revision', $r$
- Alkanes CnH(2n+2), single bonds, substitution reactions, clean blue flame.
- Alkenes CnH2n and alkynes CnH(2n-2), multiple bonds, addition reactions, sooty flame.
- Bromine water is decolourised by unsaturated hydrocarbons only.
- Homologous series: consecutive members differ by CH2.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-00000000000f','reading','Read: functional groups and isomers', $r$
A functional group is the atom or group of atoms that gives a carbon compound its characteristic chemistry. The carbon chain is mostly a carrier; the functional group does the reacting.

The ones to know:
- -OH alcohol (ethanol, CH3CH2OH)
- -CHO aldehyde (ethanal)
- -CO- ketone (propanone)
- -COOH carboxylic acid (ethanoic acid, CH3COOH)
- -X halogen (chloroethane)

Naming: take the stem for the number of carbons (meth-, eth-, prop-, but-) and add the ending for the group: -ol for alcohol, -al for aldehyde, -one for ketone, -oic acid for a carboxylic acid. Three carbons with an -OH group gives propanol.

Isomers are compounds with the same molecular formula but different structures, and therefore different properties. C4H10 has two: n-butane, a straight chain, and isobutane, a branched chain. Both are C4H10, but they boil at different temperatures.

Isomerism needs at least four carbon atoms in the alkane series - with one, two or three carbons there is only one way to arrange them.

Common mistake: drawing the same molecule bent in a different direction and calling it an isomer. If you can trace the same connections between atoms, it is the same compound.
$r$, 8, 1),

('aaaa0001-1111-4111-8111-00000000000f','summary','Quick revision', $r$
- Functional group decides the chemical behaviour: -OH, -CHO, -CO-, -COOH, -X.
- Endings: -ol, -al, -one, -oic acid.
- Isomers: same molecular formula, different structure, different properties.
- Alkane isomerism starts at C4H10.
$r$, 2, 2),

('aaaa0001-1111-4111-8111-000000000010','reading','Read: ethanol and ethanoic acid', $r$
Ethanol (CH3CH2OH) is a colourless liquid that mixes with water in all proportions. It is the alcohol in alcoholic drinks and a useful solvent for medicines, tinctures and perfumes.

Its reactions:
- With sodium: 2Na + 2CH3CH2OH -> 2CH3CH2ONa + H2. Hydrogen gas is released, which shows the -OH group.
- Dehydration: heated with hot concentrated sulphuric acid at about 170 degrees C, ethanol loses water and becomes ethene. The acid here is a dehydrating agent.
- Oxidation: with alkaline KMnO4 or acidified K2Cr2O7, ethanol is oxidised to ethanoic acid. The purple colour of KMnO4 disappears as it is used up.

Ethanoic acid (CH3COOH) is a weak acid. A 5 to 8 per cent solution in water is vinegar. Pure ethanoic acid freezes at 17 degrees C, which is just below room temperature in cold places, so it is called glacial acetic acid.

Its reactions:
- Turns blue litmus red, but only partly ionises, so it is weak - a dilute solution conducts less than hydrochloric acid at the same concentration.
- With a carbonate: 2CH3COOH + Na2CO3 -> 2CH3COONa + H2O + CO2. The brisk fizzing distinguishes a carboxylic acid from an alcohol.
- Esterification: with ethanol and a little concentrated sulphuric acid it gives ethyl ethanoate, an ester with a sweet smell, used in perfumes and flavourings. Warming an ester with NaOH reverses this - saponification, the reaction behind soap making.
$r$, 8, 1),

('aaaa0001-1111-4111-8111-000000000010','summary','Quick revision', $r$
- Ethanol + sodium gives hydrogen; dehydration with hot conc. H2SO4 gives ethene.
- Ethanol is oxidised to ethanoic acid by alkaline KMnO4 (purple colour fades).
- Ethanoic acid is a weak acid; 5-8% solution is vinegar; pure acid is glacial acetic acid.
- Acid + carbonate fizzes (CO2); acid + alcohol gives a sweet-smelling ester.
$r$, 2, 2);

-- ------------------------------------------------------------- assignments
INSERT INTO public.assignments (concept_id, title, prompt, rubric, difficulty)
SELECT c.id,
  'Apply: ' || c.name,
  'In 3-5 sentences, explain ' || c.name ||
    ' in your own words, include one worked example or everyday use, and state one mistake students commonly make here. Do not copy from the reading.',
  'Full credit: correct idea + a valid example + a genuine common mistake, in the student''s own words. Partial credit: correct idea only. Zero: incorrect or off-topic.',
  c.difficulty
FROM public.concepts c
WHERE c.id::text LIKE 'aaaa0001-%';
