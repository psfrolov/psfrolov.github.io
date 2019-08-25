#Requires -Version 6
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$WarningPreference = "Stop"

$scriptDir = Split-Path -Path $script:MyInvocation.MyCommand.Path

# Create self-signed web server certificate.
$certPath = "$scriptDir\srv-auth.crt"
$keyPath = "$scriptDir\srv-auth.key"
& openssl req `
  -out $certPath `
  -keyout $keyPath `
  -newkey EC `
  -pkeyopt "ec_paramgen_curve:P-384" `
  -nodes `
  -x509 `
  -subj "/CN=TheHermeticVault/O=TheHermeticVault" `
  -days 365 `
  -addext "subjectAltName = DNS:localhost" `
  -addext "keyUsage = digitalSignature" `
  -addext "extendedKeyUsage = serverAuth" `
  -sha256
if (!$?) { throw "Failed to create test web server certificate." }

# Import certificate on Windows.
# Import-Certificate -CertStoreLocation "Cert:\LocalMachine\Root" -FilePath $certPath `
