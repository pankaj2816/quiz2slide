import re

test_stems = [
    ("Q1", "A light wave is propagating with plane wave fronts of the type x + y + z = constant. The angle made by the direction of wave propagation with the x -axis is:"),
    ("Q2", "The equation for real gas is given by ( P + a 2 ) (V − b) = RT, where P, V, T and R are the pressure, volume, temperature and gas constant, respectively. The dimension of ab is equivalent to that of:"),
    ("Q4", "A slanted object AB is placed on one side of convex lens as shown in the diagram. The image is formed on the opposite side. Angle made by the image with principal axis is:"),
    ("Q5", "Consider two infinitely large plane parallel conducting plates as shown below. The plates are uniformly charged with a surface charge density + σ and −2 σ. The force experienced by a point charge +q placed at the mid point between two plates will be:"),
    ("Q13", "A square Lamina OABC of length 10 cm is pivoted at 'O'. Forces act at Lamina as shown in figure. If Lamina remains stationary, then the magnitude of F is:"),
    ("Q17", "A spherical surface separates two media of refractive indices 1 and 1.5 as shown in figure. Distance of the image of an object ' O ', is: ( C is the center of curvature of the spherical surface and R is the radius of curvature)"),
    ("Q19", "A small bob of mass 100 mg and charge +10 μ C is connected to an insulating string of length 1 m. It is brought near to an infinitely long nonconducting sheet of charge density ' σ ' as shown in figure. If string subtends an angle of 45° with the sheet at equilibrium the charge density of sheet will be:"),
    ("Chem Q3", "The property/properties that show irregularity in first four elements of group-17 is/are:"),
    ("Chem Q5", "According to Bohr’s model of hydrogen atom, which of the following statement is incorrect?")
]

pattern = re.compile(r'\b(?:shown\s+(?:in|as|below|in\s+the\s+diagram|in\s+figure|in\s+the\s+figure)|as\s+shown\s+(?:in\s+the\s+diagram|in\s+figure|in\s+the\s+figure|below)|given\s+(?:in\s+)?(?:diagram|figure)|diagram\s+below|figure\s+below)\b', re.IGNORECASE)

for name, stem in test_stems:
    match = bool(pattern.search(stem))
    print(f"{name:8}: diagram_needed = {match}")
