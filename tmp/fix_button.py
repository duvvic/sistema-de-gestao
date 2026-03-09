filepath = r'C:\Users\login\OneDrive\Área de Trabalho\Projetos\sistema-de-gest-o\frontend\src\components\TeamMemberDetail.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
i = 0
while i < len(lines):
    # Detecta a linha do className com hover:opacity-90 e text-white (botão sem fundo correto)
    if ("'text-white hover:opacity-90'" in lines[i] and 
        "bg-amber-500" in lines[i] and 
        "hover:bg-amber-600 hover:opacity-90" in lines[i]):
        
        # Corrige o className
        lines[i] = lines[i].replace(
            "bg-amber-500 text-white hover:bg-amber-600 hover:opacity-90' : 'text-white hover:opacity-90'",
            "bg-amber-500 text-white hover:bg-amber-600' : 'bg-[var(--primary)] text-white hover:opacity-90'"
        )
        print(f"Fixed className on line {i+1}")
        found = True
        
        # Remove a linha seguinte se contiver o style={...} indesejado
        if i + 1 < len(lines) and "backgroundColor: 'var(--text)'" in lines[i + 1]:
            removed = lines.pop(i + 1)
            print(f"Removed style line: {removed.strip()}")
        break
    i += 1

if not found:
    print("Pattern not found! Searching for similar patterns...")
    for idx, line in enumerate(lines):
        if "var(--text)" in line and "backgroundColor" in line:
            print(f"  Line {idx+1}: {line.rstrip()}")
        if "Editar Perfil" in line or "Cancelar Edição" in line:
            print(f"  Line {idx+1}: {line.rstrip()}")

if found:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved successfully!")
