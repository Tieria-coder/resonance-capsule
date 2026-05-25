$f = 'C:\Users\20883\.qclaw\workspace\emotion-capsule\cloudfunctions\ai\index.js'
$c = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$c = $c.TrimStart([char]0xFEFF)
[IO.File]::WriteAllText($f, $c, (New-Object Text.UTF8Encoding $false))
Write-Host "BOM removed successfully"
