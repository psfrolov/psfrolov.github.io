@echo off

echo Removing site...
rmdir /s /q %~dp0\_site
echo.

echo Generating site...
set SSL_CERT_FILE=C:\Develop\cacert.pem
bundler exec jekyll serve --port 3999
