---
layout: page
schema: "http://schema.org/AboutPage"
og_prefix: "fb: http://ogp.me/ns/fb# profile: http://ogp.me/ns/profile#"
og_type: profile
title: About
---

<span class="drop-letter">W</span><span>elcome</span> to my place, stranger!

---

{% include social-profiles.html %}

<!-- https://developers.google.com/structured-data/customize/social-profiles -->
<script type="application/ld+json">
  {
    "@context" : "http://schema.org",
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
    "@context": "http://schema.org",
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
          "name": "{{ page.title }}"
        }
      }
    ]
  }
</script>
