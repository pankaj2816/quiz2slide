import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

# Let's inspect the entire OCR text from the user's uploaded pages
ocr_pages = [
"""Physics
Q. 1 A light wave is propagating with plane wave fronts of the type x + y + z = constant. The
angle made by the direction of wave propagation with the x -axis is :
Option 1:
cos−1 ( 1 / √3 )
Option 2:
cos−1 ( 2 / 3 )
Option 3:
cos−1 ( 1 / 3 )
Option 4:
cos−1 (√ 2 / 3 )
Correct Answer:
cos−1 ( 1 / √3 )
Solution:
The direction of propagation of light is perpendicular to the wave front and is symmetric about x, y and z axis.
∴ Angle made by the light with x, y&z axis is same.
∴ cos α = cos β = cos γ(α, β&γ are angle made by light with x, y&z axis respectively)
Also cos2 α + cos2 β + cos2 γ = 1 [Sum of direction cosines]
∴ α = cos−1 1 / √3
Hence, the answer is the option (1)
Q. 2 The equation for real gas is given by (P + a / V2 )(V − b) = RT , where P, V, T and R are
the pressure, volume, temperature and gas constant, respectively. The dimension of ab−2 is
equivalent to that of:
Option 1:
Planck's constant""",

"""Option 2:
Compressibility
Option 3:
Strain
Option 4:
Energy density
Correct Answer:
Energy density
Solution:
[P + a / V2 ](V − b) = RT
∴ [a] = [P] [V2] = ML−1 T−2 L6 = ML5 T−2
[b] = [V] = L3
[ab−2] = ML5 T−2 L−6 = ML−1 T−2
Dimension of energy density.
Hence, the answer is the option (4)
Q. 3 A cord of negligible mass is wound around the rim of a wheel supported by spokes with
negligible mass. The mass of wheel is 10 kg and radius is 10 cm and it can freely rotate
without any friction. Initially the wheel is at rest. If a steady pull of 20 N is applied on the
cord, the angular velocity of the wheel, after the cord is unwound by 1 m , would be :
Option 1:
20rad/s
Option 2:
30rad/s""",

"""Option 3:
10rad/s
Option 4:
0rad/s
Correct Answer:
20rad/s
Solution:
WF = 20 × I = 20 J
∴ ΔKE = 20 J = 1/2 Iω2
I = MR2 = 10 × 0.12 = 0.1 kg m2
∴ 20 = 1/2 × 0.1 × ω2
⇒ ω = 20rad/sec
Hence, the answer is the option (1)
Q. 4 A slanted object AB is placed on one side of convex lens as shown in the diagram. The
image is formed on the opposite side. Angle made by the image with principal axis is :
Option 1:
− α / 2
Option 2:
−45∘
Option 3:
+45∘
Option 4:
−α
Correct Answer:
−45∘""",

"""Solution:
Location of image of A :-
1/v − 1/u = 1/f ⇒ 1/v − 1/−30 = 1/20 ⇒ 1/v = 1/60 ⇒ v = 60 cm
∴ m = 2
Since size of object is small w.r.t. the location, hence
dv = m2du ⇒ dv = 4 × l = 4 cm
hi = mh0 ⇒ hi(dy) = 2 × 2 = 4 cm
∴ Angle made with principle axis = −45∘
Hence, the answer is the option (2)
Q. 5 Consider two infinitely large plane parallel conducting plates as shown below. The plates are
uniformly charged with a surface charge density +σ and −2σ. The force experienced by a
point charge +q placed at the mid point between two plates will be :
Option 1:
σq / 4ϵ0
Option 2:
3σq / 2ϵ0
Option 3:
3σq / 4ϵ0"""
]

full_stream = "\n".join(ocr_pages)

# Build a robust question parser that handles:
# 1. Sections: Physics, Chemistry, Mathematics
# 2. Q. <num> or Question <num> or <num>.
# 3. Option 1:, Option 2:, Option 3:, Option 4: OR (A), (B), (C), (D)
# 4. Correct Answer: and Solution: extraction/isolation

def parse_advanced_quiz(stream):
    # Regex to find question beginnings: Q. 1, Q. 2, Question 1, etc.
    q_pattern = re.compile(
        r'(?:(?:^|\n)(?:Section\s+[A-Z0-9]+:?|Physics|Chemistry|Mathematics)\s*\n+)?'
        r'(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*(\d+)|\b(\d+)\.)\s+',
        re.I
    )
    
    matches = list(q_pattern.finditer(stream))
    print(f"Found {len(matches)} question anchors in sample stream.")
    
    parsed = []
    for i, m in enumerate(matches):
        q_num = m.group(1) or m.group(2)
        start_idx = m.end()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(stream)
        raw_chunk = stream[start_idx:end_idx].strip()
        
        # Check for Solution / Correct Answer block to isolate Question Stem & Options
        sol_match = re.search(r'\n\s*(?:Correct\s+Answer:|Solution:|Ans(?:wer)?:)', raw_chunk, re.I)
        if sol_match:
            qa_chunk = raw_chunk[:sol_match.start()].strip()
            sol_chunk = raw_chunk[sol_match.start():].strip()
        else:
            qa_chunk = raw_chunk
            sol_chunk = ""
            
        # Parse Options: either "Option 1:" ... "Option 4:" OR "(A)" ... "(D)"
        opt_matches = list(re.finditer(r'(?:^|\n)\s*(?:Option\s*([1-4A-Da-d])\s*:|\(\s*([A-Da-d1-4])\s*\)|([A-Da-d])[\.\)])\s+', qa_chunk, re.I))
        
        if len(opt_matches) >= 4:
            mA, mB, mC, mD = opt_matches[-4], opt_matches[-3], opt_matches[-2], opt_matches[-1]
            stem = qa_chunk[:mA.start()].strip()
            optA = qa_chunk[mA.end():mB.start()].strip()
            optB = qa_chunk[mB.end():mC.start()].strip()
            optC = qa_chunk[mC.end():mD.start()].strip()
            optD = qa_chunk[mD.end():].strip()
        else:
            stem = qa_chunk
            optA = optB = optC = optD = ""
            
        parsed.append({
            'q_num': int(q_num),
            'stem': stem,
            'options': {'A': optA, 'B': optB, 'C': optC, 'D': optD},
            'solution': sol_chunk
        })
        
    return parsed

results = parse_advanced_quiz(full_stream)
for r in results:
    print(f"\n--- Q{r['q_num']} ---")
    print("STEM:", r['stem'][:120])
    print("A:", r['options']['A'])
    print("B:", r['options']['B'])
    print("C:", r['options']['C'])
    print("D:", r['options']['D'])
