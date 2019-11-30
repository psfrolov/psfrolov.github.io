---
layout: default
title: News Feed
description: 'Use the link provided in this page in news aggregator or web feed reader to get notified of new articles on this website.'
image:
  url: /img/pages/the-quarrel-of-oberon-and-titania-by-joseph-noel-paton.jpg
  name: &name <i>The Quarrel of Oberon and Titania</i> by Joseph Noel Paton, Scottish National Gallery, Edinburgh
  alt: *name
---

{% include page-image.html image=page.image %}

<article markdown="block">

# {{ page.title }}

Use the following URL in news aggregator or web feed reader to get notified of new articles on this website: `{{ site.url }}/news/feed`
([link](/news/feed)).


{% include social-profiles.html %}

</article>
