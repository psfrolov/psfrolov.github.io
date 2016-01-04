---
title: Resource Management with Explicit Template Specialisations
tags: [C++, Generic Programming, Windows API]
description: |
  This article shows how to build an RAII wrapper with the help of
  interesting static polymorphism technique based on explicit template
  specialization.
reading_time: 15
image:
  url: /img/pages/overload-126.png
---

<span class="drop-letter">H</span><span>ere’s</span> my article from the [April
2015 issue of Overload journal][url-overload]. It presents a simple,
easy-to-use, generic RAII wrapper based on an interesting static polymorphism
technique which I introduced in the [previous post][url-previous-post].

## [Resource Management with Explicit Template Specialisations][url-overload-article]

> [RAII][url-raii] is one of the most important and useful C++ idioms. RAII
efficiently relieves the programmer of manual resource management and is a must
for writing [exception-safe][url-exception-safety] code. Perhaps, the most
ubiquitous usage of RAII is dynamic memory management with
[smart pointers][url-smart-pointer], but there are a plenty of other resources
for which it can be applied, notably in the world of low-level libraries.
Examples are Windows API handles, POSIX file descriptors, OpenGL primitives,
and so on.

Also available [in Russian][url-russian-article].

*[RAII]: Resource Acquisition Is Initialization

[url-overload]: http://accu.org/index.php/journals/c348/
{: rel="external" }
[url-previous-post]: {% post_url 2015-01-17-providing-explicit-specializations-for-non-template-members-of-class-template %}
[url-overload-article]: http://accu.org/index.php/journals/2086
{: rel="external" }
[url-raii]: http://en.wikibooks.org/wiki/More_C++_Idioms/Resource_Acquisition_Is_Initialization
{: rel="external" }
[url-exception-safety]: https://en.wikipedia.org/wiki/Exception_safety
{: rel="external" }
[url-smart-pointer]: https://en.wikipedia.org/wiki/Smart_pointer
{: rel="external" }
[url-russian-article]: http://habrahabr.ru/company/pt/blog/255487/
{: rel="external" hreflang="ru-RU" }
