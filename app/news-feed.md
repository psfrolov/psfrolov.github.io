---
layout: default
title: News Feed
description: >-
  Use the link provided in this page in news aggregator or web feed reader to
  get notified of new articles on this website.
image:
  url: /img/pages/the-quarrel-of-oberon-and-titania-by-joseph-noel-paton.jpg
  name: &name >-
    The Quarrel of Oberon and Titania by Joseph Noel Paton, Scottish National
    Gallery, Edinburgh
  alt: *name
---


{% include page-image.html image=page.image %}

<article markdown="block">

# {{ page.title | escape }}

Use the following URL in news aggregator or web feed reader to get notified of
new articles on this website: `{{ site.url }}/news/feed-test3`
([link](/news/feed-test3)).


{% include social-profiles.html %}

</article>
