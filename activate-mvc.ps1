# Script de Ativação da Arquitetura MVC
# Executa: .\activate-mvc.ps1

Write-Host "🚀 Ativando Arquitetura MVC com React Router..." -ForegroundColor Cyan
Write-Host ""

# Passo 1: Backup dos arquivos antigos
Write-Host "📦 Fazendo backup dos arquivos antigos..." -ForegroundColor Yellow

if (Test-Path "App.tsx") {
    Copy-Item "App.tsx" "App_Antigo_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').tsx"
    Write-Host "✅ Backup App.tsx criado" -ForegroundColor Green
}

if (Test-Path "components\Login.tsx") {
    Copy-Item "components\Login.tsx" "components\Login_Antigo_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').tsx"
    Write-Host "✅ Backup Login.tsx criado" -ForegroundColor Green
}

Write-Host ""

# Passo 2: Ativar novos arquivos
Write-Host "🔄 Ativando novos arquivos..." -ForegroundColor Yellow

if (Test-Path "App_New.tsx") {
    Remove-Item "App.tsx" -ErrorAction SilentlyContinue
    Rename-Item "App_New.tsx" "App.tsx"
    Write-Host "✅ App.tsx atualizado" -ForegroundColor Green
} else {
    Write-Host "⚠️  App_New.tsx não encontrado, pulando..." -ForegroundColor Red
}

if (Test-Path "components\Login_New.tsx") {
    Remove-Item "components\Login.tsx" -ErrorAction SilentlyContinue
    Rename-Item "components\Login_New.tsx" "components\Login.tsx"
    Write-Host "✅ Login.tsx atualizado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Login_New.tsx não encontrado, pulando..." -ForegroundColor Red
}

Write-Host ""

# Passo 3: Verificar instalação de dependências
Write-Host "📚 Verificando dependências..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json

$hasReactRouter = $false
$hasLocalforage = $false

if ($packageJson.dependencies.'react-router-dom') {
    $hasReactRouter = $true
    Write-Host "✅ react-router-dom instalado" -ForegroundColor Green
}

if ($packageJson.dependencies.'localforage') {
    $hasLocalforage = $true
    Write-Host "✅ localforage instalado" -ForegroundColor Green
}

if (-not $hasReactRouter -or -not $hasLocalforage) {
    Write-Host ""
    Write-Host "⚠️  Faltam dependências! Execute:" -ForegroundColor Red
    Write-Host "npm install react-router-dom localforage" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✨ Arquitetura MVC ATIVADA com sucesso!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Reinicie o servidor: Ctrl+C e depois 'npm run dev'" -ForegroundColor White
Write-Host "  2. Abra http://localhost:5173/login" -ForegroundColor White
Write-Host "  3. Teste a navegação e o F5" -ForegroundColor White
Write-Host "  4. Leia NEXT_STEPS.md para mais detalhes" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Benefícios:" -ForegroundColor Yellow
Write-Host "  ✅ URLs reais (/admin/clients, /tasks/123)" -ForegroundColor Green
Write-Host "  ✅ F5 funciona e mantém o estado" -ForegroundColor Green
Write-Host "  ✅ Navegação com histórico do navegador" -ForegroundColor Green
Write-Host "  ✅ Pode compartilhar links diretos" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Documentação:" -ForegroundColor Yellow
Write-Host "  - MIGRATION_GUIDE.md: Como migrar componentes" -ForegroundColor White
Write-Host "  - NEXT_STEPS.md: Próximos passos detalhados" -ForegroundColor White
Write-Host ""
