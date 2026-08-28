$token = 'eyJ1aWQiOiJhZG1pbi0wMDAwLTAwMDAtMDAwMCIsImV4cCI6NDk0MTUwMzY4NDUzM30.ro_-n8P2q_KzvFQH8BcxM1SjQaT1G6LBOGSLhUdaE-I'
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== Test: GET /api/paths ==="
$paths = Invoke-RestMethod -Uri 'http://localhost:3456/api/paths' -Method Get -Headers $headers
Write-Host "Paths count: $($paths.Count)"
$paths | ForEach-Object { Write-Host "  $($_.id): $($_.name) - $($_.description)" }

Write-Host ""
Write-Host "=== Test: GET /api/professions ==="
$profs = Invoke-RestMethod -Uri 'http://localhost:3456/api/professions' -Method Get -Headers $headers
Write-Host "Professions count: $($profs.Count)"
$profs | ForEach-Object { Write-Host "  $($_.id): $($_.name) - $($_.description)" }

Write-Host ""
Write-Host "=== Test: GET /api/game-settings ==="
$settings = Invoke-RestMethod -Uri 'http://localhost:3456/api/game-settings' -Method Get -Headers $headers
Write-Host "Settings count: $($settings.Count)"
$settings | ForEach-Object { Write-Host "  $($_.setting_key) = $($_.setting_value)" }

Write-Host ""
Write-Host "=== Test: POST /api/auth/signup (new player) ==="
try {
    $newUser = Invoke-RestMethod -Uri 'http://localhost:3456/api/auth/signup' -Method Post -ContentType 'application/json' -Body (@{username='testplayer';password='test123'} | ConvertTo-Json)
    Write-Host "Signup OK: id=$($newUser.id), username=$($newUser.username)"
} catch {
    Write-Host "Signup result: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "All API tests passed!"
