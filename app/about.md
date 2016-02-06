---
layout: default
schema: https://schema.org/AboutPage
og_prefix: 'fb: http://ogp.me/ns/fb# profile: http://ogp.me/ns/profile#'
og_type: profile
title: About
description: >-
  The intention of this site is to share ideas, tips, idioms, patterns,
  gotchas, issues, etc., that arises over the course of my professional
  activity, many of which I hope would be useful for software developers.
image:
  url: /img/pages/profile.jpg
---


<div class="page-image" id="top">
  <img src="{{ site.baseurl }}/img/pages/the-alchemist-by-pieter-bruegel-the-elder.jpg"
       alt="The Alchemist by Pieter Bruegel the Elder">
  <small>The Alchemist by Pieter Bruegel the Elder</small>
</div>

<article markdown="block">

# {{ page.title | escape }}

Welcome to my place, stranger! The name's Paul. Once a SCADA/DCS applications
builder involved in space ground‐based infrastructure projects (namely, Angara
Space Rocket Complex and Land Launch). Now a software developer in
information security field.
{: .drop-letter }

{{ page.description | escape }} My primary programming language (as well as an area of
professional interests) is C++, so expect the majority of articles to be C++
related. Speaking about C++, I'm particularly enthusiastic about generic
programming paradigm. But fear not thou, my friend <svg class="icon icon-smile-o" role="img"><title>Smiley Face</title><use xlink:href="{{ site.baseurl }}/svg/symbol-defs.svg#icon-smile-o"/></svg>,
as I tend not to delve too deep into obscure realms of template metaprogramming
and other experimental stuff, which—even though quite interesting on its own—is
often appears to be of insufficient practical value for real world, day‐to‐day
application in team‐based software development. Rather, I'm trying to come up
with solutions (in the form of idioms and design patterns) applicable to wide
range of problem domains, but which at the same time are simple to implement,
understand and maintain.

I hope you'll find something valuable here. Feel free to drop me a line or two
via [contact form]({{ site.baseurl }}/contact#top). Or use one of the social
links below.

*[DCS]: Distributed Control System
*[SCADA]: Supervisory Control And Data Acquisition

---

{% include social-profiles.html %}

</article>

<!-- https://developers.google.com/structured-data/customize/social-profiles -->
<script type="application/ld+json">
  {
    "@context" : "https://schema.org",
    "@type" : "Person",
    "name" : "Pavel Frolov",
    "url" : "{{ site.url }}{{ site.base_url }}{{ page.url }}",
    "image": "{{ site.url }}{{ site.baseurl }}{{ page.image.url }}",
    "sameAs" : [
      "{{ site.facebook.profile }}",
      "{{ site.twitter.profile }}",
      "{{ site.linkedin_profile }}",
      "{{ site.github_profile }}"
    ],
    "gender": "male",
    "alumniOf": "Moscow State Industrial University",
    "jobTitle": "Software Developer",
    "worksFor": "Positive Technologies"
  }
</script>

<!-- https://developers.google.com/structured-data/breadcrumbs -->
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@id": "{{ site.url}}{{ site.baseurl }}",
          "name": "Home"
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@id": "{{ site.url}}{{ site.baseurl }}{{ page.url }}",
          "name": {{ page.title | jsonify }}
        }
      }
    ]
  }
</script>
