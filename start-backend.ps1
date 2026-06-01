$env:JAVA_HOME = 'C:\Program Files\Java\jdk-26.0.1'
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
Set-Location -LiteralPath 'C:\Users\nyand\OneDrive\Desktop\A. GoFast\gofast-backend'
Write-Host "JAVA_HOME=$env:JAVA_HOME"
& .\mvnw.cmd spring-boot:run
