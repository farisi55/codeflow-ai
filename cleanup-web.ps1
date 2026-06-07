# cleanup-web.ps1
# Jalankan dari ROOT monorepo: codeflow-ai\
# Command: .\cleanup-web.ps1

$webPath = "apps\web"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CodeFlow AI — Cleanup apps/web" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1 — Stop dev server jika sedang berjalan di port 3001
Write-Host "[1/3] Cek dev server di port 3001..." -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn.OwningProcess | Select-Object -First 1
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "      Dev server dihentikan (PID: $pid)" -ForegroundColor Green
} else {
    Write-Host "      Tidak ada dev server berjalan" -ForegroundColor Gray
}

Write-Host ""

# Step 2 — Hapus semua generated files
Write-Host "[2/3] Menghapus generated files..." -ForegroundColor Yellow

$targets = @(
    # Source code (generated oleh Codex)
    "$webPath\src",

    # Dependencies & build artifacts
    "$webPath\node_modules",
    "$webPath\.next",
    "$webPath\pnpm-lock.yaml",

    # Config files (akan di-generate ulang oleh revised prompt)
    "$webPath\package.json",
    "$webPath\tsconfig.json",
    "$webPath\next.config.ts",
    "$webPath\next.config.js",
    "$webPath\next.config.mjs",
    "$webPath\tailwind.config.ts",
    "$webPath\tailwind.config.js",
    "$webPath\postcss.config.mjs",
    "$webPath\postcss.config.js",
    "$webPath\components.json",

    # Env files
    "$webPath\.env.local",
    "$webPath\.env",

    # Misc
    "$webPath\eslint.config.mjs",
    "$webPath\.eslintrc.json",
    "$webPath\.eslintrc.js"
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        Remove-Item -Recurse -Force $target -ErrorAction SilentlyContinue
        Write-Host "      Dihapus: $target" -ForegroundColor Green
    }
}

Write-Host ""

# Step 3 — Verifikasi folder apps/web bersih
Write-Host "[3/3] Verifikasi state folder..." -ForegroundColor Yellow
$remaining = Get-ChildItem -Path $webPath -ErrorAction SilentlyContinue

if ($null -eq $remaining) {
    Write-Host "      apps\web kosong — siap untuk prompt baru" -ForegroundColor Green
} elseif ($remaining.Count -eq 0) {
    Write-Host "      apps\web kosong — siap untuk prompt baru" -ForegroundColor Green
} else {
    Write-Host "      File tersisa (ini normal, bukan masalah):" -ForegroundColor Gray
    foreach ($item in $remaining) {
        $itemName = $item.Name
        Write-Host "      - $itemName" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cleanup selesai." -ForegroundColor Cyan
Write-Host " Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host "   1. Jalankan Prompt #01b (Revised) di Codex" -ForegroundColor White
Write-Host "   2. cd apps\web" -ForegroundColor White
Write-Host "   3. pnpm install" -ForegroundColor White
Write-Host "   4. pnpm dev" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
