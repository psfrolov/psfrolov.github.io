---
layout: default
schema: https://schema.org/AboutPage
og_prefix: 'profile: http://ogp.me/ns/profile#'
og_type: profile
title: About
description: 'The intention of this site is to share ideas, tips, idioms, patterns, gotchas, issues, etc., many of which I hope would be useful for other software developers.'
image:
  url: /img/pages/the-alchemist-by-pieter-bruegel-the-elder.jpg
  name: &name >-
    <i>The Alchemist</i> by Pieter Bruegel the Elder, National Gallery of Art,
    Washington, D.C.
  alt: *name
---

{% include page-image.html image=page.image %}

<article markdown="block">

# {{ page.title }}

{{ page.description }} Feel free to contact me via [contact form](/contact). Or use one of the social links below.
{: .drop-letter }

*Paul*

{% include social-profiles.html %}

</article>

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
          "@id": "{{ site.url}}",
          "name": "Home"
        }
      },
      {
        "@type": "ListItem",
        "position": 2,
        "item": {
          "@id": "{{ site.url}}{{ page.url }}",
          "name": {{ page.title | jsonify }}
        }
      }
    ]
  }
</script>
