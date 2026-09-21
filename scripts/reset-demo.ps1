<#
.SYNOPSIS
    Togg Health MVP - Demo Sıfırlama Yardımcısı (PowerShell)
.DESCRIPTION
    Yerel test/demo oturum kayıtlarını ve geçici backend verilerini temizler.
#>

$ErrorActionPreference = "Continue"
$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         TOGG HEALTH MVP - DEMO VERİ SIFIRLAYICI            " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Backend Oturum Dosyalarını Temizle
$SessionFiles = @(
    (Join-Path $ProjectRoot "services\core-api\togg_session_memory.json"),
    (Join-Path $ProjectRoot "togg_session_memory.json")
)

$clearedCount = 0
foreach ($f in $SessionFiles) {
    if (Test-Path $f) {
        Remove-Item -Path $f -Force
        Write-Host "Silindi: $f" -ForegroundColor Yellow
        $clearedCount++
    }
}

if ($clearedCount -eq 0) {
    Write-Host "Backend tarafında temizlenecek aktif seans kaydı bulunamadı." -ForegroundColor Gray
} else {
    Write-Host "Backend seans dosyaları başarıyla temizlendi ($clearedCount dosya)." -ForegroundColor Green
}

Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "ℹ️  TARAYICI (LOCALSTORAGE) VERİLERİNİ SIFIRLAMA:" -ForegroundColor Cyan
Write-Host "Tarayıcı güvenliği gereğince terminalden istemci localStorage silinemez." -ForegroundColor Gray
Write-Host "Kullanıcı arayüzünde tüm görme/cilt/mental geçmişini sıfırlamak için:" -ForegroundColor Gray
Write-Host "👉 http://localhost:3000/privacy adresine gidin ve 'Tüm Yerel Verileri Sil' butonuna tıklayın." -ForegroundColor White
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Demo ortamı temizlendi." -ForegroundColor Green
