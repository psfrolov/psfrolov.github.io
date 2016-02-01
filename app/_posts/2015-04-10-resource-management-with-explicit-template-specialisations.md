---
title: Resource Management with Explicit Template Specialisations
tags: [C++, Generic Programming, Windows API]
description: &description >-
  Here’s my article from the April 2015 issue of Overload journal. It shows how
  to build a convinient RAII wrapper with the help of interesting static
  polymorphism technique based on explicit template specialisation.
excerpt: *description
reading_time: 15
image:
  url: /img/pages/overload-126.png
  alt: 'Overload journal #126, April 2015'
---

Here’s my article from the
[April 2015 issue of Overload journal][url-overload]. It presents a simple,
easy‐to‐use, generic _RAII_[^fn-raii] wrapper based on an interesting _static
polymorphism_[^fn-static-polymorphism] technique which I introduced in the
[previous post][url-previous-post].

## <cite>[Resource Management with Explicit Template Specialisations][url-overload-article]</cite>

> RAII is one of the most important and useful C++ idioms. RAII efficiently
relieves the programmer of manual resource management and is a must for writing
_exception‐safe_[^fn-exception-safety] code. Perhaps, the most ubiquitous usage
of RAII is dynamic memory management with _smart pointers_[^fn-smart-pointer],
but there are a plenty of other resources for which it can be applied, notably
in the world of low‐level libraries. Examples are Windows API handles, POSIX
file descriptors, OpenGL primitives, and so on.

Also available [in Russian][url-russian-article].

*[RAII]: Resource Acquisition Is Initialization

---

[^fn-raii]: [Resource Acquisition Is Initialization][url-raii].

[^fn-static-polymorphism]:
    A [form of polymorphism][url-static-polymorphism] in programming code which
    is resolved at compile time (i.e. without dynamic dispatch overhead).

[^fn-exception-safety]:
    A set of contractual guidelines that class library implementers and clients
    can use when reasoning about exception handling safety in programming code
    ([Wikipedia][url-exception-safety]).

[^fn-smart-pointer]:
    An abstract data type that simulates a pointer while providing additional
    features, such as automatic memory management or bounds checking
    ([Wikipedia][url-smart-pointer]).

[url-overload]: http://accu.org/index.php/journals/c348/
{: rel="external" }
[url-previous-post]: {% post_url 2015-01-17-providing-explicit-specialisations-for-non-template-members-of-class-template %}
[url-overload-article]: http://accu.org/index.php/journals/2086
{: rel="external" }
[url-raii]: https://en.wikibooks.org/wiki/More_C++_Idioms/Resource_Acquisition_Is_Initialization
{: rel="external" }
[url-static-polymorphism]: https://en.wikipedia.org/wiki/Polymorphism_(computer_science)#Static_and_dynamic_polymorphism
{: rel="external" }
[url-exception-safety]: https://en.wikipedia.org/wiki/Exception_safety
{: rel="external" }
[url-smart-pointer]: https://en.wikipedia.org/wiki/Smart_pointer
{: rel="external" }
[url-russian-article]: https://habrahabr.ru/company/pt/blog/255487/
{: rel="external" hreflang="ru-RU" }
