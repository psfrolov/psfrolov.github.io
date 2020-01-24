---
uuid: urn:uuid:cc8a2d84-a51a-4de8-867e-05ffec616448
title: Resource Management with Explicit Template Specialisations
tags: [C++, Generic Programming, Windows API]
description: &description 'Here’s my article from the April 2015 issue of <i>Overload</i> journal. It shows how to build a convenient RAII wrapper with the help of interesting static polymorphism technique based on explicit template specialisation.'
excerpt: *description
reading_time: 15
image:
  url: &url /img/pages/overload-126.png
  path: *url
  alt: 'Overload journal #126, April 2015'
---

Here’s my article from the [April 2015 issue of <i>Overload</i> journal][url-overload]. It presents a simple, easy‐to‐use, generic RAII wrapper based on an interesting static polymorphism[^fn-static-polymorphism] technique which I introduced in the [previous post][url-previous-post].

## <cite>[Resource Management with Explicit Template Specialisations][url-overload-article]</cite>

> RAII is one of the most important and useful C++ idioms. RAII efficiently relieves the programmer of manual resource management and is a must for writing exception‐safe code. Perhaps, the most ubiquitous usage of RAII is dynamic memory management with smart pointers, but there are a plenty of other resources for which it can be applied, notably in the world of low‐level libraries. Examples are Windows API handles, POSIX file descriptors, OpenGL primitives, and so on.

Also available [in Russian][url-russian-article].

---

## Footnotes
{: .screenreader-only }

[^fn-static-polymorphism]:
    A [form of polymorphism][url-static-polymorphism] in programming code which is resolved at compile time (i.e. without dynamic dispatch overhead).

[url-overload]: https://accu.org/index.php/journals/c348/
{: rel="external" }
[url-previous-post]: {% post_url 2015-01-17-providing-explicit-specialisations-for-non-template-members-of-class-template %}
[url-overload-article]: https://accu.org/index.php/journals/2086
{: rel="external" }
[url-static-polymorphism]: https://en.wikipedia.org/wiki/Polymorphism_(computer_science)#Static_and_dynamic_polymorphism
{: rel="external" }
[url-russian-article]: https://habrahabr.ru/company/pt/blog/255487/
{: rel="external" hreflang="ru-RU" }
