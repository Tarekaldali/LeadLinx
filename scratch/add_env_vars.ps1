# Powershell script to add env variables to Vercel
$envFile = Join-Path (Get-Item .).FullName ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error ".env.local file not found!"
    exit 1
}

# Parse env file line by line
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    # Skip comments and empty lines
    if ($line.StartsWith("#") -or $line -eq "") {
        return
    }
    
    # Split by the first '=' character
    $pos = $line.IndexOf('=')
    if ($pos -le 0) {
        return
    }
    
    $key = $line.Substring(0, $pos).Trim()
    $val = $line.Substring($pos + 1).Trim()
    
    # We will set NEXTAUTH_URL and NEXT_PUBLIC_APP_URL later once we get the real Vercel URL
    if ($key -eq "NEXTAUTH_URL" -or $key -eq "NEXT_PUBLIC_APP_URL") {
        Write-Host "Skipping $key for now (will set to actual Vercel URL after first deploy)"
        return
    }
    
    # Skip if key or value is empty
    if ($key -eq "" -or $val -eq "") {
        Write-Host "Skipping empty variable: $key"
        return
    }
    
    Write-Host "Adding environment variable: $key"
    foreach ($envType in @("production", "preview", "development")) {
        Write-Host "  Adding to $envType..."
        # Use Force to overwrite any existing ones
        $val | vercel env add $key $envType --yes --force
    }
}
