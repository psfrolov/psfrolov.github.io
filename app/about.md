---
layout: default
schema: https://schema.org/AboutPage
og_prefix: 'profile: http://ogp.me/ns/profile#'
og_type: profile
title: About
description: >-
  The intention of this site is to share ideas, tips, idioms, patterns,
  gotchas, issues, etc., that arises over the course of my professional
  activity, many of which I hope would be useful for other software developers.
image:
  url: /img/pages/profile.png
twitter_image:
  url: /img/pages/the-alchemist-by-pieter-bruegel-the-elder.jpg
  name: &name The Alchemist by Pieter Bruegel the Elder
  alt: *name
---


<div class="page-image">
  <img src="{{ site.baseurl }}{{ page.twitter_image.url }}"
       alt="{{ page.twitter_image.alt }}">
  <small>{{ page.twitter_image.name }}</small>
</div>

<article markdown="block">

# {{ page.title | escape }}

{{ page.description | escape }} Feel free to contact me via
[contact form]({{ site.baseurl }}/contact#main). Or use one of the social links
below.
{: .drop-letter }

*Paul*

---

{% include social-profiles.html %}

</article>

<!-- https://developers.google.com/structured-data/customize/social-profiles -->
<script type="application/ld+json">
  {
    "@context" : "https://schema.org",
    "@type" : "Person",
    "name" : "{{ site.creator.full_name }}",
    "url" : "{{ site.url }}{{ site.base_url }}{{ page.url }}",
    "image": "{{ site.url }}{{ site.baseurl }}{{ page.image.url }}",
    "sameAs" : [
      "{{ site.facebook.profile }}",
      "{{ site.twitter.profile }}",
      "{{ site.linkedin_profile }}",
      "{{ site.github_profile }}"
    ],
    "gender": "male",
    "jobTitle": "Software Developer"
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
