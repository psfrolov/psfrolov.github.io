---
title: Using Coverity Scan with AppVeyor
tags: [AppVeyor, CI, Coverity, .NET, PowerShell, Static Analysis]
description: &description |
  Unlike Travis CI, AppVeyor currently lacks out of the box integration with
  Coverity Scan. In this article I’ll show you how to enable Coverity Scan code
  analysis for your project by injecting custom PowerShell scripts into
  AppVeyor build process.
excerpt: *description
image:
  url: /img/pages/coverity-scan-and-appveyor.png
---

[<span class="drop-letter">A</span><span>ppVeyor</span>][url-appveyor] is an
awesome SaaS CI server similar to [Travis CI][url-travis-ci] but for Windows
developers. It enables you to build, test and deploy all sorts of projects:
C/C++, .NET, IIS, SQL Server, WiX, among others (see [Instaled Software]
[url-appveyor-instaled-software]). Moreover, it is completely free for Open
Source projects.

[Coverity Scan][url-coverity-scan] is a free SaaS version of
[Coverity][url-coverity], static code analysis solution for C/C++, C# and
Java. Coverity Scan is used by some major Open Source projects such as Linux,
Python, PostgreSQL, Apache Software Foundation projects.

{{ page.excerpt }}

<div class="message">
<i class="fa fa-exclamation-triangle" title="Warning"></i>
The rest of the article assumes that you have a GitHub repository registered
with both AppVeyor and Coverity Scan, and you are familiar with Coverity Scan
workflow (i.e., manually building your project with Coverity Build Tool and
submitting results to Coverity Scan server).
</div>

### The Necessary Steps

Analysing project source code with Coverity Scan involves the
following steps:

1. [Download Coverity Build Tool](#downloading-coverity-build-tool).
2. [Build project with Coverity Build Tool](#building-project-with-coverity-build-tool).
3. [Compress scan data](#compressing-scan-data).
4. [Upload scan data to Coverity Scan server](#uploading-scan-data-to-coverity-scan-server).

### A Note on Scan Data Submissions Frequency

One important thing to note when working with Coverity Scan is build
submissions frequency. Coverity Scan [limits maximum number of submitted builds
on daily and weekly basis][url-coverity-scan-build-freq]. But even with limits
left out of scope it is probably impractical to run each and every build with
Coverity Scan since it takes noticeably longer time to complete. Let's see how
we can deal with it.

#### Using Dedicated Branch

Coverity Scan documentation suggests us to create separate branch dedicated
for code analysis (let's call it `analyse`). In that case, we can conditionally
enable Coverity Scan when building our project using `APPVEYOR_REPO_BRANCH`
built-in environment variable. Personally, I find this approach somewhat
inconvenient: we need to keep `analyse` branch in sync with `develop` branch
(although this can be automated if necessary).

#### Using Scheduled Builds

Alternatively, we can use AppVeyor
[Scheduled Builds][url-appveyor-scheduled-builds] feature to run Coverity Scan.
For example, I use the following crontab expression to launch Coverity build at
5:00 p.m. UTC+03 on Friday: `0 14 * * 5`. There is built-in variable named
`APPVEYOR_SCHEDULED_BUILD` which is set to `True` when the build is a scheduled
one. I find this approach more convenient, so I'll stick to it for the rest of
the article.

### Downloading Coverity Build Tool

<div class="message">
<i class="fa fa-exclamation-triangle" title="Warning"></i>
UPDATE. Coverity Build Tool now comes preinstaled on AppVeyor builder. See the
link in comment by Mark Clearwater below the article for more information.
</div>

The first step may sound simple, but _one does not simply download Coverity
Build Tool_. First, for security and legal reasons you need to pass your
Coverity Scan project name and token as part of download request. Second, the
download link is specific to you project language. See more on
[Coverity Community discussion page][url-coverity-community].

We will use PowerShell, and the right place to put our script is `instal` hook
in `appveyor.yml`:
{% highlight yaml %}
instal:
- ps: |
    # Here goes our code.
{% endhighlight %}

Let's deal with input data.

**Project name** is your Coverity Scan project name as seen in web UI. Usually
it's the same as GitHub project name (`owner-name/repo-name`), in which case
you can use `APPVEYOR_REPO_NAME` built-in variable for it.

**Project token** is used by Coverity Scan for automated build submissions. You
can examine and regenerate it in your Coverity Scan web GUI **Project
Settings** page. The token is meant to be kept in secret, so it is a good
practice to use AppVeyor [Secure Variables][url-appveyor-secure-variables]
feature to encrypt it:
{% highlight yaml %}
environment:
  CoverityProjectToken:
    secure: iNIJoA5yBGe4K1lV06g9Sta6kvcxeDxhnavNngxeEyE=
{% endhighlight %}

**Download link** can be obtained from your Coverity Scan web GUI
**Submit Build** page. Choose link for `Win64` platform (AppVeyor build worker
is 64-bit Windows Server). In my case (project language is `C++`), the
download link is `https://scan.coverity.com/download/cxx/win_64`.

Now we can craft the HTTP request with the help of
[Invoke-WebRequest][url-invoke-webrequest] cmdlet:
{% highlight powershell %}
# Download Coverity Build Tool if we are doing scheduled build.
if ($env:APPVEYOR_SCHEDULED_BUILD -eq "True") {
  Invoke-WebRequest `
    -Uri "https://scan.coverity.com/download/cxx/win_64" `
    -Body @{ project = "$env:APPVEYOR_REPO_NAME";
             token = "$env:CoverityProjectToken" } `
    -OutFile "$env:APPVEYOR_BUILD_FOLDER\coverity.zip"
  # Unzip downloaded package.
  Add-Type -AssemblyName "System.IO.Compression.FileSystem"
  [IO.Compression.ZipFile]::ExtractToDirectory(
    "$env:APPVEYOR_BUILD_FOLDER\coverity.zip",
    "$env:APPVEYOR_BUILD_FOLDER")
}
{% endhighlight %}

### Building Project with Coverity Build Tool

The next step is to build the project with Coverity Build Tool. This means
passing your build command to `cov-build.exe`:
{% highlight batch %}
cov-build.exe --dir cov-int <build command>
{% endhighlight %}
Here `cov-int` is a name of directory to place collected scan data into.

For example, if your build command is
{% highlight batch %}
"C:\Program Files (x86)\MSBuild\12.0\bin\msbuild.exe" "/l:C:\Program Files\AppVeyor\BuildAgent\Appveyor.MSBuildLogger.dll"
{% endhighlight %}
Then, corresponding Coverity Build command becomes
{% highlight batch %}
cov-build.exe --dir cov-int "C:\Program Files (x86)\MSBuild\12.0\bin\msbuild.exe" "/l:C:\Program Files\AppVeyor\BuildAgent\Appveyor.MSBuildLogger.dll"
{% endhighlight %}
For this to work we need to drop AppVeyor built-in MSBuild support in favour of
custom build script:
{% highlight yaml %}
build_script:
- ps: |
    # Here goes our code.
{% endhighlight %}
The actual PowerShell code snippet:
{% highlight powershell %}
# Define build command.
$buildCmd = "C:\Program Files (x86)\MSBuild\12.0\bin\msbuild.exe"
$buildArgs = @(
  "/m",
  "/l:C:\Program Files\AppVeyor\BuildAgent\Appveyor.MSBuildLogger.dll",
  "/p:Configuration=$env:CONFIGURATION",
  "/p:Platform=$env:PLATFORM")

# If build is not a scheduled one, then simply build project with MSBuild.
if ($env:APPVEYOR_SCHEDULED_BUILD -ne "True") {
  & $buildCmd $buildArgs
  return  # exit script
}

# Else, build project with Coverity Scan.
"Building project with Coverity Scan..."
& ".\cov-analysis-win64-7.6.0\bin\cov-build.exe" `
  --dir cov-int `
  $buildCmd $buildArgs

# Compress scan data.
# ...

# Upload scan data.
# ...
{% endhighlight %}
Things to note here:

* I'm using predefined `CONFIGURATION` and `PLATFORM` variables to simulate
  behaviour of AppVeyour buit-in MSBuild provider.
* The directory `cov-analysis-win64-7.6.0` is created by extracting Coverity
  Build Tool ZIP archive on the previous step.
* After building the project with Coverity Build Tool there will be directory
  named `cov-int` under `APPVEYOR_BUILD_FOLDER`.

### Compressing Scan Data

Coverity Scan requires the scan data collected during build to be compressed.
We can easily do this with 7-Zip which comes pre-instaled on AppVeyor build
worker. However, I'll show you pure PowerShell/.NET way of doing this
which involves some nasty .NET bug and one cool PowerShell trick to workaround
it.

Currently, the only way to create ZIP archive in PowerShell which is available
out of the box (that I'm aware of) is to use .NET
[System.IO.Compression.ZipFile API][url-dotnet-zipfile]:
{% highlight powershell %}
[IO.Compression.ZipFile]::CreateFromDirectory(
  "$env:APPVEYOR_BUILD_FOLDER\cov-int",
  "$env:APPVEYOR_BUILD_FOLDER\$env:APPVEYOR_PROJECT_NAME.zip")
{% endhighlight %}
Unfortunately, if you try to upload ZIP file created with
`IO.Compression.ZipFile` the analysis will fail. The reason is a
[bug][url-dotnet-zipfile-bug] in `IO.Compression.ZipFile` implementation due to
which file names inside ZIP archive are encoded with backslashes as path
separators (according to [ZIP format specification][url-zip-format-spec] only
forward slashes are permitted).
As a result, such an archive cannot be unpacked on *nix systems (Coverity Scan
is using Ubuntu currently).

To workaround the bug, we need to create custom encoder for ZIP file name
entries, which means defining .NET class. Can we do this from PowerShell
script? Yep, we can!
{% highlight powershell %}
# Compress results.
"Compressing Coverity results..."
$zipEncoderDef = @'
  namespace AnalyseCode {
    public class PortableFileNameEncoder: System.Text.UTF8Encoding {
      public PortableFileNameEncoder() {}
      public override byte[] GetBytes(string entry) {
        return base.GetBytes(entry.Replace("\\", "/"));
      }
    }
  }
'@
Add-Type -TypeDefinition $zipEncoderDef
[IO.Compression.ZipFile]::CreateFromDirectory(
  "$env:APPVEYOR_BUILD_FOLDER\cov-int",
  "$env:APPVEYOR_BUILD_FOLDER\$env:APPVEYOR_PROJECT_NAME.zip",
  [IO.Compression.CompressionLevel]::Optimal,
  $true,  # include root directory
  (New-Object AnalyseCode.PortableFileNameEncoder))
{% endhighlight %}
Things to note:

* `Add-Type -TypeDefinition $zipEncoderDef` defines new C# class, a custom
  encoder which replaces back slashes with forward slashes.
  The object of this class is passed as last parameter to `CreateFromDirectory`
  method.
* The fourth parameter of `CreateFromDirectory` is `true` to indicate that
  `$env:APPVEYOR_BUILD_FOLDER\cov-int` directory must be included into archive
  as a root directory (otherwise, only content of `cov-int` is included). That
  is required by Coverity Scan.
* After compressing the scan data there will be file named
  `<APPVEYOR_PROJECT_NAME>.zip` under `APPVEYOR_BUILD_FOLDER`.

### Uploading Scan Data to Coverity Scan Server

That last step is the most complex one. In order to upload scan data to
Coverity Scan server we need to send [multipart/form-data][url-rfc2388] HTML
form containing archived scan data along with some build metadata (the
process is documented in **Upload a Project Build** page of your Coverity Scan
project web GUI). This can be accomplished in many ways, I'll use
[System.Net.Http.MultipartFormDataContent][url-dotnet-multipart-form-data].

First, we need to initialize `HttpClient` and `MultipartFormDataContent`:
{% highlight powershell %}
# Upload results to Coverity server.
"Uploading Coverity results..."
Add-Type -AssemblyName "System.Net.Http"
$client = New-Object Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromMinutes(20)
$form = New-Object Net.Http.MultipartFormDataContent
{% endhighlight %}
Note that `$client.Timeout` value must be large enough for the form to upload,
otherwise exception will be thrown while sending data.

Next, we'll fill form fields one by one. Those fields are `token`, `email`,
`file`, `version` and `description`.

#### `token` field

The `token` is our Coverity Scan project token we used before to download
Coverity Build Tool.
{% highlight powershell %}
# Fill token field.
[Net.Http.HttpContent]$formField =
  New-Object Net.Http.StringContent($env:CoverityProjectToken)
$form.Add($formField, "`"token`"")
{% endhighlight %}

#### `email` field

The `email` is an e-mail address to which Coverity Scan will send a
notification about analysis results.
{% highlight powershell %}
# Fill email field.
$formField = New-Object Net.Http.StringContent($env:CoverityNotificationEmail)
$form.Add($formField, "`"email`"")
{% endhighlight %}
I recommend you to secure your e-mail:
{% highlight yaml %}
environment:
  CoverityNotificationEmail:
    secure: +eYz1A/Z8lciYhPTNqd7KgfkqxmG1nS/lOJqFjmvRdg=
{% endhighlight %}

#### `file` field

The `file` is our zipped scan data produced earlier:
{% highlight powershell %}
# Fill file field.
$fs = New-Object IO.FileStream(
  "$env:APPVEYOR_BUILD_FOLDER\$env:APPVEYOR_PROJECT_NAME.zip",
  [IO.FileMode]::Open,
  [IO.FileAccess]::Read)
$formField = New-Object Net.Http.StreamContent($fs)
$form.Add($formField, "`"file`"", "$env:APPVEYOR_PROJECT_NAME.zip")
{% endhighlight %}

#### `version` field

Your need to set this field to the version of your build:
{% highlight powershell %}
# Fill version field.
$formField = New-Object Net.Http.StringContent($env:APPVEYOR_BUILD_VERSION)
$form.Add($formField, "`"version`"")
{% endhighlight %}

#### `description` field

An arbitrary text describing your build:
{% highlight powershell %}
# Fill description field.
$formField = New-Object Net.Http.StringContent("AppVeyor scheduled build.")
$form.Add($formField, "`"description`"")
{% endhighlight %}

Finally, we can submit the form:
{% highlight powershell %}
# Submit form.
$url = "https://scan.coverity.com/builds?project=$env:APPVEYOR_REPO_NAME"
$task = $client.PostAsync($url, $form)
try {
  $task.Wait()  # throws AggregateException on time-out
} catch [AggregateException] {
  throw $_.Exception.InnerException
}
$task.Result
$fs.Close()
{% endhighlight %}
Things to note:

* We need to pass the project name in `owner-name/repo-name` format in the
  query string.
* On time-out `$task.Wait()` will throw `System.AggregateException` containing
  nested `System.Threading.Tasks.TaskCanceledException`.

### Examining the Results

After uploading the scan data you can examine intermediate results in your
Coverity Scan project web GUI, and the final results will be delivered to you
by e-mail. Then use **View Defects** button in Coverity Scan web GUI to start
triaging discovered issues.

Here is full [appveyor.yml][url-my-appveyor-yml] utilising the approach
described in the article.

*[CI]: Continuous Integration
*[SaaS]: Software as a Service

[url-appveyor]: http://www.appveyor.com
[url-travis-ci]: https://travis-ci.org
[url-appveyor-instaled-software]: http://www.appveyor.com/docs/installed-software
[url-appveyor-scheduled-builds]: http://www.appveyor.com/docs/build-configuration#scheduled-builds
[url-appveyor-secure-variables]: http://www.appveyor.com/docs/build-configuration#secure-variables
[url-coverity-scan]: https://scan.coverity.com
[url-coverity]: http://www.coverity.com
[url-coverity-scan-build-freq]: https://scan.coverity.com/faq#frequency
[url-coverity-community]: https://communities.coverity.com/message/6120#6120
[url-invoke-webrequest]: https://technet.microsoft.com/en-us/library/hh849901.aspx
[url-dotnet-zipfile]: https://msdn.microsoft.com/en-us/library/system.io.compression.zipfile(v=vs.110).aspx
[url-dotnet-zipfile-bug]: https://connect.microsoft.com/VisualStudio/feedback/details/862380/archive-created-with-system-io-compression-zipfile-createfromdirectory-does-not-preserve-directories-structure-when-unpacked-on-mac-os
[url-dotnet-multipart-form-data]: https://msdn.microsoft.com/en-us/library/system.net.http.multipartformdatacontent(v=vs.110).aspx
[url-rfc2388]: https://tools.ietf.org/html/rfc2388
[url-zip-format-spec]: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
[url-my-appveyor-yml]: https://github.com/arkfps/smart-splash/blob/34ab7d398c8b1c824779b92cdd7175e27575a88b/appveyor.yml
